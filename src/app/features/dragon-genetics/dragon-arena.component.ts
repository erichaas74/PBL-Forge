import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnChanges,
  SimpleChanges,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ArenaViewportComponent } from '../../shared/assembly-arena/components/arena-viewport/arena-viewport.component';
import {
  ArenaControlFrame,
  BattleBodySnapshot,
  BattlePlayMode,
  BattleTeam,
  ControlFrameByCombatant,
} from '../../shared/assembly-arena/models/arena.models';
import { AttackMoveStep } from '../../shared/assembly-arena/models/attack-move.models';
import { AssemblyArenaPhysicsService } from '../../shared/assembly-arena/physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from '../../shared/assembly-arena/rendering/assembly-arena-renderer.service';
import { AssemblyArenaStore } from '../../shared/assembly-arena/state/assembly-arena.store';
import {
  buildControlFrames,
  buildSensors,
  createActionControlFrame,
  NEUTRAL_CONTROL_FRAME,
} from '../../shared/assembly-arena/strategy/strategy-runner';
import { CreationLibraryService } from '../../shared/creation-library/services/creation-library.service';
import { DragonArenaSoundService } from './dragon-arena-sound.service';
import { findParent, materializeDragon, runDragonBatch } from './dragon-genetics.domain';
import { DragonBattleResult, StudentDragonRecord } from './dragon-genetics.models';
import { DRAGON_MOVE_CARDS, DragonMoveCard, findDragonMoveCards } from './dragon-move-cards';

type ControlKey = 'forward' | 'back' | 'left' | 'right' | 'boost';
type AttackType = 'bite' | 'wing' | 'tail' | 'fire';

/** Standard-mapping gamepad indices: A, B, X, right trigger, d-pad. */
const PAD_BITE = 0;
const PAD_TAIL = 1;
const PAD_WING = 2;
const PAD_FIRE = 3;
const PAD_BOOST = 7;
const PAD_UP = 12;
const PAD_DOWN = 13;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;
const PAD_DEADZONE = 0.2;

/** A scripted set of move-card steps currently playing out in the physics arena. */
interface TurnScript {
  team: BattleTeam;
  steps: AttackMoveStep[];
  startedAtSeconds: number;
  totalSeconds: number;
}

const MAX_CARDS_PER_TURN = 3;

@Component({
  selector: 'app-dragon-arena',
  imports: [ArenaViewportComponent],
  providers: [
    AssemblyArenaStore,
    AssemblyArenaPhysicsService,
    AssemblyArenaRendererService,
    DragonArenaSoundService,
  ],
  templateUrl: './dragon-arena.component.html',
  styleUrl: './dragon-arena.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonArenaComponent implements OnChanges {
  readonly champion = input.required<StudentDragonRecord>();
  /**
   * Drops the standalone control reference. Set when the arena is embedded in a
   * lesson that carries its own instructions, where a second full keyboard
   * guide is a wall of text between the student and the fight.
   */
  readonly compact = input(false);
  readonly battleFinished = output<DragonBattleResult>();
  readonly arena = inject(AssemblyArenaStore);
  readonly sound = inject(DragonArenaSoundService);
  private readonly library = inject(CreationLibraryService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly controls = signal<ReadonlySet<ControlKey>>(new Set());
  private biteUntil = 0;
  private wingUntil = 0;
  private tailUntil = 0;
  private fireUntil = 0;
  private reportedMatchId: number | null = null;
  private studentAssetId = '';
  private opponentAssetId = '';
  private opponentRecord: StudentDragonRecord | null = null;
  private previousTotalHealth: number | null = null;
  private readonly padButtonsDown = new Set<number>();

  readonly playMode = signal<BattlePlayMode>('real-time');
  readonly moveCards = DRAGON_MOVE_CARDS;
  readonly selectedCardIds = signal<readonly string[]>([]);
  readonly turnScript = signal<TurnScript | null>(null);
  readonly maxCardsPerTurn = MAX_CARDS_PER_TURN;

  readonly scoreboard = this.arena.scoreboard;
  readonly player = computed(() => this.scoreboard().find(entry => entry.team === 'red'));
  readonly opponent = computed(() => this.scoreboard().find(entry => entry.team === 'blue'));
  readonly winnerName = computed(() => {
    const winnerId = this.arena.state().winnerId;
    return this.arena.state().combatants.find(combatant => combatant.id === winnerId)?.name ?? null;
  });
  readonly canWingAttack = computed(() =>
    this.champion().genome.wings.some(allele => allele === 'W'));
  readonly canFireAttack = computed(() =>
    this.champion().genome.fire.some(allele => allele === 'F'));

  readonly controlFrameFactory = (snapshots: BattleBodySnapshot[]): ControlFrameByCombatant => {
    const state = this.arena.state();
    const frames = buildControlFrames(
      state,
      snapshots,
      this.arena.strategyPrograms(),
      this.manualFrame(),
    );

    // In the turn duel, the scripted combatant is driven entirely by its move
    // cards — the base program (manual or AI) is replaced, not merged.
    const scripted = this.scriptFrame(state, snapshots);
    if (scripted) frames[scripted.combatantId] = scripted.frame;
    return frames;
  };

  constructor() {
    effect(() => {
      const state = this.arena.state();
      if (!state.winnerId || this.reportedMatchId === state.matchId) return;
      this.reportedMatchId = state.matchId;
      this.sound.playVictory();
      const player = this.player();
      const remainingHealthPercent = player
        ? Math.round(100 * player.totalHealth / Math.max(1, player.maxTotalHealth))
        : 0;
      this.battleFinished.emit({
        won: state.winnerId === 'red-1',
        winnerName: this.winnerName() ?? 'Unknown dragon',
        elapsedSeconds: state.elapsedSeconds,
        remainingHealthPercent,
      });
    });

    // Impact thud whenever anyone loses health.
    effect(() => {
      const total = this.scoreboard().reduce((sum, entry) => sum + entry.totalHealth, 0);
      if (this.previousTotalHealth !== null && total < this.previousTotalHealth - 0.01) {
        this.sound.playImpact();
      }
      this.previousTotalHealth = total;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['champion']) return;
    const champion = materializeDragon(this.champion());
    const opponentSeed = runDragonBatch(findParent('moss'), findParent('quartz'), 909, 1).sample[0]
      ?? this.champion();
    this.opponentRecord = {
      ...opponentSeed,
      id: 'arena-warden',
      name: 'The Arena Warden',
      title: 'Balanced AI challenger',
      // Authored paint, not the bred colour that came with the seed genome.
      // Student dragons take a saturated hue off the identity wheel, and two of
      // those can land in the same family by chance — which is exactly what
      // happened here, a champion at hue 249 against a challenger at 238. The
      // house dragon sits off that wheel entirely, in desaturated iron: it can
      // never collide with a hatchling, and the fight always reads as a student
      // animal against the arena's own.
      color: '#4a5058',
      accentColor: '#8c939b',
    };
    const opponent = materializeDragon(this.opponentRecord);
    const studentAsset = this.library.saveAssemblyAsset({
      name: `Champion ${this.champion().id}`,
      description: 'A student-bred dragon generated from the official genetics record.',
      tags: ['dragon', 'student', 'genetics'],
      compatibleGameIds: ['assembly-arena'],
      assembly: champion.assembly,
      combatProfile: champion.combatProfile,
    });
    const opponentAsset = this.library.saveAssemblyAsset({
      name: 'Arena Warden',
      description: 'A consistent AI opponent for the Dragon Genetics final challenge.',
      tags: ['dragon', 'opponent', 'genetics'],
      compatibleGameIds: ['assembly-arena'],
      assembly: opponent.assembly,
      combatProfile: opponent.combatProfile,
    });
    this.studentAssetId = studentAsset.id;
    this.opponentAssetId = opponentAsset.id;
    this.loadCurrentMatch();
  }

  setMode(mode: BattlePlayMode): void {
    if (this.playMode() === mode) return;
    this.playMode.set(mode);
    this.loadCurrentMatch();
  }

  toggleBattle(): void {
    if (this.arena.state().isRunning) {
      this.arena.pause();
    } else {
      this.arena.start();
    }
  }

  resetBattle(): void {
    this.clearControls();
    this.clearTurnState();
    this.reportedMatchId = null;
    this.arena.resetCurrentMatch();
  }

  setControl(key: ControlKey, active: boolean): void {
    this.controls.update(current => {
      const next = new Set(current);
      if (active) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  attack(type: AttackType): void {
    const until = performance.now() + 360;
    if (type === 'bite') {
      this.biteUntil = until;
      this.sound.playBite();
    }
    if (type === 'wing' && this.canWingAttack()) {
      this.wingUntil = until;
      this.sound.playWing();
    }
    if (type === 'tail') {
      this.tailUntil = until;
      this.sound.playTail();
    }
    if (type === 'fire' && this.canFireAttack()) {
      this.fireUntil = performance.now() + 520;
      this.sound.playFire();
    }
  }

  healthPercent(value: number | undefined, max: number | undefined): number {
    return !value || !max ? 0 : Math.max(0, Math.min(100, 100 * value / max));
  }

  // ---------------------------------------------------------------------------
  // Turn duel.
  // ---------------------------------------------------------------------------

  toggleCard(cardId: string): void {
    this.selectedCardIds.update(ids => {
      if (ids.includes(cardId)) return ids.filter(id => id !== cardId);
      return ids.length >= MAX_CARDS_PER_TURN ? ids : [...ids, cardId];
    });
  }

  selectionIndex(cardId: string): number {
    return this.selectedCardIds().indexOf(cardId);
  }

  canUseCard(card: DragonMoveCard): boolean {
    return (!card.requiresWings || this.canWingAttack())
      && (!card.requiresFire || this.canFireAttack());
  }

  cardUnavailableReason(card: DragonMoveCard): string {
    if (card.requiresWings && !this.canWingAttack()) return 'Unavailable: wingless genotype';
    if (card.requiresFire && !this.canFireAttack()) return 'Unavailable: no fire genotype';
    return card.detail;
  }

  playTurn(): void {
    const cards = findDragonMoveCards(this.selectedCardIds()).filter(card => this.canUseCard(card));
    if (!cards.length || this.turnScript()) return;
    this.selectedCardIds.set([]);
    this.startScript('red', cards);
  }

  private scriptFrame(
    state: ReturnType<AssemblyArenaStore['state']>,
    snapshots: BattleBodySnapshot[],
  ): { combatantId: string; frame: ArenaControlFrame } | null {
    const script = this.turnScript();
    if (!script || state.playMode !== 'turn-based') return null;

    if (state.winnerId) {
      queueMicrotask(() => this.turnScript.set(null));
      return null;
    }

    const elapsed = state.elapsedSeconds - script.startedAtSeconds;
    if (elapsed >= script.totalSeconds) {
      queueMicrotask(() => this.finishScript());
      return null;
    }

    const combatant = state.combatants.find(item => item.team === script.team);
    if (!combatant) return null;

    const step = stepAtTime(script.steps, elapsed);
    if (!step) return null;

    const sensors = buildSensors(state, snapshots, combatant.id);
    return {
      combatantId: combatant.id,
      frame: createActionControlFrame(sensors, step.action, step.amount),
    };
  }

  private startScript(team: BattleTeam, cards: readonly DragonMoveCard[]): void {
    const steps = cards.flatMap(card => card.steps);
    if (!steps.length) return;
    this.turnScript.set({
      team,
      steps,
      startedAtSeconds: this.arena.state().elapsedSeconds,
      totalSeconds: steps.reduce((sum, step) => sum + Math.max(step.durationSeconds, 0), 0),
    });
    this.arena.start();
  }

  private finishScript(): void {
    const script = this.turnScript();
    if (!script) return;
    this.turnScript.set(null);
    if (this.arena.state().winnerId) return;
    this.arena.pause();
    this.arena.endTurn();
    if (this.arena.state().activeTeam === 'blue') {
      this.playWardenTurn();
    }
  }

  /** The Warden rotates through simple genotype-legal plans by turn number. */
  private playWardenTurn(): void {
    const winged = this.opponentRecord?.genome.wings.includes('W') ?? false;
    const patterns: string[][] = [
      ['advance', 'bite'],
      winged ? ['advance', 'wing'] : ['charge', 'bite'],
      ['charge', 'tail'],
      ['bite', 'tail'],
    ];
    const pattern = patterns[(this.arena.state().turnNumber - 1) % patterns.length];
    this.startScript('blue', findDragonMoveCards(pattern));
  }

  private loadCurrentMatch(): void {
    if (!this.studentAssetId || !this.opponentAssetId) return;
    this.clearTurnState();
    this.arena.loadMatch(
      'duel-arena',
      this.studentAssetId,
      this.opponentAssetId,
      'dragon-attack',
      'dragon-attack',
      this.playMode(),
    );
  }

  private clearTurnState(): void {
    this.turnScript.set(null);
    this.selectedCardIds.set([]);
  }

  // ---------------------------------------------------------------------------
  // Keyboard and manual controls (real-time mode).
  // ---------------------------------------------------------------------------

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.ignoresKey(event) || this.arena.state().playMode === 'turn-based') return;
    if (this.applyKey(event.key.toLowerCase(), true)) event.preventDefault();
  }

  /**
   * Release is deliberately unguarded: a key pressed while the arena had the
   * keyboard must still clear its control when it comes up, even if focus moved
   * to a control outside the arena in between. Otherwise the dragon runs on.
   */
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (!isTypingTarget(event.target)) {
      this.applyKey(event.key.toLowerCase(), false);
    }
  }

  /**
   * Whether a keypress belongs to something other than the dragon.
   *
   * The arena listens on `window` because a student steering with WASD should
   * not first have to click the canvas. But embedded in a lesson it shares that
   * window with answer buttons, and an arrow key pressed while one of those
   * holds focus belongs to the page, not to the fight. Focus on the document
   * body — the usual case, and the case after clicking the arena itself — still
   * drives the dragon.
   */
  private ignoresKey(event: KeyboardEvent): boolean {
    const target = event.target;
    if (isTypingTarget(target)) return true;
    return target instanceof HTMLElement
      && target !== document.body
      && !this.host.nativeElement.contains(target);
  }

  @HostListener('window:blur')
  clearControls(): void {
    this.controls.set(new Set());
  }

  /** Keyboard scheme: WASD/arrows move, Shift boosts, J/K/L/F attack. */
  private applyKey(key: string, active: boolean): boolean {
    switch (key) {
      case 'w': case 'arrowup': this.setControl('forward', active); return true;
      case 's': case 'arrowdown': this.setControl('back', active); return true;
      case 'a': case 'arrowleft': this.setControl('left', active); return true;
      case 'd': case 'arrowright': this.setControl('right', active); return true;
      case 'shift': this.setControl('boost', active); return true;
      case 'j': if (active) this.attack('bite'); return true;
      case 'k': if (active) this.attack('wing'); return true;
      case 'l': if (active) this.attack('tail'); return true;
      case 'f': if (active) this.attack('fire'); return true;
      default: return false;
    }
  }

  private manualFrame(): ArenaControlFrame {
    if (this.arena.state().playMode === 'turn-based') {
      return { ...NEUTRAL_CONTROL_FRAME };
    }

    const pad = this.readGamepad();
    const controls = this.controls();
    const now = performance.now();
    const keyboardThrottle = Number(controls.has('forward')) - Number(controls.has('back'));
    const keyboardSteer = Number(controls.has('right')) - Number(controls.has('left'));

    return {
      ...NEUTRAL_CONTROL_FRAME,
      throttle: clampAxis(keyboardThrottle + (pad?.throttle ?? 0)),
      steer: clampAxis(keyboardSteer + (pad?.steer ?? 0)),
      boost: controls.has('boost') || (pad?.boost ?? false),
      biteAttack: now < this.biteUntil,
      wingAttack: now < this.wingUntil,
      tailAttack: now < this.tailUntil,
      fireAttack: now < this.fireUntil,
    };
  }

  /**
   * Standard-mapping gamepad: left stick or d-pad moves, right trigger boosts,
   * A/X/B/Y attack. Buttons route through attack() on the press edge so gating
   * and sounds behave exactly like the keyboard.
   */
  private readGamepad(): { throttle: number; steer: number; boost: boolean } | null {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find(candidate => candidate?.connected);
    if (!pad) {
      this.padButtonsDown.clear();
      return null;
    }

    const axis = (value: number | undefined): number =>
      value !== undefined && Math.abs(value) >= PAD_DEADZONE ? value : 0;
    const pressed = (index: number): boolean => pad.buttons[index]?.pressed ?? false;

    const attackButtons: [number, AttackType][] = [
      [PAD_BITE, 'bite'],
      [PAD_WING, 'wing'],
      [PAD_TAIL, 'tail'],
      [PAD_FIRE, 'fire'],
    ];
    for (const [index, type] of attackButtons) {
      if (pressed(index)) {
        if (!this.padButtonsDown.has(index)) {
          this.padButtonsDown.add(index);
          this.attack(type);
        }
      } else {
        this.padButtonsDown.delete(index);
      }
    }

    return {
      throttle: clampAxis(-axis(pad.axes[1]) + Number(pressed(PAD_UP)) - Number(pressed(PAD_DOWN))),
      steer: clampAxis(axis(pad.axes[0]) + Number(pressed(PAD_RIGHT)) - Number(pressed(PAD_LEFT))),
      boost: (pad.buttons[PAD_BOOST]?.value ?? 0) > 0.35 || pressed(PAD_BOOST),
    };
  }
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function stepAtTime(steps: readonly AttackMoveStep[], elapsedSeconds: number): AttackMoveStep | null {
  let cursor = 0;
  for (const step of steps) {
    cursor += Math.max(step.durationSeconds, 0);
    if (elapsedSeconds <= cursor) return step;
  }
  return null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT';
}
