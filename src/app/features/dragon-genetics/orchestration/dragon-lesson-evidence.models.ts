import { DragonPathContextId, isDragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';

export interface AlleleExpressionEvidenceDraft {
  evidenceType: 'allele-expression';
  workstationId: 'allele-workbench';
  geneId: string;
  pairIds: readonly [string, string];
  genotype: string;
  phenotype: string;
}

export interface BreedingBatchEvidenceBucket {
  id: string;
  label: string;
  count: number;
  percentage: number;
}

export interface BreedingBatchEvidenceDraft {
  evidenceType: 'breeding-batch';
  workstationId: 'breeding-incubator';
  batchId: string;
  parentIds: readonly [string, string];
  geneId: string;
  sampleSize: number;
  buckets: readonly BreedingBatchEvidenceBucket[];
}

export type DragonLessonEvidenceDraft =
  | AlleleExpressionEvidenceDraft
  | BreedingBatchEvidenceDraft;

interface DragonLessonEvidenceMetadata {
  schemaVersion: 1;
  evidenceId: string;
  studentId: string;
  pathId: DragonPathContextId;
  lessonId: string;
  source: 'student';
  capturedAtIso: string;
}

export type DragonLessonEvidenceRecord = DragonLessonEvidenceDraft &
  DragonLessonEvidenceMetadata;

export function normalizeDragonLessonEvidence(value: unknown): DragonLessonEvidenceRecord | null {
  if (!isRecord(value) || value['schemaVersion'] !== 1 || value['source'] !== 'student') {
    return null;
  }
  const metadata = normalizeMetadata(value);
  if (!metadata) return null;
  if (value['evidenceType'] === 'allele-expression') {
    const draft = normalizeAlleleExpression(value);
    return draft ? { ...metadata, ...draft } : null;
  }
  if (value['evidenceType'] === 'breeding-batch') {
    const draft = normalizeBreedingBatch(value);
    return draft ? { ...metadata, ...draft } : null;
  }
  return null;
}

export function dragonLessonEvidenceTitle(record: DragonLessonEvidenceRecord): string {
  if (record.evidenceType === 'allele-expression') {
    return `${record.genotype} → ${record.phenotype}`;
  }
  return `${record.sampleSize} offspring: ${record.buckets
    .map((bucket) => `${bucket.count} ${bucket.label}`)
    .join(' · ')}`;
}

export function dragonLessonEvidenceDetail(record: DragonLessonEvidenceRecord): string {
  return record.evidenceType === 'allele-expression'
    ? `${record.geneId} · Allele Workbench`
    : `${record.geneId} · Breeding Incubator`;
}

function normalizeMetadata(value: Record<string, unknown>): DragonLessonEvidenceMetadata | null {
  const pathId = stringValue(value['pathId']);
  const evidenceId = stringValue(value['evidenceId']);
  const studentId = stringValue(value['studentId']);
  const lessonId = stringValue(value['lessonId']);
  const capturedAtIso = stringValue(value['capturedAtIso']);
  if (
    !isDragonPathContextId(pathId) ||
    !evidenceId ||
    !studentId ||
    !lessonId ||
    !capturedAtIso
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    evidenceId,
    studentId,
    pathId,
    lessonId,
    source: 'student',
    capturedAtIso,
  };
}

function normalizeAlleleExpression(
  value: Record<string, unknown>,
): AlleleExpressionEvidenceDraft | null {
  if (value['workstationId'] !== 'allele-workbench') return null;
  const pairIds = stringPair(value['pairIds']);
  const geneId = stringValue(value['geneId']);
  const genotype = stringValue(value['genotype']);
  const phenotype = stringValue(value['phenotype']);
  return pairIds && geneId && genotype && phenotype
    ? {
        evidenceType: 'allele-expression',
        workstationId: 'allele-workbench',
        geneId,
        pairIds,
        genotype,
        phenotype,
      }
    : null;
}

function normalizeBreedingBatch(value: Record<string, unknown>): BreedingBatchEvidenceDraft | null {
  if (value['workstationId'] !== 'breeding-incubator') return null;
  const batchId = stringValue(value['batchId']);
  const parentIds = stringPair(value['parentIds']);
  const geneId = stringValue(value['geneId']);
  const sampleSize = positiveInteger(value['sampleSize']);
  const buckets = Array.isArray(value['buckets'])
    ? value['buckets'].flatMap((candidate) => {
        if (!isRecord(candidate)) return [];
        const id = stringValue(candidate['id']);
        const label = stringValue(candidate['label']);
        const count = nonnegativeInteger(candidate['count']);
        const percentage = finiteNumber(candidate['percentage']);
        return id && label && count !== null && percentage !== null
          ? [{ id, label, count, percentage }]
          : [];
      })
    : [];
  if (!batchId || !parentIds || !geneId || sampleSize === null || !buckets.length) return null;
  if (buckets.reduce((total, bucket) => total + bucket.count, 0) !== sampleSize) return null;
  return {
    evidenceType: 'breeding-batch',
    workstationId: 'breeding-incubator',
    batchId,
    parentIds,
    geneId,
    sampleSize,
    buckets,
  };
}

function stringPair(value: unknown): readonly [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = stringValue(value[0]);
  const second = stringValue(value[1]);
  return first && second ? [first, second] : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function nonnegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
