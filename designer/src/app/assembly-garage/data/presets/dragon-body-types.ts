import {
  AssemblyBlueprint,
  AssemblyPreset,
  Vector3Data,
} from '@pbl/assembly/domain/assembly.models';
import { preset } from '@pbl/assembly/assets/assembly-preset-builder';
import { AssemblyPartDefinition } from '../assembly-part-definitions';
import {
  buildCatalogPresetAssembly,
  CatalogPresetPart,
} from './classic-dragon-test';

interface DragonWingEntry {
  definitionId: string;
  label: string;
}

interface DragonBodyPresetConfig {
  id: string;
  prefix: string;
  name: string;
  description: string;
  bodyDefinitionId: string;
  upperLegDefinitionIds: readonly [string, string, string, string];
  lowerLegDefinitionIds: readonly [string, string];
  footDefinitionId: string;
  wings: readonly DragonWingEntry[];
  tailLinks: number;
  basePosition: Vector3Data;
}

const STANDARD_UPPER_LEGS = [
  'dragon-front-left-leg',
  'dragon-front-right-leg',
  'dragon-rear-left-leg',
  'dragon-rear-right-leg',
] as const;

const STANDARD_LOWER_LEGS = [
  'dragon-front-lower-leg',
  'dragon-rear-lower-leg',
] as const;

const STANDARD_WINGS: readonly DragonWingEntry[] = [
  { definitionId: 'dragon-left-wing', label: 'Left Wing' },
  { definitionId: 'dragon-right-wing', label: 'Right Wing' },
];

const BODY_PRESET_CONFIGS: readonly DragonBodyPresetConfig[] = [
  {
    id: 'regal-dragon',
    prefix: 'regal-dragon',
    name: 'Regal Dragon',
    description: 'A balanced royal dragon with a proud shoulder line, standard walking limbs, and classic wings.',
    bodyDefinitionId: 'dragon-regal-body',
    upperLegDefinitionIds: STANDARD_UPPER_LEGS,
    lowerLegDefinitionIds: STANDARD_LOWER_LEGS,
    footDefinitionId: 'dragon-clawed-foot',
    wings: STANDARD_WINGS,
    tailLinks: 2,
    basePosition: { x: 0, y: 1.4, z: 0 },
  },
  {
    id: 'bulwark-dragon',
    prefix: 'bulwark-dragon',
    name: 'Bulwark Dragon',
    description: 'A short, deep, broad dragon assembled with heavy legs, load-bearing feet, and broad-lift wings.',
    bodyDefinitionId: 'dragon-bulwark-body',
    upperLegDefinitionIds: [
      'dragon-bulwark-front-left-leg',
      'dragon-bulwark-front-right-leg',
      'dragon-bulwark-rear-left-leg',
      'dragon-bulwark-rear-right-leg',
    ],
    lowerLegDefinitionIds: [
      'dragon-bulwark-front-lower-leg',
      'dragon-bulwark-rear-lower-leg',
    ],
    footDefinitionId: 'dragon-bulwark-clawed-foot',
    wings: [
      { definitionId: 'dragon-bulwark-left-wing', label: 'Left Broad Wing' },
      { definitionId: 'dragon-bulwark-right-wing', label: 'Right Broad Wing' },
    ],
    tailLinks: 2,
    basePosition: { x: 0, y: 1.45, z: 0 },
  },
  {
    id: 'sky-courser-dragon',
    prefix: 'sky-courser-dragon',
    name: 'Sky Courser Dragon',
    description: 'A narrow high-chested flyer assembled with long running legs and high-aspect tapered wings.',
    bodyDefinitionId: 'dragon-courser-body',
    upperLegDefinitionIds: [
      'dragon-courser-front-left-leg',
      'dragon-courser-front-right-leg',
      'dragon-courser-rear-left-leg',
      'dragon-courser-rear-right-leg',
    ],
    lowerLegDefinitionIds: [
      'dragon-courser-front-lower-leg',
      'dragon-courser-rear-lower-leg',
    ],
    footDefinitionId: 'dragon-courser-clawed-foot',
    wings: [
      { definitionId: 'dragon-courser-left-wing', label: 'Left Tapered Wing' },
      { definitionId: 'dragon-courser-right-wing', label: 'Right Tapered Wing' },
    ],
    tailLinks: 3,
    basePosition: { x: 0, y: 1.75, z: 0 },
  },
  {
    id: 'marsh-prowler-dragon',
    prefix: 'marsh-prowler-dragon',
    name: 'Marsh Prowler Dragon',
    description: 'A long low dragon assembled with crouched splayed limbs, broad feet, and compact rugged wings.',
    bodyDefinitionId: 'dragon-prowler-body',
    upperLegDefinitionIds: [
      'dragon-prowler-front-left-leg',
      'dragon-prowler-front-right-leg',
      'dragon-prowler-rear-left-leg',
      'dragon-prowler-rear-right-leg',
    ],
    lowerLegDefinitionIds: [
      'dragon-prowler-front-lower-leg',
      'dragon-prowler-rear-lower-leg',
    ],
    footDefinitionId: 'dragon-prowler-clawed-foot',
    wings: [
      { definitionId: 'dragon-prowler-left-wing', label: 'Left Compact Wing' },
      { definitionId: 'dragon-prowler-right-wing', label: 'Right Compact Wing' },
    ],
    tailLinks: 3,
    basePosition: { x: 0, y: 1.15, z: 0 },
  },
  {
    id: 'double-wing-dragon',
    prefix: 'double-wing-dragon',
    name: 'Double-Wing Dragon',
    description: 'A complete four-wing dragon using both the primary and secondary wing pairs, each independently joined and clawed.',
    bodyDefinitionId: 'dragon-four-wing-body',
    upperLegDefinitionIds: STANDARD_UPPER_LEGS,
    lowerLegDefinitionIds: STANDARD_LOWER_LEGS,
    footDefinitionId: 'dragon-clawed-foot',
    wings: [
      ...STANDARD_WINGS,
      { definitionId: 'dragon-left-secondary-wing', label: 'Left Second Wing' },
      { definitionId: 'dragon-right-secondary-wing', label: 'Right Second Wing' },
    ],
    tailLinks: 2,
    basePosition: { x: 0, y: 1.4, z: 0 },
  },
  {
    id: 'long-serpent-dragon',
    prefix: 'long-serpent-dragon',
    name: 'Long Serpent Dragon',
    description: 'A wingless snake-like dragon with a curved narrow torso, compact splayed limbs, and an extended seven-link tail.',
    bodyDefinitionId: 'dragon-serpent-body',
    upperLegDefinitionIds: [
      'dragon-prowler-front-left-leg',
      'dragon-prowler-front-right-leg',
      'dragon-prowler-rear-left-leg',
      'dragon-prowler-rear-right-leg',
    ],
    lowerLegDefinitionIds: [
      'dragon-prowler-front-lower-leg',
      'dragon-prowler-rear-lower-leg',
    ],
    footDefinitionId: 'dragon-prowler-clawed-foot',
    wings: [],
    tailLinks: 7,
    basePosition: { x: 0, y: 1.15, z: 0 },
  },
];

export const DRAGON_BODY_TYPE_PRESETS: readonly AssemblyPreset[] =
  createDragonBodyTypePresets();

export function createDragonBodyTypePresets(
  resolveDefinition: (
    definition: AssemblyPartDefinition,
  ) => AssemblyPartDefinition = value => value,
): AssemblyPreset[] {
  return BODY_PRESET_CONFIGS.map(config => preset(
    config.id,
    config.name,
    config.description,
    reinforceDragonJoints(
      buildCatalogPresetAssembly(
        dragonBodyPresetParts(config),
        config.basePosition,
        resolveDefinition,
      ),
    ),
  ));
}

/**
 * Catalog joints carry combat break thresholds. A large new authoring preset
 * can exceed those tiny accumulated-load values merely by settling onto the
 * Garage floor, long before it has been hit. Keep the behavior and articulation
 * but give the assembled specimen a structural threshold that survives normal
 * gravity and motor startup.
 */
function reinforceDragonJoints(blueprint: AssemblyBlueprint): AssemblyBlueprint {
  return {
    ...blueprint,
    joints: blueprint.joints.map(joint => ({
      ...joint,
      behavior: joint.behavior
        ? {
            ...joint.behavior,
            breakForce: Math.max(joint.behavior.breakForce ?? 0, 1_000_000),
            breakDamage: Math.max(joint.behavior.breakDamage ?? 0, 1_000_000),
          }
        : undefined,
    })),
  };
}

function dragonBodyPresetParts(config: DragonBodyPresetConfig): CatalogPresetPart[] {
  const prefix = config.prefix;
  const entries: CatalogPresetPart[] = [
    {
      definitionId: config.bodyDefinitionId,
      partId: `${prefix}-body`,
      label: `${config.name} Body`,
    },
    { definitionId: 'dragon-horned-head', partId: `${prefix}-horned-head`, label: 'Horned Head' },
    { definitionId: 'dragon-upper-jaw', partId: `${prefix}-upper-jaw`, label: 'Upper Jaw' },
    { definitionId: 'dragon-lower-jaw', partId: `${prefix}-lower-jaw`, label: 'Lower Jaw' },
  ];

  const upperNames = ['front-left', 'front-right', 'rear-left', 'rear-right'] as const;
  for (const [index, name] of upperNames.entries()) {
    entries.push({
      definitionId: config.upperLegDefinitionIds[index],
      partId: `${prefix}-${name}-leg`,
      label: `${title(name)} Upper Leg`,
    });
  }

  const lowerDefinitions = {
    front: config.lowerLegDefinitionIds[0],
    rear: config.lowerLegDefinitionIds[1],
  };
  for (const name of upperNames) {
    const pair = name.startsWith('front') ? 'front' : 'rear';
    entries.push({
      definitionId: lowerDefinitions[pair],
      partId: `${prefix}-${name}-lower-leg`,
      label: `${title(name)} Lower Leg`,
    });
  }

  for (const name of upperNames) {
    entries.push({
      definitionId: config.footDefinitionId,
      partId: `${prefix}-${name}-foot`,
      label: `${title(name)} Foot`,
    });
  }

  for (const [index, wing] of config.wings.entries()) {
    const slug = wing.definitionId.includes('secondary')
      ? wing.definitionId.includes('left') ? 'left-second-wing' : 'right-second-wing'
      : wing.definitionId.includes('left') ? 'left-wing' : 'right-wing';
    entries.push({
      definitionId: wing.definitionId,
      partId: `${prefix}-${slug}`,
      label: wing.label,
    });

    entries.push({
      definitionId: 'dragon-wing-hand-claw',
      partId: `${prefix}-wing-claw-${index + 1}`,
      label: `${wing.label} Claw`,
    });
  }

  entries.push({
    definitionId: 'dragon-tail-chain-root',
    partId: `${prefix}-tail-chain-root`,
    label: 'Tail Chain Root',
  });
  for (let index = 0; index < config.tailLinks; index += 1) {
    entries.push({
      definitionId: 'dragon-tail-chain-link',
      partId: `${prefix}-tail-link-${index + 1}`,
      label: `Tail Chain Link ${index + 1}`,
    });
  }
  entries.push({
    definitionId: 'dragon-tail-stinger',
    partId: `${prefix}-tail-stinger`,
    label: 'Tail Stinger',
  });

  return entries;
}

function title(value: string): string {
  return value.split('-').map(word => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ');
}
