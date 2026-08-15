import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../../data/published-dragon-models';
import { AssemblyBlueprint } from '../../../../shared/assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import { cloneAssemblyBlueprint } from '../../../../shared/assembly/domain/assembly-clone';
import {
  createFounderDragonGenome,
  generateDragonAssembly,
  realignPartsToJoints,
} from './dragon-phenotype-builder';
import { dragonBodySurfacePoint } from '../../../../shared/assembly/rendering/dragon-body-profile';
import {
  DragonLabGenome,
  DragonBredProfile,
  DragonGameteGenome,
  DragonOffspring,
  DragonParentProfile,
  DragonTraitDefinition,
  DragonTraitGenotype,
  DragonTraitId,
  PairDiversityAnalysis,
  PunnettCell,
} from './dragon-lab.models';

export const DRAGON_TRAITS: readonly DragonTraitDefinition[] = [
  {
    id: 'wings',
    name: 'Wings',
    geneSymbol: 'W',
    chromosomeModel: 1,
    dominantAllele: 'W',
    recessiveAllele: 'w',
    dominantPhenotype: 'Winged',
    recessivePhenotype: 'Wingless',
    description: 'In this simplified model, one W allele is enough for wings to develop.',
  },
  {
    id: 'fire',
    name: 'Fire breathing',
    geneSymbol: 'F',
    chromosomeModel: 2,
    dominantAllele: 'F',
    recessiveAllele: 'f',
    dominantPhenotype: 'Breathes fire',
    recessivePhenotype: 'Does not breathe fire',
    description: 'The F allele is dominant in the hatchery model.',
  },
  {
    id: 'scales',
    name: 'Scale pattern',
    geneSymbol: 'S',
    chromosomeModel: 3,
    dominantAllele: 'S',
    recessiveAllele: 's',
    dominantPhenotype: 'Spotted scales',
    recessivePhenotype: 'Solid scales',
    description: 'Spotted scales are the dominant pattern in this model.',
  },
  {
    id: 'horns',
    name: 'Horns',
    geneSymbol: 'H',
    chromosomeModel: 4,
    dominantAllele: 'H',
    recessiveAllele: 'h',
    dominantPhenotype: 'Horned',
    recessivePhenotype: 'Smooth-headed',
    description: 'Horns appear when at least one H allele is inherited.',
  },
];

export const DRAGON_PARENTS: readonly DragonParentProfile[] = [
  profile('ember', 'Ember', 'Volcanic scout', '#d94841', '#ffb45e', {
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['h', 'h'],
  }),
  profile('tide', 'Tide', 'Coastal navigator', '#3679b8', '#73d5e8', {
    wings: ['w', 'w'],
    fire: ['F', 'f'],
    scales: ['s', 's'],
    horns: ['H', 'h'],
  }),
  profile('moss', 'Moss', 'Forest guardian', '#4f814d', '#add46f', {
    wings: ['W', 'w'],
    fire: ['f', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
  }),
  profile('quartz', 'Quartz', 'Mountain glider', '#7d66a5', '#d8b6f0', {
    wings: ['W', 'W'],
    fire: ['f', 'f'],
    scales: ['s', 's'],
    horns: ['h', 'h'],
  }),
];

export function getTrait(traitId: DragonTraitId): DragonTraitDefinition {
  const trait = DRAGON_TRAITS.find((item) => item.id === traitId);
  if (!trait) throw new Error(`Unknown dragon trait: ${traitId}`);
  return trait;
}

export function normalizeGenotype(genotype: DragonTraitGenotype): DragonTraitGenotype {
  return [...genotype].sort((left, right) => {
    const leftDominant = left === left.toUpperCase();
    const rightDominant = right === right.toUpperCase();
    return leftDominant === rightDominant ? left.localeCompare(right) : leftDominant ? -1 : 1;
  }) as DragonTraitGenotype;
}

export function genotypeLabel(genotype: DragonTraitGenotype): string {
  return normalizeGenotype(genotype).join('');
}

export function isHeterozygous(genotype: DragonTraitGenotype): boolean {
  return genotype[0] !== genotype[1];
}

export function showsDominantPhenotype(
  genotype: DragonTraitGenotype,
  traitId: DragonTraitId,
): boolean {
  return genotype.includes(getTrait(traitId).dominantAllele);
}

export function phenotypeLabel(profile: DragonParentProfile, traitId: DragonTraitId): string {
  const trait = getTrait(traitId);
  return showsDominantPhenotype(profile.genome[traitId], traitId)
    ? trait.dominantPhenotype
    : trait.recessivePhenotype;
}

export function buildPunnettCells(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  traitId: DragonTraitId,
): PunnettCell[] {
  const cells: PunnettCell[] = [];
  for (const rowAllele of parentA.genome[traitId]) {
    for (const columnAllele of parentB.genome[traitId]) {
      const genotype = normalizeGenotype([rowAllele, columnAllele]);
      cells.push({
        rowAllele,
        columnAllele,
        genotype,
        showsDominantPhenotype: showsDominantPhenotype(genotype, traitId),
      });
    }
  }
  return cells;
}

export function dominantPhenotypeProbability(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  traitId: DragonTraitId,
): number {
  const cells = buildPunnettCells(parentA, parentB, traitId);
  return Math.round(
    (100 * cells.filter((cell) => cell.showsDominantPhenotype).length) / cells.length,
  );
}

export function breedLabClutch(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  run: number,
  size = 8,
): DragonOffspring[] {
  return breedLabOffspringProfiles(parentA, parentB, run, size).map((dragon) => {
    const engineGenome = createVisualGenome(dragon.id, dragon.genome, dragon.generation);
    const build = createEducationalAssembly(dragon.genome, engineGenome);
    return {
      ...dragon,
      engineGenome,
      assembly: build.assembly,
      combatProfile: build.combatProfile,
    };
  });
}

/**
 * Breeds the same deterministic offspring as {@link breedLabClutch} without eagerly generating a
 * 3D assembly for every animal. Population instruments can handle batches of 100 cheaply, then
 * materialize only the specimens that actually enter a renderer.
 */
export function breedLabOffspringProfiles(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  run: number,
  size = 8,
): DragonBredProfile[] {
  return Array.from({ length: size }, (_, index) => {
    const seed = `${parentA.id}:${parentB.id}:${run}:${index}`;
    const genome = Object.fromEntries(
      DRAGON_TRAITS.map((trait) => [
        trait.id,
        normalizeGenotype([
          selectAllele(parentA.genome[trait.id], `${seed}:${trait.id}:a`),
          selectAllele(parentB.genome[trait.id], `${seed}:${trait.id}:b`),
        ]),
      ]),
    ) as DragonLabGenome;
    const id = `clutch-${run}-${index + 1}`;
    const color = offspringColor(`${parentA.id}:${parentB.id}:${run}`, index);
    return {
      id,
      name: `Hatchling ${index + 1}`,
      title: `Generation ${run}`,
      color,
      accentColor: accentTone(color),
      genome,
      parentIds: [parentA.id, parentB.id],
      generation: run,
    };
  });
}

/**
 * Fertilizes two student-selected gametes through the same phenotype and assembly
 * pipeline used by the rest of the Dragon Genetics lab.
 */
export function fertilizeLabGametes(
  eggParent: DragonParentProfile,
  spermParent: DragonParentProfile,
  egg: DragonGameteGenome,
  sperm: DragonGameteGenome,
  offspringId: string,
  generation: number,
  name = `Hatchling ${generation}`,
  /**
   * Position in the clutch this hatchling joins. Only the identity colour reads
   * it, to space this dragon's hue off its siblings' — the hatchery fertilizes
   * one gamete pair at a time, so there is no clutch-wide pass to do it later.
   */
  sequence = 1,
): DragonOffspring {
  const genome = Object.fromEntries(
    DRAGON_TRAITS.map((trait) => [trait.id, normalizeGenotype([egg[trait.id], sperm[trait.id]])]),
  ) as DragonLabGenome;
  const color = offspringColor(`${eggParent.id}:${spermParent.id}:${generation}`, sequence);
  const engineGenome = createVisualGenome(offspringId, genome, generation);
  const build = createEducationalAssembly(genome, engineGenome);

  return {
    id: offspringId,
    name,
    title: `Generation ${generation}`,
    color,
    accentColor: accentTone(color),
    genome,
    parentIds: [eggParent.id, spermParent.id],
    generation,
    engineGenome,
    assembly: build.assembly,
    combatProfile: build.combatProfile,
  };
}

export function countDominantPhenotypes(
  clutch: readonly DragonOffspring[],
  traitId: DragonTraitId,
): number {
  return clutch.filter((dragon) => showsDominantPhenotype(dragon.genome[traitId], traitId)).length;
}

export function analyzePairDiversity(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
): PairDiversityAnalysis {
  let alleleRichness = 0;
  let heterozygousCells = 0;
  for (const trait of DRAGON_TRAITS) {
    const alleles = new Set([...parentA.genome[trait.id], ...parentB.genome[trait.id]]);
    alleleRichness += alleles.size / 2;
    heterozygousCells +=
      buildPunnettCells(parentA, parentB, trait.id).filter((cell) => isHeterozygous(cell.genotype))
        .length / 4;
  }
  const alleleRichnessPercent = Math.round((100 * alleleRichness) / DRAGON_TRAITS.length);
  const expectedHeterozygosityPercent = Math.round(
    (100 * heterozygousCells) / DRAGON_TRAITS.length,
  );
  const score = Math.round(alleleRichnessPercent * 0.6 + expectedHeterozygosityPercent * 0.4);

  return {
    pairId: [parentA.id, parentB.id].sort().join('--'),
    parentIds: [parentA.id, parentB.id],
    alleleRichnessPercent,
    expectedHeterozygosityPercent,
    score,
    summary:
      score >= 75
        ? 'This pair preserves many modeled alleles and can produce varied offspring.'
        : score >= 55
          ? 'This pair preserves some variation, with fewer possible combinations at some genes.'
          : 'This pair has a narrower modeled gene pool. Repeating only this cross could reduce variation.',
  };
}

export function allParentPairAnalyses(): PairDiversityAnalysis[] {
  const analyses: PairDiversityAnalysis[] = [];
  for (let first = 0; first < DRAGON_PARENTS.length; first += 1) {
    for (let second = first + 1; second < DRAGON_PARENTS.length; second += 1) {
      analyses.push(analyzePairDiversity(DRAGON_PARENTS[first], DRAGON_PARENTS[second]));
    }
  }
  return analyses.sort(
    (left, right) => right.score - left.score || left.pairId.localeCompare(right.pairId),
  );
}

function profile(
  id: string,
  name: string,
  title: string,
  color: string,
  accentColor: string,
  genome: DragonLabGenome,
): DragonParentProfile {
  return { id, name, title, color, accentColor, genome };
}

function selectAllele(genotype: DragonTraitGenotype, seed: string): string {
  return genotype[stableHash(seed) % 2];
}

/**
 * How a dragon's identity colour reaches the engine genome.
 *
 * `pigment-hue` is a single 0..1 scalar that `expressDragonPhenotype` turns
 * back into `hsl(hue …)`, so an exact brand colour cannot survive the round
 * trip. Callers that have one pass it here: the scalar keeps the *engine*
 * roughly in agreement (it drives arena tinting and thumbnail accents), and
 * `createEducationalAssembly` repaints the parts with the exact value.
 */
export interface DragonIdentityPaint {
  /** Base scale colour — the dragon's card colour. */
  color: string;
  /** Second tone, shown only on a dragon expressing spotted scales. */
  accentColor: string;
}

export function createVisualGenome(
  id: string,
  genome: DragonLabGenome,
  generation: number,
  identity?: DragonIdentityPaint,
) {
  const winged = showsDominantPhenotype(genome.wings, 'wings');
  const fire = showsDominantPhenotype(genome.fire, 'fire');
  const horned = showsDominantPhenotype(genome.horns, 'horns');

  const visual = createFounderDragonGenome(id, {
    /*
     * Body size, tail length, and temperament are individual variation, not
     * modelled genes. They are hashed off the dragon's id so they are stable
     * for a given animal and clearly not something a student can predict from
     * the four-gene Punnett square — which is the honest representation, since
     * the lesson does not model them.
     */
    'body-size': 0.42 + (stableHash(`${id}:body`) % 40) / 100,
    'tail-length': 0.4 + (stableHash(`${id}:tail`) % 35) / 100,
    temperament: 0.35 + (stableHash(`${id}:temperament`) % 45) / 100,

    /*
     * The four modelled genes. Each is binary on purpose: `Ww` and `WW` must
     * produce an identical animal, because "the heterozygote is
     * indistinguishable from the homozygous dominant" is the single idea the
     * whole hatchery is teaching. Anything continuous here would leak the
     * genotype into the phenotype and quietly destroy the lesson.
     */
    'wing-span': winged ? 0.78 : 0.04,
    'jaw-strength': fire ? 0.76 : 0.3,
    'armor-density': horned ? 0.72 : 0.25,
    /*
     * Pigment is *identity*, not a trait readout. It used to encode the scales
     * genotype, which meant Ember and Moss rendered as the same animal whenever
     * their scale genes matched, and it taught students that the S gene changes
     * hue — which it does not. Scale pattern now shows as a pattern (see
     * `createEducationalAssembly`) and colour says who this dragon is.
     */
    'pigment-hue': identity ? hueScalar(identity.color) : 0.28,
  });
  visual.generation = generation;
  return visual;
}

export interface EducationalDragonBuild {
  assembly: AssemblyBlueprint;
  combatProfile: AssemblyCombatProfile;
}

/** Parts that carry the bioluminescent row when the `N` locus expresses it. */
const GLOWING_PROFILE_IDS = new Set([
  'dragon-body',
  'dragon-head-horned',
  'dragon-tail',
  'dragon-tail-club',
  'dragon-tail-stinger',
]);

/** Visible controls carried by one expressed dragon, never by the global Parts Lab style. */
export interface DragonVisualExpression {
  /**
   * The front limb's body plan.
   *
   * `walking` is the quadruped: four weight-bearing legs, the shipped skeleton
   * untouched. `grasping` swaps the front chain for a short arm ending in a
   * three-fingered hand, held clear of the ground.
   *
   * This replaced deleting the front legs outright. An absence is a poor
   * phenotype: a student comparing two dragons could see that one had fewer
   * limbs but had nothing to *read* on the recessive animal, and a dragon
   * balanced on two legs with no counterweight looked broken rather than
   * different. A grasping arm is the same recessive call with something visible
   * on the other side of it.
   */
  forelimbs?: 'walking' | 'grasping';
  clawScale?: number;
  crestScale?: number;
  /** Living lanterns down the flanks, throat and tail. */
  glowMarkings?: boolean;
  fangScale?: number;
  backSpikeCount?: number;
  backSpikeScale?: number;
  eyeColor?: string;
  sex?: 'female' | 'male';
  tailClubForm?: 'large' | 'intermediate' | 'small';
}

/**
 * Turns a four-gene lab genotype into the actual animal.
 *
 * Each modelled gene gets its own visual channel, and they are deliberately
 * different *kinds* of change so no two can be confused for one another:
 *
 * | Gene   | Channel                                           |
 * |--------|---------------------------------------------------|
 * | wings  | wing parts present or absent                      |
 * | horns  | horned skull or smooth snout                      |
 * | scales | two-tone patterning or a single solid colour      |
 * | fire   | jaw size, plus the fire ability in combat         |
 *
 * Colour is reserved for identity — see the note on `pigment-hue` in
 * {@link createVisualGenome}.
 */
export function createEducationalAssembly(
  genome: DragonLabGenome,
  engineGenome: ReturnType<typeof createFounderDragonGenome>,
  identity?: DragonIdentityPaint,
  expression: DragonVisualExpression = {},
): EducationalDragonBuild {
  const generated = generateDragonAssembly(PUBLISHED_CLASSIC_DRAGON_PRESET.state, engineGenome);
  let blueprint = cloneAssemblyBlueprint(generated.blueprint);

  if (!showsDominantPhenotype(genome.wings, 'wings')) {
    const removedIds = new Set(
      blueprint.parts.filter((part) => part.roles?.includes('wing')).map((part) => part.id),
    );
    blueprint = {
      parts: blueprint.parts.filter((part) => !removedIds.has(part.id)),
      joints: blueprint.joints.filter(
        (joint) => !removedIds.has(joint.parentPartId) && !removedIds.has(joint.childPartId),
      ),
    };
  }

  /*
   * Horns: retract them on the one skull rather than bolting parts on or
   * swapping the profile. This used to switch to `dragon-head-snout`, which no
   * longer exists — the skull now carries the trait through the horn lengths it
   * already reads, so a hornless dragon is smooth-headed at no collision cost.
   * Interim: a hornless head deserves a silhouette of its own, not just the
   * horned one with the horns taken off.
   */
  if (!showsDominantPhenotype(genome.horns, 'horns')) {
    /*
     * Two parts carry horns, so both have to be stripped: the skull wears the
     * forward pair and the brow spikes, and the upper jaw wears the nose horn.
     * Zeroing only the head left a hornless dragon with a horn on its snout.
     */
    blueprint.parts = blueprint.parts.map((part) => {
      const profileId = part.visualProfile?.profileId;
      if (!part.visualProfile) return part;
      if (profileId === 'dragon-head-horned') {
        return {
          ...part,
          visualProfile: {
            ...part.visualProfile,
            parameters: {
              ...(part.visualProfile.parameters ?? {}),
              hornLength: 0,
              browLength: 0,
            },
          },
        };
      }
      if (profileId === 'dragon-upper-jaw') {
        return {
          ...part,
          visualProfile: {
            ...part.visualProfile,
            parameters: { ...(part.visualProfile.parameters ?? {}), noseHornLength: 0 },
          },
        };
      }
      return part;
    });
  }

  blueprint.parts = blueprint.parts.map((part) => {
    const profileId = part.visualProfile?.profileId ?? '';
    const parameters: Record<string, string | number | boolean> = {
      ...(part.visualProfile?.parameters ?? {}),
    };
    if (profileId === 'dragon-body') {
      if (expression.backSpikeCount !== undefined)
        parameters['backSpikeCount'] = expression.backSpikeCount;
      if (expression.backSpikeScale !== undefined)
        parameters['backSpikeScale'] = expression.backSpikeScale;
    }
    if (profileId.startsWith('dragon-head-')) {
      if (expression.crestScale !== undefined) parameters['crestScale'] = expression.crestScale;
      if (expression.eyeColor) parameters['eyeColor'] = expression.eyeColor;
      if (expression.sex) parameters['sex'] = expression.sex;
    }
    /*
     * Glow is the one expression that runs the length of the animal rather than
     * belonging to a single body part. Whichever way a dragon is turned, and
     * however small the thumbnail, some of it is lit — which is the entire
     * reason this trait replaced ear shape.
     */
    if (expression.glowMarkings !== undefined && GLOWING_PROFILE_IDS.has(profileId)) {
      parameters['glowMarkings'] = expression.glowMarkings;
    }
    if (profileId === 'dragon-upper-jaw' || profileId === 'dragon-lower-jaw') {
      if (expression.fangScale !== undefined) parameters['fangScale'] = expression.fangScale;
    }
    // The hand takes the claw gene too: those are the same claws, and the swap
    // to a grasping forelimb happens after this pass, so the front foot is
    // still a foot when the parameter is written.
    if (profileId === 'dragon-foot' && expression.clawScale !== undefined) {
      parameters['clawScale'] = expression.clawScale;
    }
    if (
      expression.tailClubForm &&
      (profileId === 'dragon-tail-stinger' || profileId === 'dragon-tail-club') &&
      part.visualProfile
    ) {
      const form = expression.tailClubForm;
      const size =
        form === 'large'
          ? { x: 0.34, y: 0.46, z: 0.46, mass: 0.72 }
          : form === 'intermediate'
            ? { x: 0.26, y: 0.38, z: 0.32, mass: 0.52 }
            : { x: 0.19, y: 0.3, z: 0.2, mass: 0.34 };
      parameters['tailClubSpikeCount'] = form === 'large' ? 10 : form === 'intermediate' ? 5 : 0;
      parameters['tailClubSpikeScale'] =
        form === 'large' ? 1.2 : form === 'intermediate' ? 0.78 : 0;
      return {
        ...part,
        label: `${form[0].toUpperCase()}${form.slice(1)} tail club`,
        shape: 'sphere',
        dimensions: { x: size.x, y: size.y, z: size.z },
        mass: size.mass,
        visualProfile: {
          ...part.visualProfile,
          profileId: 'dragon-tail-club',
          parameters,
        },
      };
    }
    return Object.keys(parameters).length && part.visualProfile
      ? { ...part, visualProfile: { ...part.visualProfile, parameters } }
      : part;
  });

  if (expression.forelimbs === 'grasping') {
    applyGraspingForelimbs(blueprint);
  }

  /*
   * Colour. Three tones belong to the **dragon**, drawn per animal rather than
   * from its genome — colour is identity here, not a trait readout, for the
   * reason set out on `offspringColor`.
   *
   * Every part is painted from that one set of three, and each takes a *pair* of
   * them: a ground colour and a colour for its markings. Which pair varies by
   * part, so the legs can be a different two of the three from the body, and the
   * animal reads as one three-colour scheme rearranged rather than as three
   * differently-coloured animals bolted together.
   */
  const tones = dragonTones(blueprint, identity);

  /*
   * Scale pattern.
   *
   * The `S` phenotype decides *whether* the skin is patterned; which pattern it
   * gets — splotches or zig-zag stripes — is drawn per dragon from its own
   * identity, alongside the colours and for the same reason.
   *
   * A patterned dragon shows the gene as *two pigments on every surface* rather
   * than as a darker shade of one. That is a stronger channel than the colour
   * banding this replaced, and unlike the banding it survives being looked at
   * closely as well as at 120px.
   *
   * `spotted` is a *phenotype* call. `showsDominantPhenotype` returns the same
   * answer for `SS` and `Ss`, and it has to stay that way: this is a visible
   * channel, so reading zygosity here would let a student tell a heterozygote by
   * eye. See the test in `dragon-inheritance.spec.ts`.
   */
  const spotted = showsDominantPhenotype(genome.scales, 'scales');
  const pattern = spotted ? scalePatternFor(tones[0]) : SCALE_PATTERN_PLAIN;

  // Both halves of a part's paint in one pass: its ground colour on the part, and
  // the colour its markings are drawn in on the visual profile. Set on every part
  // rather than one profile, because every scaled surface — body, legs, tail,
  // head, jaws, feet — takes the same skin.
  blueprint.parts = blueprint.parts.map((part) => {
    const [ground, marking] = tonePairFor(part.id, tones);
    return {
      ...part,
      color: ground,
      visualProfile: part.visualProfile
        ? {
            ...part.visualProfile,
            parameters: {
              ...(part.visualProfile.parameters ?? {}),
              scalePattern: pattern,
              patternColor: marking,
            },
          }
        : part.visualProfile,
    };
  });

  // The genome-tuned combat profile (armor from horns, damage from temperament)
  // travels with the assembly so the arena fights with these numbers instead of
  // regenerating defaults. Prune entries for parts removed by the genotype.
  const partIds = new Set(blueprint.parts.map((part) => part.id));
  const combatProfile: AssemblyCombatProfile = {
    ...generated.combatProfile,
    parts: Object.fromEntries(
      Object.entries(generated.combatProfile.parts).filter(([partId]) => partIds.has(partId)),
    ),
  };

  return { assembly: blueprint, combatProfile };
}

// ---------------------------------------------------------------------------
// The grasping forelimb.
// ---------------------------------------------------------------------------

/**
 * How much smaller a grasping arm is than the walking leg it replaces.
 *
 * One number for the whole chain, so the arm stays a scaled-down limb rather
 * than a set of three separately guessed parts, and so the genetics pipeline's
 * own per-genome scaling still reads through it.
 *
 * The ceiling is the forelimb spec, not taste: a grasping limb has to stay
 * lighter than a third of the leg it replaced, and mass goes as the cube, so
 * anything at or above 0.67 makes an arm that weighs like a leg.
 */
const GRASP_ARM_SCALE = 0.64;
const GRASP_HAND_SCALE = 0.62;

/**
 * Where the arm meets the torso, in radians around the spine from the belly.
 *
 * Higher than `HIP_ANGLE` (0.66) in the part catalog, and that is the anatomy:
 * a leg hangs off the bottom of the ribcage to get under the animal's weight,
 * while an arm that only reaches is slung on the side of the chest. Mounting it
 * at the hip station left the hands dangling below the belly, which reads as a
 * dragon with two long legs and two withered ones rather than as arms.
 */
const SHOULDER_ANGLE = 1.24;

/**
 * Swaps the front walking chain for arms, in place.
 *
 * Rescaling a limb is not just a matter of its dimensions: every joint pivot is
 * a distance in some part's local frame, so a pivot left at full size hangs the
 * new smaller part where the old bigger one used to reach, and the chain comes
 * apart at every seam. Both sides of each pivot are therefore scaled by the
 * factor belonging to *that side's* part, and the chain is re-derived from the
 * joints afterwards — the same pass the phenotype builder runs after it scales
 * a genome's parts, for the same reason.
 */
function applyGraspingForelimbs(blueprint: AssemblyBlueprint): void {
  const body = blueprint.parts.find((part) => part.roles?.includes('core'));
  const isFrontLimb = (id: string): boolean =>
    id.includes('front')
    && Boolean(blueprint.parts.find((part) => part.id === id)?.roles?.includes('leg'));
  const isHand = (id: string): boolean => isFrontLimb(id) && id.includes('foot');

  const factorFor = (id: string): number => (isHand(id) ? GRASP_HAND_SCALE : GRASP_ARM_SCALE);

  blueprint.parts = blueprint.parts.map((part) => {
    if (!isFrontLimb(part.id)) return part;
    const factor = factorFor(part.id);

    return {
      ...part,
      dimensions: {
        x: part.dimensions.x * factor,
        y: part.dimensions.y * factor,
        z: part.dimensions.z * factor,
      },
      // Volume, not length: a limb at 0.64 scale has a quarter of the mass, and
      // the arena reads mass for momentum and the combat profile for health.
      // Leaving it at a leg's weight gives a dragon two heavy dead arms.
      mass: part.mass * factor * factor * factor,
      visualProfile: part.visualProfile
        ? {
            ...part.visualProfile,
            profileId: isHand(part.id) ? 'dragon-grasp-hand' : 'dragon-grasp-arm',
          }
        : part.visualProfile,
    };
  });

  blueprint.joints = blueprint.joints.map((joint) => {
    const childIsLimb = isFrontLimb(joint.childPartId);
    if (!childIsLimb) return joint;

    const parentIsLimb = isFrontLimb(joint.parentPartId);
    const pivotOnChild = scaleVector(joint.pivotOnChild, factorFor(joint.childPartId));

    // The shoulder: re-seated up the flank rather than scaled, because its
    // pivot is on the torso, which has not changed size at all.
    const pivotOnParent = parentIsLimb
      ? scaleVector(joint.pivotOnParent, factorFor(joint.parentPartId))
      : body
        ? shoulderMount(body.dimensions, joint.pivotOnParent)
        : joint.pivotOnParent;

    return { ...joint, pivotOnParent, pivotOnChild };
  });

  realignPartsToJoints(blueprint);
}

/** The shoulder station on the torso, at the same place along it as the old hip. */
function shoulderMount(
  bodyDimensions: { x: number; y: number; z: number },
  hipPivot: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const axialFraction = hipPivot.x / Math.max(bodyDimensions.x, 1e-6);
  const seat = dragonBodySurfacePoint(
    bodyDimensions,
    axialFraction,
    SHOULDER_ANGLE * (hipPivot.z < 0 ? -1 : 1),
  );
  return { x: seat.x, y: seat.y, z: seat.z };
}

function scaleVector(
  vector: { x: number; y: number; z: number },
  factor: number,
): { x: number; y: number; z: number } {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

/**
 * Golden angle. Stepping a hue by this per hatchling walks the whole colour
 * wheel without ever revisiting a neighbourhood, which is what makes a clutch
 * come out as eight distinguishable animals rather than eight shades of two.
 */
const HUE_STEP = 137.508;

/**
 * A bred dragon's identity paint.
 *
 * The clutch seed picks where on the wheel the walk starts and the position in
 * the clutch steps it, so no two hatchlings a student sees side by side share a
 * colour, and two different clutches do not repeat the same run of them.
 * Saturation and lightness jitter per dragon on top.
 *
 * Kept dark on purpose. These are lit by a bright overcast stage against pale
 * sand, and a light pigment there comes back as pastel — the pigment has to
 * start well below the sand to read as a coloured animal standing on it.
 *
 * Nothing here reads the genome, deliberately: colour is identity, not a trait
 * readout (see the note on `pigment-hue` in {@link createVisualGenome}). The
 * previous version keyed the hue off the scales phenotype *and* the fire
 * genotype, which handed a student a way to tell `Ff` from `FF` by eye — the
 * one thing the whole hatchery lesson rests on not being possible.
 *
 * Commas, not spaces. This string is handed straight to `THREE.Color`, whose
 * `hsl()` parser only accepts the comma-separated form — the modern CSS
 * `hsl(h s% l%)` syntax fails to match, and three leaves the colour at its
 * default white. Every bred dragon rendered as a white blank because of it.
 */
function offspringColor(clutchSeed: string, index: number): string {
  const hue = Math.round(((stableHash(clutchSeed) % 360) + index * HUE_STEP) % 360);
  // Widened from 48..67 and 26..35. Those bands were narrow enough that the
  // golden-angle hue walk was doing all the work of telling hatchlings apart,
  // and two dragons a third of the wheel apart still arrived at the same
  // apparent depth. The dark ceiling is unchanged and deliberate — see above.
  const saturation = 52 + (stableHash(`${clutchSeed}:saturation:${index}`) % 26);
  const lightness = 24 + (stableHash(`${clutchSeed}:lightness:${index}`) % 16);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * The `scalePattern` visual parameter's values, as the mesh factory reads them.
 *
 * Numeric because visual parameters are numbers, strings or booleans, and every
 * other pattern-ish parameter in this pipeline is a number.
 */
const SCALE_PATTERN_PLAIN = 0;
const SCALE_PATTERNS = [1, 2] as const;

/**
 * Which patterned skin this dragon wears, drawn from its own base colour.
 *
 * Hashed rather than actually random, and that is the whole trick: a dragon is
 * rendered many times — the viewer, a thumbnail bake, the arena, a pedigree card
 * — and `Math.random()` here would give it a different pattern in each, which
 * reads as a bug rather than as variety. Hashing its colour gives a draw that is
 * stable for the life of the dragon and unrelated to its genome.
 */
function scalePatternFor(baseColor: string): number {
  return SCALE_PATTERNS[stableHash(`${baseColor}:pattern`) % SCALE_PATTERNS.length];
}

/**
 * The three tones a dragon is painted in.
 *
 * The first is its identity colour — the one on its card, which a student uses to
 * tell it from its siblings, so it has to be exactly that and not a derivation.
 * The other two are hue rotations off it, spaced far enough apart that all three
 * read as different colours rather than as one colour lit three ways, with the
 * rotations and the lightness jitter hashed off the base so a dragon keeps its
 * scheme everywhere it is drawn.
 *
 * Falls back to the blueprint's own colours when there is no identity — the parts
 * lab and the published preset take that path, and they still get three tones.
 */
function dragonTones(
  blueprint: AssemblyBlueprint,
  identity?: DragonIdentityPaint,
): [string, string, string] {
  const base =
    identity?.color ??
    blueprint.parts.find((part) => part.id.includes('body'))?.color ??
    blueprint.parts[0]?.color ??
    '#4b6b4a';

  // 60..150° away in each direction: closer and the pair reads as a shading
  // error, further and the two rotations meet on the far side of the wheel.
  const spreadA = 60 + (stableHash(`${base}:tone-a`) % 91);
  const spreadB = 60 + (stableHash(`${base}:tone-b`) % 91);

  return [
    base,
    identity?.accentColor ?? rotateColor(base, spreadA, 8),
    rotateColor(base, -spreadB, stableHash(`${base}:tone-b-light`) % 2 === 0 ? 12 : -6),
  ];
}

/**
 * The two of the dragon's three tones this part wears: ground first, markings
 * second.
 *
 * Drawn per part, so the legs can be a different pair from the body — that is the
 * variety, and it comes out of the same three colours rather than out of new ones.
 *
 * Hashed on a **symmetry-stripped** key, which is the part that matters. Hashing
 * the raw id gives the left leg one pair and the right leg another, and a dragon
 * whose two sides are painted differently reads as broken rather than as varied.
 * Stripping `left`/`right` and any trailing index pairs the limbs up and keeps the
 * links of the tail chain together, while still letting front differ from rear.
 */
function tonePairFor(partId: string, tones: readonly string[]): [string, string] {
  const key = partId.replace(/left|right/g, '').replace(/\d+/g, '');
  const ground = stableHash(`${key}:ground`) % tones.length;
  // Step 1..n-1 round the ring, so the marking can never land on the ground
  // colour — a part painted in one colour twice has no pattern on it at all.
  const step = 1 + (stableHash(`${key}:marking`) % (tones.length - 1));
  return [tones[ground], tones[(ground + step) % tones.length]];
}

/**
 * Rotates a colour's hue and nudges its lightness, keeping the `hsl(h, s%, l%)`
 * form the lab stores and `THREE.Color` parses.
 *
 * Hex input comes back as `hsl(...)` too. Saturation is not recoverable from
 * {@link hueOf}, so a hex base lands on a fixed mid saturation — good enough,
 * because the only hex colours in play are the hand-authored preset ones.
 */
function rotateColor(color: string, degrees: number, lightnessDelta: number): string {
  const hue = ((hueOf(color) ?? 100) + degrees + 360) % 360;
  const hsl = /^hsl\(\s*[\d.]+\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/.exec(color);
  const saturation = hsl ? Number.parseFloat(hsl[1]) : 58;
  const lightness = hsl ? Number.parseFloat(hsl[2]) : 32;

  // Held inside the same dark band `offspringColor` works in: these are lit by a
  // bright overcast stage against pale sand, and a light pigment reads as pastel.
  const clamped = Math.max(20, Math.min(46, lightness + lightnessDelta));
  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(clamped)}%)`;
}

/**
 * A dragon's second tone.
 *
 * This used to be `lightenColor` — the same hue up to 24 points lighter, which is
 * one colour lit twice rather than two colours. A dragon is meant to be painted in
 * three *different* colours now, so the accent takes a hue of its own, rotated by
 * a hashed amount so two dragons with neighbouring base hues do not land on the
 * same scheme.
 */
function accentTone(color: string): string {
  return rotateColor(color, 60 + (stableHash(`${color}:accent`) % 91), 10);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * A colour's hue as the 0..1 scalar the `pigment-hue` locus stores.
 *
 * Inverts `expressDragonPhenotype`, which reads the locus back as
 * `hue = pigment * 320 + 20`. Round-tripping through that formula is lossy —
 * it cannot represent hues below 20° or above 340°, and saturation and
 * lightness are dropped entirely — which is exactly why the parts are also
 * repainted with the literal colour. This only has to be close enough that
 * arena tinting and thumbnail accents land in the right family.
 *
 * Accepts the `#rrggbb` and `hsl(h …)` forms the lab actually stores. Anything
 * else falls back to mid-range rather than throwing: a dragon with an
 * unparseable colour should still render.
 */
function hueScalar(color: string): number {
  const hue = hueOf(color);
  return hue === null ? 0.28 : Math.max(0, Math.min(1, (hue - 20) / 320));
}

function hueOf(color: string): number | null {
  const hslMatch = /^hsl\(\s*([\d.]+)/.exec(color);
  if (hslMatch) return Number.parseFloat(hslMatch[1]) % 360;

  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return null;

  const value = Number.parseInt(hex[1], 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  // Achromatic: no hue to recover, so let the caller use its default.
  if (chroma < 1e-6) return null;

  let hue: number;
  if (max === red) hue = ((green - blue) / chroma) % 6;
  else if (max === green) hue = (blue - red) / chroma + 2;
  else hue = (red - green) / chroma + 4;

  return (((hue * 60) % 360) + 360) % 360;
}
