import {
  bloodlineReport,
  companionAssembly,
  founderLinesRepresented,
  founderToCompanion,
  kinshipCoefficient,
  litterConsistency,
  materializeLitter,
  meetsStandard,
  pupToCompanion,
  rebuildKennel,
  sameStandard,
  standardMatches,
  whelpLitter,
} from './companion-show.domain';
import {
  BreedStandardTarget,
  CompanionDragon,
  CompanionShowSnapshot,
  LitterRecord,
} from './companion-show.models';
import { emptyCompanionShowSnapshot } from './companion-show.repository';
import { MINI_FOUNDERS } from './mini-dragon.genetics';

const FLUFFY: BreedStandardTarget = { geneId: 'coat', formId: 'coat:fluffy' };
const SLEEK: BreedStandardTarget = { geneId: 'coat', formId: 'coat:sleek' };
const CURLED: BreedStandardTarget = { geneId: 'horns', formId: 'horns:curled' };

function founder(id: string): CompanionDragon {
  const dragon = founderToCompanion(id);
  if (!dragon) throw new Error(`No founder ${id}`);
  return dragon;
}

function snapshotWith(overrides: Partial<CompanionShowSnapshot>): CompanionShowSnapshot {
  return { ...emptyCompanionShowSnapshot('student-1'), ...overrides };
}

describe('companion show standard', () => {
  it('compares a genome to a standard by visible form only', () => {
    const cinder = founder('mini-cinder');

    const matches = standardMatches(cinder.genome, [FLUFFY, CURLED]);

    expect(matches.map((match) => match.matched)).toEqual([true, true]);
    expect(matches[0].actualLabel).toBe('Fluffy coat');
    // The record a phenotype-only surface renders must carry no allele pair.
    expect(JSON.stringify(matches)).not.toMatch(/"[A-Za-z]{1,2}","[A-Za-z]{1,2}"/);
  });

  it('treats an empty standard as unmet so nothing can be registered without one', () => {
    expect(meetsStandard(founder('mini-biscuit').genome, [])).toBe(false);
  });

  it('compares standards as sets, not as ordered lists', () => {
    expect(sameStandard([FLUFFY, CURLED], [CURLED, FLUFFY])).toBe(true);
    expect(sameStandard([FLUFFY], [SLEEK])).toBe(false);
    expect(sameStandard([FLUFFY], [FLUFFY, CURLED])).toBe(false);
  });
});

describe('companion litters', () => {
  it('produces the requested number of young from the mini dragon breeder', () => {
    const litter = whelpLitter(founder('mini-biscuit'), founder('mini-pepper'), [FLUFFY], 1, 8);

    expect(litter.pups.length).toBe(8);
    expect(litter.record.parentIds).toEqual(['mini-biscuit', 'mini-pepper']);
    expect(litter.record.generation).toBe(1);
    expect(new Set(litter.pups.map((pup) => pup.id)).size).toBe(8);
  });

  it('rebuilds identical young from the stored record', () => {
    const original = whelpLitter(founder('mini-biscuit'), founder('mini-cinder'), [FLUFFY], 3, 6);
    const replayed = materializeLitter(
      original.record,
      founder('mini-biscuit'),
      founder('mini-cinder'),
    );

    expect(replayed.pups.map((pup) => pup.genome)).toEqual(original.pups.map((pup) => pup.genome));
    expect(replayed.pups.map((pup) => pup.name)).toEqual(original.pups.map((pup) => pup.name));
  });

  it('judges each litter against the standard it was whelped under', () => {
    // Thistle is homozygous fluffy, so every young of this pairing is fluffy.
    const fluffy = whelpLitter(founder('mini-thistle'), founder('mini-cinder'), [FLUFFY], 1, 6);
    const sleek = whelpLitter(founder('mini-thistle'), founder('mini-cinder'), [SLEEK], 2, 6);

    expect(fluffy.matchedCount).toBe(6);
    expect(fluffy.matchPercent).toBe(100);
    expect(sleek.matchedCount).toBe(0);
  });

  it('counts consistency only across litters bred to the same standard', () => {
    const matching = whelpLitter(founder('mini-thistle'), founder('mini-cinder'), [FLUFFY], 1, 6);
    const other = whelpLitter(founder('mini-thistle'), founder('mini-cinder'), [SLEEK], 2, 6);

    const report = litterConsistency([matching, other], [FLUFFY]);

    expect(report.litterCount).toBe(1);
    expect(report.pupCount).toBe(6);
    expect(report.percent).toBe(100);
  });

  it('produces off-standard young from two parents that both meet the standard', () => {
    // Both founders show curled horns; both are heterozygous, so a quarter of
    // the young are expected to be straight-horned. This is the whole lesson.
    const litter = whelpLitter(founder('mini-biscuit'), founder('mini-sorrel'), [CURLED], 1, 12);

    expect(meetsStandard(founder('mini-biscuit').genome, [CURLED])).toBe(true);
    expect(meetsStandard(founder('mini-sorrel').genome, [CURLED])).toBe(true);
    expect(litter.matchedCount).toBeLessThan(litter.pups.length);
  });
});

describe('kennel rebuild', () => {
  it('replays adopted founders and every kept young across generations', () => {
    const first = whelpLitter(founder('mini-biscuit'), founder('mini-pepper'), [FLUFFY], 1, 4);
    const firstRecord: LitterRecord = {
      ...first.record,
      keptPupIds: [first.pups[0].id, first.pups[1].id],
    };
    const second = whelpLitter(
      pupToCompanion({ ...first.pups[0], kept: true }),
      pupToCompanion({ ...first.pups[1], kept: true }),
      [FLUFFY],
      2,
      4,
    );

    const rebuilt = rebuildKennel(
      snapshotWith({
        kennelFounderIds: ['mini-biscuit', 'mini-pepper'],
        litters: [firstRecord, { ...second.record, keptPupIds: [second.pups[0].id] }],
      }),
    );

    expect(rebuilt.kennel.size).toBe(5);
    expect(rebuilt.kennel.get(second.pups[0].id)?.generation).toBe(2);
    expect(rebuilt.litters.size).toBe(2);
  });

  it('skips a litter whose parents are no longer in the kennel', () => {
    const litter = whelpLitter(founder('mini-biscuit'), founder('mini-pepper'), [FLUFFY], 1, 4);

    const rebuilt = rebuildKennel(
      snapshotWith({ kennelFounderIds: ['mini-biscuit'], litters: [litter.record] }),
    );

    expect(rebuilt.litters.size).toBe(0);
    expect(rebuilt.kennel.size).toBe(1);
  });

  it('ignores a founder id the Society register does not recognize', () => {
    expect(founderToCompanion('mini-nonesuch')).toBeNull();
    expect(rebuildKennel(snapshotWith({ kennelFounderIds: ['mini-nonesuch'] })).kennel.size).toBe(0);
  });
});

describe('bloodline', () => {
  const nodes = new Map([
    ['p', { id: 'p', generation: 0, parentIds: null }],
    ['q', { id: 'q', generation: 0, parentIds: null }],
    ['a', { id: 'a', generation: 1, parentIds: ['p', 'q'] as readonly [string, string] }],
    ['b', { id: 'b', generation: 1, parentIds: ['p', 'q'] as readonly [string, string] }],
    ['c', { id: 'c', generation: 2, parentIds: ['a', 'b'] as readonly [string, string] }],
  ]);

  it('treats unrelated founders as unrelated', () => {
    expect(kinshipCoefficient('p', 'q', nodes)).toBe(0);
  });

  it('gives full siblings a kinship of one quarter', () => {
    expect(kinshipCoefficient('a', 'b', nodes)).toBeCloseTo(0.25, 6);
  });

  it('gives a parent and its young a kinship of one quarter', () => {
    expect(kinshipCoefficient('p', 'a', nodes)).toBeCloseTo(0.25, 6);
  });

  it('raises kinship for an inbred descendant', () => {
    expect(kinshipCoefficient('c', 'c', nodes)).toBeCloseTo(0.625, 6);
  });

  it('flags a sibling pairing and names the shared line', () => {
    const first = whelpLitter(founder('mini-biscuit'), founder('mini-pepper'), [FLUFFY], 1, 4);
    const record: LitterRecord = {
      ...first.record,
      keptPupIds: [first.pups[0].id, first.pups[1].id],
    };
    const rebuilt = rebuildKennel(
      snapshotWith({ kennelFounderIds: ['mini-biscuit', 'mini-pepper'], litters: [record] }),
    );
    const siblings = [...rebuilt.kennel.values()].filter((dragon) => dragon.origin === 'bred');

    const report = bloodlineReport(siblings[0], siblings[1], rebuilt.kennel);

    expect(report.inbreedingPercent).toBeCloseTo(25, 5);
    expect(report.relatednessPercent).toBeCloseTo(50, 5);
    expect(report.band).toBe('Very close');
    expect(report.sharedAncestorNames).toContain('Biscuit');
  });

  it('reads no genome at all: two identical genomes are still unrelated without a pedigree', () => {
    const first = founder('mini-pepper');
    const twin: CompanionDragon = { ...first, id: 'twin', name: 'Twin' };
    const kennel = new Map([
      [first.id, first],
      [twin.id, twin],
    ]);

    expect(bloodlineReport(first, twin, kennel).band).toBe('Unrelated');
  });

  it('counts the founder lines still represented in the kennel', () => {
    const litter = whelpLitter(founder('mini-biscuit'), founder('mini-pepper'), [FLUFFY], 1, 4);
    const rebuilt = rebuildKennel(
      snapshotWith({
        kennelFounderIds: ['mini-biscuit', 'mini-pepper'],
        litters: [{ ...litter.record, keptPupIds: [litter.pups[0].id] }],
      }),
    );

    expect(founderLinesRepresented(rebuilt.kennel)).toBe(2);
  });
});

describe('anatomy', () => {
  it('builds every founder into a renderable mini dragon blueprint', () => {
    for (const definition of MINI_FOUNDERS) {
      const blueprint = companionAssembly(founder(definition.id));
      expect(blueprint.parts.length).withContext(definition.id).toBeGreaterThan(8);
      expect(
        blueprint.parts.every((part) =>
          (part.visualProfile?.profileId ?? '').startsWith('mini-dragon-'),
        ),
      )
        .withContext(definition.id)
        .toBe(true);
    }
  });

  it('shortens the legs and keeps the head large on a teacup', () => {
    const teacup = companionAssembly(founder('mini-pepper'));
    const standard = companionAssembly(founder('mini-nimbus'));
    const legHeight = (parts: typeof teacup['parts']): number =>
      parts.find((part) => part.id === 'mini-leg-front-left')!.dimensions.y;
    const headToBody = (parts: typeof teacup['parts']): number =>
      parts.find((part) => part.id === 'mini-head')!.dimensions.y /
      parts.find((part) => part.id === 'mini-body')!.dimensions.y;

    expect(legHeight(teacup.parts)).toBeLessThan(legHeight(standard.parts));
    // Proportion, not scale: auto-framing would hide a uniform shrink entirely.
    expect(headToBody(teacup.parts)).toBeGreaterThan(headToBody(standard.parts));
  });

  it('passes the coat, horn, and wing genes through to the renderer', () => {
    const fluffyCurled = companionAssembly(founder('mini-cinder'));
    const head = fluffyCurled.parts.find((part) => part.id === 'mini-head')!;
    const wing = fluffyCurled.parts.find((part) => part.id === 'mini-wing-left')!;

    expect(head.visualProfile?.parameters?.['miniCoatDepth']).toBe(1);
    expect(head.visualProfile?.parameters?.['miniHornCurl']).toBe(1);
    expect(wing.visualProfile?.parameters?.['miniWingSpread']).toBeCloseTo(0.58, 5);
  });

  it('collapses the wings of a vestigial genotype', () => {
    const wingless = companionAssembly(founder('mini-nimbus'));
    const wing = wingless.parts.find((part) => part.id === 'mini-wing-left')!;
    expect(wing.visualProfile?.parameters?.['miniWingSpread']).toBeCloseTo(0.12, 5);
  });

  it('authors part-local joint pivots', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));
    const head = blueprint.parts.find((part) => part.id === 'mini-head')!;
    const joint = blueprint.joints.find((candidate) => candidate.childPartId === 'mini-head')!;

    // The body sits at the origin, so the pivot equals the head's offset.
    expect(joint.pivotOnParent).toEqual(head.position);
    expect(joint.pivotOnChild).toEqual({ x: 0, y: 0, z: 0 });
  });
});
