import { toCoreLabGenome, DEFAULT_EXPRESSIVE_DRAGON } from './dragon-expressive-genome';
import {
  DRAGON_BODY_TYPES,
  bodyGenomeForType,
  isDragonBodyType,
} from './dragon-body-type.genetics';

describe('classic dragon body type genetics', () => {
  const core = toCoreLabGenome(DEFAULT_EXPRESSIVE_DRAGON);

  it('publishes the six teacher-bench types', () => {
    expect(DRAGON_BODY_TYPES.map((type) => type.id)).toEqual([
      'regal-dragon',
      'bulwark-dragon',
      'sky-courser-dragon',
      'marsh-prowler-dragon',
      'double-wing-dragon',
      'long-serpent-dragon',
    ]);
  });

  it('loads each type without discarding unrelated loci', () => {
    const custom = { ...core, fire: ['f', 'f'] as [string, string] };

    for (const type of DRAGON_BODY_TYPES) {
      const genome = bodyGenomeForType(custom, type.id);
      expect(isDragonBodyType(genome, type.id)).toBe(true);
      expect(genome.fire).toEqual(['f', 'f']);
    }
  });

  it('uses wing and tail expression to distinguish the long serpent', () => {
    const serpent = bodyGenomeForType(core, 'long-serpent-dragon');

    expect(serpent.wings).toEqual(['w', 'w']);
    expect(serpent['tail-length']).toEqual(['T', 't']);
    expect(serpent['secondary-wings']).toEqual(['q', 'q']);
    expect(serpent.horns).toEqual(['H', 'h']);
    expect(serpent.tail).toEqual(['k', 'k']);
  });
});
