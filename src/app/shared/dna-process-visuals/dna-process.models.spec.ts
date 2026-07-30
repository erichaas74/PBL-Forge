import {
  complementaryDna,
  dnaSequence,
  mutatedSequence,
  transcribedRna,
} from './dna-process.models';

describe('DNA process models', () => {
  const sequence = dnaSequence('AGTCAT');

  it('builds DNA and RNA complements using the correct bases', () => {
    expect(complementaryDna(sequence).join('')).toBe('TCAGTA');
    expect(transcribedRna(sequence).join('')).toBe('AGUCAU');
  });

  it('models insertion, deletion, and substitution as distinct length changes', () => {
    expect(mutatedSequence(sequence, 'insertion', 'C').join('')).toBe('AGTCCAT');
    expect(mutatedSequence(sequence, 'deletion', 'C').join('')).toBe('AGTAT');
    expect(mutatedSequence(sequence, 'substitution', 'C').join('')).toBe('AGTAAT');
    expect(mutatedSequence(sequence, 'substitution', 'G').join('')).toBe('AGTGAT');
  });
});
