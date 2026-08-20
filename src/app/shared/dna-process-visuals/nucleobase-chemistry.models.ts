import { DnaBase, RnaBase } from './dna-process.models';

export type NucleobaseSymbol = DnaBase | RnaBase;
export type NucleobaseElement = 'C' | 'N' | 'O';

export interface NucleobaseAtom {
  id: string;
  label: string;
  element: NucleobaseElement;
  x: number;
  y: number;
}

export interface NucleobaseBond {
  from: string;
  to: string;
  order: 1 | 2;
}

export interface NucleobaseDefinition {
  symbol: NucleobaseSymbol;
  name: string;
  family: 'purine' | 'pyrimidine';
  ringCount: 1 | 2;
  formula: string;
  occursIn: readonly ('DNA' | 'RNA')[];
  pairInDna: NucleobaseSymbol | null;
  pairInRna: NucleobaseSymbol;
  hydrogenBondCount: 2 | 3;
  distinction: string;
  atoms: readonly NucleobaseAtom[];
  bonds: readonly NucleobaseBond[];
}

const PURINE_ATOMS: readonly NucleobaseAtom[] = [
  atom('N1', 'N', 'N', 78, 146),
  atom('C2', 'C', 'C', 54, 107),
  atom('N3', 'N', 'N', 77, 68),
  atom('C4', 'C', 'C', 123, 68),
  atom('C5', 'C', 'C', 148, 107),
  atom('C6', 'C', 'C', 124, 146),
  atom('N7', 'N', 'N', 184, 76),
  atom('C8', 'C', 'C', 213, 111),
  atom('N9', 'N', 'N', 181, 144),
];

const PURINE_RING_BONDS: readonly NucleobaseBond[] = [
  bond('N1', 'C2', 1),
  bond('C2', 'N3', 2),
  bond('N3', 'C4', 1),
  bond('C4', 'C5', 2),
  bond('C5', 'C6', 1),
  bond('C6', 'N1', 2),
  bond('C5', 'N7', 1),
  bond('N7', 'C8', 2),
  bond('C8', 'N9', 1),
  bond('N9', 'C4', 1),
];

const PYRIMIDINE_ATOMS: readonly NucleobaseAtom[] = [
  atom('N1', 'N', 'N', 86, 151),
  atom('C2', 'C', 'C', 61, 109),
  atom('N3', 'N', 'N', 86, 67),
  atom('C4', 'C', 'C', 136, 67),
  atom('C5', 'C', 'C', 161, 109),
  atom('C6', 'C', 'C', 136, 151),
];

const PYRIMIDINE_RING_BONDS: readonly NucleobaseBond[] = [
  bond('N1', 'C2', 1),
  bond('C2', 'N3', 1),
  bond('N3', 'C4', 1),
  bond('C4', 'C5', 1),
  bond('C5', 'C6', 2),
  bond('C6', 'N1', 1),
];

/**
 * Shared structural catalog for the five canonical nucleobases used by the app.
 *
 * Coordinates are an educational 2D layout. Atom identities, molecular formulae,
 * ring families, and bond orders follow the neutral base structures represented by
 * PubChem compound records 190, 135398634, 597, 1135, and 1174.
 */
export const NUCLEOBASE_CHEMISTRY: Readonly<Record<NucleobaseSymbol, NucleobaseDefinition>> = {
  A: {
    symbol: 'A',
    name: 'Adenine',
    family: 'purine',
    ringCount: 2,
    formula: 'C₅H₅N₅',
    occursIn: ['DNA', 'RNA'],
    pairInDna: 'T',
    pairInRna: 'U',
    hydrogenBondCount: 2,
    distinction: 'A double-ring purine with an amino group; it pairs with T in DNA or U in RNA.',
    atoms: [...PURINE_ATOMS, atom('N6', 'NH₂', 'N', 124, 194)],
    bonds: [...PURINE_RING_BONDS, bond('C6', 'N6', 1)],
  },
  G: {
    symbol: 'G',
    name: 'Guanine',
    family: 'purine',
    ringCount: 2,
    formula: 'C₅H₅N₅O',
    occursIn: ['DNA', 'RNA'],
    pairInDna: 'C',
    pairInRna: 'C',
    hydrogenBondCount: 3,
    distinction: 'A double-ring purine with oxygen and an amino group; it pairs with cytosine.',
    atoms: [...PURINE_ATOMS, atom('O6', 'O', 'O', 124, 194), atom('N2', 'NH₂', 'N', 12, 107)],
    bonds: [
      bond('N1', 'C2', 1),
      bond('C2', 'N3', 2),
      bond('N3', 'C4', 1),
      bond('C4', 'C5', 2),
      bond('C5', 'C6', 1),
      bond('C6', 'N1', 1),
      bond('C5', 'N7', 1),
      bond('N7', 'C8', 2),
      bond('C8', 'N9', 1),
      bond('N9', 'C4', 1),
      bond('C6', 'O6', 2),
      bond('C2', 'N2', 1),
    ],
  },
  C: {
    symbol: 'C',
    name: 'Cytosine',
    family: 'pyrimidine',
    ringCount: 1,
    formula: 'C₄H₅N₃O',
    occursIn: ['DNA', 'RNA'],
    pairInDna: 'G',
    pairInRna: 'G',
    hydrogenBondCount: 3,
    distinction: 'A single-ring pyrimidine with oxygen and an amino group; it pairs with guanine.',
    atoms: [...PYRIMIDINE_ATOMS, atom('O2', 'O', 'O', 10, 109), atom('N4', 'NH₂', 'N', 136, 18)],
    bonds: [
      bond('N1', 'C2', 1),
      bond('C2', 'N3', 1),
      bond('N3', 'C4', 2),
      bond('C4', 'C5', 1),
      bond('C5', 'C6', 2),
      bond('C6', 'N1', 1),
      bond('C2', 'O2', 2),
      bond('C4', 'N4', 1),
    ],
  },
  T: {
    symbol: 'T',
    name: 'Thymine',
    family: 'pyrimidine',
    ringCount: 1,
    formula: 'C₅H₆N₂O₂',
    occursIn: ['DNA'],
    pairInDna: 'A',
    pairInRna: 'A',
    hydrogenBondCount: 2,
    distinction: 'A DNA pyrimidine with a methyl group; RNA uses uracil in its place.',
    atoms: [
      ...PYRIMIDINE_ATOMS.map((candidate) =>
        candidate.id === 'N3' ? { ...candidate, element: 'N' as const } : candidate,
      ),
      atom('O2', 'O', 'O', 10, 109),
      atom('O4', 'O', 'O', 136, 18),
      atom('C7', 'CH₃', 'C', 215, 109),
    ],
    bonds: [
      ...PYRIMIDINE_RING_BONDS,
      bond('C2', 'O2', 2),
      bond('C4', 'O4', 2),
      bond('C5', 'C7', 1),
    ],
  },
  U: {
    symbol: 'U',
    name: 'Uracil',
    family: 'pyrimidine',
    ringCount: 1,
    formula: 'C₄H₄N₂O₂',
    occursIn: ['RNA'],
    pairInDna: null,
    pairInRna: 'A',
    hydrogenBondCount: 2,
    distinction: 'An RNA pyrimidine shaped like thymine but without thymine’s methyl group.',
    atoms: [...PYRIMIDINE_ATOMS, atom('O2', 'O', 'O', 10, 109), atom('O4', 'O', 'O', 136, 18)],
    bonds: [...PYRIMIDINE_RING_BONDS, bond('C2', 'O2', 2), bond('C4', 'O4', 2)],
  },
};

export const NUCLEOBASE_SYMBOLS: readonly NucleobaseSymbol[] = ['A', 'C', 'G', 'T', 'U'];

export function nucleobaseDefinition(symbol: NucleobaseSymbol): NucleobaseDefinition {
  return NUCLEOBASE_CHEMISTRY[symbol];
}

function atom(
  id: string,
  label: string,
  element: NucleobaseElement,
  x: number,
  y: number,
): NucleobaseAtom {
  return { id, label, element, x, y };
}

function bond(from: string, to: string, order: 1 | 2): NucleobaseBond {
  return { from, to, order };
}
