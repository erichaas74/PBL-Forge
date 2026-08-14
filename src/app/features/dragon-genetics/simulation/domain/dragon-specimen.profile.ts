import { Provider } from '@angular/core';
import { AssemblyBlueprint, AssemblyPartRole } from '../../../../shared/assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import {
  SpecimenDescriptor,
  SpecimenExpressOptions,
  SpecimenSource,
  SpecimenTraitReadout,
  describeSpecimen,
} from '../../../../shared/assembly/preview/specimen.models';
import {
  SpecimenProfile,
  provideSpecimenProfile,
} from '../../../../shared/assembly/preview/specimen-profile.registry';
import {
  DRAGON_LOCUS_VISUALS,
  expressDragonPhenotype,
  generateDragonAssembly,
} from './dragon-phenotype-builder';
import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../../data/published-dragon-models';
import { DragonGeneLocus, DragonGenome, DragonPhenotype } from './dragon-genetics.models';
import { DragonLabGenome, DragonOffspring, DragonParentProfile } from './dragon-lab.models';
import {
  DRAGON_TRAITS,
  DragonIdentityPaint,
  createEducationalAssembly,
  createVisualGenome,
  showsDominantPhenotype,
} from './dragon-inheritance';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  EXPRESSIVE_DRAGON_TRAITS,
  DragonSex,
  ExpressiveDragonProfile,
  ExpressiveDragonTraitId,
  expressivePhenotype,
  sexChromosomes,
  showsExpressiveDominant,
  toCoreLabGenome,
} from './dragon-expressive-genome';

/**
 * Teaches the generic specimen viewer how to read dragons.
 *
 * Two genome shapes reach this profile, and both are legitimate entry points:
 *
 * - `DragonGenome` — the continuous engine genome (seven loci, 0..1 alleles)
 *   that drives geometry. This is what the arena and garage already consume.
 * - `DragonLabGenome` — the four Mendelian trait genotypes a student actually
 *   works with in the lab (`WW`, `Ww`, `ww`, ...). Expressed here through the
 *   same path the hatchery uses, so the specimen a student inspects is the same
 *   animal that later walks into the arena.
 */

export const DRAGON_SPECIMEN_PROFILE_ID = 'dragon-genetics';

/**
 * Folds the wings of a blueprint on its way to a *viewer*.
 *
 * A dragon standing on a bench has its wings folded; a dragon in the arena is
 * fighting and may be about to use them. Both read the same blueprint, so the
 * fold is stamped here — on the descriptor path, which only the specimen
 * viewers and thumbnails take — rather than in `createEducationalAssembly`,
 * which the arena consumes directly.
 *
 * Copies rather than mutates: assembly blueprints are memoised per parent and
 * per offspring, and folding one in place would fold the animal that walks into
 * the battle too.
 */
function withFoldedWings(blueprint: AssemblyBlueprint): AssemblyBlueprint {
  const wings = blueprint.parts.filter(
    part => part.visualProfile?.profileId === 'dragon-wing'
      || part.visualProfile?.profileId === 'dragon-secondary-wing',
  );
  // Which wing each claw hangs from, so the claw can be folded with it.
  const clawParents = new Map<string, string>();
  for (const joint of blueprint.joints) {
    if (wings.some(wing => wing.id === joint.parentPartId)) {
      clawParents.set(joint.childPartId, joint.parentPartId);
    }
  }
  const wingsById = new Map(wings.map(wing => [wing.id, wing]));

  return {
    ...blueprint,
    parts: blueprint.parts.map(part => {
      if (wingsById.has(part.id) && part.visualProfile) {
        return {
          ...part,
          visualProfile: {
            ...part.visualProfile,
            parameters: { ...(part.visualProfile.parameters ?? {}), wingFold: 1 },
          },
        };
      }

      /*
       * The hand claw is a separate *part*, mounted out at the wingtip, so the
       * mesh folding on its own left it hanging in the air where the spread tip
       * used to be.
       *
       * It is marked rather than moved. Moving it needs the claw's position in
       * the builder's frame, and there isn't one to recover: genetics rescales
       * the wings and `realignPartsToJoints` then re-derives every child from
       * its joint pivot, so by the time the blueprint arrives here the claw is
       * wherever the joint put it and not at `wingClawAnchor`. Three different
       * reconstructions all landed it somewhere plausible and wrong.
       *
       * Not drawing it is the honest answer rather than a dodge: on a folded
       * wing the hand is closed against the flank and its claw is tucked inside
       * the fold, so the correct number of visible hand claws on a resting
       * dragon is zero. The part stays in the blueprint — trait highlighting and
       * the part list are unchanged — and the arena, which never folds, still
       * draws it.
       */
      const parentId = clawParents.get(part.id);
      if (!parentId || !part.visualProfile) return part;

      return {
        ...part,
        visualProfile: {
          ...part.visualProfile,
          parameters: { ...(part.visualProfile.parameters ?? {}), wingFold: 1 },
        },
      };
    }),
  };
}

type DragonSpecimenGenome =
  | { kind: 'engine'; genome: DragonGenome }
  | {
      kind: 'lab';
      genome: DragonLabGenome;
      generation?: number;
      /**
       * The dragon's card colours. Optional because an anonymous genotype (a
       * Punnett cell, a predicted outcome) has no identity yet — those render
       * in the engine's own pigment.
       */
      identity?: DragonIdentityPaint;
    };

export const DRAGON_SPECIMEN_PROFILE: SpecimenProfile<DragonSpecimenGenome> = {
  id: DRAGON_SPECIMEN_PROFILE_ID,
  supports: isDragonSpecimenGenome,
  express: (genome, options) =>
    genome.kind === 'engine'
      ? describeEngineGenome(genome.genome, options)
      : describeLabGenome(
          genome.genome,
          { ...options, generation: options.generation ?? genome.generation },
          genome.identity,
        ),
};

/**
 * Register once, wherever the viewer is used (route providers or bootstrap).
 *
 * Supplies the rule for expressing a genome into the assembly used by the live
 * viewport and baked 3D thumbnails.
 */
export function provideDragonSpecimenProfile(): Provider[] {
  return [provideSpecimenProfile(DRAGON_SPECIMEN_PROFILE as SpecimenProfile)];
}

// ---------------------------------------------------------------------------
// Sources — the shapes a caller actually has on hand
// ---------------------------------------------------------------------------

/** A student's four-trait genotype set, straight from the lab. */
export function dragonLabGenomeSource(
  id: string,
  genome: DragonLabGenome,
  options: { label?: string; generation?: number; identity?: DragonIdentityPaint } = {},
): SpecimenSource {
  return {
    kind: 'genome',
    profileId: DRAGON_SPECIMEN_PROFILE_ID,
    genome: {
      kind: 'lab',
      genome,
      generation: options.generation,
      identity: options.identity,
    } satisfies DragonSpecimenGenome,
    id,
    label: options.label ?? id,
    generation: options.generation,
  };
}

/** The continuous engine genome, when a caller already holds one. */
export function dragonEngineGenomeSource(
  genome: DragonGenome,
  options: { label?: string } = {},
): SpecimenSource {
  return {
    kind: 'genome',
    profileId: DRAGON_SPECIMEN_PROFILE_ID,
    genome: { kind: 'engine', genome } satisfies DragonSpecimenGenome,
    id: genome.id,
    label: options.label ?? genome.id,
    generation: genome.generation,
  };
}

/**
 * Memoised per profile object.
 *
 * Templates call `dragonParentSource(profile)` inside a binding, so this runs
 * on every change-detection pass. Returning a fresh object each time would
 * change the input identity of every specimen tile on the screen and force a
 * re-resolve — and resolving runs `createEducationalAssembly`, which rebuilds
 * a whole blueprint. The parent profiles are module constants, so keying on
 * object identity is both safe and exact.
 */
const parentSources = new WeakMap<DragonParentProfile, SpecimenSource>();

/**
 * A parent the student picked in the lab.
 *
 * Carries the profile's own colours through, so the specimen on screen is the
 * same red Ember or blue Tide as every card that names it. Without this the
 * engine repaints from `pigment-hue` alone and two parents with matching scale
 * genes come out as the same animal.
 */
export function dragonParentSource(parent: DragonParentProfile): SpecimenSource {
  const cached = parentSources.get(parent);
  if (cached) return cached;

  const source = dragonLabGenomeSource(parent.id, parent.genome, {
    label: parent.name,
    identity: { color: parent.color, accentColor: parent.accentColor },
  });
  parentSources.set(parent, source);
  return source;
}

/**
 * Everything the test bench needs for one dragon.
 *
 * The bench reports health and damage from the combat profile, and fire breath
 * is a genotype call rather than a part, so all three travel together — built
 * from the same `createEducationalAssembly` call the hatchery and arena use.
 */
export interface DragonBenchBuild {
  source: SpecimenSource;
  combatProfile: AssemblyCombatProfile;
  fireBreathing: boolean;
}

export function createDragonBenchBuild(
  id: string,
  genome: DragonLabGenome,
  options: { label?: string; generation?: number; identity?: DragonIdentityPaint } = {},
): DragonBenchBuild {
  const generation = options.generation ?? 0;
  const engineGenome = createVisualGenome(id, genome, generation, options.identity);
  const build = createEducationalAssembly(genome, engineGenome, options.identity);

  return {
    source: {
      kind: 'descriptor',
      descriptor: describeSpecimen(id, withFoldedWings(build.assembly), {
        label: options.label ?? id,
        profileId: DRAGON_SPECIMEN_PROFILE_ID,
        generation,
        accentColor: options.identity?.color ?? expressDragonPhenotype(engineGenome).scaleColor,
        traits: buildDragonTraitReadouts(expressDragonPhenotype(engineGenome), genome),
      }),
    },
    combatProfile: build.combatProfile,
    fireBreathing: showsDominantPhenotype(genome.fire, 'fire'),
  };
}

/**
 * Full phenotype test-bed build used to validate traits before the Allele Vault consumes them.
 * It still ends in the same assembly descriptor and renderer as every other real dragon.
 */
export function createExpressiveDragonBenchBuild(
  id: string,
  profile: ExpressiveDragonProfile,
  options: {
    label?: string;
    generation?: number;
    identity?: DragonIdentityPaint;
  } = {},
): DragonBenchBuild {
  const generation = options.generation ?? 0;
  const coreGenome = toCoreLabGenome(profile);
  const bodyColor = showsExpressiveDominant(
    profile,
    EXPRESSIVE_DRAGON_TRAITS.find((trait) => trait.id === 'body-color')!,
  );
  const identity: DragonIdentityPaint =
    options.identity ??
    (bodyColor
      ? { color: '#98552f', accentColor: '#e3a75d' }
      : { color: '#287b78', accentColor: '#75d0c1' });
  const engineGenome = createVisualGenome(id, coreGenome, generation, identity);
  // Tail length stays fixed here: the K locus changes the club end, not the whole tail.
  engineGenome.loci['tail-length'].maternal.value = 0.62;
  engineGenome.loci['tail-length'].paternal.value = 0.62;

  const build = createEducationalAssembly(coreGenome, engineGenome, identity, {
    legPairs: dominant(profile, 'legs') ? 2 : 1,
    clawScale: dominant(profile, 'claws') ? 1.5 : 0.62,
    crestScale: dominant(profile, 'crest') ? 1.35 : 0.42,
    earShape: dominant(profile, 'ears') ? 'pointed' : 'rounded',
    fangScale: dominant(profile, 'fangs') ? 1.5 : 0.58,
    backSpikeCount: dominant(profile, 'spikes') ? 10 : 3,
    backSpikeScale: dominant(profile, 'spikes') ? 1.15 : 0.52,
    eyeColor: dominant(profile, 'eye-color') ? '#ff9f2e' : '#46a9ff',
    sex: profile.sex,
    tailClubForm: tailClubForm(profile),
  });

  return {
    source: {
      kind: 'descriptor',
      descriptor: describeSpecimen(id, withFoldedWings(build.assembly), {
        label: options.label ?? id,
        profileId: DRAGON_SPECIMEN_PROFILE_ID,
        generation,
        accentColor: identity.color,
        traits: buildExpressiveTraitReadouts(profile),
      }),
    },
    combatProfile: build.combatProfile,
    fireBreathing: dominant(profile, 'fire'),
  };
}

const sexedParentSources = new WeakMap<
  DragonParentProfile,
  Partial<Record<DragonSex, SpecimenSource>>
>();

/**
 * A full live-canvas build for a hatchery parent. The four inherited lab genes
 * come from the selected parent record; the additional expressive loci use the
 * shared test-bench baseline until the hatchery data model carries those loci.
 * Sex is explicit so the renderer applies the female or male head/frill anatomy.
 */
export function dragonParentCanvasSource(
  parent: DragonParentProfile,
  sex: DragonSex,
): SpecimenSource {
  const cached = sexedParentSources.get(parent)?.[sex];
  if (cached) return cached;

  const profile = dragonParentExpressiveProfile(parent, sex);
  const source = createExpressiveDragonBenchBuild(`${parent.id}-${sex}`, profile, {
    label: `${parent.name} · ${sex}`,
    identity: { color: parent.color, accentColor: parent.accentColor },
  }).source;
  const entries = sexedParentSources.get(parent) ?? {};
  entries[sex] = source;
  sexedParentSources.set(parent, entries);
  return source;
}

/**
 * The complete genome used by the Hatchery parent renderer and its meiosis instrument.
 * Keeping this expansion in one function means chromosome labels, gametes, and the live parent
 * dragon cannot silently disagree while the four-gene lab record is being migrated to the full
 * expressive genome.
 */
export function dragonParentExpressiveProfile(
  parent: DragonParentProfile,
  sex: DragonSex,
): ExpressiveDragonProfile {
  return {
    sex,
    genome: {
      ...DEFAULT_EXPRESSIVE_DRAGON.genome,
      wings: parent.genome.wings,
      fire: parent.genome.fire,
      horns: parent.genome.horns,
      scales: parent.genome.scales,
      'eye-color': sex === 'male' ? ['E', 'Y'] : ['E', 'e'],
    },
  };
}

function buildExpressiveTraitReadouts(profile: ExpressiveDragonProfile): SpecimenTraitReadout[] {
  return [
    {
      id: 'sex-chromosomes',
      label: 'Modeled sex',
      valueLabel: `${profile.sex === 'female' ? 'Female' : 'Male'} · ${sexChromosomes(profile.sex)}`,
      detail:
        'This fictional dragon population uses an XX/XY model; real species use many systems.',
      roles: ['head'],
    },
    ...EXPRESSIVE_DRAGON_TRAITS.map((trait) => ({
      id: `trait:${trait.id}`,
      label: trait.name,
      valueLabel: `${displayExpressiveGenotype(profile, trait.id)} · ${expressivePhenotype(profile, trait)}`,
      detail: `${trait.chromosome}${trait.inheritance === 'x-linked' ? ' · X-linked' : trait.inheritance === 'incomplete-dominance' ? ' · Incomplete dominance' : ''}. ${trait.description}`,
      roles: expressiveTraitRoles(trait.id),
      expressed: showsExpressiveDominant(profile, trait),
    })),
  ];
}

function dominant(profile: ExpressiveDragonProfile, traitId: ExpressiveDragonTraitId): boolean {
  const trait = EXPRESSIVE_DRAGON_TRAITS.find((candidate) => candidate.id === traitId);
  return !!trait && showsExpressiveDominant(profile, trait);
}

function tailClubForm(profile: ExpressiveDragonProfile): 'large' | 'intermediate' | 'small' {
  const [first, second] = profile.genome.tail;
  if (first === 'K' && second === 'K') return 'large';
  if (first === 'k' && second === 'k') return 'small';
  return 'intermediate';
}

function displayExpressiveGenotype(
  profile: ExpressiveDragonProfile,
  traitId: ExpressiveDragonTraitId,
): string {
  const pair = profile.genome[traitId];
  if (traitId === 'eye-color') {
    return pair[1] === 'Y' ? `X${pair[0]}Y` : `X${pair[0]}X${pair[1]}`;
  }
  return pair.join('');
}

function expressiveTraitRoles(traitId: ExpressiveDragonTraitId): readonly AssemblyPartRole[] {
  switch (traitId) {
    case 'wings':
      return ['wing'];
    case 'tail':
      return ['tail'];
    case 'legs':
    case 'claws':
      return ['leg'];
    case 'fire':
    case 'fangs':
      return ['jaw'];
    case 'horns':
    case 'crest':
    case 'ears':
    case 'eye-color':
      return ['head'];
    case 'spikes':
      return ['core'];
    case 'scales':
    case 'body-color':
      return [];
  }
}

/**
 * A hatched offspring. Its assembly was already built and its combat profile
 * already tuned, so this reuses that blueprint rather than re-expressing — the
 * student inspects the exact animal in their clutch.
 */
const offspringSources = new WeakMap<DragonOffspring, SpecimenSource>();

export function dragonOffspringSource(offspring: DragonOffspring): SpecimenSource {
  // Memoised for the same reason as parents — see `parentSources`. An offspring
  // object is replaced whenever the clutch changes, so the cache turns over
  // exactly when the animal actually does.
  const cached = offspringSources.get(offspring);
  if (cached) return cached;

  const source: SpecimenSource = {
    kind: 'descriptor',
    descriptor: describeSpecimen(offspring.id, withFoldedWings(offspring.assembly), {
      label: offspring.name,
      profileId: DRAGON_SPECIMEN_PROFILE_ID,
      generation: offspring.generation,
      accentColor: offspring.accentColor,
      traits: buildDragonTraitReadouts(
        expressDragonPhenotype(offspring.engineGenome),
        offspring.genome,
      ),
    }),
  };
  offspringSources.set(offspring, source);
  return source;
}

// ---------------------------------------------------------------------------
// Expression
// ---------------------------------------------------------------------------

function describeEngineGenome(
  genome: DragonGenome,
  options: SpecimenExpressOptions,
): SpecimenDescriptor {
  const generated = generateDragonAssembly(PUBLISHED_CLASSIC_DRAGON_PRESET.state, genome);
  return describeSpecimen(options.id ?? genome.id, withFoldedWings(generated.blueprint), {
    label: options.label ?? genome.id,
    profileId: DRAGON_SPECIMEN_PROFILE_ID,
    generation: options.generation ?? genome.generation,
    accentColor: generated.phenotype.scaleColor,
    traits: buildDragonTraitReadouts(generated.phenotype, null),
  });
}

function describeLabGenome(
  genome: DragonLabGenome,
  options: SpecimenExpressOptions,
  identity?: DragonIdentityPaint,
): SpecimenDescriptor {
  const id = options.id ?? 'dragon-specimen';
  const generation = options.generation ?? 0;
  const engineGenome = createVisualGenome(id, genome, generation, identity);
  // Same call the hatchery makes, so a wingless genotype loses its wings here
  // exactly as it does in the clutch and in the arena.
  const build = createEducationalAssembly(genome, engineGenome, identity);

  return describeSpecimen(id, withFoldedWings(build.assembly), {
    label: options.label ?? id,
    profileId: DRAGON_SPECIMEN_PROFILE_ID,
    generation,
    accentColor: identity?.color ?? expressDragonPhenotype(engineGenome).scaleColor,
    traits: buildDragonTraitReadouts(expressDragonPhenotype(engineGenome), genome),
  });
}

/**
 * Trait readouts, roles taken from {@link DRAGON_LOCUS_VISUALS} so the
 * highlight always matches the geometry the same table produced.
 *
 * When a lab genome is supplied, the Mendelian traits lead — those are the ones
 * the student reasoned about — and the continuous measurements follow as the
 * physical consequence.
 */
export function buildDragonTraitReadouts(
  phenotype: DragonPhenotype,
  labGenome: DragonLabGenome | null,
): SpecimenTraitReadout[] {
  const readouts: SpecimenTraitReadout[] = [];

  if (labGenome) {
    for (const trait of DRAGON_TRAITS) {
      const genotype = labGenome[trait.id];
      const dominant = showsDominantPhenotype(genotype, trait.id);
      readouts.push({
        id: `trait:${trait.id}`,
        label: trait.name,
        valueLabel: `${genotype.join('')} — ${dominant ? trait.dominantPhenotype : trait.recessivePhenotype}`,
        detail: trait.description,
        roles: labTraitRoles(trait.id),
        // Structured, so a flat renderer never has to read the copy to find out
        // whether this dragon has wings.
        expressed: dominant,
      });
    }
  }

  readouts.push(
    measurement('body-size', 'Body size', phenotype.bodyScale, 0.78, 1.33),
    measurement('wing-span', 'Wing span', phenotype.wingSpanScale, 0.72, 1.57),
    measurement('jaw-strength', 'Jaw size', phenotype.jawScale, 0.78, 1.43),
    measurement('tail-length', 'Tail length', phenotype.tailScale, 0.75, 1.55),
    {
      id: 'armor-density',
      label: 'Armour density',
      valueLabel: `${Math.round(phenotype.armorDensity * 100)}%`,
      detail: 'Thicker armour raises the health of the body and armoured parts.',
      roles: rolesFor('armor-density'),
      normalized: phenotype.armorDensity,
    },
    {
      id: 'pigment-hue',
      label: 'Scale colour',
      valueLabel: `Hue ${Math.round(phenotype.pigmentHue)}°`,
      detail: 'Pigment repaints every part, including horn, membrane, and claw tones.',
      roles: rolesFor('pigment-hue'),
    },
  );

  return readouts;
}

function measurement(
  locus: DragonGeneLocus,
  label: string,
  value: number,
  min: number,
  max: number,
): SpecimenTraitReadout {
  return {
    id: locus,
    label,
    valueLabel: `${value.toFixed(2)}x`,
    roles: rolesFor(locus),
    normalized: clamp01((value - min) / Math.max(max - min, 1e-6)),
  };
}

function rolesFor(locus: DragonGeneLocus): readonly AssemblyPartRole[] {
  return DRAGON_LOCUS_VISUALS[locus].roles;
}

/** Maps a lab trait onto the parts its dominant phenotype adds or shapes. */
function labTraitRoles(traitId: string): readonly AssemblyPartRole[] {
  switch (traitId) {
    case 'wings':
      return rolesFor('wing-span');
    case 'fire':
      return rolesFor('jaw-strength');
    case 'horns':
      return rolesFor('armor-density');
    // Scale pattern repaints the whole animal; no single part owns it.
    default:
      return [];
  }
}

function isDragonSpecimenGenome(value: unknown): value is DragonSpecimenGenome {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { kind?: unknown; genome?: unknown };
  if (typeof candidate.genome !== 'object' || candidate.genome === null) return false;

  if (candidate.kind === 'engine') {
    const genome = candidate.genome as Partial<DragonGenome>;
    return typeof genome.loci === 'object' && genome.loci !== null;
  }

  if (candidate.kind === 'lab') {
    const genome = candidate.genome as Record<string, unknown>;
    return DRAGON_TRAITS.every((trait) => {
      const genotype = genome[trait.id];
      return (
        Array.isArray(genotype) &&
        genotype.length === 2 &&
        genotype.every((allele) => typeof allele === 'string')
      );
    });
  }

  return false;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
