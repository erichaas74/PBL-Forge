import {
  ControllerProgram,
  StrategyBlock,
  StrategyBlockType,
  StrategyProgramId,
} from './strategy.models';

export const STRATEGY_PRESETS = [
  {
    id: 'manual-keyboard',
    name: 'Manual Keyboard',
    description: 'Passes W/S, A/D, Q/E, and Shift through to the selected combatant.',
    blocks: [
      createStrategyBlock('manual-input'),
    ],
  },
  {
    id: 'car-ram-opponent',
    name: 'Car: Ram Opponent',
    description: 'Drive toward the opponent and boost when close.',
    blocks: [
      createStrategyBlock('aim-at-opponent', { amount: 0.8 }),
      createStrategyBlock('chase', { amount: 1 }),
      createStrategyBlock('if-distance-less', { threshold: 2.8 }, [
        createStrategyBlock('boost'),
      ]),
      createStrategyBlock('if-stuck', { seconds: 1.1, speedThreshold: 0.18 }, [
        createStrategyBlock('back-up', { amount: 0.75 }),
      ]),
    ],
  },
  {
    id: 'car-circle-and-ram',
    name: 'Car: Circle And Ram',
    description: 'Arc around the target, then surge in when the range closes.',
    blocks: [
      createStrategyBlock('aim-at-opponent', { amount: 1 }),
      createStrategyBlock('chase', { amount: 0.78 }),
      createStrategyBlock('strafe', { amount: 0.5 }),
      createStrategyBlock('if-distance-less', { threshold: 3.2 }, [
        createStrategyBlock('chase', { amount: 1 }),
        createStrategyBlock('boost'),
      ]),
      createStrategyBlock('avoid-wall', { amount: 0.9 }),
    ],
  },
  {
    id: 'dragon-attack-combo',
    name: 'Dragon: Attack Combo',
    description: 'Chase the opponent, bite at close range, then alternate wing and tail attacks.',
    blocks: [
      createStrategyBlock('aim-at-opponent', { amount: 0.85 }),
      createStrategyBlock('chase', { amount: 0.72 }),
      createStrategyBlock('if-distance-less', { threshold: 3.1 }, [
        createStrategyBlock('dragon-attack', { attack: 'bite', amount: 1 }),
      ]),
      createStrategyBlock('if-distance-less', { threshold: 2.4 }, [
        createStrategyBlock('repeat-sequence', {
          firstAction: 'wing-buffet',
          firstDuration: 0.55,
          secondAction: 'tail-sweep',
          secondDuration: 0.75,
        }),
      ]),
      createStrategyBlock('avoid-wall', { amount: 0.9 }),
      createStrategyBlock('if-stuck', { seconds: 0.9, speedThreshold: 0.14 }, [
        createStrategyBlock('back-up', { amount: 0.85 }),
      ]),
    ],
  },
  {
    id: 'robot-right-self',
    name: 'Robot: Right Self',
    description: 'Stay mostly still, then use the righting assist when tipped.',
    blocks: [
      createStrategyBlock('stop'),
      createStrategyBlock('if-upside-down-for', { seconds: 0.35 }, [
        createStrategyBlock('recover-if-tipped', { amount: 1 }),
      ]),
    ],
  },
  {
    id: 'robot-shove-and-recover',
    name: 'Robot: Shove And Recover',
    description: 'Recover from tipping, shove toward the opponent, and boost near contact.',
    blocks: [
      createStrategyBlock('if-tipped', {}, [
        createStrategyBlock('recover-if-tipped', { amount: 1 }),
      ]),
      createStrategyBlock('aim-at-opponent', { amount: 0.75 }),
      createStrategyBlock('chase', { amount: 0.72 }),
      createStrategyBlock('if-distance-less', { threshold: 2.4 }, [
        createStrategyBlock('boost'),
      ]),
      createStrategyBlock('if-stuck', { seconds: 0.9, speedThreshold: 0.16 }, [
        createStrategyBlock('back-up', { amount: 0.8 }),
      ]),
    ],
  },
  {
    id: 'static-target',
    name: 'Static Target',
    description: 'Produces no active movement commands.',
    blocks: [
      createStrategyBlock('stop'),
    ],
  },
] as const satisfies readonly ControllerProgram[];

export const STRATEGY_BLOCK_OPTIONS = [
  { type: 'drive', name: 'Drive', group: 'Movement' },
  { type: 'turn', name: 'Turn', group: 'Movement' },
  { type: 'strafe', name: 'Strafe', group: 'Movement' },
  { type: 'boost', name: 'Boost', group: 'Movement' },
  { type: 'back-up', name: 'Back Up', group: 'Movement' },
  { type: 'chase', name: 'Chase Opponent', group: 'Movement' },
  { type: 'dragon-attack', name: 'Dragon Attack', group: 'Attack' },
  { type: 'aim-at-opponent', name: 'Aim At Opponent', group: 'Movement' },
  { type: 'turn-toward-opponent', name: 'Turn Toward Opponent', group: 'Movement' },
  { type: 'avoid-wall', name: 'Avoid Wall', group: 'Sensor' },
  { type: 'recover-if-tipped', name: 'Recover If Tipped', group: 'Sensor' },
  { type: 'if-distance-less', name: 'If Distance Less', group: 'Sensor' },
  { type: 'if-tipped', name: 'If Tipped', group: 'Sensor' },
  { type: 'if-stuck', name: 'If Stuck', group: 'Sensor' },
  { type: 'if-upside-down-for', name: 'If Upside Down For', group: 'Sensor' },
  { type: 'repeat-sequence', name: 'Repeat Sequence', group: 'Logic' },
  { type: 'stop', name: 'Stop', group: 'Utility' },
] as const satisfies readonly {
  type: StrategyBlockType;
  name: string;
  group: string;
}[];

export const STRATEGY_CHILD_BLOCK_OPTIONS = [
  { type: 'boost', name: 'Boost' },
  { type: 'back-up', name: 'Back Up' },
  { type: 'chase', name: 'Chase Opponent' },
  { type: 'dragon-attack', name: 'Dragon Attack' },
  { type: 'aim-at-opponent', name: 'Aim At Opponent' },
  { type: 'avoid-wall', name: 'Avoid Wall' },
  { type: 'recover-if-tipped', name: 'Recover' },
  { type: 'stop', name: 'Stop' },
] as const satisfies readonly {
  type: StrategyBlockType;
  name: string;
}[];

export function getStrategyPreset(programId: StrategyProgramId): ControllerProgram {
  return cloneProgram(
    STRATEGY_PRESETS.find(program => program.id === programId) ?? STRATEGY_PRESETS[0],
  );
}

export function cloneProgram(program: ControllerProgram): ControllerProgram {
  return {
    ...program,
    blocks: program.blocks.map(cloneBlock),
  };
}

export function createStrategyBlock(
  type: StrategyBlockType,
  overrides: Record<string, number | string | boolean> = {},
  children?: StrategyBlock[],
): StrategyBlock {
  const nestedBlocks = children ?? getDefaultChildren(type);

  return {
    id: createBlockId(type),
    type,
    params: {
      ...getDefaultParams(type),
      ...overrides,
    },
    ...(nestedBlocks.length > 0 ? { children: nestedBlocks } : {}),
  };
}

export function createBlockId(type: StrategyBlockType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDefaultParams(type: StrategyBlockType): Record<string, number | string | boolean> {
  switch (type) {
    case 'manual-input':
      return {};
    case 'drive':
      return { amount: 1 };
    case 'turn':
      return { amount: 0.6 };
    case 'strafe':
      return { amount: 0.45 };
    case 'boost':
      return { enabled: true };
    case 'stop':
      return {};
    case 'back-up':
      return { amount: 0.7 };
    case 'chase':
      return { amount: 0.85 };
    case 'dragon-attack':
      return { attack: 'bite', amount: 1 };
    case 'aim-at-opponent':
      return { amount: 0.85 };
    case 'turn-toward-opponent':
      return { amount: 0.85 };
    case 'avoid-wall':
      return { amount: 1 };
    case 'recover-if-tipped':
      return { amount: 1 };
    case 'if-distance-less':
      return { threshold: 2.8 };
    case 'if-tipped':
      return {};
    case 'if-stuck':
      return { seconds: 1, speedThreshold: 0.18 };
    case 'if-upside-down-for':
      return { seconds: 0.45 };
    case 'repeat-sequence':
      return {
        firstAction: 'chase',
        firstDuration: 1.4,
        secondAction: 'back-up',
        secondDuration: 0.55,
      };
  }
}

function getDefaultChildren(type: StrategyBlockType): StrategyBlock[] {
  switch (type) {
    case 'if-distance-less':
      return [createStrategyBlock('boost')];
    case 'if-tipped':
    case 'if-upside-down-for':
      return [createStrategyBlock('recover-if-tipped')];
    case 'if-stuck':
      return [createStrategyBlock('back-up')];
    default:
      return [];
  }
}

function cloneBlock(block: StrategyBlock): StrategyBlock {
  return {
    ...block,
    id: createBlockId(block.type),
    params: { ...block.params },
    ...(block.children ? { children: block.children.map(cloneBlock) } : {}),
  };
}
