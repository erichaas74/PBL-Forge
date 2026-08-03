import { AssemblyBlueprint, AssemblyPartRole } from '../domain/assembly.models';
import { AssemblyCombatProfile } from './assembly-combat.models';

/**
 * What an assembly can do in a fight, and the numbers behind it.
 *
 * These constants are the arena's real combat tuning. They live here rather
 * than inside the physics service so a test bench can report what a creation
 * *would* do without instantiating a physics world — and so the bench and the
 * arena can never quote different numbers at a student.
 */

export type AssemblyContactAbilityId = 'bite' | 'wing-buffet' | 'tail-sweep';
export type AssemblyAbilityId = AssemblyContactAbilityId | 'fire-breath';

export interface ScriptedAssemblyAttackTiming {
  durationSeconds: number;
  strikeAt: number;
  activeWindow: number;
  range: number;
  /** Minimum forward alignment. Null makes the move radial, as with a tail sweep. */
  coneDot: number | null;
}

/**
 * Authored combat timing shared by input, hit detection, and animation. The
 * arena treats these as moves with anticipation and recovery instead of forces
 * applied to independently simulated limbs.
 */
export const SCRIPTED_ASSEMBLY_ATTACKS: Readonly<Record<AssemblyAbilityId, ScriptedAssemblyAttackTiming>> = {
  bite: { durationSeconds: 1.1, strikeAt: 0.6, activeWindow: 0.16, range: 2.05, coneDot: 0.52 },
  'wing-buffet': { durationSeconds: 1.2, strikeAt: 0.75, activeWindow: 0.2, range: 2.45, coneDot: 0.15 },
  'tail-sweep': { durationSeconds: 1.2, strikeAt: 0.75, activeWindow: 0.22, range: 2.35, coneDot: null },
  'fire-breath': { durationSeconds: 1.6, strikeAt: 0.4, activeWindow: 0.6, range: 3.4, coneDot: 0.72 },
};

/**
 * Contact-window abilities: while the attack is held, the attacking part
 * landing on an opponent deals its damage regardless of impact speed — a bite
 * that connects is a bite, not a shove.
 */
export interface AssemblyContactAbility {
  ability: AssemblyContactAbilityId;
  role: AssemblyPartRole;
  baseDamage: number;
  cooldownSeconds: number;
  /** Bite scales with the attacking part's damage multiplier (temperament genes). */
  usesAttackerMultiplier: boolean;
  knockback: boolean;
}

export const ASSEMBLY_CONTACT_ABILITIES: readonly AssemblyContactAbility[] = [
  // Bite includes the authored head lunge and foreclaw rake. Its opponent-only
  // hit volume produces a small reaction without giving those parts floor or
  // wall colliders that could trip their owner.
  { ability: 'bite', role: 'jaw', baseDamage: 9, cooldownSeconds: 0.9, usesAttackerMultiplier: true, knockback: true },
  { ability: 'wing-buffet', role: 'wing', baseDamage: 6, cooldownSeconds: 1.2, usesAttackerMultiplier: false, knockback: true },
  { ability: 'tail-sweep', role: 'tail', baseDamage: 7, cooldownSeconds: 1.1, usesAttackerMultiplier: false, knockback: false },
];

/** Fire breath: a cone of area damage, gated by genotype at the control layer. */
export const FIRE_BREATH_TUNING = {
  range: 3.4,
  /** Minimum alignment (dot product) for a target to be inside the cone. */
  coneDot: 0.72,
  tickSeconds: 0.45,
  tickDamage: 3,
  maxTargets: 3,
} as const;

/**
 * Base-radius-to-length ratio for *drawing* the fire cone.
 *
 * Deliberately narrower than the damage volume, which spans `acos(coneDot)` —
 * about 44 degrees off-axis. The arena has always drawn the narrower cone
 * (`ConeGeometry(1.0, 3.2)`), and matching it keeps the bench and the battle
 * looking like the same attack. The length is the true range either way, so
 * what a student reads off the reach is accurate.
 */
export const FIRE_BREATH_VISUAL_RADIUS_RATIO = 1.0 / 3.2;

export interface AssemblyAbilityReadout {
  ability: AssemblyAbilityId;
  available: boolean;
  /** Parts that perform it; empty when the assembly cannot. */
  partIds: readonly string[];
  /** Role the ability needs, or null when it is gated some other way. */
  requiredRole: AssemblyPartRole | null;
  /** Damage per connecting hit (per tick, for fire breath). */
  damagePerHit: number;
  /** Seconds between hits — the ability's own cooldown. */
  cooldownSeconds: number;
  knockback: boolean;
  /** Sustained damage per second if every hit connects. The comparable number. */
  damagePerSecond: number;
}

export interface ResolveAbilityOptions {
  /**
   * Fire breath is not decided by parts — nothing on the body announces it — so
   * the caller supplies it from the genotype, exactly as the arena's control
   * layer does.
   */
  fireBreathing?: boolean;
  /** Applies each part's damage multiplier where the ability uses one. */
  combatProfile?: AssemblyCombatProfile | null;
}

/**
 * Every ability the assembly could use, including the ones it cannot — a
 * student learns as much from "no wings, so no wing buffet" as from the moves
 * that are available, so unavailable abilities are reported rather than hidden.
 */
export function resolveAssemblyAbilities(
  blueprint: AssemblyBlueprint,
  options: ResolveAbilityOptions = {},
): AssemblyAbilityReadout[] {
  const readouts: AssemblyAbilityReadout[] = ASSEMBLY_CONTACT_ABILITIES.map(definition => {
    const parts = blueprint.parts.filter(part => part.roles?.includes(definition.role));
    const multiplier = definition.usesAttackerMultiplier
      ? bestDamageMultiplier(parts.map(part => part.id), options.combatProfile ?? null)
      : 1;
    const damagePerHit = definition.baseDamage * multiplier;

    return {
      ability: definition.ability,
      available: parts.length > 0,
      partIds: parts.map(part => part.id),
      requiredRole: definition.role,
      damagePerHit: round(damagePerHit),
      cooldownSeconds: definition.cooldownSeconds,
      knockback: definition.knockback,
      damagePerSecond: parts.length ? round(damagePerHit / definition.cooldownSeconds) : 0,
    } satisfies AssemblyAbilityReadout;
  });

  const fireBreathing = options.fireBreathing ?? false;
  readouts.push({
    ability: 'fire-breath',
    available: fireBreathing,
    partIds: fireBreathing
      ? blueprint.parts.filter(part => part.roles?.includes('head')).map(part => part.id)
      : [],
    requiredRole: null,
    damagePerHit: FIRE_BREATH_TUNING.tickDamage,
    cooldownSeconds: FIRE_BREATH_TUNING.tickSeconds,
    knockback: false,
    // Fire hits several targets at once, so its per-second figure is the one
    // ability here that is not a single-target comparison.
    damagePerSecond: fireBreathing
      ? round(FIRE_BREATH_TUNING.tickDamage / FIRE_BREATH_TUNING.tickSeconds)
      : 0,
  });

  return readouts;
}

function bestDamageMultiplier(
  partIds: readonly string[],
  profile: AssemblyCombatProfile | null,
): number {
  if (!profile) return 1;
  let best = 0;
  for (const partId of partIds) {
    const part = profile.parts[partId];
    if (part) best = Math.max(best, part.damageMultiplier);
  }
  return best > 0 ? best : 1;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
