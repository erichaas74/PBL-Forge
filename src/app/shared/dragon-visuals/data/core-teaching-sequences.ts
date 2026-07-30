import { DRAGON_VISUAL_CONTRACT_VERSION } from '../domain/dragon-visual.models';
import { DragonTeachingSequence } from '../domain/teaching-sequence.models';

export const ALLELE_EXPRESSION_SEQUENCE: DragonTeachingSequence = {
  contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
  sequenceId: 'allele-expression-v1',
  conceptId: 'dominant-recessive-expression',
  supportedSurfaces: ['station', 'cutscene'],
  durationMs: 4800,
  cues: [
    {
      id: 'focus-allele-pair',
      atMs: 0,
      durationMs: 800,
      action: 'focus',
      targetIds: ['allele-slot-a', 'allele-slot-b'],
      motionId: 'instrument-focus',
      captionId: 'allele-expression.inspect-pair',
    },
    {
      id: 'request-expression-prediction',
      atMs: 900,
      durationMs: 0,
      action: 'pause-for-prediction',
      targetIds: ['phenotype-display'],
      captionId: 'allele-expression.predict',
      checkpointId: 'expression-prediction',
    },
    {
      id: 'trace-dominant-allele',
      atMs: 1200,
      durationMs: 1400,
      action: 'trace',
      targetIds: ['dominant-allele', 'phenotype-display'],
      motionId: 'allele-trace',
      captionId: 'allele-expression.trace',
    },
    {
      id: 'reveal-expressed-trait',
      atMs: 2700,
      durationMs: 1200,
      action: 'morph',
      targetIds: ['dragon-specimen', 'phenotype-display'],
      motionId: 'trait-morph',
      captionId: 'allele-expression.reveal',
    },
    {
      id: 'highlight-carried-recessive-allele',
      atMs: 4000,
      durationMs: 800,
      action: 'highlight',
      targetIds: ['recessive-allele'],
      motionId: 'evidence-highlight',
      captionId: 'allele-expression.recessive-remains',
    },
  ],
};

export const PARENT_ALLELE_TRACE_SEQUENCE: DragonTeachingSequence = {
  contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
  sequenceId: 'parent-allele-trace-v1',
  conceptId: 'one-allele-from-each-parent',
  supportedSurfaces: ['station', 'cutscene'],
  durationMs: 5200,
  cues: [
    {
      id: 'show-parent-alleles',
      atMs: 0,
      durationMs: 900,
      action: 'highlight',
      targetIds: ['parent-a-alleles', 'parent-b-alleles'],
      motionId: 'evidence-highlight',
      captionId: 'inheritance.parents-have-two',
    },
    {
      id: 'request-offspring-prediction',
      atMs: 1000,
      durationMs: 0,
      action: 'pause-for-prediction',
      targetIds: ['offspring-allele-slots'],
      captionId: 'inheritance.predict-combination',
      checkpointId: 'offspring-combination-prediction',
    },
    {
      id: 'move-parent-a-allele',
      atMs: 1300,
      durationMs: 1300,
      action: 'move',
      targetIds: ['parent-a-selected-allele', 'offspring-slot-a'],
      motionId: 'allele-transfer',
      captionId: 'inheritance.parent-a-transfer',
    },
    {
      id: 'move-parent-b-allele',
      atMs: 2600,
      durationMs: 1300,
      action: 'move',
      targetIds: ['parent-b-selected-allele', 'offspring-slot-b'],
      motionId: 'allele-transfer',
      captionId: 'inheritance.parent-b-transfer',
    },
    {
      id: 'reveal-offspring-phenotype',
      atMs: 4000,
      durationMs: 1200,
      action: 'reveal',
      targetIds: ['offspring-genotype', 'offspring-phenotype'],
      motionId: 'trait-morph',
      captionId: 'inheritance.combination-result',
    },
  ],
};

export const CORE_DRAGON_TEACHING_SEQUENCES = [
  ALLELE_EXPRESSION_SEQUENCE,
  PARENT_ALLELE_TRACE_SEQUENCE,
] as const;

