import {
  AssemblyAbilityReadout,
  ResolveAbilityOptions,
  resolveAssemblyAbilities,
} from '../combat/assembly-abilities';
import { AssemblyCombatProfile } from '../combat/assembly-combat.models';
import { AssemblyBlueprint, AssemblyPartRole } from '../domain/assembly.models';

/**
 * Measuring what a creation can do, without fighting with it.
 *
 * Everything here is arithmetic over the blueprint and its combat profile — the
 * same numbers the arena would use — so a student can test a build, change a
 * gene, and test again in seconds instead of running matches.
 *
 * On the word *fitness*: what this computes is performance in one arena model,
 * against one set of weights, both of which are reported alongside the score.
 * It is deliberately not presented as a single authoritative number, because
 * the transferable idea is that fitness depends on the environment you measure
 * it in.
 */

export interface SpecimenDefenseGroup {
  role: AssemblyPartRole;
  partCount: number;
  totalHealth: number;
  /** Mean damage reduction across the group, 0..1. */
  meanArmor: number;
  partIds: readonly string[];
}

export interface SpecimenDefenseReport {
  /** Health of every part added together. */
  totalHealth: number;
  /** The part that ends the fight when it is destroyed. */
  corePartId: string;
  corePartHealth: number;
  /**
   * Damage reduction on the core. This — not the mean across parts — is what
   * decides how long a creation survives, because destroying the core ends the
   * fight however healthy the limbs are.
   */
  coreArmor: number;
  /**
   * Mean damage reduction across all parts. Reported because it is easy to
   * misread: on a 21-part body where only the core carries armour it sits near
   * zero at every genome, so it is informative but not a fitness input.
   */
  meanArmor: number;
  /** Parts with any damage reduction at all. */
  armoredPartIds: readonly string[];
  /** Share of total health sitting behind some armour, 0..1. */
  armoredHealthFraction: number;
  byRole: readonly SpecimenDefenseGroup[];
}

export interface SpecimenOffenseReport {
  abilities: readonly AssemblyAbilityReadout[];
  availableAbilities: readonly AssemblyAbilityReadout[];
  /** Damage per second of the single best move, if every hit connects. */
  bestDamagePerSecond: number;
  /** The heaviest single blow available. */
  bestSingleHit: number;
  moveCount: number;
}

export interface SpecimenFitnessComponent {
  id: string;
  label: string;
  /** Normalised 0..1 contribution. */
  score: number;
  weight: number;
  /** The measurement behind the score, in its own units. */
  measured: string;
}

export interface SpecimenFitnessReport {
  /** Weighted mean of the components, 0..100. */
  overall: number;
  components: readonly SpecimenFitnessComponent[];
  calibration: SpecimenFitnessCalibration;
}

export interface SpecimenAssay {
  offense: SpecimenOffenseReport;
  defense: SpecimenDefenseReport;
  fitness: SpecimenFitnessReport;
}

/**
 * Half-saturation points: the value at which a component scores 0.5.
 *
 * A saturating curve rather than a hard maximum, so an extreme build still
 * improves its score without any single measure being able to run away with the
 * total, and so nothing ever clips at 100%. Defaults are calibrated against a
 * mid-range classic dragon (see `specimen-assay.spec.ts`, which pins them).
 */
export interface SpecimenFitnessCalibration {
  halfDamagePerSecond: number;
  halfTotalHealth: number;
  halfArmor: number;
  /** Moves needed to score 0.5 on versatility. */
  halfMoveCount: number;
  weights: {
    offense: number;
    durability: number;
    protection: number;
    versatility: number;
  };
}

/**
 * Measured against the classic dragon across its full genome range: damage
 * 8.6-11.5/s, health 715-1365, core armour 0-0.28. Each half-point sits near
 * the middle of its range so a genome change moves the score visibly, which is
 * the whole reason a student runs the bench twice.
 */
export const DEFAULT_FITNESS_CALIBRATION: SpecimenFitnessCalibration = {
  halfDamagePerSecond: 10,
  halfTotalHealth: 900,
  halfArmor: 0.14,
  halfMoveCount: 2.5,
  weights: { offense: 0.3, durability: 0.3, protection: 0.2, versatility: 0.2 },
};

export interface AssayOptions extends ResolveAbilityOptions {
  calibration?: SpecimenFitnessCalibration;
}

export function assaySpecimen(
  blueprint: AssemblyBlueprint,
  combatProfile: AssemblyCombatProfile | null,
  options: AssayOptions = {},
): SpecimenAssay {
  const offense = buildOffenseReport(blueprint, { ...options, combatProfile });
  const defense = buildDefenseReport(blueprint, combatProfile);
  const fitness = buildFitnessReport(
    offense,
    defense,
    options.calibration ?? DEFAULT_FITNESS_CALIBRATION,
  );
  return { offense, defense, fitness };
}

function buildOffenseReport(
  blueprint: AssemblyBlueprint,
  options: ResolveAbilityOptions,
): SpecimenOffenseReport {
  const abilities = resolveAssemblyAbilities(blueprint, options);
  const available = abilities.filter(ability => ability.available);

  return {
    abilities,
    availableAbilities: available,
    bestDamagePerSecond: round(Math.max(0, ...available.map(a => a.damagePerSecond))),
    bestSingleHit: round(Math.max(0, ...available.map(a => a.damagePerHit))),
    moveCount: available.length,
  };
}

function buildDefenseReport(
  blueprint: AssemblyBlueprint,
  combatProfile: AssemblyCombatProfile | null,
): SpecimenDefenseReport {
  const healthOf = (partId: string): number => combatProfile?.parts[partId]?.maxHealth ?? 0;
  const armorOf = (partId: string): number => combatProfile?.parts[partId]?.armor ?? 0;

  const totalHealth = blueprint.parts.reduce((sum, part) => sum + healthOf(part.id), 0);
  const armoredParts = blueprint.parts.filter(part => armorOf(part.id) > 0);
  const armoredHealth = armoredParts.reduce((sum, part) => sum + healthOf(part.id), 0);

  const roles = new Set<AssemblyPartRole>();
  for (const part of blueprint.parts) {
    for (const role of part.roles ?? []) roles.add(role);
  }

  const byRole = [...roles]
    .map(role => {
      const parts = blueprint.parts.filter(part => part.roles?.includes(role));
      return {
        role,
        partCount: parts.length,
        totalHealth: round(parts.reduce((sum, part) => sum + healthOf(part.id), 0)),
        meanArmor: round3(mean(parts.map(part => armorOf(part.id)))),
        partIds: parts.map(part => part.id),
      } satisfies SpecimenDefenseGroup;
    })
    .sort((a, b) => b.totalHealth - a.totalHealth);

  const corePartId = combatProfile?.corePartId
    ?? blueprint.parts.find(part => part.roles?.includes('core'))?.id
    ?? '';

  return {
    totalHealth: round(totalHealth),
    corePartId,
    corePartHealth: round(healthOf(corePartId)),
    coreArmor: round3(armorOf(corePartId)),
    meanArmor: round3(mean(blueprint.parts.map(part => armorOf(part.id)))),
    armoredPartIds: armoredParts.map(part => part.id),
    armoredHealthFraction: totalHealth > 0 ? round3(armoredHealth / totalHealth) : 0,
    byRole,
  };
}

function buildFitnessReport(
  offense: SpecimenOffenseReport,
  defense: SpecimenDefenseReport,
  calibration: SpecimenFitnessCalibration,
): SpecimenFitnessReport {
  const weights = calibration.weights;
  const components: SpecimenFitnessComponent[] = [
    {
      id: 'offense',
      label: 'Attack power',
      score: saturate(offense.bestDamagePerSecond, calibration.halfDamagePerSecond),
      weight: weights.offense,
      measured: `${offense.bestDamagePerSecond} damage/second`,
    },
    {
      id: 'durability',
      label: 'Durability',
      score: saturate(defense.totalHealth, calibration.halfTotalHealth),
      weight: weights.durability,
      measured: `${defense.totalHealth} total health`,
    },
    {
      id: 'protection',
      label: 'Protection',
      score: saturate(defense.coreArmor, calibration.halfArmor),
      weight: weights.protection,
      measured: `${Math.round(defense.coreArmor * 100)}% damage reduction on the body`,
    },
    {
      id: 'versatility',
      label: 'Versatility',
      score: saturate(offense.moveCount, calibration.halfMoveCount),
      weight: weights.versatility,
      measured: `${offense.moveCount} move${offense.moveCount === 1 ? '' : 's'} available`,
    },
  ];

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const overall = totalWeight > 0
    ? components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight
    : 0;

  return {
    overall: Math.round(overall * 100),
    components: components.map(component => ({ ...component, score: round3(component.score) })),
    calibration,
  };
}

/**
 * `x / (x + half)`: 0 at zero, 0.5 at the half-saturation point, approaching but
 * never reaching 1. Keeps one runaway measure from dominating the total.
 */
function saturate(value: number, half: number): number {
  if (value <= 0) return 0;
  return value / (value + Math.max(half, 1e-6));
}

/** Comparison against another build — the honest way to read a fitness score. */
export interface SpecimenFitnessDelta {
  componentId: string;
  label: string;
  subject: number;
  baseline: number;
  /** Positive when the subject scores higher. */
  difference: number;
}

export function compareSpecimenFitness(
  subject: SpecimenFitnessReport,
  baseline: SpecimenFitnessReport,
): SpecimenFitnessDelta[] {
  return subject.components.map(component => {
    const other = baseline.components.find(entry => entry.id === component.id);
    const baselineScore = other?.score ?? 0;
    return {
      componentId: component.id,
      label: component.label,
      subject: component.score,
      baseline: baselineScore,
      difference: round3(component.score - baselineScore),
    };
  });
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
