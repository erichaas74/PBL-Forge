import { computed, inject, Injectable, signal } from '@angular/core';
import { CreationLibraryService } from '../../creation-library/services/creation-library.service';
import { CreationAssemblyAsset } from '../../creation-library/models/creation-library.models';
import {
  toArenaSetup,
} from '../data/arena-setups';
import {
  ArenaControlMode,
  ArenaSetupConfig,
  ArenaSetupStyleId,
  BattleArenaState,
  BattleCombatant,
  BattlePhysicsFrame,
  BattlePlayMode,
  BattleScoreboardEntry,
  BattleTeam,
} from '../models/arena.models';
import {
  createCombatant,
  createPartStatuses,
  getBodyKey,
} from '../utils/battle-assembly';
import {
  ControllerProgram,
  StrategyBlock,
  StrategyBlockParamValue,
  StrategyBlockType,
  StrategyProgramId,
} from '../strategy/strategy.models';
import {
  STRATEGY_BLOCK_OPTIONS,
  createStrategyBlock,
  getStrategyPreset,
} from '../strategy/strategy-presets';

const MAX_EVENTS = 7;

@Injectable()
export class AssemblyArenaStore {
  private matchId = 0;
  private readonly creationLibrary = inject(CreationLibraryService);
  readonly availablePresets = this.creationLibrary.assemblyAssets;
  readonly availableSetups = computed(() =>
    this.creationLibrary.testScenarioDefinitions().map(toArenaSetup),
  );
  private readonly matchRevisionSignal = signal(0);
  private readonly stateSignal = signal<BattleArenaState>(
    createInitialArenaState(
      this.nextMatchId(),
      this.availableSetups()[0],
      this.availablePresets(),
    ),
  );
  private readonly strategyProgramsSignal = signal<Record<string, ControllerProgram>>(
    createProgramsForState(this.stateSignal()),
  );

  readonly state = this.stateSignal.asReadonly();
  readonly matchRevision = this.matchRevisionSignal.asReadonly();
  readonly strategyPrograms = this.strategyProgramsSignal.asReadonly();
  readonly currentSetup = computed(() => this.state().setup);
  readonly matchSummary = computed(() => {
    const state = this.state();
    return {
      matchId: state.matchId,
      setupName: state.setupName,
      isRunning: state.isRunning,
      elapsedSeconds: state.elapsedSeconds,
      playMode: state.playMode,
      activeTeam: state.activeTeam,
      turnNumber: state.turnNumber,
      combatantCount: state.combatants.length,
      partCount: state.combatants.reduce((total, combatant) => total + combatant.assembly.parts.length, 0),
    };
  });
  readonly scoreboard = computed<BattleScoreboardEntry[]>(() => {
    const state = this.state();

    return state.combatants.map(combatant => {
      const statuses = Object.values(state.partStatuses)
        .filter(status => status.combatantId === combatant.id);
      const coreKey = getBodyKey(combatant.id, combatant.corePartId);
      const coreStatus = state.partStatuses[coreKey];
      const totalHealth = statuses.reduce((sum, status) => sum + Math.max(status.health, 0), 0);
      const maxTotalHealth = statuses.reduce((sum, status) => sum + status.maxHealth, 0);

      return {
        combatantId: combatant.id,
        name: combatant.name,
        team: combatant.team,
        controller: combatant.controller,
        controlMode: combatant.controlMode,
        coreHealth: coreStatus ? Math.max(coreStatus.health, 0) : 0,
        coreMaxHealth: coreStatus?.maxHealth ?? 1,
        totalHealth,
        maxTotalHealth,
        destroyedParts: statuses.filter(status => status.destroyed).length,
        partCount: statuses.length,
      };
    });
  });

  loadSetup(setupStyleId: ArenaSetupStyleId, playMode = this.state().playMode): void {
    const setup = this.findSetup(setupStyleId);
    const state = createArenaState(
      setup,
      this.findAssemblyAsset(setup.defaultRedPresetId),
      this.findAssemblyAsset(setup.defaultBluePresetId),
      setup.redControlMode,
      setup.blueControlMode,
      this.nextMatchId(),
      playMode,
    );

    this.setMatchState(state);
  }

  loadMatch(
    setupStyleId: ArenaSetupStyleId,
    redPresetId: string,
    bluePresetId: string,
    redControlMode: ArenaControlMode,
    blueControlMode: ArenaControlMode,
    playMode = this.state().playMode,
  ): void {
    const setup = this.findSetup(setupStyleId);

    const state = createArenaState(
      setup,
      this.findAssemblyAsset(redPresetId),
      this.findAssemblyAsset(bluePresetId),
      redControlMode,
      blueControlMode,
      this.nextMatchId(),
      playMode,
    );

    this.setMatchState(state);
  }

  start(): void {
    if (this.state().winnerId) {
      return;
    }

    this.stateSignal.update(state => ({ ...state, isRunning: true }));
  }

  pause(): void {
    this.stateSignal.update(state => ({ ...state, isRunning: false }));
  }

  resetCurrentMatch(): void {
    const [red, blue] = this.state().combatants;
    this.loadMatch(
      this.state().setupStyleId,
      red?.presetId ?? this.currentSetup().defaultRedPresetId,
      blue?.presetId ?? this.currentSetup().defaultBluePresetId,
      red?.controlMode ?? this.currentSetup().redControlMode,
      blue?.controlMode ?? this.currentSetup().blueControlMode,
      this.state().playMode,
    );
  }

  setPlayMode(playMode: BattlePlayMode): void {
    this.stateSignal.update(state => ({
      ...state,
      playMode,
      activeTeam: playMode === 'turn-based' ? 'red' : state.activeTeam,
      turnNumber: playMode === 'turn-based' ? 1 : state.turnNumber,
      events: [
        playMode === 'turn-based'
          ? 'Turn based battle mode enabled'
          : 'Real time battle mode enabled',
        ...state.events,
      ].slice(0, MAX_EVENTS),
    }));
  }

  endTurn(): void {
    this.stateSignal.update(state => {
      if (state.playMode !== 'turn-based' || state.winnerId) {
        return state;
      }

      const nextTeam = getNextTeam(state.activeTeam);
      const turnNumber = nextTeam === 'red'
        ? state.turnNumber + 1
        : state.turnNumber;

      return {
        ...state,
        activeTeam: nextTeam,
        turnNumber,
        events: [
          `Turn ${turnNumber}: ${formatTeamName(nextTeam)} active`,
          ...state.events,
        ].slice(0, MAX_EVENTS),
      };
    });
  }

  applyPhysicsFrame(frame: BattlePhysicsFrame, deltaSeconds: number): void {
    if (!this.state().isRunning) {
      return;
    }

    this.stateSignal.update(state => {
      const partStatuses = { ...state.partStatuses };
      const events = [...state.events];

      for (const damageEvent of frame.damageEvents) {
        const status = partStatuses[damageEvent.bodyKey];

        if (!status || status.destroyed) {
          continue;
        }

        const combatant = state.combatants.find(item => item.id === status.combatantId);
        const combatPart = combatant?.combatProfile.parts[status.sourcePartId];
        const effectiveDamage = damageEvent.amount
          * (combatPart?.damageMultiplier ?? 1)
          * (1 - Math.max(0, Math.min(combatPart?.armor ?? 0, 0.9)));
        const nextHealth = Math.max(0, status.health - effectiveDamage);
        const destroyed = nextHealth <= 0;
        partStatuses[damageEvent.bodyKey] = {
          ...status,
          health: nextHealth,
          destroyed,
        };

        if (effectiveDamage >= 1 || destroyed) {
          events.unshift(
            destroyed
              ? `${status.label} destroyed`
              : `${status.label} took ${effectiveDamage.toFixed(1)} damage`,
          );
        }
      }

      const raceWinnerId = getRaceWinnerId(state, frame);
      const isRaceSetup = state.setup.winCondition.type === 'finish-line';
      const isOpenPractice = state.setup.winCondition.type === 'practice-open';
      const winnerId = raceWinnerId ?? (
        isRaceSetup || isOpenPractice
          ? null
          : getWinnerId(state.combatants, partStatuses)
      );

      if (raceWinnerId && !state.winnerId) {
        const winner = state.combatants.find(combatant => combatant.id === raceWinnerId);
        events.unshift(`${winner?.name ?? 'A car'} crossed the finish line`);
      }

      return {
        ...state,
        partStatuses,
        events: events.slice(0, MAX_EVENTS),
        elapsedSeconds: state.elapsedSeconds + deltaSeconds,
        winnerId,
        isRunning: winnerId ? false : state.isRunning,
      };
    });
  }

  setStrategyProgram(combatantId: string, programId: StrategyProgramId): void {
    this.strategyProgramsSignal.update(programs => ({
      ...programs,
      [combatantId]: getStrategyPreset(programId),
    }));
  }

  addStrategyBlock(combatantId: string, type: StrategyBlockType): void {
    this.strategyProgramsSignal.update(programs => {
      const program = programs[combatantId];

      if (!program) {
        return programs;
      }

      return {
        ...programs,
        [combatantId]: markProgramCustom({
          ...program,
          blocks: [
            ...program.blocks,
            createStrategyBlock(type),
          ],
        }),
      };
    });
  }

  removeStrategyBlock(combatantId: string, blockId: string): void {
    this.strategyProgramsSignal.update(programs => {
      const program = programs[combatantId];

      if (!program) {
        return programs;
      }

      return {
        ...programs,
        [combatantId]: markProgramCustom({
          ...program,
          blocks: program.blocks.filter(block => block.id !== blockId),
        }),
      };
    });
  }

  moveStrategyBlock(combatantId: string, blockId: string, direction: -1 | 1): void {
    this.strategyProgramsSignal.update(programs => {
      const program = programs[combatantId];

      if (!program) {
        return programs;
      }

      const currentIndex = program.blocks.findIndex(block => block.id === blockId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= program.blocks.length) {
        return programs;
      }

      const blocks = [...program.blocks];
      const [block] = blocks.splice(currentIndex, 1);

      if (!block) {
        return programs;
      }

      blocks.splice(nextIndex, 0, block);

      return {
        ...programs,
        [combatantId]: markProgramCustom({ ...program, blocks }),
      };
    });
  }

  updateStrategyBlockParam(
    combatantId: string,
    blockId: string,
    key: string,
    value: StrategyBlockParamValue,
  ): void {
    this.strategyProgramsSignal.update(programs => {
      const program = programs[combatantId];

      if (!program) {
        return programs;
      }

      return {
        ...programs,
        [combatantId]: markProgramCustom({
          ...program,
          blocks: program.blocks.map(block => block.id === blockId
            ? {
                ...block,
                params: {
                  ...block.params,
                  [key]: value,
                },
              }
            : block),
        }),
      };
    });
  }

  loadStrategyProgramJson(combatantId: string, json: string): void {
    const program = parseStrategyProgram(json);
    this.strategyProgramsSignal.update(programs => ({
      ...programs,
      [combatantId]: program,
    }));
  }

  exportStrategyProgramJson(combatantId: string): string {
    const program = this.strategyPrograms()[combatantId];
    return JSON.stringify(program ?? getStrategyPreset('manual-keyboard'), null, 2);
  }

  setStrategyBlockChild(
    combatantId: string,
    blockId: string,
    childType: StrategyBlockType,
  ): void {
    this.strategyProgramsSignal.update(programs => {
      const program = programs[combatantId];

      if (!program) {
        return programs;
      }

      return {
        ...programs,
        [combatantId]: markProgramCustom({
          ...program,
          blocks: program.blocks.map(block => block.id === blockId
            ? {
                ...block,
                children: [createStrategyBlock(childType)],
              }
            : block),
        }),
      };
    });
  }

  private nextMatchId(): number {
    this.matchId += 1;
    return this.matchId;
  }

  private findSetup(setupStyleId: ArenaSetupStyleId): ArenaSetupConfig {
    return this.availableSetups().find(setup => setup.id === setupStyleId)
      ?? this.availableSetups()[0]
      ?? fallbackArenaSetup();
  }

  private findAssemblyAsset(assetId: string): CreationAssemblyAsset {
    return this.availablePresets().find(asset => asset.id === assetId)
      ?? this.availablePresets()[0]
      ?? emptyAssemblyAsset();
  }

  private setMatchState(state: BattleArenaState): void {
    this.stateSignal.set(state);
    this.strategyProgramsSignal.set(createProgramsForState(state));
    this.matchRevisionSignal.update(revision => revision + 1);
  }
}

function createInitialArenaState(
  matchId: number,
  setup: ArenaSetupConfig | undefined,
  assets: CreationAssemblyAsset[],
): BattleArenaState {
  const resolvedSetup = setup ?? fallbackArenaSetup();
  return createArenaState(
    resolvedSetup,
    findAssemblyAsset(assets, resolvedSetup.defaultRedPresetId),
    findAssemblyAsset(assets, resolvedSetup.defaultBluePresetId),
    resolvedSetup.redControlMode,
    resolvedSetup.blueControlMode,
    matchId,
    'real-time',
  );
}

function createArenaState(
  setup: ArenaSetupConfig,
  redPreset: CreationAssemblyAsset,
  bluePreset: CreationAssemblyAsset,
  redControlMode: ArenaControlMode,
  blueControlMode: ArenaControlMode,
  matchId: number,
  playMode: BattlePlayMode,
): BattleArenaState {
  const combatants: BattleCombatant[] = [
    createCombatant(
      'red-1',
      redPreset,
      'red',
      setup.redSpawn,
      getControllerForControlMode(redControlMode, true),
      redControlMode,
      setup.redInitialRotation,
    ),
    createCombatant(
      'blue-1',
      bluePreset,
      'blue',
      setup.blueSpawn,
      getControllerForControlMode(blueControlMode, false),
      blueControlMode,
      setup.blueInitialRotation,
    ),
  ];

  return {
    combatants,
    partStatuses: createPartStatuses(combatants),
    isRunning: false,
    winnerId: null,
    elapsedSeconds: 0,
    playMode,
    activeTeam: 'red',
    turnNumber: 1,
    events: [`${setup.name} loaded`],
    matchId,
    setupStyleId: setup.id,
    setup,
    setupName: setup.name,
    setupDescription: setup.description,
  };
}

function getNextTeam(team: BattleTeam): BattleTeam {
  return team === 'red' ? 'blue' : 'red';
}

function formatTeamName(team: BattleTeam): string {
  return team === 'red' ? 'Red' : 'Blue';
}

function getControllerForControlMode(controlMode: ArenaControlMode, isPlayerSlot: boolean): BattleCombatant['controller'] {
  if (controlMode === 'static-target') {
    return 'static';
  }

  if (controlMode === 'ai-hunter') {
    return 'ai';
  }

  return isPlayerSlot ? 'player' : 'ai';
}

function createProgramsForState(state: BattleArenaState): Record<string, ControllerProgram> {
  const programs: Record<string, ControllerProgram> = {};

  for (const combatant of state.combatants) {
    programs[combatant.id] = getStrategyPreset(getDefaultProgramId(combatant));
  }

  return programs;
}

function getDefaultProgramId(combatant: BattleCombatant): StrategyProgramId {
  if (combatant.controlMode === 'static-target') {
    return 'static-target';
  }

  if (combatant.controlMode === 'dragon-attack') {
    return combatant.team === 'red' ? 'manual-keyboard' : 'dragon-attack-combo';
  }

  if (combatant.team === 'red') {
    return combatant.controlMode === 'righting-assist'
      ? 'robot-right-self'
      : 'manual-keyboard';
  }

  if (combatant.controlMode === 'vehicle-drive') {
    return 'car-ram-opponent';
  }

  if (combatant.controlMode === 'righting-assist') {
    return 'robot-shove-and-recover';
  }

  return 'car-ram-opponent';
}

function markProgramCustom(program: ControllerProgram): ControllerProgram {
  return {
    ...program,
    id: 'custom-program',
    name: program.name.endsWith(' Custom') ? program.name : `${program.name} Custom`,
  };
}

function parseStrategyProgram(json: string): ControllerProgram {
  const parsed = JSON.parse(json) as unknown;

  if (!isRecord(parsed)) {
    throw new Error('Strategy JSON must be an object.');
  }

  const rawBlocks = parsed['blocks'];

  if (!Array.isArray(rawBlocks)) {
    throw new Error('Strategy JSON must include a blocks array.');
  }

  const blocks = rawBlocks
    .map(toStrategyBlock)
    .filter((block): block is StrategyBlock => block !== null);

  return {
    id: typeof parsed['id'] === 'string' ? parsed['id'] : 'custom-program',
    name: typeof parsed['name'] === 'string' ? parsed['name'] : 'Imported Program',
    description: typeof parsed['description'] === 'string'
      ? parsed['description']
      : 'Imported block program.',
    blocks,
  };
}

function toStrategyBlock(value: unknown): StrategyBlock | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value['type'];

  if (!isStrategyBlockType(type)) {
    return null;
  }

  const rawParams = value['params'];
  const params: Record<string, StrategyBlockParamValue> = {};
  const rawChildren = value['children'];

  if (isRecord(rawParams)) {
    for (const [key, paramValue] of Object.entries(rawParams)) {
      if (
        typeof paramValue === 'number' ||
        typeof paramValue === 'string' ||
        typeof paramValue === 'boolean'
      ) {
        params[key] = paramValue;
      }
    }
  }

  return {
    id: typeof value['id'] === 'string' ? value['id'] : createStrategyBlock(type).id,
    type,
    params: {
      ...createStrategyBlock(type).params,
      ...params,
    },
    ...(Array.isArray(rawChildren)
      ? {
          children: rawChildren
            .map(toStrategyBlock)
            .filter((block): block is StrategyBlock => block !== null),
        }
      : {}),
  };
}

function isStrategyBlockType(value: unknown): value is StrategyBlockType {
  return value === 'manual-input' || STRATEGY_BLOCK_OPTIONS.some(option => option.type === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getWinnerId(
  combatants: BattleCombatant[],
  partStatuses: BattleArenaState['partStatuses'],
): string | null {
  const alive = combatants.filter(combatant => {
    const core = partStatuses[getBodyKey(combatant.id, combatant.corePartId)];
    return core && !core.destroyed && core.health > 0;
  });

  return alive.length === 1 ? alive[0].id : null;
}

function getRaceWinnerId(state: BattleArenaState, frame: BattlePhysicsFrame): string | null {
  const finishX = state.setup.raceFinishX;

  if (finishX === undefined || state.winnerId) {
    return null;
  }

  const coreSnapshots = state.combatants
    .map(combatant => {
      const bodyKey = getBodyKey(combatant.id, combatant.corePartId);
      const snapshot = frame.snapshots.find(item => item.bodyKey === bodyKey);
      return snapshot ? { combatantId: combatant.id, x: snapshot.position.x } : null;
    })
    .filter((item): item is { combatantId: string; x: number } => item !== null)
    .filter(item => item.x >= finishX)
    .sort((a, b) => b.x - a.x);

  return coreSnapshots[0]?.combatantId ?? null;
}

function findAssemblyAsset(assets: CreationAssemblyAsset[], assetId: string): CreationAssemblyAsset {
  return assets.find(asset => asset.id === assetId) ?? assets[0] ?? emptyAssemblyAsset();
}

function fallbackArenaSetup(): ArenaSetupConfig {
  return {
    id: 'fallback-arena',
    name: 'Fallback Arena',
    description: 'A minimal arena used when no scenario assets are available.',
    floorSize: { x: 12, y: 0.3, z: 8 },
    wallHeight: 1.5,
    defaultRedPresetId: '',
    defaultBluePresetId: '',
    redSpawn: { x: -2, y: 0.5, z: 0 },
    blueSpawn: { x: 2, y: 0.5, z: 0 },
    redInitialRotation: { x: 0, y: 0, z: 0 },
    blueInitialRotation: { x: 0, y: Math.PI, z: 0 },
    redControlMode: 'shove-drive',
    blueControlMode: 'static-target',
    winCondition: { type: 'core-survival' },
    obstacles: [],
  };
}

function emptyAssemblyAsset(): CreationAssemblyAsset {
  const now = new Date(0).toISOString();
  return {
    id: 'empty-assembly',
    kind: 'assembly',
    name: 'Empty Assembly',
    description: 'Fallback empty assembly.',
    tags: [],
    scope: 'built-in',
    schemaVersion: 1,
    assetVersion: 1,
    createdAtIso: now,
    updatedAtIso: now,
    authoringTool: 'import',
    assembly: { parts: [], joints: [] },
    combatProfile: { corePartId: '', parts: {}, abilityIds: [] },
  };
}
