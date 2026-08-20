import {
  complementaryDna,
  dnaSequence,
  mutatedSequence,
  transcribedRna,
  translateRna,
} from './dna-process.models';

describe('DNA process models', () => {
  const sequence = dnaSequence('AGTCAT');

  it('builds DNA and RNA complements using the correct bases', () => {
    expect(complementaryDna(sequence).join('')).toBe('TCAGTA');
    expect(transcribedRna(sequence).join('')).toBe('AGUCAU');
  });

  it('translates codons and stops at a release signal', () => {
    const translation = translateRna('AUGCCGUAAAGA');

    expect(translation.steps.map((step) => step.shortName)).toEqual(['Met', 'Pro', 'STOP']);
    expect(translation.aminoAcids).toEqual(['Methionine', 'Proline']);
    expect(translation.stoppedEarly).toBeTrue();
  });

  it('keeps all 24 modeled bases for an eight-codon gene', () => {
    const codingDna = 'ATGCCGTACCGAGCTACCGGATCA';

    expect(dnaSequence(codingDna).length).toBe(24);
    expect(translateRna(codingDna.replaceAll('T', 'U')).aminoAcids.length).toBe(8);
  });

  it('models insertion, deletion, and substitution as distinct length changes', () => {
    expect(mutatedSequence(sequence, 'insertion', 'C').join('')).toBe('AGTCCAT');
    expect(mutatedSequence(sequence, 'deletion', 'C').join('')).toBe('AGTAT');
    expect(mutatedSequence(sequence, 'substitution', 'C').join('')).toBe('AGTAAT');
    expect(mutatedSequence(sequence, 'substitution', 'G').join('')).toBe('AGTGAT');
  });
});
