import { StationCopy } from '../../../../shared/dragon-visuals';
import { TRAIT_RULE_CHALLENGES } from '../../dragon-genetics.content';
import {
  AlleleRuleEvidenceId,
  AlleleWorkbenchMode,
  AlleleWorkbenchSampleVial,
  AlleleWorkbenchTask,
} from '../domain/allele-workbench.models';

const STARTING_PAIRS: Record<string, readonly [string, string]> = {
  'wings-hetero': ['w', 'w'],
  'fire-recessive': ['F', 'f'],
  'horns-homo-dominant': ['H', 'h'],
  'scales-hetero': ['s', 's'],
};

const EVIDENCE: Record<string, AlleleRuleEvidenceId> = {
  'wings-hetero': 'recessive-remains-present',
  'fire-recessive': 'two-recessive-required',
  'horns-homo-dominant': 'at-least-one-dominant',
  'scales-hetero': 'recessive-remains-present',
};

const EXPLANATIONS: Record<string, string> = {
  'wings-hetero': 'Ww expresses the winged phenotype because one W allele is enough; w is still present.',
  'fire-recessive': 'ff expresses the recessive fire phenotype because no dominant F allele is present.',
  'horns-homo-dominant': 'HH has two dominant alleles and expresses the horned phenotype.',
  'scales-hetero': 'Ss expresses spotted scales while the recessive s allele remains in the genotype.',
};

const TASK_LAB_DATA: Record<string, {
  sampleCode: string;
  sampleLabel: string;
  sampleProfileId: string;
  chromosomeNumber: number;
  nearbyGeneIds: readonly string[];
  targetGeneId: string;
  dominantPhenotypeLabel: string;
  recessivePhenotypeLabel: string;
}> = {
  'wings-hetero': {
    sampleCode: 'EX-W-104',
    sampleLabel: 'Ember wing-tissue extract',
    sampleProfileId: 'ember',
    chromosomeNumber: 5,
    nearbyGeneIds: ['C', 'F', 'W', 'T'],
    targetGeneId: 'W',
    dominantPhenotypeLabel: 'Winged',
    recessivePhenotypeLabel: 'Wingless',
  },
  'fire-recessive': {
    sampleCode: 'EX-F-212',
    sampleLabel: 'Moss fire-gland extract',
    sampleProfileId: 'moss',
    chromosomeNumber: 2,
    nearbyGeneIds: ['A', 'F', 'M', 'R'],
    targetGeneId: 'F',
    dominantPhenotypeLabel: 'Breathes fire',
    recessivePhenotypeLabel: 'Does not breathe fire',
  },
  'horns-homo-dominant': {
    sampleCode: 'EX-H-406',
    sampleLabel: 'Tide horn-matrix extract',
    sampleProfileId: 'tide',
    chromosomeNumber: 4,
    nearbyGeneIds: ['B', 'H', 'N', 'Q'],
    targetGeneId: 'H',
    dominantPhenotypeLabel: 'Horned',
    recessivePhenotypeLabel: 'Smooth-headed',
  },
  'scales-hetero': {
    sampleCode: 'EX-S-330',
    sampleLabel: 'Quartz scale-bed extract',
    sampleProfileId: 'quartz',
    chromosomeNumber: 3,
    nearbyGeneIds: ['D', 'K', 'S', 'V'],
    targetGeneId: 'S',
    dominantPhenotypeLabel: 'Spotted scales',
    recessivePhenotypeLabel: 'Solid scales',
  },
};

const SAMPLE_VIALS: readonly AlleleWorkbenchSampleVial[] = Object.values(TASK_LAB_DATA).map(item => ({
  code: item.sampleCode,
  label: item.sampleLabel,
  profileId: item.sampleProfileId,
}));

const TASKS: readonly AlleleWorkbenchTask[] = TRAIT_RULE_CHALLENGES.map(challenge => {
  const lab = TASK_LAB_DATA[challenge.id];
  const correctGenotypeClass = challenge.genotype[0] !== challenge.genotype[1]
    ? 'heterozygous'
    : challenge.genotype[0] === challenge.genotype[0].toUpperCase()
      ? 'homozygous-dominant'
      : 'homozygous-recessive';
  return {
    id: challenge.id,
    traitId: challenge.traitId,
    ...lab,
    prompt: challenge.prompt,
    startingAlleles: STARTING_PAIRS[challenge.id],
    requestedAlleles: challenge.genotype,
    correctPrediction: challenge.correctAnswer,
    correctGenotypeClass,
    correctEvidenceId: EVIDENCE[challenge.id],
    evidenceId: EVIDENCE[challenge.id],
    explanation: EXPLANATIONS[challenge.id],
    misconception: challenge.correctAnswer === 'recessive'
      ? 'one-recessive-is-enough'
      : challenge.genotype[0] !== challenge.genotype[1]
        ? 'heterozygous-loses-recessive'
        : 'dominant-means-stronger',
  };
});

export const ALLELE_WORKBENCH_EVIDENCE = [
  { id: 'at-least-one-dominant', labelId: 'evidence.at-least-one-dominant', anchorId: 'dominant-allele' },
  { id: 'two-recessive-required', labelId: 'evidence.two-recessive-required', anchorId: 'recessive-allele' },
  { id: 'recessive-remains-present', labelId: 'evidence.recessive-remains-present', anchorId: 'carrier-indicator' },
] as const;

export const ALLELE_WORKBENCH_COPY: StationCopy = {
  'evidence.at-least-one-dominant': 'At least one uppercase allele produces the dominant phenotype in this model.',
  'evidence.two-recessive-required': 'The recessive phenotype appears only when both alleles are recessive.',
  'evidence.recessive-remains-present': 'A heterozygous pair keeps the recessive allele even when the dominant phenotype is expressed.',
  'allele-expression.inspect-pair': 'Keep both allele symbols visible and inspect their case.',
  'allele-expression.predict': 'Use the locked prediction before tracing expression.',
  'allele-expression.trace': 'The model checks whether at least one dominant allele is present.',
  'allele-expression.reveal': 'The scientific phenotype readout resolves without showing dragon anatomy.',
  'allele-expression.recessive-remains': 'A recessive allele remains part of a heterozygous genotype.',
};

export function alleleWorkbenchTasks(
  mode: AlleleWorkbenchMode,
  seed: string,
): readonly AlleleWorkbenchTask[] {
  void seed;
  if (mode === 'reteach') {
    return TASKS.filter(task => task.misconception === 'heterozygous-loses-recessive').slice(0, 1);
  }
  return TASKS;
}

export function alleleWorkbenchTask(id: string): AlleleWorkbenchTask {
  return TASKS.find(task => task.id === id) ?? TASKS[0];
}

/** Three deterministic rack choices. The first investigation uses the brief's exact vial set. */
export function alleleWorkbenchVials(taskId: string): readonly AlleleWorkbenchSampleVial[] {
  if (taskId === 'wings-hetero') {
    return ['EX-W-104', 'EX-F-212', 'EX-S-330']
      .map(code => SAMPLE_VIALS.find(vial => vial.code === code)!)
      .filter(Boolean);
  }
  const task = alleleWorkbenchTask(taskId);
  const assigned = SAMPLE_VIALS.find(vial => vial.code === task.sampleCode)!;
  return [assigned, ...SAMPLE_VIALS.filter(vial => vial.code !== assigned.code).slice(0, 2)];
}
