export type DnaBase = 'A' | 'T' | 'C' | 'G';
export type DnaDifferenceKind = 'match' | 'substitution' | 'insertion' | 'deletion';
export type DnaLabTool = 'compare' | 'mutation' | 'repair';
export type DnaMutationAction = 'substitution' | 'insertion' | 'deletion';
export type DnaRepairAction = 'replace' | 'insert' | 'remove';
export type DnaComparisonScope = 'gene' | 'chromosome';

export interface DnaEvidenceResult {
  caseId: string;
  tool: DnaLabTool;
  observation: string;
  differenceCount: number;
}

export interface DnaSequenceChanged {
  caseId: string;
  sequence: string;
}

export interface DnaAnalysisCase {
  id: string;
  sampleLabel: string;
  chromosomeLabel?: string;
  geneLabel?: string;
  locusLabel?: string;
  referenceSampleLabel?: string;
  comparisonSampleLabel?: string;
  reference: string;
  sample: string;
  mutationType: 'substitution' | 'insertion' | 'deletion';
}

export interface DnaAlignmentColumn {
  referenceBase: DnaBase | null;
  comparisonBase: DnaBase | null;
  referenceIndex: number | null;
  comparisonIndex: number | null;
  kind: DnaDifferenceKind;
}

export interface MolecularEvidenceRecord extends DnaEvidenceResult {
  id: string;
  recordedAtIso: string;
}

export interface PersistedDnaLabState {
  scope?: DnaComparisonScope;
  specimenAId?: string | null;
  specimenBId?: string | null;
  workingSequences?: Record<string, string>;
  evidence?: MolecularEvidenceRecord[];
}

export const DEFAULT_DNA_ANALYSIS_CASE: DnaAnalysisCase = {
  id: 'scale-pigment-01',
  sampleLabel: 'Dragon scale-cell sample',
  referenceSampleLabel: 'CH3-G1a',
  comparisonSampleLabel: 'CH3-G1b',
  reference: 'ATGCCTGAATTT',
  sample: 'ATGCATGAATTT',
  mutationType: 'substitution',
};

export const TEST_DNA_ANALYSIS_CASE: DnaAnalysisCase = {
  id: 'test-wing-pigment-01',
  sampleLabel: 'Test case · Wing-pigment cell sample',
  referenceSampleLabel: 'CH1-G1a',
  comparisonSampleLabel: 'CH1-G1b',
  reference: 'ATGCCGTAACGA',
  sample: 'ATGCTGTAACGA',
  mutationType: 'substitution',
};
