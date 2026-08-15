import { AssemblyAbilityId } from '../combat/assembly-abilities';
import { AssemblyPartRole } from '../domain/assembly.models';
import { SpecimenMotionDefinition } from './specimen-motion';

/**
 * Wording for the test bench.
 *
 * The bench computes numbers; a simulation supplies the words. A dragon lab
 * says "Bite" and "Horns", a robot lab would say "Crusher" and "Plating", and
 * neither vocabulary belongs in the shared component.
 */

export interface AbilityCopy {
  name: string;
  /** What the move does, in the student's language. */
  detail: string;
  /** Shown when the creation cannot perform it — explain what is missing. */
  missingDetail: string;
}

export interface DefensiveFeatureCopy {
  id: string;
  name: string;
  /** Roles whose presence means the creation has this feature. */
  roles: readonly AssemblyPartRole[];
  /** What it does for the creature. */
  detail: string;
  /** Shown when no part carries any of those roles. */
  missingDetail: string;
}

/**
 * A motion the bench can play that is *not* an attack.
 *
 * Kept separate from {@link AbilityCopy} because the distinction is the lesson:
 * an ability is carried by the genome and read by the arena, while a motion is
 * something the animal was taught or simply does. Nothing here reaches combat.
 */
export interface SpecimenBenchMotion {
  id: string;
  name: string;
  detail: string;
  motion: SpecimenMotionDefinition;
}

export interface SpecimenBenchCopy {
  abilities: Partial<Record<AssemblyAbilityId, AbilityCopy>>;
  defensiveFeatures: readonly DefensiveFeatureCopy[];
  /**
   * The honest caveat printed under the fitness score. Required, not optional:
   * a bare number invites students to read it as biological fitness, and the
   * environment it was measured in is the transferable idea.
   */
  fitnessCaveat: string;
}

export const FALLBACK_ABILITY_COPY: Record<AssemblyAbilityId, AbilityCopy> = {
  bite: {
    name: 'Bite',
    detail: 'Snaps the jaws shut on whatever is in front.',
    missingDetail: 'No jaw parts, so there is nothing to bite with.',
  },
  'claw-rake': {
    name: 'Claw rake',
    detail: 'A fast swipe of the foreclaws. Little damage, but almost no commitment.',
    missingDetail: 'No limbs, so there is nothing to rake with.',
  },
  'wing-buffet': {
    name: 'Wing buffet',
    detail: 'Slams both wings down to knock an opponent back.',
    missingDetail: 'No wings, so this move is unavailable.',
  },
  'horn-charge': {
    name: 'Horn charge',
    detail: 'Drops the head and runs the target down, knocking it off its feet.',
    missingDetail: 'This creature does not carry the horned phenotype.',
  },
  'tail-sweep': {
    name: 'Tail sweep',
    detail: 'Whips the tail in a wide arc.',
    missingDetail: 'No tail, so there is nothing to sweep with.',
  },
  'fire-breath': {
    name: 'Fire breath',
    detail: 'Breathes a cone of fire that can catch several targets at once.',
    missingDetail: 'This creature does not carry the fire-breathing phenotype.',
  },
};

export function resolveAbilityCopy(
  copy: SpecimenBenchCopy | null,
  ability: AssemblyAbilityId,
): AbilityCopy {
  return copy?.abilities[ability] ?? FALLBACK_ABILITY_COPY[ability];
}
