import { TestBed } from '@angular/core/testing';
import { GeneticsProgramResolver } from './genetics-program.resolver';
import { MINI_CHROMOSOME_GENE_IDS } from '../mini-dragon-shared/mini-dragon-chromosome.catalog';
import { MINI_GENE_IDS } from '../companion-show/mini-dragon.genetics';

describe('GeneticsProgramResolver', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('keeps every Mini gene in one authoritative chromosome group', () => {
    const assigned = Object.values(MINI_CHROMOSOME_GENE_IDS).flat();
    expect(new Set(assigned).size).toBe(MINI_GENE_IDS.length);
    expect(new Set(assigned)).toEqual(new Set(MINI_GENE_IDS));
  });

  for (const pathId of ['arena', 'mini-show'] as const) {
    it(`supplies cards, breeding, meiosis, and fertilization for ${pathId}`, () => {
      const program = TestBed.inject(GeneticsProgramResolver).resolve(pathId);
      const specimens = program.specimens(`program-spec-${pathId}`);
      expect(specimens.length).toBeGreaterThanOrEqual(2);
      expect(program.genes.length).toBeGreaterThan(0);

      const bundle = program.cardBundle(specimens[0]);
      expect(bundle.card.source).toBeTruthy();
      expect(bundle.genome.chromosomes.length).toBeGreaterThan(0);
      expect(bundle.genome.genesByChromosome.size).toBeGreaterThan(0);

      const geneId = program.genes[0].id;
      const batch = program.breed(specimens[0], specimens[1], geneId, 8, `${pathId}:batch`);
      expect(batch.offspring).toHaveLength(8);
      expect(batch.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(8);

      const firstGametes = program.meiosis(specimens[0], `${pathId}:first`);
      const secondGametes = program.meiosis(specimens[1], `${pathId}:second`);
      expect(firstGametes).toHaveLength(4);
      expect(secondGametes).toHaveLength(4);
      const child = program.fertilize(
        specimens[0],
        specimens[1],
        firstGametes[0],
        secondGametes[0],
        `${pathId}:child`,
      );
      expect(child.id).toContain('child');
      expect(child.renderSource).toBeTruthy();
    });
  }
});
