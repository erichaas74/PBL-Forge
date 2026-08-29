import { DragonLessonEvidenceRepository } from './dragon-lesson-evidence.repository';

describe('DragonLessonEvidenceRepository', () => {
  const repository = new DragonLessonEvidenceRepository();
  const studentId = 'evidence-student';
  const lessonId = 'alleles-and-phenotypes';

  beforeEach(() => localStorage.clear());

  it('captures, restores, and removes typed allele-expression evidence', () => {
    const record = repository.capture(studentId, 'arena', lessonId, {
      evidenceType: 'allele-expression',
      workstationId: 'allele-workbench',
      geneId: 'wings',
      pairIds: ['wings-W', 'wings-w'],
      genotype: 'CH1-G1a × CH1-G1b',
      phenotype: 'Full wings',
    });

    expect(repository.load(studentId, 'arena', lessonId)).toEqual([record]);
    expect(repository.load(studentId, 'mini-show', lessonId)).toEqual([]);
    expect(repository.remove(studentId, 'arena', lessonId, record.evidenceId)).toEqual([]);
  });

  it('replaces the same scientific comparison instead of duplicating it', () => {
    const draft = {
      evidenceType: 'allele-expression' as const,
      workstationId: 'allele-workbench' as const,
      geneId: 'wings',
      pairIds: ['wings-W', 'wings-w'] as const,
      genotype: 'CH1-G1a × CH1-G1b',
      phenotype: 'Full wings',
    };
    repository.capture(studentId, 'arena', lessonId, draft);
    repository.capture(studentId, 'arena', lessonId, draft);

    expect(repository.load(studentId, 'arena', lessonId)).toHaveLength(1);
  });

  it('captures a breeding batch without storing every offspring record', () => {
    const record = repository.capture(studentId, 'arena', 'breeding-and-offspring', {
      evidenceType: 'breeding-batch',
      workstationId: 'breeding-incubator',
      batchId: 'arena-batch-1',
      parentIds: ['parent-a', 'parent-b'],
      geneId: 'wings',
      sampleSize: 8,
      buckets: [
        { id: 'winged', label: 'Winged', count: 6, percentage: 75 },
        { id: 'wingless', label: 'Wingless', count: 2, percentage: 25 },
      ],
    });

    expect(record.evidenceType).toBe('breeding-batch');
    expect(repository.load(studentId, 'arena', 'breeding-and-offspring')).toEqual([record]);
    expect(JSON.stringify(record)).not.toContain('offspringIds');
  });

  it('keeps blood evidence attached to its optional case branch', () => {
    const record = repository.capture(
      studentId,
      'arena',
      lessonId,
      {
        evidenceType: 'blood-test',
        workstationId: 'blood-type-lab',
        specimenId: 'patient:moss',
        sampleCode: 'PT-01',
        dragonId: 'moss',
        dragonName: 'Moss',
        specimenRole: 'patient',
        phenotypeId: 'b-positive',
        phenotypeName: 'B+',
        antiA: false,
        antiB: true,
        antiD: true,
      },
      'dragon-in-the-ash',
    );

    expect(record.branchId).toBe('dragon-in-the-ash');
    expect(repository.load(studentId, 'arena', lessonId)).toEqual([record]);
  });

  it('captures a complete Molecular Rescue Record for the protein branch', () => {
    const record = repository.capture(
      studentId,
      'arena',
      lessonId,
      {
        evidenceType: 'protein-rescue',
        workstationId: 'protein-rescue',
        recordId: 'rescue-1',
        patientId: 'tide',
        patientName: 'Tide',
        sampleEvidence: [
          {
            sampleCode: 'CHR4-A', codingDna: 'ATG', templateDna: 'TAC', mrna: 'AUG',
            aminoAcids: ['Met'], stoppedEarly: true, enzymeWorks: false,
          },
          {
            sampleCode: 'CHR4-B', codingDna: 'ATG', templateDna: 'TAC', mrna: 'AUG',
            aminoAcids: ['Met'], stoppedEarly: true, enzymeWorks: false,
          },
        ],
        digestionTrials: [{
          id: 'trial-1', foodId: 'emberroot-stew', foodName: 'Emberroot meat stew',
          result: 'no-dracose', sugarSplit: false, energy: 'steady', symptoms: 'None',
          explanation: 'No Dracose exposure.', testedAtIso: '2026-08-23T12:00:00.000Z',
        }],
        claimedGenotype: 'dd',
        recommendedFoodIds: ['emberroot-stew'],
        explanation: 'Both samples stop early, so the diet avoids Dracose.',
      },
      'food-that-steals-fire',
    );

    expect(record.branchId).toBe('food-that-steals-fire');
    expect(repository.load(studentId, 'arena', lessonId)).toEqual([record]);
  });
});
