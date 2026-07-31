import { TestBed } from '@angular/core/testing';
import { SpecimenProfileRegistry } from '../../../../shared/assembly/preview/specimen-profile.registry';
import {
  toStoredSpecimenModel,
  parseStoredSpecimenModel,
} from '../../../../shared/assembly/preview/stored-specimen';
import { DRAGON_LOCUS_VISUALS, createFounderDragonGenome } from './dragon-phenotype-builder';
import { DragonLabGenome } from './dragon-lab.models';
import {
  DRAGON_SPECIMEN_PROFILE_ID,
  dragonEngineGenomeSource,
  dragonLabGenomeSource,
  provideDragonSpecimenProfile,
} from './dragon-specimen.profile';

const WINGED: DragonLabGenome = {
  wings: ['W', 'w'],
  fire: ['F', 'f'],
  scales: ['S', 's'],
  horns: ['H', 'h'],
};

const WINGLESS: DragonLabGenome = {
  wings: ['w', 'w'],
  fire: ['f', 'f'],
  scales: ['s', 's'],
  horns: ['h', 'h'],
};

function registry(): SpecimenProfileRegistry {
  TestBed.configureTestingModule({ providers: [provideDragonSpecimenProfile()] });
  return TestBed.inject(SpecimenProfileRegistry);
}

describe('dragon specimen profile', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('registers under a stable id', () => {
    expect(registry().registeredIds).toContain(DRAGON_SPECIMEN_PROFILE_ID);
  });

  it('builds a specimen from a student lab genome', () => {
    const resolution = registry().resolve(dragonLabGenomeSource('ember', WINGED, { label: 'Ember' }));

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.label).toBe('Ember');
    expect(resolution.descriptor.blueprint.parts.length).toBeGreaterThan(0);
  });

  it('drops the wings for a recessive wingless genotype', () => {
    const resolve = registry();
    const winged = resolve.resolve(dragonLabGenomeSource('a', WINGED));
    const wingless = resolve.resolve(dragonLabGenomeSource('b', WINGLESS));

    if (winged.status !== 'ready' || wingless.status !== 'ready') {
      fail('expected both genomes to resolve');
      return;
    }

    const wingCount = (parts: { roles?: string[] }[]) =>
      parts.filter(part => part.roles?.includes('wing')).length;

    expect(wingCount(winged.descriptor.blueprint.parts)).toBeGreaterThan(0);
    expect(wingCount(wingless.descriptor.blueprint.parts)).toBe(0);
  });

  it('is deterministic: the same genome always yields the same specimen', () => {
    const resolve = registry();
    const first = resolve.resolve(dragonLabGenomeSource('ember', WINGED));
    const second = resolve.resolve(dragonLabGenomeSource('ember', WINGED));

    if (first.status !== 'ready' || second.status !== 'ready') {
      fail('expected both to resolve');
      return;
    }

    expect(first.descriptor.blueprint).toEqual(second.descriptor.blueprint);
  });

  it('reports the Mendelian traits a student reasoned about first', () => {
    const resolution = registry().resolve(dragonLabGenomeSource('ember', WINGED));

    if (resolution.status !== 'ready') {
      fail('expected a specimen');
      return;
    }

    const traitIds = resolution.descriptor.traits.map(trait => trait.id);
    expect(traitIds.slice(0, 4)).toEqual([
      'trait:wings',
      'trait:fire',
      'trait:scales',
      'trait:horns',
    ]);
    expect(traitIds).toContain('wing-span');
  });

  it('labels a heterozygous genotype with its dominant phenotype', () => {
    const resolution = registry().resolve(dragonLabGenomeSource('ember', WINGED));

    if (resolution.status !== 'ready') {
      fail('expected a specimen');
      return;
    }

    const wings = resolution.descriptor.traits.find(trait => trait.id === 'trait:wings');
    expect(wings?.valueLabel).toContain('Ww');
    expect(wings?.valueLabel).toContain('Winged');
  });

  /**
   * Roles may legitimately be declared that this particular preset does not use
   * — `armor-density` names `armor`, which only the armoured head carries — so
   * the rule is that a trait must reach *some* part, not every named part. A
   * trait matching nothing would offer the student a highlight that does
   * nothing when clicked.
   */
  it('gives every trait a highlight that reaches at least one part', () => {
    const resolution = registry().resolve(dragonLabGenomeSource('ember', WINGED));

    if (resolution.status !== 'ready') {
      fail('expected a specimen');
      return;
    }

    const present = new Set(resolution.descriptor.blueprint.parts.flatMap(part => part.roles ?? []));
    for (const trait of resolution.descriptor.traits) {
      // An empty role list means "the whole animal", which always highlights.
      if (trait.roles.length === 0) continue;

      expect(trait.roles.some(role => present.has(role)))
        .withContext(`trait ${trait.id} highlights ${JSON.stringify(trait.roles)}, which no part carries`)
        .toBe(true);
    }
  });

  it('expresses the continuous engine genome too', () => {
    const genome = createFounderDragonGenome('founder-1');
    const resolution = registry().resolve(dragonEngineGenomeSource(genome, { label: 'Founder' }));

    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    expect(resolution.descriptor.accentColor).toContain('hsl');
  });

  it('rejects a genome that is not a dragon', () => {
    const resolution = registry().resolve({
      kind: 'genome',
      profileId: DRAGON_SPECIMEN_PROFILE_ID,
      genome: { kind: 'lab', genome: { wings: 'WW' } },
    });

    expect(resolution.status).toBe('error');
  });

  it('reloads a saved genome-only record through the profile', () => {
    const resolve = registry();
    const live = resolve.resolve(dragonLabGenomeSource('ember', WINGED, { label: 'Ember' }));

    if (live.status !== 'ready') {
      fail('expected a specimen');
      return;
    }

    const stored = toStoredSpecimenModel(live.descriptor, {
      genome: { kind: 'lab', genome: WINGED },
      includeBlueprint: false,
    });
    const reread = parseStoredSpecimenModel(JSON.parse(JSON.stringify(stored)));
    expect(reread).toBeTruthy();

    const reloaded = resolve.resolve({ kind: 'stored', model: reread! });
    if (reloaded.status !== 'ready') {
      fail(`expected the saved specimen to reload: ${reloaded.message}`);
      return;
    }

    expect(reloaded.descriptor.label).toBe('Ember');
    expect(reloaded.descriptor.blueprint).toEqual(live.descriptor.blueprint);
  });
});

describe('DRAGON_LOCUS_VISUALS', () => {
  it('gives every shape-bearing locus an axis and a scale reader', () => {
    for (const locus of ['wing-span', 'jaw-strength', 'tail-length'] as const) {
      expect(DRAGON_LOCUS_VISUALS[locus].axis).toBeDefined();
      expect(DRAGON_LOCUS_VISUALS[locus].scaleOf).toBeDefined();
      expect(DRAGON_LOCUS_VISUALS[locus].roles.length).toBeGreaterThan(0);
    }
  });

  it('treats whole-body loci as unfocusable', () => {
    expect(DRAGON_LOCUS_VISUALS['body-size'].roles).toEqual([]);
    expect(DRAGON_LOCUS_VISUALS['pigment-hue'].roles).toEqual([]);
  });
});
