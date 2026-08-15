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
      // Retuned with the distance sensor, which now reports the gap between the
      // two creations rather than the space between their centres.
      createStrategyBlock('if-distance-less', { threshold: 1.6 }, [
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
      createStrategyBlock('if-distance-less', { threshold: 2 }, [
        createStrategyBlock('chase', { amount: 1 }),
        createStrategyBlock('boost'),
      ]),
      createStrategyBlock('avoid-wall', { amount: 0.9 }),
    ],
  },
  {
    id: 'dragon-attack-combo',
    name: 'Dragon: Attack Combo',
    description: 'Close the distance, poke with claws, commit to a bite in range, and answer incoming attacks.',
    /*
     * Blocks run in order and later ones overwrite earlier ones, so this reads
     * top to bottom as "here is my default plan, and here is what overrides it".
     * Defence sits last among the reactions because answering the blow that is
     * actually coming has to beat whatever attack the plan had lined up.
     *
     * Nothing in here holds boost. Boost is a wing beat: the old program held it
     * whenever it was near the player, took off, and came down on top of them —
     * the pin this rework exists to fix.
     */
    /*
     * Thresholds are gaps between the two animals, and they are deliberately
     * set just inside each move's own reach (the `+x` figures in
     * SCRIPTED_ASSEMBLY_ATTACKS, which are measured the same way): fire at
     * 2.14, charge at 1.64, buffet at 1.19, sweep at 1.09, bite at 0.79, rake
     * at 0.62.
     */
    blocks: [
      createStrategyBlock('aim-at-opponent', { amount: 0.9 }),
      // Keep walking in until it is close enough to bite. Gating the approach
      // on being *far* looks tidier and is wrong: the dragon parks at the edge
      // of the condition and never reaches the range its attacks need.
      createStrategyBlock('if-distance-more', { threshold: 0.5 }, [
        createStrategyBlock('chase', { amount: 0.85 }),
      ]),
      // Longest reach first, so the closer options below can override it.
      createStrategyBlock('if-distance-less', { threshold: 2 }, [
        createStrategyBlock('dragon-attack', { attack: 'fire-breath', amount: 1 }),
      ]),
      // The charge is the one move that closes its own distance, which is why
      // standing just outside bite range is not safe against a horned dragon.
      createStrategyBlock('if-distance-less', { threshold: 1.55 }, [
        createStrategyBlock('dragon-attack', { attack: 'horn-charge', amount: 1 }),
      ]),
      // Point blank: the sweep and the buffet hit around the body rather than
      // in front of it.
      createStrategyBlock('if-distance-less', { threshold: 1.05 }, [
        createStrategyBlock('repeat-sequence', {
          firstAction: 'tail-sweep',
          firstDuration: 0.7,
          secondAction: 'wing-buffet',
          secondDuration: 0.6,
        }),
      ]),
      createStrategyBlock('if-distance-less', { threshold: 0.75 }, [
        createStrategyBlock('repeat-sequence', {
          firstAction: 'claw-rake',
          firstDuration: 0.5,
          secondAction: 'bite',
          secondDuration: 0.9,
        }),
      ]),
      createStrategyBlock('avoid-wall', { amount: 0.9 }),
      createStrategyBlock('if-stuck', { seconds: 0.9, speedThreshold: 0.14 }, [
        createStrategyBlock('back-up', { amount: 0.85 }),
      ]),
      // Something heavy is on its way. Roll out of it if the wings allow, brace
      // into it if the horns do; a dragon with neither has to eat it, which is
      // the genotype showing up in the fight.
      createStrategyBlock('if-opponent-attacking', { committedOnly: true }, [
        createStrategyBlock('dragon-defend', { defense: 'dodge', amount: 1 }),
        createStrategyBlock('dragon-defend', { defense: 'guard', amount: 1 }),
      ]),
      // Hurt: brace more, chase less, and take the openings instead of making
      // them.
      createStrategyBlock('if-health-below', { ratio: 0.35 }, [
        createStrategyBlock('dragon-defend', { defense: 'guard', amount: 1 }),
      ]),
    ],
  },
  {
    id: 'dragon-defensive-counter',
    name: 'Dragon: Defensive Counter',
    description: 'Hold the middle distance, block or roll what comes in, and punish the recovery.',
    blocks: [
      createStrategyBlock('aim-at-opponent', { amount: 1 }),
      // Holds the edge of claw range: close enough to counter, far enough that
      // most of what comes back misses.
      createStrategyBlock('if-distance-more', { threshold: 0.55 }, [
        createStrategyBlock('chase', { amount: 0.6 }),
      ]),
      // Too close to work with: give the ground back rather than be mauled.
      createStrategyBlock('if-distance-less', { threshold: 0.3 }, [
        createStrategyBlock('back-up', { amount: 0.7 }),
      ]),
      // The counter itself: whatever it just threw, it is still recovering from
      // it, and a claw rake is fast enough to land inside that window.
      createStrategyBlock('if-distance-less', { threshold: 0.6 }, [
        createStrategyBlock('dragon-attack', { attack: 'claw-rake', amount: 1 }),
      ]),
      createStrategyBlock('if-opponent-attacking', { committedOnly: false }, [
        createStrategyBlock('dragon-defend', { defense: 'guard', amount: 1 }),
      ]),
      createStrategyBlock('avoid-wall', { amount: 1 }),
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
      createStrategyBlock('if-distance-less', { threshold: 1.4 }, [
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
  { type: 'dragon-defend', name: 'Dragon Defend', group: 'Defence' },
  { type: 'aim-at-opponent', name: 'Aim At Opponent', group: 'Movement' },
  { type: 'turn-toward-opponent', name: 'Turn Toward Opponent', group: 'Movement' },
  { type: 'avoid-wall', name: 'Avoid Wall', group: 'Sensor' },
  { type: 'recover-if-tipped', name: 'Recover If Tipped', group: 'Sensor' },
  { type: 'if-distance-less', name: 'If Distance Less', group: 'Sensor' },
  { type: 'if-distance-more', name: 'If Distance More', group: 'Sensor' },
  { type: 'if-tipped', name: 'If Tipped', group: 'Sensor' },
  { type: 'if-stuck', name: 'If Stuck', group: 'Sensor' },
  { type: 'if-upside-down-for', name: 'If Upside Down For', group: 'Sensor' },
  { type: 'if-opponent-attacking', name: 'If Opponent Attacking', group: 'Sensor' },
  { type: 'if-health-below', name: 'If Health Below', group: 'Sensor' },
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
  { type: 'dragon-defend', name: 'Dragon Defend' },
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
    case 'dragon-defend':
      return { defense: 'guard', amount: 1 };
    case 'aim-at-opponent':
      return { amount: 0.85 };
    case 'turn-toward-opponent':
      return { amount: 0.85 };
    case 'avoid-wall':
      return { amount: 1 };
    case 'recover-if-tipped':
      return { amount: 1 };
    // Gaps between creations, not distances between their centres.
    case 'if-distance-less':
      return { threshold: 1.2 };
    case 'if-distance-more':
      return { threshold: 2 };
    case 'if-opponent-attacking':
      return { committedOnly: true };
    case 'if-health-below':
      return { ratio: 0.4 };
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
    case 'if-distance-more':
      return [createStrategyBlock('boost')];
    case 'if-opponent-attacking':
      return [createStrategyBlock('dragon-defend')];
    case 'if-health-below':
      return [createStrategyBlock('back-up')];
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
