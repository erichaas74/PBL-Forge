import { PUBLISHED_CLASSIC_DRAGON_PRESET } from '../../../../data/published-dragon-models';
import { AssemblyBlueprint } from '../../../../shared/assembly/domain/assembly.models';
import { AssemblyCombatProfile } from '../../../../shared/assembly/combat/assembly-combat.models';
import { cloneAssemblyBlueprint } from '../../../../shared/assembly/domain/assembly-clone';
import {
  createFounderDragonGenome,
  generateDragonAssembly,
} from './dragon-phenotype-builder';
import {
  DragonLabGenome,
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
    wings: ['W', 'w'], fire: ['F', 'f'], scales: ['S', 's'], horns: ['h', 'h'],
  }),
  profile('tide', 'Tide', 'Coastal navigator', '#3679b8', '#73d5e8', {
    wings: ['w', 'w'], fire: ['F', 'f'], scales: ['s', 's'], horns: ['H', 'h'],
  }),
  profile('moss', 'Moss', 'Forest guardian', '#4f814d', '#add46f', {
    wings: ['W', 'w'], fire: ['f', 'f'], scales: ['S', 's'], horns: ['H', 'h'],
  }),
  profile('quartz', 'Quartz', 'Mountain glider', '#7d66a5', '#d8b6f0', {
    wings: ['W', 'W'], fire: ['f', 'f'], scales: ['s', 's'], horns: ['h', 'h'],
  }),
];

export function getTrait(traitId: DragonTraitId): DragonTraitDefinition {
  const trait = DRAGON_TRAITS.find(item => item.id === traitId);
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
  return Math.round(100 * cells.filter(cell => cell.showsDominantPhenotype).length / cells.length);
}

export function breedLabClutch(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  run: number,
  size = 8,
): DragonOffspring[] {
  return Array.from({ length: size }, (_, index) => {
    const seed = `${parentA.id}:${parentB.id}:${run}:${index}`;
    const genome = Object.fromEntries(DRAGON_TRAITS.map(trait => [trait.id, normalizeGenotype([
      selectAllele(parentA.genome[trait.id], `${seed}:${trait.id}:a`),
      selectAllele(parentB.genome[trait.id], `${seed}:${trait.id}:b`),
    ])])) as DragonLabGenome;
    const id = `clutch-${run}-${index + 1}`;
    const color = offspringColor(`${parentA.id}:${parentB.id}:${run}`, index);
    const engineGenome = createVisualGenome(id, genome, run);
    const build = createEducationalAssembly(genome, engineGenome);

    return {
      id,
      name: `Hatchling ${index + 1}`,
      title: `Generation ${run}`,
      color,
      accentColor: lightenColor(color),
      genome,
      parentIds: [parentA.id, parentB.id],
      generation: run,
      engineGenome,
      assembly: build.assembly,
      combatProfile: build.combatProfile,
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
    DRAGON_TRAITS.map((trait) => [
      trait.id,
      normalizeGenotype([egg[trait.id], sperm[trait.id]]),
    ]),
  ) as DragonLabGenome;
  const color = offspringColor(`${eggParent.id}:${spermParent.id}:${generation}`, sequence);
  const engineGenome = createVisualGenome(offspringId, genome, generation);
  const build = createEducationalAssembly(genome, engineGenome);

  return {
    id: offspringId,
    name,
    title: `Generation ${generation}`,
    color,
    accentColor: lightenColor(color),
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
  return clutch.filter(dragon => showsDominantPhenotype(dragon.genome[traitId], traitId)).length;
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
    heterozygousCells += buildPunnettCells(parentA, parentB, trait.id)
      .filter(cell => isHeterozygous(cell.genotype)).length / 4;
  }
  const alleleRichnessPercent = Math.round(100 * alleleRichness / DRAGON_TRAITS.length);
  const expectedHeterozygosityPercent = Math.round(100 * heterozygousCells / DRAGON_TRAITS.length);
  const score = Math.round(alleleRichnessPercent * 0.6 + expectedHeterozygosityPercent * 0.4);

  return {
    pairId: [parentA.id, parentB.id].sort().join('--'),
    parentIds: [parentA.id, parentB.id],
    alleleRichnessPercent,
    expectedHeterozygosityPercent,
    score,
    summary: score >= 75
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
  return analyses.sort((left, right) => right.score - left.score || left.pairId.localeCompare(right.pairId));
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

/** Visible controls carried by one expressed dragon, never by the global Parts Lab style. */
export interface DragonVisualExpression {
  legPairs?: 1 | 2;
  clawScale?: number;
  crestScale?: number;
  earShape?: 'pointed' | 'rounded';
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
      blueprint.parts.filter(part => part.roles?.includes('wing')).map(part => part.id),
    );
    blueprint = {
      parts: blueprint.parts.filter(part => !removedIds.has(part.id)),
      joints: blueprint.joints.filter(joint =>
        !removedIds.has(joint.parentPartId) && !removedIds.has(joint.childPartId)),
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
    blueprint.parts = blueprint.parts.map(part =>
      part.visualProfile?.profileId === 'dragon-head-horned'
        ? {
          ...part,
          visualProfile: {
            ...part.visualProfile,
            parameters: { ...(part.visualProfile.parameters ?? {}), hornLength: 0, browLength: 0 },
          },
        }
        : part);
  }

  blueprint.parts = blueprint.parts.map(part => {
    const profileId = part.visualProfile?.profileId ?? '';
    const parameters: Record<string, string | number | boolean> = {
      ...(part.visualProfile?.parameters ?? {}),
    };
    if (profileId === 'dragon-body') {
      if (expression.backSpikeCount !== undefined) parameters['backSpikeCount'] = expression.backSpikeCount;
      if (expression.backSpikeScale !== undefined) parameters['backSpikeScale'] = expression.backSpikeScale;
    }
    if (profileId.startsWith('dragon-head-')) {
      if (expression.crestScale !== undefined) parameters['crestScale'] = expression.crestScale;
      if (expression.earShape) parameters['earShape'] = expression.earShape;
      if (expression.eyeColor) parameters['eyeColor'] = expression.eyeColor;
      if (expression.sex) parameters['sex'] = expression.sex;
    }
    if (profileId === 'dragon-upper-jaw' || profileId === 'dragon-lower-jaw') {
      if (expression.fangScale !== undefined) parameters['fangScale'] = expression.fangScale;
    }
    if (profileId === 'dragon-foot' && expression.clawScale !== undefined) {
      parameters['clawScale'] = expression.clawScale;
    }
    if (
      expression.tailClubForm
      && (profileId === 'dragon-tail-stinger' || profileId === 'dragon-tail-club')
      && part.visualProfile
    ) {
      const form = expression.tailClubForm;
      const size = form === 'large'
        ? { x: 0.34, y: 0.46, z: 0.46, mass: 0.72 }
        : form === 'intermediate'
          ? { x: 0.26, y: 0.38, z: 0.32, mass: 0.52 }
          : { x: 0.19, y: 0.3, z: 0.2, mass: 0.34 };
      parameters['tailClubSpikeCount'] = form === 'large' ? 10 : form === 'intermediate' ? 5 : 0;
      parameters['tailClubSpikeScale'] = form === 'large' ? 1.2 : form === 'intermediate' ? 0.78 : 0;
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

  if (expression.legPairs === 1) {
    const removedIds = new Set(
      blueprint.parts
        .filter(part => part.id.includes('front') && part.roles?.includes('leg'))
        .map(part => part.id),
    );
    blueprint = {
      parts: blueprint.parts.filter(part => !removedIds.has(part.id)),
      joints: blueprint.joints.filter(joint =>
        !removedIds.has(joint.parentPartId) && !removedIds.has(joint.childPartId)),
    };
  }

  /*
   * Scale pattern. A spotted dragon is two-tone — every third part takes the
   * accent colour, which at specimen scale reads as banding down the flank and
   * tail; a solid dragon is one colour throughout. This replaced a uniform
   * lightening that was nearly invisible next to a solid dragon, and it is the
   * only channel the S gene owns, so it has to be legible on a 120px thumbnail.
   */
  const spotted = showsDominantPhenotype(genome.scales, 'scales');
  if (identity) {
    blueprint.parts = blueprint.parts.map((part, index) => ({
      ...part,
      color: spotted && index % 3 === 0 ? identity.accentColor : identity.color,
    }));
  } else if (spotted) {
    blueprint.parts = blueprint.parts.map((part, index) => ({
      ...part,
      color: index % 3 === 0 ? lightenColor(part.color) : part.color,
    }));
  }

  // The genome-tuned combat profile (armor from horns, damage from temperament)
  // travels with the assembly so the arena fights with these numbers instead of
  // regenerating defaults. Prune entries for parts removed by the genotype.
  const partIds = new Set(blueprint.parts.map(part => part.id));
  const combatProfile: AssemblyCombatProfile = {
    ...generated.combatProfile,
    parts: Object.fromEntries(
      Object.entries(generated.combatProfile.parts).filter(([partId]) => partIds.has(partId)),
    ),
  };

  return { assembly: blueprint, combatProfile };
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
  const hue = Math.round((stableHash(clutchSeed) % 360 + index * HUE_STEP) % 360);
  const saturation = 48 + stableHash(`${clutchSeed}:saturation:${index}`) % 20;
  const lightness = 26 + stableHash(`${clutchSeed}:lightness:${index}`) % 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function lightenColor(color: string): string {
  if (color.startsWith('hsl(')) return color.replace(/(\d+)%\)$/, value => `${Math.min(76, Number(value.slice(0, -2)) + 24)}%)`);
  return color;
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

  return ((hue * 60) % 360 + 360) % 360;
}
