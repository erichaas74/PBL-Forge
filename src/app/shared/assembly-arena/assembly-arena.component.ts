import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ArenaViewportComponent } from './components/arena-viewport/arena-viewport.component';
import { StrategyBlockPanelComponent } from './components/strategy-block-panel/strategy-block-panel.component';
import {
  ATTACK_MOVE_ACTION_OPTIONS,
  ATTACK_MOVE_CATALOG,
  getAttackMoveDuration,
} from './data/attack-moves';
import {
  ARENA_CONTROL_MODES,
  toArenaSetup,
} from './data/arena-setups';
import {
  ArenaControlFrame,
  ArenaControlMode,
  ArenaSetupStyleId,
  BattleBodySnapshot,
  BattlePlayMode,
  ControlFrameByCombatant,
} from './models/arena.models';
import {
  ActiveAttackMove,
  AttackMoveDefinition,
  AttackMoveStep,
} from './models/attack-move.models';
import { CreationLibraryService } from '../creation-library/services/creation-library.service';
import { AssemblyArenaPhysicsService } from './physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from './rendering/assembly-arena-renderer.service';
import { buildAttackMoveControlFrames } from './strategy/attack-move-runner';
import { AssemblyArenaStore } from './state/assembly-arena.store';
import { buildControlFrames } from './strategy/strategy-runner';
import { StrategyAction } from './strategy/strategy.models';

type ArenaInputKey = 'w' | 'a' | 's' | 'd' | 'q' | 'e' | 'shift' | ' ' | 'j' | 'k';

@Component({
  selector: 'app-assembly-arena',
  imports: [
    ArenaViewportComponent,
    StrategyBlockPanelComponent,
  ],
  providers: [
    AssemblyArenaStore,
    AssemblyArenaPhysicsService,
    AssemblyArenaRendererService,
  ],
  templateUrl: './assembly-arena.component.html',
  styleUrl: './assembly-arena.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyArenaComponent {
  readonly store = inject(AssemblyArenaStore);
  readonly creationLibrary = inject(CreationLibraryService);
  readonly presets = this.creationLibrary.assemblyAssets;
  readonly setups = computed(() => this.creationLibrary.testScenarioDefinitions().map(toArenaSetup));
  readonly controlModes = ARENA_CONTROL_MODES;
  readonly attackMoveActionOptions = ATTACK_MOVE_ACTION_OPTIONS;
  readonly battleModes: { id: BattlePlayMode; name: string }[] = [
    { id: 'real-time', name: 'Real Time' },
    { id: 'turn-based', name: 'Turn Based' },
  ];
  readonly setupStyleId = signal<ArenaSetupStyleId>(this.store.state().setupStyleId);
  readonly redPresetId = signal(this.store.state().combatants[0]?.presetId ?? '');
  readonly bluePresetId = signal(this.store.state().combatants[1]?.presetId ?? '');
  readonly redControlMode = signal<ArenaControlMode>(
    this.store.state().combatants[0]?.controlMode ?? 'shove-drive',
  );
  readonly blueControlMode = signal<ArenaControlMode>(
    this.store.state().combatants[1]?.controlMode ?? 'static-target',
  );
  readonly playMode = signal<BattlePlayMode>('real-time');
  readonly selectedAttackMoveId = signal<string>(ATTACK_MOVE_CATALOG[0].id);
  readonly draftAttackMoveName = signal('Custom Dragon Combo');
  readonly draftAttackMoveDescription = signal('A saved turn attack move built from arena actions.');
  readonly draftAttackMoveSteps = signal<AttackMoveStep[]>([
    { action: 'aim', durationSeconds: 0.25, amount: 1 },
    { action: 'bite', durationSeconds: 0.4, amount: 1 },
  ]);
  private readonly activeAttackMove = signal<ActiveAttackMove | null>(null);
  private readonly pressedKeys = signal<ReadonlySet<string>>(new Set<string>());
  private biteAttackUntil = 0;
  private wingAttackUntil = 0;
  private tailAttackUntil = 0;

  readonly winnerName = computed(() => {
    const winnerId = this.store.state().winnerId;
    return this.store.state().combatants.find(combatant => combatant.id === winnerId)?.name ?? null;
  });

  readonly allAttackMoves = computed<AttackMoveDefinition[]>(() => {
    return this.creationLibrary.attackMoveDefinitions();
  });
  readonly selectedAttackMove = computed(() => this.findAttackMove(this.selectedAttackMoveId()));
  readonly activeAttackMoveName = computed(() => {
    const activeMove = this.activeAttackMove();

    if (!activeMove) {
      return null;
    }

    const move = this.findAttackMove(activeMove.moveId);
    const elapsedSeconds = this.store.state().elapsedSeconds - activeMove.startedAtSeconds;

    return elapsedSeconds <= getAttackMoveDuration(move)
      ? `${move.name} (${activeMove.team})`
      : null;
  });
  readonly draftAttackMoveSnippet = computed(() => createAttackMoveSnippet(
    this.draftAttackMoveName(),
    this.draftAttackMoveDescription(),
    this.draftAttackMoveSteps(),
  ));

  readonly controlFrameFactory = (snapshots: BattleBodySnapshot[]): ControlFrameByCombatant =>
    buildControlFrames(
      this.store.state(),
      snapshots,
      this.store.strategyPrograms(),
      this.getManualControls(),
      buildAttackMoveControlFrames(
        this.store.state(),
        snapshots,
        this.allAttackMoves(),
        this.getActiveAttackMove(),
      ),
    );

  loadSelectedMatch(): void {
    this.clearPressedKeys();
    this.clearActiveAttackMove();
    this.blurActiveControl();
    this.store.loadMatch(
      this.setupStyleId(),
      this.redPresetId(),
      this.bluePresetId(),
      this.redControlMode(),
      this.blueControlMode(),
      this.playMode(),
    );
  }

  loadSetup(event: Event): void {
    this.clearPressedKeys();
    this.clearActiveAttackMove();
    this.blurActiveControl();
    const setupStyleId = (event.target as HTMLSelectElement).value as ArenaSetupStyleId;
    const setup = this.setups().find(item => item.id === setupStyleId) ?? this.setups()[0];
    if (!setup) {
      return;
    }
    this.setupStyleId.set(setup.id);
    this.redPresetId.set(setup.defaultRedPresetId);
    this.bluePresetId.set(setup.defaultBluePresetId);
    this.redControlMode.set(setup.redControlMode);
    this.blueControlMode.set(setup.blueControlMode);
    this.store.loadSetup(setup.id, this.playMode());
  }

  setPreset(team: 'red' | 'blue', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (team === 'red') {
      this.redPresetId.set(value);
      return;
    }

    this.bluePresetId.set(value);
  }

  setControlMode(team: 'red' | 'blue', event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ArenaControlMode;

    if (team === 'red') {
      this.redControlMode.set(value);
      return;
    }

    this.blueControlMode.set(value);
  }

  setPlayMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BattlePlayMode;
    this.clearPressedKeys();
    this.clearActiveAttackMove();
    this.blurActiveControl();
    this.playMode.set(value);
    this.store.setPlayMode(value);
  }

  toggleRunning(): void {
    this.blurActiveControl();
    this.clearPressedKeys();

    if (this.store.state().isRunning) {
      this.store.pause();
      return;
    }

    this.store.start();
  }

  healthPercent(value: number, max: number): number {
    return max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  }

  setVirtualControl(key: ArenaInputKey, active: boolean, event?: Event): void {
    event?.preventDefault();

    if (active && (key === ' ' || key === 'j' || key === 'k')) {
      this.bufferAttack(key === ' ' ? 'bite' : key === 'j' ? 'wing' : 'tail', 320);
    }

    this.pressedKeys.update(keys => {
      const next = new Set(keys);

      if (active) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  triggerAttack(type: 'bite' | 'wing' | 'tail'): void {
    this.blurActiveControl();
    this.bufferAttack(type, 320);
  }

  setSelectedAttackMove(event: Event): void {
    this.selectedAttackMoveId.set((event.target as HTMLSelectElement).value);
  }

  playSelectedAttackMove(): void {
    this.clearPressedKeys();
    this.blurActiveControl();
    this.activeAttackMove.set({
      moveId: this.selectedAttackMoveId(),
      team: this.store.state().activeTeam,
      startedAtSeconds: this.store.state().elapsedSeconds,
    });
  }

  setDraftAttackMoveName(event: Event): void {
    this.draftAttackMoveName.set((event.target as HTMLInputElement).value);
  }

  setDraftAttackMoveDescription(event: Event): void {
    this.draftAttackMoveDescription.set((event.target as HTMLInputElement).value);
  }

  addDraftAttackMoveStep(): void {
    this.draftAttackMoveSteps.update(steps => [
      ...steps,
      { action: 'bite', durationSeconds: 0.35, amount: 1 },
    ]);
  }

  saveDraftAttackMove(): void {
    const move = createAttackMoveDefinition(
      this.draftAttackMoveName(),
      this.draftAttackMoveDescription(),
      this.draftAttackMoveSteps(),
    );

    const asset = this.creationLibrary.saveAttackMoveDefinition(move);
    this.selectedAttackMoveId.set(asset.id);
  }

  removeDraftAttackMoveStep(index: number): void {
    this.draftAttackMoveSteps.update(steps => steps.filter((_, itemIndex) => itemIndex !== index));
  }

  updateDraftStepAction(index: number, event: Event): void {
    const action = (event.target as HTMLSelectElement).value as StrategyAction;
    this.updateDraftStep(index, { action });
  }

  updateDraftStepNumber(
    index: number,
    key: 'durationSeconds' | 'amount',
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.updateDraftStep(index, {
      [key]: Number.isFinite(value) ? value : 0,
    });
  }

  endTurn(): void {
    this.clearPressedKeys();
    this.clearActiveAttackMove();
    this.blurActiveControl();
    this.store.endTurn();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (isTextInputTarget(event.target)) {
      return;
    }

    const key = normalizeKey(event);

    if (!isControlKey(key)) {
      return;
    }

    event.preventDefault();

    if (key === ' ') {
      this.bufferAttack('bite');
    } else if (key === 'j') {
      this.bufferAttack('wing');
    } else if (key === 'k') {
      this.bufferAttack('tail');
    }

    this.pressedKeys.update(keys => new Set([...keys, key]));
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (isTextInputTarget(event.target)) {
      return;
    }

    const key = normalizeKey(event);

    if (!isControlKey(key)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.update(keys => {
      const next = new Set(keys);
      next.delete(key);
      return next;
    });
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.clearPressedKeys();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) {
      this.clearPressedKeys();
    }
  }

  private getManualControls(): ArenaControlFrame {
    const keys = this.pressedKeys();
    const now = performance.now();
    const forward = keys.has('w') || keys.has('arrowup');
    const backward = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');

    return {
      throttle: Number(forward) - Number(backward),
      steer: Number(right) - Number(left),
      strafe: Number(keys.has('e')) - Number(keys.has('q')),
      boost: keys.has('shift'),
      biteAttack: keys.has(' ') || now < this.biteAttackUntil,
      wingAttack: keys.has('j') || now < this.wingAttackUntil,
      tailAttack: keys.has('k') || now < this.tailAttackUntil,
    };
  }

  private clearPressedKeys(): void {
    this.pressedKeys.set(new Set<string>());
    this.biteAttackUntil = 0;
    this.wingAttackUntil = 0;
    this.tailAttackUntil = 0;
  }

  private clearActiveAttackMove(): void {
    this.activeAttackMove.set(null);
  }

  private getActiveAttackMove(): ActiveAttackMove | null {
    const activeMove = this.activeAttackMove();

    if (!activeMove) {
      return null;
    }

    const move = this.findAttackMove(activeMove.moveId);
    const elapsedSeconds = this.store.state().elapsedSeconds - activeMove.startedAtSeconds;

    if (elapsedSeconds > getAttackMoveDuration(move)) {
      return null;
    }

    return activeMove;
  }

  private findAttackMove(moveId: string): AttackMoveDefinition {
    return this.allAttackMoves().find(move => move.id === moveId) ?? ATTACK_MOVE_CATALOG[0];
  }

  private updateDraftStep(index: number, partialStep: Partial<AttackMoveStep>): void {
    this.draftAttackMoveSteps.update(steps => steps.map((step, itemIndex) => itemIndex === index
      ? {
          ...step,
          ...partialStep,
          durationSeconds: clampPositive(partialStep.durationSeconds ?? step.durationSeconds, 0.05),
          amount: clamp(partialStep.amount ?? step.amount, 0, 1.5),
        }
      : step));
  }

  private blurActiveControl(): void {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private bufferAttack(type: 'bite' | 'wing' | 'tail', durationMs = 220): void {
    const until = performance.now() + durationMs;

    if (type === 'bite') {
      this.biteAttackUntil = until;
    } else if (type === 'wing') {
      this.wingAttackUntil = until;
    } else {
      this.tailAttackUntil = until;
    }
  }
}

function createAttackMoveSnippet(
  name: string,
  description: string,
  steps: AttackMoveStep[],
): string {
  const move = createAttackMoveDefinition(name, description, steps);
  const formattedSteps = steps.map(step =>
    `      { action: '${step.action}', durationSeconds: ${roundForSnippet(step.durationSeconds)}, amount: ${roundForSnippet(step.amount)} },`,
  ).join('\n');

  return `  {
    id: '${move.id}',
    name: '${escapeSnippetString(move.name)}',
    description: '${escapeSnippetString(move.description)}',
    tags: ['custom'],
    steps: [
${formattedSteps}
    ],
  },`;
}

function createAttackMoveDefinition(
  name: string,
  description: string,
  steps: AttackMoveStep[],
): AttackMoveDefinition {
  const moveName = name.trim() || 'Custom Attack Move';

  return {
    id: toKebabId(moveName),
    name: moveName,
    description: description.trim() || 'A saved turn attack move.',
    tags: ['custom'],
    steps: steps.map(step => ({
      action: step.action,
      durationSeconds: clampPositive(step.durationSeconds, 0.05),
      amount: clamp(step.amount, 0, 1.5),
    })),
  };
}

function toKebabId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-attack-move';
}

function escapeSnippetString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function roundForSnippet(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampPositive(value: number, min: number): number {
  return Math.max(min, value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeKey(event: KeyboardEvent): string {
  if (event.code === 'Space' || event.key === 'Spacebar') {
    return ' ';
  }

  if (event.code.startsWith('Key')) {
    return event.code.slice(3).toLowerCase();
  }

  if (event.code.startsWith('Arrow')) {
    return event.code.toLowerCase();
  }

  return event.key.toLowerCase();
}

function isControlKey(key: string): boolean {
  return [
    'w',
    'a',
    's',
    'd',
    'q',
    'e',
    'shift',
    ' ',
    'j',
    'k',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
  ].includes(key);
}

function isTextInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLElement && target.isContentEditable;
}
