export type DnaBase = 'A' | 'T' | 'C' | 'G';
export type RnaBase = 'A' | 'U' | 'C' | 'G';
export type DnaMutationMode = 'insertion' | 'deletion' | 'substitution' | 'repair';
export type DnaProcessMode = 'replication' | 'transcription' | DnaMutationMode;

export interface DnaProcessQuestionOption {
  id: string;
  label: string;
}

export interface DnaProcessQuestion {
  id: string;
  mode: DnaProcessMode;
  tabLabel: string;
  title: string;
  description: string;
  sequence: string;
  mutationBase?: DnaBase;
  prompt: string;
  options: readonly DnaProcessQuestionOption[];
  correctOptionId: string;
  explanation: string;
  boundary?: string;
}

export const DNA_BASES: readonly DnaBase[] = ['A', 'T', 'C', 'G'];
export const DNA_COMPLEMENT: Readonly<Record<DnaBase, DnaBase>> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};
export const RNA_COMPLEMENT: Readonly<Record<DnaBase, RnaBase>> = {
  A: 'U',
  T: 'A',
  C: 'G',
  G: 'C',
};

export function dnaSequence(value: string): readonly DnaBase[] {
  const normalized = value
    .toUpperCase()
    .replace(/[^ACGT]/g, '')
    .slice(0, 18);
  return (normalized || 'AGTCAT').split('') as DnaBase[];
}

export function complementaryDna(sequence: readonly DnaBase[]): readonly DnaBase[] {
  return sequence.map((base) => DNA_COMPLEMENT[base]);
}

/** Input is the coding strand; the result matches it with U in place of T. */
export function transcribedRna(codingStrand: readonly DnaBase[]): readonly RnaBase[] {
  const template = complementaryDna(codingStrand);
  return template.map((base) => RNA_COMPLEMENT[base]);
}

export function mutationIndex(sequence: readonly DnaBase[]): number {
  return Math.floor(sequence.length / 2);
}

export function mutatedSequence(
  sequence: readonly DnaBase[],
  mode: Exclude<DnaMutationMode, 'repair'>,
  mutationBase: DnaBase,
): readonly DnaBase[] {
  const index = mutationIndex(sequence);
  if (mode === 'insertion') {
    return [...sequence.slice(0, index), mutationBase, ...sequence.slice(index)];
  }
  if (mode === 'deletion') {
    return sequence.filter((_, current) => current !== index);
  }
  const replacement =
    sequence[index] === mutationBase ? (mutationBase === 'A' ? 'C' : 'A') : mutationBase;
  return sequence.map((base, current) => (current === index ? replacement : base));
}
