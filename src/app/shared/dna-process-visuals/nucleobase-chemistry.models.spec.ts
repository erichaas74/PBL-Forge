import { NUCLEOBASE_CHEMISTRY, NUCLEOBASE_SYMBOLS } from './nucleobase-chemistry.models';

describe('nucleobase chemistry catalog', () => {
    it('contains the canonical formula and ring family for all five app bases', () => {
        expect(NUCLEOBASE_SYMBOLS).toEqual(['A', 'C', 'G', 'T', 'U']);
        expect(Object.fromEntries(NUCLEOBASE_SYMBOLS.map((symbol) => [
            symbol,
            [NUCLEOBASE_CHEMISTRY[symbol].formula, NUCLEOBASE_CHEMISTRY[symbol].ringCount],
        ]))).toEqual({
            A: ['C₅H₅N₅', 2],
            C: ['C₄H₅N₃O', 1],
            G: ['C₅H₅N₅O', 2],
            T: ['C₅H₆N₂O₂', 1],
            U: ['C₄H₄N₂O₂', 1],
        });
    });

    it('keeps every structural bond connected to catalog atoms', () => {
        for (const definition of Object.values(NUCLEOBASE_CHEMISTRY)) {
            const atomIds = new Set(definition.atoms.map((atom) => atom.id));
            expect(atomIds.size).toBe(definition.atoms.length);
            expect(definition.bonds.every((bond) => atomIds.has(bond.from) && atomIds.has(bond.to))).toBe(true);
        }
    });

    it('models thymine as DNA-only and uracil as RNA-only while preserving pairing', () => {
        expect(NUCLEOBASE_CHEMISTRY.T.occursIn).toEqual(['DNA']);
        expect(NUCLEOBASE_CHEMISTRY.U.occursIn).toEqual(['RNA']);
        expect(NUCLEOBASE_CHEMISTRY.T.pairInDna).toBe('A');
        expect(NUCLEOBASE_CHEMISTRY.U.pairInRna).toBe('A');
        expect(NUCLEOBASE_CHEMISTRY.G.hydrogenBondCount).toBe(3);
        expect(NUCLEOBASE_CHEMISTRY.C.hydrogenBondCount).toBe(3);
    });
});
