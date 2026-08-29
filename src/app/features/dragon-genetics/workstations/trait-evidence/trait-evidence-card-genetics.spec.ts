import { TRAIT_EVIDENCE_DRAGONS } from './trait-evidence.content';
import { buildTraitEvidenceCardGenomeView } from './trait-evidence-card-genetics';

describe('Trait Evidence card genetics', () => {
    it('builds every card from the shared five-pair chromosome catalog', () => {
        for (const dragon of TRAIT_EVIDENCE_DRAGONS) {
            const view = buildTraitEvidenceCardGenomeView(dragon);

            expect(view.chromosomes.map((chromosome) => chromosome.id)).toEqual([
                'Chr 1',
                'Chr 2',
                'Chr 3',
                'Chr 4',
                'Chr X',
            ]);
            expect([...view.genesByChromosome.values()].flat()).toHaveLength(12);
        }
    });

    it('keeps the card readout and rendered core profile on the same dragon genome', () => {
        const aster = TRAIT_EVIDENCE_DRAGONS[0];
        const view = buildTraitEvidenceCardGenomeView(aster);
        const horn = view.genesByChromosome.get('Chr 2')?.find((gene) => gene.id === 'horns');

        expect(horn?.genotype).toBe('hh');
        expect(horn?.phenotype).toBe('Smooth-headed');
    });

    it('shows XX and XY card backs with the shared X-linked eye locus', () => {
        const female = buildTraitEvidenceCardGenomeView(TRAIT_EVIDENCE_DRAGONS[0]);
        const male = buildTraitEvidenceCardGenomeView(TRAIT_EVIDENCE_DRAGONS[1]);

        expect(female.sexChromosomes).toBe('XX');
        expect(male.sexChromosomes).toBe('XY');
        expect(female.genesByChromosome.get('Chr X')?.[0].genotype).toBe('XE Xe');
        expect(male.genesByChromosome.get('Chr X')?.[0].genotype).toBe('XEY');
    });
});
