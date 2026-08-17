import { TestBed } from '@angular/core/testing';
import { founderToCompanion, whelpLitter } from './companion-show.domain';
import { BreedStandardTarget } from './companion-show.models';
import {
  CompanionShowRepository,
  emptyCompanionShowSnapshot,
} from './companion-show.repository';

const FLUFFY: BreedStandardTarget = { geneId: 'coat', formId: 'coat:fluffy' };

describe('CompanionShowRepository', () => {
  const studentId = 'companion-show-repository-spec';
  const storageKey = `pbl-forge.dragon-genetics.companion-show.v4.${studentId}`;
  const version3Key = `pbl-forge.dragon-genetics.companion-show.v3.${studentId}`;
  const previousKey = `pbl-forge.dragon-genetics.companion-show.v2.${studentId}`;
  const legacyKey = `pbl-forge.dragon-genetics.companion-show.v1.${studentId}`;
  let repository: CompanionShowRepository;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(version3Key);
    localStorage.removeItem(previousKey);
    localStorage.removeItem(legacyKey);
    TestBed.configureTestingModule({});
    repository = TestBed.inject(CompanionShowRepository);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(version3Key);
    localStorage.removeItem(previousKey);
    localStorage.removeItem(legacyKey);
  });

  it('round-trips a breeding program', () => {
    const litter = whelpLitter(
      founderToCompanion('mini-biscuit')!,
      founderToCompanion('mini-pepper')!,
      [FLUFFY],
      1,
      6,
      '2026-08-13T12:00:00.000Z',
    );
    repository.save({
      ...emptyCompanionShowSnapshot(studentId),
      breedName: 'Cloud Puff',
      targets: [FLUFFY],
      kennelFounderIds: ['mini-biscuit', 'mini-pepper'],
      pairIds: ['mini-biscuit', 'mini-pepper'],
      litters: [{ ...litter.record, keptPupIds: [litter.pups[0].id] }],
      nextRunNumber: 2,
      citedLitterIds: [litter.record.id],
      rareTraitGeneId: 'coat',
      rareCandidateIds: [litter.pups[0].id],
      claim: 'Both parents were fluffy and every young in two litters was fluffy.',
      updatedAtIso: '2026-08-13T12:01:00.000Z',
    });

    const restored = repository.load(studentId);

    expect(restored.breedName).toBe('Cloud Puff');
    expect(restored.targets).toEqual([FLUFFY]);
    expect(restored.litters[0].keptPupIds).toEqual([litter.pups[0].id]);
    expect(restored.litters[0].targets).toEqual([FLUFFY]);
    expect(restored.citedLitterIds).toEqual([litter.record.id]);
    expect(restored.nextRunNumber).toBe(2);
    expect(restored.rareTraitGeneId).toBe('coat');
    expect(restored.rareCandidateIds).toEqual([litter.pups[0].id]);
  });

  it('drops a standard target the gene catalog no longer recognizes', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...emptyCompanionShowSnapshot(studentId),
        targets: [FLUFFY, { geneId: 'coat', formId: 'coat:retired' }, { geneId: 'nope' }],
      }),
    );

    expect(repository.load(studentId).targets).toEqual([FLUFFY]);
  });

  it('drops a founder the Society register does not list', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...emptyCompanionShowSnapshot(studentId),
        kennelFounderIds: ['mini-biscuit', 'ember'],
      }),
    );

    expect(repository.load(studentId).kennelFounderIds).toEqual(['mini-biscuit']);
  });

  it('ignores a v1 record rather than migrating a different species into one', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ schemaVersion: 1, breedName: 'Old lab dragon breed', targets: [] }),
    );

    expect(repository.load(studentId).breedName).toBe('');
  });

  it('migrates a version 2 kennel and initializes the new show-training records', () => {
    localStorage.setItem(
      previousKey,
      JSON.stringify({
        schemaVersion: 2,
        studentId,
        breedName: 'Cloud Puff',
        targets: [FLUFFY],
        kennelFounderIds: ['mini-biscuit'],
        pairIds: [null, null],
        litterSize: 6,
        litters: [],
        nextRunNumber: 1,
        championId: null,
        citedLitterIds: [],
        claim: '',
        registry: [],
        updatedAtIso: '2026-08-15T00:00:00.000Z',
      }),
    );

    const restored = repository.load(studentId);

    expect(restored.schemaVersion).toBe(4);
    expect(restored.breedName).toBe('Cloud Puff');
    expect(restored.showDivisionId).toBeNull();
    expect(restored.trainingSessions).toEqual([]);
    expect(restored.showRuns).toEqual([]);
    expect(restored.rareTraitGeneId).toBeNull();
    expect(restored.rareCandidateIds).toEqual([]);
  });

  it('falls back safely when stored data is corrupt', () => {
    localStorage.setItem(storageKey, '{not-json');

    const restored = repository.load(studentId);

    expect(restored.litters).toEqual([]);
    expect(restored.targets).toEqual([]);
  });
});
