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
});
