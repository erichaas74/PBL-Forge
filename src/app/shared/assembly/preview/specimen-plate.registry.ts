import { InjectionToken, Provider, Type, inject } from '@angular/core';
import { SpecimenDescriptor } from './specimen.models';

/**
 * How a simulation supplies its own flat artwork.
 *
 * `shared/assembly` renders *any* assembly in 3D without knowing what it is —
 * that is the whole point of the specimen seam. A flat plate cannot work that
 * way: a drawn dragon is dragon-specific artwork, and there is no generic
 * vector illustration of "an arbitrary assembly".
 *
 * So the same trick the genome expression already uses applies here. A feature
 * registers the component that draws its species, keyed by the profile that
 * expressed the specimen, and the generic tile looks it up. A simulation with
 * no plate registered simply falls back to the baked 3D render — no error, no
 * gap, and no obligation for every simulation to commission artwork.
 */

/** Every plate component receives exactly this. */
export interface SpecimenPlateInputs {
  descriptor: SpecimenDescriptor;
  /** Mutes the parts this trait did not shape, matching the 3D trait focus. */
  focusedTraitId: string | null;
}

export interface SpecimenPlate {
  /** The `SpecimenProfile.id` whose specimens this plate can draw. */
  profileId: string;
  /** A component accepting {@link SpecimenPlateInputs} as signal inputs. */
  component: Type<unknown>;
}

export const SPECIMEN_PLATES = new InjectionToken<readonly SpecimenPlate[]>('SPECIMEN_PLATES');

/** Registers a simulation's flat artwork. Add beside its specimen profile. */
export function provideSpecimenPlate(plate: SpecimenPlate): Provider {
  return { provide: SPECIMEN_PLATES, useValue: plate, multi: true };
}

/**
 * Resolves the plate for a descriptor, or null when the owning simulation has
 * not registered one.
 *
 * Call from an injection context.
 */
export function resolveSpecimenPlate(profileId: string | undefined): Type<unknown> | null {
  if (!profileId) return null;
  const plates = inject(SPECIMEN_PLATES, { optional: true }) ?? [];
  return plates.find(plate => plate.profileId === profileId)?.component ?? null;
}
