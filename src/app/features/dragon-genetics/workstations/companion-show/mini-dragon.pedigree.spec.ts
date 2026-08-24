import { founderToCompanion } from './companion-show.domain';
import { CompanionDragon } from './companion-show.models';
import {
  MINI_RARE_TRAIT_TARGETS,
  miniPedigreeEvidence,
  miniRareTraitCount,
} from './mini-dragon.pedigree';

describe('mini dragon rare-trait pedigree evidence', () => {
  const target = MINI_RARE_TRAIT_TARGETS.find((candidate) => candidate.geneId === 'coat')!;
  const biscuit = founderToCompanion('mini-biscuit')!;
  const pepper = founderToCompanion('mini-pepper')!;
  const fluffyYoung: CompanionDragon = {
    id: 'fluffy-young',
    name: 'Flurry',
    title: 'Pedigree test young',
    origin: 'bred',
    generation: 1,
    parentIds: [biscuit.id, pepper.id],
    litterId: 'litter-1',
    genome: { ...biscuit.genome, coat: ['f', 'f'] },
  };

  it('derives only hidden complete-dominance forms from the genetics catalog', () => {
    expect(MINI_RARE_TRAIT_TARGETS.map((candidate) => candidate.formLabel)).toEqual([
      'Baby-bumpy spike rows',
      'Straight horns',
      'Teacup',
      'Smooth chin',
      'Soft shoulders',
    ]);
  });

  it('uses visible family outcomes rather than exposing a genome answer', () => {
    const population = [biscuit, pepper, fluffyYoung];

    expect(miniPedigreeEvidence(fluffyYoung, population, target).id).toBe('shows-trait');
    expect(miniPedigreeEvidence(biscuit, population, target).id).toBe('proven-by-offspring');
    expect(miniRareTraitCount(population, target)).toBe(1);
  });
});
