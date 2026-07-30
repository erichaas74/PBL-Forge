import { StationCopy } from '../../../../shared/dragon-visuals';
import {
  GenomeMicroscopeMisconception,
  GenomeMicroscopeMode,
  GenomeMicroscopeTask,
} from '../domain/genome-microscope.models';

const TASKS: readonly GenomeMicroscopeTask[] = [
  {
    id: 'find-genetic-material',
    prompt: 'Which microscope level names the molecule that stores genetic information?',
    targetLevel: 'dna',
    evidenceLevel: 'dna',
    focusTraitId: 'fire',
    explanation: 'DNA is the molecule that stores genetic information. A chromosome is one organized package of that DNA.',
    misconception: 'hierarchy-confusion',
  },
  {
    id: 'find-dna-package',
    prompt: 'Which level is an organized package of DNA containing many genes?',
    targetLevel: 'chromosome',
    evidenceLevel: 'chromosome',
    focusTraitId: 'scales',
    explanation: 'A chromosome packages a long DNA molecule and contains many gene locations.',
    misconception: 'chromosome-is-gene',
  },
  {
    id: 'find-gene-section',
    prompt: 'Which level is a specific section of DNA associated with inherited information?',
    targetLevel: 'gene',
    evidenceLevel: 'gene',
    focusTraitId: 'horns',
    explanation: 'A gene is a section of DNA at a particular locus on a chromosome.',
    misconception: 'chromosome-is-gene',
  },
  {
    id: 'find-allele-versions',
    prompt: 'At which level will the scanner reveal the two versions carried for one gene?',
    targetLevel: 'allele',
    evidenceLevel: 'allele',
    focusTraitId: 'wings',
    explanation: 'Alleles are versions of a gene. The two allele symbols belong to the gene; they are not individual DNA base pairs.',
    misconception: 'gene-is-allele',
  },
  {
    id: 'base-pair-boundary',
    prompt: 'A-T and C-G are visible on the ladder. Which level contains these paired DNA bases?',
    targetLevel: 'dna',
    evidenceLevel: 'dna',
    focusTraitId: 'wings',
    explanation: 'A-T and C-G are paired bases in DNA. One base pair is not the same thing as an allele.',
    misconception: 'base-pair-is-allele',
  },
];

export const GENOME_MICROSCOPE_COPY: StationCopy = {
  'sample.dragon.caption': 'Genome extract · anatomy view disabled',
  'sample.egg.caption': 'Egg genome extract · shell view disabled',
  'sample.offspring.caption': 'Offspring genome extract · anatomy view disabled',
  'level.cell.title': 'Cell nucleus',
  'level.cell.caption': 'Holds chromosome pairs',
  'level.chromosome.title': 'Chromosome',
  'level.chromosome.caption': 'Packages one long DNA molecule',
  'level.dna.title': 'DNA',
  'level.dna.caption': 'Molecule built from paired bases',
  'level.gene.title': 'Gene locus',
  'level.gene.caption': 'A section of DNA at one location',
  'level.allele.title': 'Allele pair',
  'level.allele.caption': 'Two versions carried for the gene',
  'genome-zoom.cell': 'Begin at the nucleus inside the sample cell.',
  'genome-zoom.predict': 'Lock your prediction before the microscope resolves the hierarchy.',
  'genome-zoom.chromosome': 'Chromosomes organize long DNA molecules.',
  'genome-zoom.dna': 'The DNA ladder uncoils from the chromosome model.',
  'genome-zoom.gene': 'One section is highlighted as the focused gene locus.',
  'genome-zoom.allele': 'The sample carries two allele versions for this gene.',
  'genome-zoom.containment': 'Each level is nested inside the level before it.',
  ...Object.fromEntries(TASKS.map(task => [`task.${task.id}.prompt`, task.prompt])),
};

export const GENOME_MICROSCOPE_MISCONCEPTION_NOTES: Readonly<Record<
  GenomeMicroscopeMisconception,
  string
>> = {
  'hierarchy-confusion': 'Rebuild the containment path from the nucleus toward smaller information units.',
  'chromosome-is-gene': 'A chromosome contains many genes; one gene is only a section of its DNA.',
  'gene-is-allele': 'A gene is the DNA section, while an allele is one version of that gene.',
  'base-pair-is-allele': 'A-T and C-G are paired DNA bases. An allele is a version of a much larger gene sequence.',
};

export function genomeMicroscopeTasks(
  mode: GenomeMicroscopeMode,
  seed: string,
): readonly GenomeMicroscopeTask[] {
  if (mode === 'learn') return [task('find-allele-versions')];
  if (mode === 'reteach') return [task('base-pair-boundary'), task('find-gene-section')];
  const count = mode === 'official' ? 4 : 3;
  return seededOrder(TASKS, seed).slice(0, count);
}

export function genomeMicroscopeTask(id: string): GenomeMicroscopeTask {
  return task(id);
}

function task(id: string): GenomeMicroscopeTask {
  const found = TASKS.find(candidate => candidate.id === id);
  if (!found) throw new Error(`Unknown Genome Microscope task ${id}.`);
  return found;
}

function seededOrder<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let state = hash(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
