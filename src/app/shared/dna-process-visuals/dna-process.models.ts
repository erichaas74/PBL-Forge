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

export interface RnaTranslationStep {
  codon: string;
  aminoAcid: string;
  shortName: string;
  stop: boolean;
}

export interface RnaTranslationResult {
  codons: readonly string[];
  steps: readonly RnaTranslationStep[];
  aminoAcids: readonly string[];
  stoppedEarly: boolean;
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

const CODON_TABLE: Readonly<Record<string, Omit<RnaTranslationStep, 'codon'>>> = {
  UUU: aminoAcid('Phenylalanine', 'Phe'),
  UUC: aminoAcid('Phenylalanine', 'Phe'),
  UUA: aminoAcid('Leucine', 'Leu'),
  UUG: aminoAcid('Leucine', 'Leu'),
  UCU: aminoAcid('Serine', 'Ser'),
  UCC: aminoAcid('Serine', 'Ser'),
  UCA: aminoAcid('Serine', 'Ser'),
  UCG: aminoAcid('Serine', 'Ser'),
  UAU: aminoAcid('Tyrosine', 'Tyr'),
  UAC: aminoAcid('Tyrosine', 'Tyr'),
  UAA: stopCodon(),
  UAG: stopCodon(),
  UGU: aminoAcid('Cysteine', 'Cys'),
  UGC: aminoAcid('Cysteine', 'Cys'),
  UGA: stopCodon(),
  UGG: aminoAcid('Tryptophan', 'Trp'),
  CUU: aminoAcid('Leucine', 'Leu'),
  CUC: aminoAcid('Leucine', 'Leu'),
  CUA: aminoAcid('Leucine', 'Leu'),
  CUG: aminoAcid('Leucine', 'Leu'),
  CCU: aminoAcid('Proline', 'Pro'),
  CCC: aminoAcid('Proline', 'Pro'),
  CCA: aminoAcid('Proline', 'Pro'),
  CCG: aminoAcid('Proline', 'Pro'),
  CAU: aminoAcid('Histidine', 'His'),
  CAC: aminoAcid('Histidine', 'His'),
  CAA: aminoAcid('Glutamine', 'Gln'),
  CAG: aminoAcid('Glutamine', 'Gln'),
  CGU: aminoAcid('Arginine', 'Arg'),
  CGC: aminoAcid('Arginine', 'Arg'),
  CGA: aminoAcid('Arginine', 'Arg'),
  CGG: aminoAcid('Arginine', 'Arg'),
  AUU: aminoAcid('Isoleucine', 'Ile'),
  AUC: aminoAcid('Isoleucine', 'Ile'),
  AUA: aminoAcid('Isoleucine', 'Ile'),
  AUG: aminoAcid('Methionine', 'Met'),
  ACU: aminoAcid('Threonine', 'Thr'),
  ACC: aminoAcid('Threonine', 'Thr'),
  ACA: aminoAcid('Threonine', 'Thr'),
  ACG: aminoAcid('Threonine', 'Thr'),
  AAU: aminoAcid('Asparagine', 'Asn'),
  AAC: aminoAcid('Asparagine', 'Asn'),
  AAA: aminoAcid('Lysine', 'Lys'),
  AAG: aminoAcid('Lysine', 'Lys'),
  AGU: aminoAcid('Serine', 'Ser'),
  AGC: aminoAcid('Serine', 'Ser'),
  AGA: aminoAcid('Arginine', 'Arg'),
  AGG: aminoAcid('Arginine', 'Arg'),
  GUU: aminoAcid('Valine', 'Val'),
  GUC: aminoAcid('Valine', 'Val'),
  GUA: aminoAcid('Valine', 'Val'),
  GUG: aminoAcid('Valine', 'Val'),
  GCU: aminoAcid('Alanine', 'Ala'),
  GCC: aminoAcid('Alanine', 'Ala'),
  GCA: aminoAcid('Alanine', 'Ala'),
  GCG: aminoAcid('Alanine', 'Ala'),
  GAU: aminoAcid('Aspartic acid', 'Asp'),
  GAC: aminoAcid('Aspartic acid', 'Asp'),
  GAA: aminoAcid('Glutamic acid', 'Glu'),
  GAG: aminoAcid('Glutamic acid', 'Glu'),
  GGU: aminoAcid('Glycine', 'Gly'),
  GGC: aminoAcid('Glycine', 'Gly'),
  GGA: aminoAcid('Glycine', 'Gly'),
  GGG: aminoAcid('Glycine', 'Gly'),
};

export function dnaSequence(value: string): readonly DnaBase[] {
  const normalized = value
    .toUpperCase()
    .replace(/[^ACGT]/g, '')
    .slice(0, 24);
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

export function rnaSequence(value: string): readonly RnaBase[] {
  return value
    .toUpperCase()
    .replace(/[^AUCG]/g, '')
    .slice(0, 24)
    .split('') as RnaBase[];
}

export function translateRna(value: string | readonly RnaBase[]): RnaTranslationResult {
  const normalized = typeof value === 'string' ? rnaSequence(value).join('') : value.join('');
  const codons = normalized.match(/.{3}/g) ?? [];
  const steps: RnaTranslationStep[] = [];
  for (const codon of codons) {
    const mapped = CODON_TABLE[codon];
    if (!mapped) continue;
    steps.push({ codon, ...mapped });
    if (mapped.stop) break;
  }
  return {
    codons,
    steps,
    aminoAcids: steps.filter((step) => !step.stop).map((step) => step.aminoAcid),
    stoppedEarly: steps.some((step) => step.stop),
  };
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

function aminoAcid(aminoAcidName: string, shortName: string): Omit<RnaTranslationStep, 'codon'> {
  return { aminoAcid: aminoAcidName, shortName, stop: false };
}

function stopCodon(): Omit<RnaTranslationStep, 'codon'> {
  return { aminoAcid: 'Stop', shortName: 'STOP', stop: true };
}
