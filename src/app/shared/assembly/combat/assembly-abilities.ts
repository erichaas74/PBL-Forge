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

export type AssemblyContactAbilityId =
  | 'bite'
  | 'claw-rake'
  | 'wing-buffet'
  | 'tail-sweep'
  | 'horn-charge';
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
 *
 * Every range is measured from the attacker's core to the *surface* of the
 * target, so it has to cover the attacker's own torso before it reaches
 * anything but not the defender's. Each carries `TORSO_REACH` on top of the
 * clearance it is actually tuned for — when the torso grew, the jaws ended up
 * outside their own bite range and the move stopped connecting.
 */
const TORSO_REACH = 1.91;

export const SCRIPTED_ASSEMBLY_ATTACKS: Readonly<Record<AssemblyAbilityId, ScriptedAssemblyAttackTiming>> = {
  // The fast poke. Half the commitment of a bite and barely more than half its
  // reach, so it is the move you can afford to throw when you are unsure —
  // which is what a fight needs if guarding and dodging are to matter.
  'claw-rake': { durationSeconds: 0.55, strikeAt: 0.45, activeWindow: 0.14, range: TORSO_REACH + 0.62, coneDot: 0.45 },
  bite: { durationSeconds: 1.1, strikeAt: 0.6, activeWindow: 0.16, range: TORSO_REACH + 0.79, coneDot: 0.52 },
  'wing-buffet': { durationSeconds: 1.2, strikeAt: 0.75, activeWindow: 0.2, range: TORSO_REACH + 1.19, coneDot: 0.15 },
  'tail-sweep': { durationSeconds: 1.2, strikeAt: 0.75, activeWindow: 0.22, range: TORSO_REACH + 1.09, coneDot: null },
  // The heavy. Longest wind-up in the set and the narrowest cone, because it
  // is the one move a defender is always given time to answer.
  'horn-charge': { durationSeconds: 1.5, strikeAt: 0.66, activeWindow: 0.24, range: TORSO_REACH + 1.64, coneDot: 0.74 },
  'fire-breath': { durationSeconds: 1.6, strikeAt: 0.4, activeWindow: 0.6, range: TORSO_REACH + 2.14, coneDot: 0.72 },
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
  /**
   * Forward speed the attacker carries through the active window, in metres per
   * second. Only the charge has one: it is a move that travels, which is what
   * makes it answerable by stepping aside rather than only by blocking.
   */
  driveSpeed?: number;
  /**
   * A hit heavy enough to put the target on the floor rather than just push it
   * back. Costs the defender its footing and a second of recovery.
   */
  knockdown?: boolean;
}

export const ASSEMBLY_CONTACT_ABILITIES: readonly AssemblyContactAbility[] = [
  // Bite includes the authored head lunge. Its opponent-only hit volume
  // produces a small reaction without giving those parts floor or wall
  // colliders that could trip their owner.
  { ability: 'bite', role: 'jaw', baseDamage: 9, cooldownSeconds: 0.9, usesAttackerMultiplier: true, knockback: true },
  // The jab of the set: cheap, quick, and safe to throw. Every dragon has
  // claws, so this is the one attack no genotype can take away.
  { ability: 'claw-rake', role: 'leg', baseDamage: 4, cooldownSeconds: 0.4, usesAttackerMultiplier: true, knockback: false },
  { ability: 'wing-buffet', role: 'wing', baseDamage: 6, cooldownSeconds: 1.2, usesAttackerMultiplier: false, knockback: true },
  { ability: 'tail-sweep', role: 'tail', baseDamage: 7, cooldownSeconds: 1.1, usesAttackerMultiplier: false, knockback: false },
  // Horned genotypes only. Hits nearly twice as hard as a bite and knocks the
  // target down, paid for with a long wind-up and a two-second cooldown.
  {
    ability: 'horn-charge',
    role: 'head',
    baseDamage: 16,
    cooldownSeconds: 2,
    usesAttackerMultiplier: true,
    knockback: true,
    driveSpeed: 7.4,
    knockdown: true,
  },
];

/**
 * Defence.
 *
 * Two answers to an incoming attack, each earned by a different gene, so what a
 * student bred decides how they are able to survive rather than only how hard
 * they hit:
 *
 * - *Guard* is the horned dragon's answer. Plant the crest and armoured brow
 *   into the blow: most of the damage is absorbed and none of the knockback
 *   lands, but a braced dragon can barely move and cannot attack.
 * - *Dodge* is the winged dragon's answer. A wing-assisted burst sideways with
 *   a window of true invulnerability in the middle — free if timed, and a
 *   second of nothing if thrown early.
 */
export const DEFENSE_TUNING = {
  guard: {
    /** Fraction of incoming damage that still lands while braced. */
    damageTaken: 0.28,
    /** How much of a normal move a braced dragon can manage. */
    moveScale: 0.35,
    /** Knockback impulses are scaled by this while braced. */
    knockbackScale: 0.15,
    /**
     * Guarding cannot be held forever: past this the brace collapses and has to
     * be re-established, so a fight cannot stall into two turtles.
     */
    maxHoldSeconds: 2.4,
    recoverySeconds: 0.9,
  },
  dodge: {
    durationSeconds: 0.5,
    /** Invulnerable between these two phases of the roll. */
    invulnerableFrom: 0.08,
    invulnerableUntil: 0.42,
    /** Burst speed of the roll itself, in metres per second. */
    speed: 8.2,
    cooldownSeconds: 1.2,
  },
} as const;

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
  /**
   * Horns are drawn onto the head rather than carried as their own part, so —
   * exactly like fire breath — nothing in the blueprint announces them and the
   * caller supplies the genotype. Gates the charge and the guard.
   */
  horned?: boolean;
}

/** Abilities no part can announce, because the anatomy that grants them is painted on. */
const GENOTYPE_GATED_ABILITIES: Readonly<Partial<Record<AssemblyAbilityId, keyof ResolveAbilityOptions>>> = {
  'horn-charge': 'horned',
};

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
    const gate = GENOTYPE_GATED_ABILITIES[definition.ability];
    const available = parts.length > 0 && (!gate || options[gate] === true);

    return {
      ability: definition.ability,
      available,
      partIds: available ? parts.map(part => part.id) : [],
      requiredRole: definition.role,
      damagePerHit: round(damagePerHit),
      cooldownSeconds: definition.cooldownSeconds,
      knockback: definition.knockback,
      damagePerSecond: available ? round(damagePerHit / definition.cooldownSeconds) : 0,
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
