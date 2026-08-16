import { DragonProceduralProfileId } from './dragon-model-pack.models';

export type DragonVisualParameterType = 'number' | 'string' | 'boolean';
export type DragonVisualParameterContract = Readonly<Record<string, DragonVisualParameterType>>;

const skin = {
  scalePattern: 'number',
  patternColor: 'string',
} as const;

const glow = { glowMarkings: 'boolean' } as const;
const joint = { jointBall: 'number' } as const;

/**
 * Canonical renderer contract for parameters carried by a published dragon.
 * Writers and readers share this table, so a misspelling is rejected at the
 * model-pack boundary instead of being silently replaced by a visual default.
 */
export const DRAGON_VISUAL_PARAMETER_CONTRACT = {
  'dragon-body': {
    ...skin,
    ...glow,
    bodyArchetype: 'string',
    spikeCount: 'number',
    spikeSpread: 'number',
    spikeHeight: 'number',
    spikeRadius: 'number',
    spikeLean: 'number',
    backSpikeCount: 'number',
    backSpikeScale: 'number',
  },
  'dragon-head-horned': {
    ...skin,
    ...glow,
    ...joint,
    cranium: 'number',
    browRidge: 'number',
    muzzleDepth: 'number',
    muzzleWidth: 'number',
    muzzleDrop: 'number',
    cheek: 'number',
    eyeAxial: 'number',
    hornLength: 'number',
    hornRadius: 'number',
    browLength: 'number',
    crestScale: 'number',
    eyeColor: 'string',
    sex: 'string',
  },
  'dragon-upper-jaw': {
    ...skin,
    toothCount: 'number',
    toothHeight: 'number',
    toothRadius: 'number',
    toothStart: 'number',
    noseHornLength: 'number',
    fangScale: 'number',
  },
  'dragon-lower-jaw': {
    ...skin,
    toothCount: 'number',
    toothHeight: 'number',
    toothRadius: 'number',
    toothStart: 'number',
    noseHornLength: 'number',
    fangScale: 'number',
  },
  'dragon-leg': { ...skin, ...joint },
  'dragon-foot': {
    ...skin,
    talonCount: 'number',
    talonLength: 'number',
    talonRadius: 'number',
    clawScale: 'number',
  },
  'dragon-grasp-arm': { ...skin, ...joint },
  'dragon-grasp-hand': {
    ...skin,
    ...joint,
    fingerCount: 'number',
    fingerLength: 'number',
    fingerRadius: 'number',
    palmLength: 'number',
    fingerSplay: 'number',
    clawScale: 'number',
  },
  'dragon-claw': { ...skin },
  'dragon-wing': {
    ...skin,
    camber: 'number',
    fingerSag: 'number',
    dihedral: 'number',
    scallop: 'number',
  },
  'dragon-secondary-wing': {
    ...skin,
    camber: 'number',
    fingerSag: 'number',
    dihedral: 'number',
    scallop: 'number',
  },
  'dragon-wing-claw': { ...skin },
  'dragon-tail': { ...skin, ...glow, ...joint },
  'dragon-tail-club': {
    ...skin,
    ...glow,
    spikeCount: 'number',
    spikeLength: 'number',
    spikeRadius: 'number',
    tailClubSpikeCount: 'number',
    tailClubSpikeScale: 'number',
  },
  'dragon-tail-stinger': { ...skin, ...glow },
} as const satisfies Record<DragonProceduralProfileId, DragonVisualParameterContract>;

export function validateDragonVisualParameters(
  profileId: DragonProceduralProfileId,
  parameters: Record<string, string | number | boolean> | undefined,
  label: string,
): void {
  if (!parameters) return;
  const contract: DragonVisualParameterContract = DRAGON_VISUAL_PARAMETER_CONTRACT[profileId];
  for (const [key, value] of Object.entries(parameters)) {
    const expected = contract[key];
    if (!expected) {
      throw new Error(`${label}.${key} is not supported by procedural profile "${profileId}".`);
    }
    if (typeof value !== expected) {
      throw new Error(`${label}.${key} must be a ${expected} for procedural profile "${profileId}".`);
    }
  }
}
