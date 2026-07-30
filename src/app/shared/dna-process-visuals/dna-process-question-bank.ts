import { DnaProcessQuestion } from './dna-process.models';

export const DNA_PROCESS_QUESTION_BANK: readonly DnaProcessQuestion[] = [
  {
    id: 'replication-template',
    mode: 'replication',
    tabLabel: 'DNA replication',
    title: 'Build two daughter DNA molecules',
    description:
      'Each separated original strand guides a new complementary DNA strand, base by base.',
    sequence: 'AGTCAT',
    prompt: 'What role does each original DNA strand have during replication?',
    options: [
      { id: 'template', label: 'It acts as a template for a complementary strand.' },
      { id: 'rna', label: 'It changes into an RNA strand.' },
      { id: 'allele', label: 'It becomes one new allele by itself.' },
    ],
    correctOptionId: 'template',
    explanation:
      'DNA polymerase follows each original template and adds complementary DNA bases, producing two DNA molecules.',
    boundary:
      'Replication copies DNA. It does not build RNA and does not guarantee that every copying event is error-free.',
  },
  {
    id: 'transcription-uracil',
    mode: 'transcription',
    tabLabel: 'RNA transcription',
    title: 'Build an mRNA strand from the DNA template',
    description: 'RNA polymerase moves along the template while a single mRNA strand grows.',
    sequence: 'AGTCAT',
    prompt: 'Why does U appear in the new strand instead of T?',
    options: [
      { id: 'rna-u', label: 'RNA uses uracil (U) in place of thymine (T).' },
      { id: 'mutation', label: 'Every U is a DNA mutation.' },
      { id: 'repair', label: 'U means the DNA was repaired.' },
    ],
    correctOptionId: 'rna-u',
    explanation:
      'The product is RNA, so RNA base-pairing uses U where a complementary DNA strand would use T.',
    boundary: 'Transcription builds one RNA copy from a DNA template. It is not DNA replication.',
  },
  {
    id: 'mutation-insertion',
    mode: 'insertion',
    tabLabel: 'Insertion',
    title: 'Insert one nucleotide pair',
    description: 'An incoming pair drops into the middle and the existing sequence spreads apart.',
    sequence: 'AGTCAT',
    mutationBase: 'C',
    prompt: 'How does an insertion change this DNA sequence model?',
    options: [
      { id: 'longer', label: 'The sequence becomes one base pair longer.' },
      { id: 'shorter', label: 'The sequence becomes one base pair shorter.' },
      { id: 'same', label: 'Only one position changes and the length stays the same.' },
    ],
    correctOptionId: 'longer',
    explanation:
      'An insertion adds a nucleotide pair, so later positions shift and the modeled sequence becomes longer.',
  },
  {
    id: 'mutation-deletion',
    mode: 'deletion',
    tabLabel: 'Deletion',
    title: 'Remove one nucleotide pair',
    description: 'The selected pair lifts away and the remaining sequence closes the gap.',
    sequence: 'AGTCAT',
    mutationBase: 'C',
    prompt: 'How does a deletion change this DNA sequence model?',
    options: [
      { id: 'longer', label: 'It adds a new nucleotide pair.' },
      { id: 'shorter', label: 'It removes a pair and shortens the sequence.' },
      { id: 'same', label: 'It exchanges one pair without changing length.' },
    ],
    correctOptionId: 'shorter',
    explanation:
      'A deletion removes one nucleotide pair and the bases after it shift to close the opening.',
  },
  {
    id: 'mutation-substitution',
    mode: 'substitution',
    tabLabel: 'Substitution',
    title: 'Exchange one nucleotide pair',
    description:
      'One pair leaves and a different complementary pair replaces it at the same position.',
    sequence: 'AGTCAT',
    mutationBase: 'C',
    prompt: 'What stays the same during this substitution?',
    options: [
      { id: 'length', label: 'The total sequence length.' },
      { id: 'all-bases', label: 'Every base in the sequence.' },
      { id: 'pairing', label: 'The identity of the exchanged pair.' },
    ],
    correctOptionId: 'length',
    explanation:
      'A substitution changes one position but does not insert or delete a nucleotide pair.',
  },
  {
    id: 'copying-error-repair',
    mode: 'repair',
    tabLabel: 'Repair mismatch',
    title: 'Find and repair a copying mismatch',
    description:
      'A repair enzyme travels to a highlighted mismatch. Use A–T and C–G pairing to replace the incorrect base.',
    sequence: 'AGTCAT',
    mutationBase: 'C',
    prompt: 'Why does checking the mismatch before another DNA copy matter?',
    options: [
      {
        id: 'correct',
        label: 'Repair can restore the complementary pair before the change is copied again.',
      },
      { id: 'visible', label: 'Every mismatch immediately changes the dragon’s appearance.' },
      { id: 'rna', label: 'Repair converts the DNA strand into RNA.' },
    ],
    correctOptionId: 'correct',
    explanation:
      'Repair systems correct some mismatches. An unrepaired sequence change may be copied later, but it still may or may not affect phenotype.',
    boundary:
      'A copying mismatch is not automatically a permanent mutation or a visible trait change.',
  },
];
