import {
  AssemblyBlueprint,
  AssemblyPart,
  AssemblyPartRole,
  Vector3Data,
} from '../../../../shared/assembly/domain/assembly.models';
import {
  cloneAssemblyBlueprint,
  normalizeAssemblyRoles,
} from '../../../../shared/assembly/domain/assembly-clone';
import {
  identityQuaternion,
  rotateVectorByQuaternion,
} from '../../../../shared/assembly/domain/vector-data';
import { createDefaultCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import {
  DragonAllele,
  DragonGeneLocus,
  DragonGenome,
  DragonPhenotype,
  GeneratedDragonAssembly,
} from './dragon-genetics.models';

const LOCI: readonly DragonGeneLocus[] = [
  'body-size',
  'wing-span',
  'jaw-strength',
  'tail-length',
  'armor-density',
  'pigment-hue',
  'temperament',
];

export function createFounderDragonGenome(id: string, values: Partial<Record<DragonGeneLocus, number>> = {}): DragonGenome {
  return {
    id,
    schemaVersion: 1,
    generation: 0,
    loci: Object.fromEntries(LOCI.map((locus, index) => {
      const value = clamp01(values[locus] ?? 0.35 + index * 0.07);
      return [locus, {
        maternal: allele(`${locus}-m`, value, 0.5),
        paternal: allele(`${locus}-p`, clamp01(value + 0.08), 0.5),
      }];
    })) as Record<DragonGeneLocus, { maternal: DragonAllele; paternal: DragonAllele }>,
  };
}

/** Deterministic Mendelian inheritance: the same parents and seed always produce the same offspring. */
export function breedDragonGenomes(
  mother: DragonGenome,
  father: DragonGenome,
  offspringId: string,
  seed: string,
): DragonGenome {
  const loci = Object.fromEntries(LOCI.map(locus => [locus, {
    maternal: cloneAllele(selectParentAllele(mother, locus, `${seed}:${locus}:mother`)),
    paternal: cloneAllele(selectParentAllele(father, locus, `${seed}:${locus}:father`)),
  }])) as DragonGenome['loci'];

  return {
    id: offspringId,
    schemaVersion: 1,
    loci,
    parentGenomeIds: [mother.id, father.id],
    generation: Math.max(mother.generation, father.generation) + 1,
  };
}

export function expressDragonPhenotype(genome: DragonGenome): DragonPhenotype {
  const body = expressLocus(genome, 'body-size');
  const wings = expressLocus(genome, 'wing-span');
  const jaw = expressLocus(genome, 'jaw-strength');
  const tail = expressLocus(genome, 'tail-length');
  const armor = expressLocus(genome, 'armor-density');
  const pigment = expressLocus(genome, 'pigment-hue');
  const temperament = expressLocus(genome, 'temperament');
  const hue = Math.round(pigment * 320 + 20);
  return {
    bodyScale: 0.78 + body * 0.55,
    wingSpanScale: 0.72 + wings * 0.85,
    jawScale: 0.78 + jaw * 0.65,
    tailScale: 0.75 + tail * 0.8,
    armorDensity: armor,
    pigmentHue: hue,
    aggression: temperament,
    // Comma syntax: valid CSS, and required by three.js Color.setStyle.
    scaleColor: `hsl(${hue}, 62%, ${Math.round(34 + pigment * 16)}%)`,
  };
}

export function generateDragonAssembly(
  baseBlueprint: AssemblyBlueprint,
  genome: DragonGenome,
): GeneratedDragonAssembly {
  const phenotype = expressDragonPhenotype(genome);
  const blueprint = applyDragonPhenotype(baseBlueprint, phenotype);
  const combatProfile = createDefaultCombatProfile(blueprint);

  for (const part of blueprint.parts) {
    const profile = combatProfile.parts[part.id];
    if (!profile) continue;
    if (part.roles?.includes('core') || part.roles?.includes('armor')) {
      profile.maxHealth = Math.round(profile.maxHealth * (1 + phenotype.armorDensity * 0.55));
      profile.armor = Math.min(0.45, profile.armor + phenotype.armorDensity * 0.28);
    }
    if (part.roles?.includes('jaw') || part.roles?.includes('weapon')) {
      profile.damageMultiplier *= 1 + phenotype.aggression * 0.35;
    }
  }

  return { genome, phenotype, blueprint, combatProfile };
}

export function applyDragonPhenotype(
  baseBlueprint: AssemblyBlueprint,
  phenotype: DragonPhenotype,
): AssemblyBlueprint {
  const blueprint = normalizeAssemblyRoles(cloneAssemblyBlueprint(baseBlueprint));
  const scaleByPart = new Map<string, Vector3Data>();

  for (const part of blueprint.parts) {
    const featureScale = getFeatureScale(part, phenotype);
    scaleByPart.set(part.id, featureScale);
    part.position = scaleVector(part.position, scalarVector(phenotype.bodyScale));
    part.dimensions = scaleVector(part.dimensions, featureScale);
    part.mass = Math.max(0.05, part.mass * featureScale.x * featureScale.y * featureScale.z);
    part.color = phenotype.scaleColor;
    part.snapPoints = part.snapPoints?.map(snap => ({
      ...snap,
      localPosition: scaleVector(snap.localPosition, featureScale),
    }));
  }

  blueprint.joints = blueprint.joints.map(joint => ({
    ...joint,
    pivotOnParent: scaleVector(
      joint.pivotOnParent,
      scaleByPart.get(joint.parentPartId) ?? scalarVector(phenotype.bodyScale),
    ),
    pivotOnChild: scaleVector(
      joint.pivotOnChild,
      scaleByPart.get(joint.childPartId) ?? scalarVector(phenotype.bodyScale),
    ),
  }));
  realignPartsToJoints(blueprint);
  return blueprint;
}

/**
 * Per-role scaling moves joint pivots by different amounts on each side, so the
 * scaled part positions no longer satisfy the joint constraints. Recompute every
 * child's position from its parent through the joint tree; otherwise the physics
 * solver snaps the misaligned parts together on spawn with enough violence to
 * break every joint instantly.
 */
function realignPartsToJoints(blueprint: AssemblyBlueprint): void {
  const partsById = new Map(blueprint.parts.map(part => [part.id, part]));
  const childIds = new Set(blueprint.joints.map(joint => joint.childPartId));
  const aligned = new Set(
    blueprint.parts.map(part => part.id).filter(id => !childIds.has(id)),
  );

  const pending = [...blueprint.joints];
  while (pending.length) {
    const readyIndex = pending.findIndex(joint => aligned.has(joint.parentPartId));
    // Cycle or orphan: keep the authored position rather than looping forever.
    if (readyIndex < 0) break;

    const [joint] = pending.splice(readyIndex, 1);
    const parent = partsById.get(joint.parentPartId);
    const child = partsById.get(joint.childPartId);
    aligned.add(joint.childPartId);
    if (!parent || !child) continue;

    const pivotOnParentWorld = rotateVectorByQuaternion(
      joint.pivotOnParent,
      parent.rotation ?? identityQuaternion(),
    );
    const pivotOnChildWorld = rotateVectorByQuaternion(
      joint.pivotOnChild,
      child.rotation ?? identityQuaternion(),
    );
    child.position = {
      x: parent.position.x + pivotOnParentWorld.x - pivotOnChildWorld.x,
      y: parent.position.y + pivotOnParentWorld.y - pivotOnChildWorld.y,
      z: parent.position.z + pivotOnParentWorld.z - pivotOnChildWorld.z,
    };
  }
}

/**
 * Which parts each locus visibly shapes, and along which axis.
 *
 * Single source of truth: {@link getFeatureScale} scales geometry from this
 * table, and the specimen viewer highlights parts from the same table. Split
 * into two lists they would drift, and a student would be told a gene shaped a
 * part that it never touched.
 *
 * An empty `roles` list means the locus acts on the whole animal. Order
 * matters — the first matching entry wins, so a part carrying several roles is
 * scaled on one axis only.
 */
export interface DragonLocusVisual {
  roles: readonly AssemblyPartRole[];
  /** Axis stretched by this locus, when it stretches one. */
  axis?: keyof Vector3Data;
  /** Reads the locus' multiplier off an expressed phenotype. */
  scaleOf?: (phenotype: DragonPhenotype) => number;
}

export const DRAGON_LOCUS_VISUALS: Readonly<Record<DragonGeneLocus, DragonLocusVisual>> = {
  'wing-span': { roles: ['wing'], axis: 'z', scaleOf: phenotype => phenotype.wingSpanScale },
  'jaw-strength': { roles: ['jaw'], axis: 'x', scaleOf: phenotype => phenotype.jawScale },
  'tail-length': { roles: ['tail'], axis: 'y', scaleOf: phenotype => phenotype.tailScale },
  // Whole-body loci: every part is scaled or repainted by these.
  'body-size': { roles: [] },
  'pigment-hue': { roles: [] },
  // Expressed as durability rather than shape, on the parts that carry armour.
  'armor-density': { roles: ['core', 'armor'] },
  // Drives jaw and weapon damage in the combat profile.
  temperament: { roles: ['jaw', 'weapon'] },
};

/** Shape-bearing loci in the order they are tested. */
const SHAPE_LOCI: readonly DragonGeneLocus[] = ['wing-span', 'jaw-strength', 'tail-length'];

function getFeatureScale(part: AssemblyPart, phenotype: DragonPhenotype): Vector3Data {
  const base = phenotype.bodyScale;
  const roles = part.roles ?? [];

  for (const locus of SHAPE_LOCI) {
    const visual = DRAGON_LOCUS_VISUALS[locus];
    const axis = visual.axis;
    if (!axis || !visual.scaleOf) continue;
    if (!roles.some(role => visual.roles.includes(role))) continue;

    const scale = scalarVector(base);
    scale[axis] = base * visual.scaleOf(phenotype);
    return scale;
  }

  return scalarVector(base);
}

function expressLocus(genome: DragonGenome, locus: DragonGeneLocus): number {
  const pair = genome.loci[locus];
  const dominanceTotal = pair.maternal.dominance + pair.paternal.dominance;
  if (dominanceTotal <= Number.EPSILON) return clamp01((pair.maternal.value + pair.paternal.value) / 2);
  return clamp01(
    (pair.maternal.value * pair.maternal.dominance
      + pair.paternal.value * pair.paternal.dominance)
    / dominanceTotal,
  );
}

function selectParentAllele(genome: DragonGenome, locus: DragonGeneLocus, seed: string): DragonAllele {
  return stableHash(seed) % 2 === 0
    ? genome.loci[locus].maternal
    : genome.loci[locus].paternal;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function allele(id: string, value: number, dominance: number): DragonAllele {
  return { id, value: clamp01(value), dominance: clamp01(dominance) };
}

function cloneAllele(value: DragonAllele): DragonAllele {
  return { ...value };
}

function scalarVector(value: number): Vector3Data {
  return { x: value, y: value, z: value };
}

function scaleVector(value: Vector3Data, scale: Vector3Data): Vector3Data {
  return { x: value.x * scale.x, y: value.y * scale.y, z: value.z * scale.z };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
