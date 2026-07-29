import {
  DragonLabGenome,
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
    const color = offspringColor(genome, index);

    return {
      id,
      name: `Hatchling ${index + 1}`,
      title: `Generation ${run}`,
      color,
      accentColor: lightenColor(color),
      genome,
      parentIds: [parentA.id, parentB.id],
      generation: run,
    };
  });
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

function offspringColor(genome: DragonLabGenome, index: number): string {
  const baseHue = showsDominantPhenotype(genome.scales, 'scales') ? 286 : 168;
  const hue = (baseHue + stableHash(`${genotypeLabel(genome.fire)}:${index}`) % 66) % 360;
  return `hsl(${hue} 52% 42%)`;
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
