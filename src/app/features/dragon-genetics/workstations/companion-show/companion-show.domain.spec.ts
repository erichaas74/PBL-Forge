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
    expect(matches[0].actualLabel).toBe('Baby-bumpy spike rows');
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
    expect(rebuildKennel(snapshotWith({ kennelFounderIds: ['mini-nonesuch'] })).kennel.size).toBe(
      0,
    );
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
    // Thistle and Biscuit share the long frame, while their size forms differ.
    const teacup = companionAssembly(founder('mini-thistle'));
    const standard = companionAssembly(founder('mini-biscuit'));
    const legHeight = (parts: (typeof teacup)['parts']): number =>
      parts.find((part) => part.id === 'mini-leg-front-left')!.dimensions.y;
    const headToBody = (parts: (typeof teacup)['parts']): number =>
      parts.find((part) => part.id === 'mini-head')!.dimensions.y /
      parts.find((part) => part.id === 'mini-body')!.dimensions.y;

    expect(legHeight(teacup.parts)).toBeLessThan(legHeight(standard.parts));
    // Proportion, not scale: auto-framing would hide a uniform shrink entirely.
    expect(headToBody(teacup.parts)).toBeGreaterThan(headToBody(standard.parts));
  });

  it('builds every leg as a hip, thigh, and articulated lower leg', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));
    const thigh = blueprint.parts.find((part) => part.id === 'mini-leg-front-left')!;
    const lower = blueprint.parts.find((part) => part.id === 'mini-leg-front-left-lower-leg')!;
    const hip = blueprint.joints.find((joint) => joint.childPartId === thigh.id)!;
    const knee = blueprint.joints.find((joint) => joint.childPartId === lower.id)!;

    expect(thigh.visualProfile?.profileId).toBe('mini-dragon-thigh');
    expect(lower.visualProfile?.profileId).toBe('mini-dragon-leg');
    expect(hip.parentPartId).toBe('mini-body');
    expect(hip.pivotOnChild.y).toBeCloseTo(thigh.dimensions.y * 0.4, 6);
    expect(knee.parentPartId).toBe(thigh.id);
    expect(knee.pivotOnChild.y).toBeCloseTo(lower.dimensions.y * 0.4, 6);
  });

  it('maps the six expanded silhouette genes into major part changes', () => {
    const longRunner = companionAssembly(founder('mini-biscuit'));
    const roundWaddler = companionAssembly(founder('mini-cinder'));
    const part = (blueprint: typeof longRunner, id: string) =>
      blueprint.parts.find((candidate) => candidate.id === id)!;
    const headParameters = part(longRunner, 'mini-head').visualProfile?.parameters;
    const roundHeadParameters = part(roundWaddler, 'mini-head').visualProfile?.parameters;

    expect(part(longRunner, 'mini-body').dimensions.x).toBeGreaterThan(
      part(roundWaddler, 'mini-body').dimensions.x,
    );
    expect(part(longRunner, 'mini-leg-front-left').dimensions.y).toBeGreaterThan(
      part(roundWaddler, 'mini-leg-front-left').dimensions.y * 2,
    );
    expect(headParameters?.['miniEarScale']).toBeGreaterThan(1);
    expect(roundHeadParameters?.['miniEarScale']).toBeLessThan(0.5);
    expect(headParameters?.['miniSnoutLength']).toBeGreaterThan(1);
    expect(roundHeadParameters?.['miniSnoutLength']).toBeLessThan(0.1);
    expect(headParameters?.['miniCrestCrown']).toBe(1);
    expect(roundHeadParameters?.['miniCrestFrill']).toBe(1);
    expect(part(longRunner, 'mini-tail-plume').visualProfile?.parameters?.['miniTailStyle']).toBe(
      0,
    );
    expect(part(roundWaddler, 'mini-tail-plume').visualProfile?.parameters?.['miniTailStyle']).toBe(
      2,
    );
  });

  it('overlaps the slim tail pieces along one continuous centreline', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));
    const tail1 = blueprint.parts.find((part) => part.id === 'mini-tail-1')!;
    const tail2 = blueprint.parts.find((part) => part.id === 'mini-tail-2')!;
    const plume = blueprint.parts.find((part) => part.id === 'mini-tail-plume')!;

    expect(tail2.position.y).toBeCloseTo(tail1.position.y, 6);
    expect(plume.position.y).toBeCloseTo(tail1.position.y, 6);
    expect(tail2.position.x + tail2.dimensions.x / 2).toBeGreaterThan(
      tail1.position.x - tail1.dimensions.x / 2,
    );
    expect(plume.position.x + plume.dimensions.x * 0.12).toBeGreaterThan(
      tail2.position.x - tail2.dimensions.x / 2,
    );
    expect(tail1.dimensions.y).toBeLessThan(tail1.dimensions.x);
  });

  it('passes the back-scale, horn, and wing genes through to the renderer', () => {
    const bumpyCurled = companionAssembly(founder('mini-cinder'));
    const scales = bumpyCurled.parts.find((part) => part.id === 'mini-dorsal-scales')!;
    const head = bumpyCurled.parts.find((part) => part.id === 'mini-head')!;
    const wing = bumpyCurled.parts.find((part) => part.id === 'mini-wing-left')!;

    expect(scales.visualProfile?.parameters?.['miniDorsalBumps']).toBe(1);
    expect(head.visualProfile?.parameters?.['miniHornCurl']).toBe(1);
    expect(wing.visualProfile?.parameters?.['miniWingSpread']).toBeCloseTo(0.58, 5);
  });

  it('passes inherited feather coverage to the body and wings independently of back scales', () => {
    const feathered = companionAssembly(founder('mini-pepper'));
    const body = feathered.parts.find((part) => part.id === 'mini-body')!;
    const wing = feathered.parts.find((part) => part.id === 'mini-wing-left')!;

    expect(body.visualProfile?.parameters?.['miniFeatherCoverage']).toBe(1);
    expect(wing.visualProfile?.parameters?.['miniFeatherCoverage']).toBe(1);
    expect(body.visualProfile?.parameters?.['miniDorsalBumps']).toBe(0);
  });

  it('includes a separate lower jaw for learned show motions', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));
    const jaw = blueprint.parts.find((part) => part.id === 'mini-jaw');

    expect(jaw?.roles).toContain('jaw');
    expect(jaw?.visualProfile?.profileId).toBe('mini-dragon-jaw');
    expect(blueprint.joints.some((joint) => joint.childPartId === 'mini-jaw')).toBe(true);
  });

  it('includes a separate neck and dorsal-scale rows for expression and learned poses', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));

    expect(blueprint.parts.find((part) => part.id === 'mini-neck')?.roles).toContain('neck');
    expect(blueprint.parts.find((part) => part.id === 'mini-dorsal-scales')?.roles).toContain(
      'dorsal-scales',
    );
  });

  it('collapses the wings of a vestigial genotype', () => {
    const wingless = companionAssembly(founder('mini-nimbus'));
    const wing = wingless.parts.find((part) => part.id === 'mini-wing-left')!;
    expect(wing.visualProfile?.parameters?.['miniWingSpread']).toBeCloseTo(0.12, 5);
  });

  it('authors part-local joint pivots', () => {
    const blueprint = companionAssembly(founder('mini-biscuit'));
    const head = blueprint.parts.find((part) => part.id === 'mini-head')!;
    const neck = blueprint.parts.find((part) => part.id === 'mini-neck')!;
    const joint = blueprint.joints.find((candidate) => candidate.childPartId === 'mini-head')!;

    expect(joint.pivotOnParent).toEqual({
      x: head.position.x - neck.position.x,
      y: head.position.y - neck.position.y,
      z: head.position.z - neck.position.z,
    });
    expect(joint.pivotOnChild).toEqual({ x: 0, y: 0, z: 0 });
  });
});
