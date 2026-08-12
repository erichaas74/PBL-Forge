import { ASSEMBLY_PART_DEFINITIONS } from './assembly-part-definitions';

describe('assembly part catalog', () => {
  it('gives every socket on a part a unique id', () => {
    const duplicates: string[] = [];

    for (const definition of ASSEMBLY_PART_DEFINITIONS) {
      const seen = new Set<string>();

      for (const snapPoint of definition.snapPoints) {
        if (seen.has(snapPoint.id)) duplicates.push(`${definition.id}:${snapPoint.id}`);
        seen.add(snapPoint.id);
      }
    }

    // Ids address a socket everywhere it matters: the renderer keys one marker
    // per id, attachment rules name one, and the Snap Workshop stores an
    // override against one. A repeat means two sockets move as one.
    expect(duplicates).toEqual([]);
  });

  it('gives every part a unique definition id', () => {
    const ids = ASSEMBLY_PART_DEFINITIONS.map(definition => definition.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
