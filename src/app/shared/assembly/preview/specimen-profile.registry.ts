import { InjectionToken, Injectable, Provider, inject } from '@angular/core';
import {
  SpecimenDescriptor,
  SpecimenExpressOptions,
  SpecimenResolution,
  SpecimenSource,
  StoredSpecimenModel,
  describeSpecimen,
} from './specimen.models';

/**
 * A simulation's rule for turning its own genome type into something viewable.
 *
 * This is the seam that keeps the viewer generic. `shared/assembly` never
 * imports a feature; a feature registers its profile and the viewer can then
 * render that feature's saved specimens from a genome alone.
 */
export interface SpecimenProfile<TGenome = unknown> {
  /** Stable id, stored inside saved specimens. Never rename a shipped one. */
  id: string;
  /**
   * Narrows an untrusted genome read back from storage. Return false rather
   * than throwing — a stored record may predate the current genome shape.
   */
  supports(genome: unknown): genome is TGenome;
  express(genome: TGenome, options: SpecimenExpressOptions): SpecimenDescriptor;
}

export const SPECIMEN_PROFILES = new InjectionToken<readonly SpecimenProfile[]>(
  'SPECIMEN_PROFILES',
);

/** Registers a simulation's profile. Add to an app, route, or component provider list. */
export function provideSpecimenProfile(profile: SpecimenProfile): Provider {
  return { provide: SPECIMEN_PROFILES, useValue: profile, multi: true };
}

/**
 * Resolves any {@link SpecimenSource} into something renderable.
 *
 * Resolution never throws: a missing profile or a malformed record produces an
 * `error` resolution the host can show, because these inputs come from student
 * data and from records saved by older builds.
 */
@Injectable({ providedIn: 'root' })
export class SpecimenProfileRegistry {
  private readonly profiles = new Map<string, SpecimenProfile>();

  constructor() {
    for (const profile of inject(SPECIMEN_PROFILES, { optional: true }) ?? []) {
      this.register(profile);
    }
  }

  register(profile: SpecimenProfile): void {
    this.profiles.set(profile.id, profile);
  }

  get(profileId: string): SpecimenProfile | null {
    return this.profiles.get(profileId) ?? null;
  }

  get registeredIds(): readonly string[] {
    return [...this.profiles.keys()];
  }

  resolve(source: SpecimenSource): SpecimenResolution {
    switch (source.kind) {
      case 'descriptor':
        return { status: 'ready', descriptor: source.descriptor };

      case 'blueprint':
        return {
          status: 'ready',
          descriptor: describeSpecimen(source.id, source.blueprint, {
            label: source.label,
            traits: source.traits,
          }),
        };

      case 'genome':
        return this.express(source.profileId, source.genome, {
          id: source.id,
          label: source.label,
          generation: source.generation,
        });

      case 'stored':
        return this.resolveStored(source.model);
    }
  }

  private resolveStored(model: StoredSpecimenModel): SpecimenResolution {
    // Genome first: it re-expresses through the current anatomy, so saved
    // specimens improve when the simulation does. The baked blueprint is the
    // fallback for when the owning profile is not registered on this screen.
    if (model.genome !== undefined && model.profileId) {
      const expressed = this.express(model.profileId, model.genome, {
        id: model.id,
        label: model.label,
        generation: model.generation,
      });
      if (expressed.status === 'ready') {
        return {
          status: 'ready',
          descriptor: {
            ...expressed.descriptor,
            traits: model.traits ?? expressed.descriptor.traits,
            accentColor: model.accentColor ?? expressed.descriptor.accentColor,
          },
        };
      }
    }

    if (model.blueprint) {
      return {
        status: 'ready',
        descriptor: describeSpecimen(model.id, model.blueprint, {
          label: model.label,
          traits: model.traits,
          profileId: model.profileId,
          generation: model.generation,
          accentColor: model.accentColor,
        }),
      };
    }

    return {
      status: 'error',
      message: model.profileId
        ? `Saved specimen "${model.id}" needs the "${model.profileId}" profile, which is not registered here.`
        : `Saved specimen "${model.id}" has neither a blueprint nor a genome.`,
    };
  }

  private express(
    profileId: string,
    genome: unknown,
    options: SpecimenExpressOptions,
  ): SpecimenResolution {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return {
        status: 'error',
        message: `No specimen profile registered for "${profileId}".`,
      };
    }

    if (!profile.supports(genome)) {
      return {
        status: 'error',
        message: `Profile "${profileId}" does not recognise this genome.`,
      };
    }

    const descriptor = profile.express(genome, options);
    return { status: 'ready', descriptor: { ...descriptor, profileId } };
  }
}
