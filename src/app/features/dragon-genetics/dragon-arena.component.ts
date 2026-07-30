import {
  ChangeDetectionStrategy,
  Component,
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
import { ArenaControlFrame, BattleBodySnapshot, ControlFrameByCombatant } from '../../shared/assembly-arena/models/arena.models';
import { AssemblyArenaPhysicsService } from '../../shared/assembly-arena/physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from '../../shared/assembly-arena/rendering/assembly-arena-renderer.service';
import { AssemblyArenaStore } from '../../shared/assembly-arena/state/assembly-arena.store';
import { buildControlFrames, NEUTRAL_CONTROL_FRAME } from '../../shared/assembly-arena/strategy/strategy-runner';
import { CreationLibraryService } from '../../shared/creation-library/services/creation-library.service';
import { findParent, materializeDragon, runDragonBatch } from './dragon-genetics.domain';
import { DragonBattleResult, StudentDragonRecord } from './dragon-genetics.models';

type ControlKey = 'forward' | 'back' | 'left' | 'right' | 'boost';

@Component({
  selector: 'app-dragon-arena',
  imports: [ArenaViewportComponent],
  providers: [AssemblyArenaStore, AssemblyArenaPhysicsService, AssemblyArenaRendererService],
  templateUrl: './dragon-arena.component.html',
  styleUrl: './dragon-arena.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonArenaComponent implements OnChanges {
  readonly champion = input.required<StudentDragonRecord>();
  readonly battleFinished = output<DragonBattleResult>();
  readonly arena = inject(AssemblyArenaStore);
  private readonly library = inject(CreationLibraryService);
  private readonly controls = signal<ReadonlySet<ControlKey>>(new Set());
  private biteUntil = 0;
  private wingUntil = 0;
  private tailUntil = 0;
  private reportedMatchId: number | null = null;

  readonly scoreboard = this.arena.scoreboard;
  readonly player = computed(() => this.scoreboard().find(entry => entry.team === 'red'));
  readonly opponent = computed(() => this.scoreboard().find(entry => entry.team === 'blue'));
  readonly winnerName = computed(() => {
    const winnerId = this.arena.state().winnerId;
    return this.arena.state().combatants.find(combatant => combatant.id === winnerId)?.name ?? null;
  });
  readonly canWingAttack = computed(() =>
    this.champion().genome.wings.some(allele => allele === 'W'));

  readonly controlFrameFactory = (snapshots: BattleBodySnapshot[]): ControlFrameByCombatant =>
    buildControlFrames(
      this.arena.state(),
      snapshots,
      this.arena.strategyPrograms(),
      this.manualFrame(),
    );

  constructor() {
    effect(() => {
      const state = this.arena.state();
      if (!state.winnerId || this.reportedMatchId === state.matchId) return;
      this.reportedMatchId = state.matchId;
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['champion']) return;
    const champion = materializeDragon(this.champion());
    const opponentSeed = runDragonBatch(findParent('moss'), findParent('quartz'), 909, 1).sample[0]
      ?? this.champion();
    const opponentRecord = {
      ...opponentSeed,
      id: 'arena-warden',
      name: 'The Arena Warden',
      title: 'Balanced AI challenger',
    };
    const opponent = materializeDragon(opponentRecord);
    const studentAsset = this.library.saveAssemblyAsset({
      name: `Champion ${this.champion().id}`,
      description: 'A student-bred dragon generated from the official genetics record.',
      tags: ['dragon', 'student', 'genetics'],
      compatibleGameIds: ['assembly-arena'],
      assembly: champion.assembly,
    });
    const opponentAsset = this.library.saveAssemblyAsset({
      name: 'Arena Warden',
      description: 'A consistent AI opponent for the Dragon Genetics final challenge.',
      tags: ['dragon', 'opponent', 'genetics'],
      compatibleGameIds: ['assembly-arena'],
      assembly: opponent.assembly,
    });
    this.arena.loadMatch(
      'duel-arena',
      studentAsset.id,
      opponentAsset.id,
      'dragon-attack',
      'dragon-attack',
      'real-time',
    );
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

  attack(type: 'bite' | 'wing' | 'tail'): void {
    const until = performance.now() + 360;
    if (type === 'bite') this.biteUntil = until;
    if (type === 'wing' && this.canWingAttack()) this.wingUntil = until;
    if (type === 'tail') this.tailUntil = until;
  }

  healthPercent(value: number | undefined, max: number | undefined): number {
    return !value || !max ? 0 : Math.max(0, Math.min(100, 100 * value / max));
  }

  @HostListener('window:blur')
  clearControls(): void {
    this.controls.set(new Set());
  }

  private manualFrame(): ArenaControlFrame {
    const controls = this.controls();
    const now = performance.now();
    return {
      ...NEUTRAL_CONTROL_FRAME,
      throttle: Number(controls.has('forward')) - Number(controls.has('back')),
      steer: Number(controls.has('right')) - Number(controls.has('left')),
      boost: controls.has('boost'),
      biteAttack: now < this.biteUntil,
      wingAttack: now < this.wingUntil,
      tailAttack: now < this.tailUntil,
    };
  }
}
