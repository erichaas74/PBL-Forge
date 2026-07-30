import { StationCopy } from '../../../../shared/dragon-visuals';
import { TRAIT_RULE_CHALLENGES } from '../../dragon-genetics.content';
import {
  AlleleRuleEvidenceId,
  AlleleWorkbenchMode,
  AlleleWorkbenchTask,
} from '../domain/allele-workbench.models';

const STARTING_PAIRS: Record<string, readonly [string, string]> = {
  'wings-hetero': ['w', 'w'],
  'fire-recessive': ['F', 'f'],
  'horns-homo-dominant': ['H', 'h'],
  'scales-hetero': ['s', 's'],
};

const EVIDENCE: Record<string, AlleleRuleEvidenceId> = {
  'wings-hetero': 'at-least-one-dominant',
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

const TASKS: readonly AlleleWorkbenchTask[] = TRAIT_RULE_CHALLENGES.map(challenge => ({
  id: challenge.id,
  traitId: challenge.traitId,
  prompt: challenge.prompt,
  startingAlleles: STARTING_PAIRS[challenge.id],
  requestedAlleles: challenge.genotype,
  correctPrediction: challenge.correctAnswer,
  evidenceId: EVIDENCE[challenge.id],
  explanation: EXPLANATIONS[challenge.id],
  misconception: challenge.correctAnswer === 'recessive'
    ? 'one-recessive-is-enough'
    : challenge.genotype[0] !== challenge.genotype[1]
      ? 'heterozygous-loses-recessive'
      : 'dominant-means-stronger',
}));

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
  void mode;
  void seed;
  return TASKS;
}

export function alleleWorkbenchTask(id: string): AlleleWorkbenchTask {
  return TASKS.find(task => task.id === id) ?? TASKS[0];
}
