import { AssemblyBlueprint } from '../domain/assembly.models';
import { SpecimenBend, SpecimenPose } from './specimen-pose';

/**
 * A physics-free motion shown by the specimen viewer.
 *
 * Motions deliberately carry no genetics, combat, or lesson meaning. A dragon
 * workstation can use the pose engine for a learned response without adding
 * that response to the genome or the arena ability catalog.
 */
export interface SpecimenMotionDefinition {
  id: string;
  durationSeconds: number;
  /** Informative pose held when the student requests reduced motion. */
  reducedMotionPhase?: number;
  poseAt(blueprint: AssemblyBlueprint, phase: number, restingDroopRadians: number): SpecimenPose;
}

/**
 * A continuous, looping idle laid over the resting pose.
 *
 * Unlike {@link SpecimenMotionDefinition} this never ends and is never
 * triggered — it is the difference between a specimen and a live animal, and
 * the whole point is that a student never has to ask for it.
 *
 * It returns *bends to add* rather than a whole pose, so it composes with
 * whatever resting stance the viewer already applies instead of replacing it,
 * and so the same idle works on a species with a different stance.
 *
 * Amplitudes belong at the bottom of the scale. This plays permanently in the
 * corner of a page a student is reading, and anything large enough to notice
 * directly is large enough to be a distraction.
 */
export interface SpecimenIdleMotion {
  id: string;
  /** Seconds for one full cycle. */
  periodSeconds: number;
  /** Extra bends for a phase in 0..1, which wraps. */
  bendsAt(phase: number): readonly SpecimenBend[];
}
