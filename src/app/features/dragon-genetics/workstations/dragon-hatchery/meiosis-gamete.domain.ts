import {
  DRAGON_AUTOSOME_LABELS,
  chromosomeVisual,
} from '../shared/dragon-chromosome.catalog';
import {
  DragonSex,
  EXPRESSIVE_DRAGON_TRAITS,
  ExpressiveDragonTraitDefinition,
  ExpressiveDragonTraitId,
} from '../../simulation/domain/dragon-expressive-genome';
import { dragonParentExpressiveProfile } from '../../simulation/domain/dragon-specimen.profile';
import {
  DragonGameteGenome,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import {
  MeiosisChromatid,
  MeiosisChromosomeLabel,
  MeiosisChromosomePair,
  MeiosisGamete,
  MeiosisGameteChromosome,
  MeiosisHomologOrigin,
  MeiosisLocusAllele,
  MeiosisRun,
} from './meiosis-gamete.models';

const MEIOSIS_CHROMOSOMES: readonly MeiosisChromosomeLabel[] = [
  ...DRAGON_AUTOSOME_LABELS,
  'Chr X',
];

export function generateMeiosisRun(
  parent: DragonParentProfile,
  sex: DragonSex,
  seed: string,
  targetTraitId: DragonTraitId,
): MeiosisRun {
  const random = seededRandom(seed);
  const profile = dragonParentExpressiveProfile(parent, sex);
  const targetTrait = expressiveTrait(targetTraitId);
  const noCrossoverAutosome = Math.floor(random() * DRAGON_AUTOSOME_LABELS.length);

  const chromosomePairs = MEIOSIS_CHROMOSOMES.map((chromosome, chromosomeIndex) => {
    const traits = EXPRESSIVE_DRAGON_TRAITS.filter((trait) => trait.chromosome === chromosome);
    const visual = chromosomeVisual(chromosome);
    const homologA = traits.map((trait, index) =>
      locusAllele(trait, profile.genome[trait.id][0], 'homolog-a', visual.locusPositions[index]),
    );
    const secondSexChromosomeIsY =
      chromosome === 'Chr X' && sex === 'male' && profile.genome['eye-color'][1] === 'Y';
    const homologB = secondSexChromosomeIsY
      ? []
      : traits.map((trait, index) =>
          locusAllele(
            trait,
            profile.genome[trait.id][1],
            'homolog-b',
            visual.locusPositions[index],
          ),
        );
    const canCross =
      chromosomeIndex < DRAGON_AUTOSOME_LABELS.length &&
      chromosomeIndex !== noCrossoverAutosome &&
      traits.length > 1;
    const crossoverAfterLocusIndex = canCross
      ? 1 + Math.floor(random() * (traits.length - 1))
      : null;
    const crossoverPosition =
      crossoverAfterLocusIndex === null
        ? null
        : midpoint(
            visual.locusPositions[crossoverAfterLocusIndex - 1],
            visual.locusPositions[crossoverAfterLocusIndex],
          );
    const recombinantA = recombine(
      homologA,
      homologB,
      crossoverAfterLocusIndex,
      'homolog-a',
    );
    const recombinantB = recombine(
      homologB,
      homologA,
      crossoverAfterLocusIndex,
      'homolog-b',
    );
    const sexA: 'X' | 'Y' | null = chromosome === 'Chr X' ? 'X' : null;
    const sexB: 'X' | 'Y' | null =
      chromosome === 'Chr X' ? (secondSexChromosomeIsY ? 'Y' : 'X') : null;
    const chromatids: MeiosisChromosomePair['chromatids'] = [
      chromatid(chromosome, 'a-original', 'homolog-a', homologA, false, sexA),
      chromatid(
        chromosome,
        'a-recombinant',
        'homolog-a',
        recombinantA,
        crossoverAfterLocusIndex !== null,
        sexA,
      ),
      chromatid(
        chromosome,
        'b-recombinant',
        'homolog-b',
        recombinantB,
        crossoverAfterLocusIndex !== null,
        sexB,
      ),
      chromatid(chromosome, 'b-original', 'homolog-b', homologB, false, sexB),
    ];
    return {
      chromosome,
      length: visual.length * 100,
      crossoverAfterLocusIndex,
      crossoverPosition,
      chromatids,
    };
  });

  let gameteChromosomes: MeiosisGameteChromosome[][] = [];
  for (let attempt = 0; attempt < 48; attempt += 1) {
    gameteChromosomes = independentlyAssort(chromosomePairs, random);
    if (new Set(gameteChromosomes.map(gameteSignature)).size === 4) break;
  }

  const gametes = gameteChromosomes.map((chromosomes, index) => {
    const alleleByTrait = Object.fromEntries(
      chromosomes.flatMap((chromosome) =>
        chromosome.loci.map((locus) => [locus.traitId, locus.allele]),
      ),
    ) as Partial<Record<ExpressiveDragonTraitId, string>>;
    return {
      id: `${seed}:gamete-${index + 1}`,
      index,
      parentId: parent.id,
      sex,
      chromosomes,
      alleleByTrait,
      targetAllelePresent: alleleByTrait[targetTraitId] === targetTrait.recessiveAllele,
    } satisfies MeiosisGamete;
  }) as unknown as MeiosisRun['gametes'];

  return {
    schemaVersion: 1,
    seed,
    parentId: parent.id,
    parentName: parent.name,
    sex,
    targetTraitId,
    targetAllele: targetTrait.recessiveAllele,
    chromosomePairs,
    gametes,
    createdAtIso: new Date().toISOString(),
  };
}

export function coreGameteGenome(gamete: MeiosisGamete): DragonGameteGenome {
  return {
    wings: requiredAllele(gamete, 'wings'),
    fire: requiredAllele(gamete, 'fire'),
    scales: requiredAllele(gamete, 'scales'),
    horns: requiredAllele(gamete, 'horns'),
  };
}

export function gameteAlleleSummary(gamete: MeiosisGamete): string {
  return gamete.chromosomes
    .map((chromosome) => {
      const loci = chromosome.loci.map((locus) => locus.allele).join(' ');
      return `${chromosome.chromosome.replace('Chr ', 'C')}:${loci || chromosome.sexChromosome}`;
    })
    .join(' · ');
}

function expressiveTrait(id: ExpressiveDragonTraitId): ExpressiveDragonTraitDefinition {
  const trait = EXPRESSIVE_DRAGON_TRAITS.find((candidate) => candidate.id === id);
  if (!trait) throw new Error(`Expressive dragon trait ${id} is not registered.`);
  return trait;
}

function locusAllele(
  trait: ExpressiveDragonTraitDefinition,
  allele: string,
  origin: MeiosisHomologOrigin,
  position = 0.5,
): MeiosisLocusAllele {
  return {
    traitId: trait.id,
    traitName: trait.name,
    geneSymbol: trait.geneSymbol,
    allele,
    position,
    origin,
    dominance: allele === trait.dominantAllele ? 'dominant' : 'recessive',
  };
}

function recombine(
  first: readonly MeiosisLocusAllele[],
  second: readonly MeiosisLocusAllele[],
  crossoverAfterLocusIndex: number | null,
  fallbackOrigin: MeiosisHomologOrigin,
): MeiosisLocusAllele[] {
  if (crossoverAfterLocusIndex === null || first.length !== second.length) {
    return first.map(cloneLocus);
  }
  return [
    ...first.slice(0, crossoverAfterLocusIndex),
    ...second.slice(crossoverAfterLocusIndex),
  ].map((locus) => ({ ...locus, origin: locus.origin ?? fallbackOrigin }));
}

function chromatid(
  chromosome: MeiosisChromosomeLabel,
  idSuffix: string,
  origin: MeiosisHomologOrigin,
  loci: readonly MeiosisLocusAllele[],
  recombinant: boolean,
  sexChromosome: 'X' | 'Y' | null,
): MeiosisChromatid {
  return {
    id: `${chromosome.toLowerCase().replace(' ', '-')}:${idSuffix}`,
    chromosome,
    origin,
    recombinant,
    sexChromosome,
    loci: loci.map(cloneLocus),
  };
}

function requiredAllele(gamete: MeiosisGamete, traitId: DragonTraitId): string {
  const allele = gamete.alleleByTrait[traitId];
  if (!allele) throw new Error(`Gamete ${gamete.id} has no ${traitId} allele.`);
  return allele;
}

function cloneLocus(locus: MeiosisLocusAllele): MeiosisLocusAllele {
  return { ...locus };
}

function midpoint(first = 0.35, second = 0.65): number {
  return (first + second) / 2;
}

function shuffle(values: number[], random: () => number): number[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function independentlyAssort(
  chromosomePairs: readonly MeiosisChromosomePair[],
  random: () => number,
): MeiosisGameteChromosome[][] {
  const gametes: MeiosisGameteChromosome[][] = Array.from({ length: 4 }, () => []);
  for (const pair of chromosomePairs) {
    // Meiosis I sends the two sister chromatids of one homolog into one daughter
    // cell and the other homolog into the second. Each pair independently chooses
    // which daughter cell receives A; Meiosis II then separates the two sisters.
    const aGametes = random() < 0.5 ? [0, 1] : [2, 3];
    const bGametes = aGametes[0] === 0 ? [2, 3] : [0, 1];
    const assortment = [
      ...shuffle([0, 1], random).map((chromatidIndex, index) => ({
        chromatidIndex,
        gameteIndex: aGametes[index],
      })),
      ...shuffle([2, 3], random).map((chromatidIndex, index) => ({
        chromatidIndex,
        gameteIndex: bGametes[index],
      })),
    ];
    assortment.forEach(({ chromatidIndex, gameteIndex }) => {
      const selected = pair.chromatids[chromatidIndex];
      gametes[gameteIndex].push({
        chromosome: pair.chromosome,
        sourceChromatidId: selected.id,
        recombinant: selected.recombinant,
        sexChromosome: selected.sexChromosome,
        loci: selected.loci.map(cloneLocus),
      });
    });
  }
  return gametes;
}

function gameteSignature(chromosomes: readonly MeiosisGameteChromosome[]): string {
  return chromosomes
    .map((chromosome) =>
      chromosome.loci.map((locus) => `${locus.traitId}:${locus.allele}`).join('|') ||
      chromosome.sexChromosome,
    )
    .join(';');
}

function seededRandom(seed: string): () => number {
  let state = stableHash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
