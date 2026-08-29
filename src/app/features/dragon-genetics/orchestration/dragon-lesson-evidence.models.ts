import { DragonPathContextId, isDragonPathContextId } from '../lesson-plan/dragon-lesson-plan.models';
import type {
  DigestionTrial,
  DracaseGenotype,
  DragonFoodId,
  ProteinRescueSampleEvidence,
} from '../workstations/protein-rescue/protein-rescue.models';

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

export interface BloodTestEvidenceDraft {
  evidenceType: 'blood-test';
  workstationId: 'blood-type-lab';
  specimenId: string;
  sampleCode: string;
  dragonId: string;
  dragonName: string;
  specimenRole: 'patient' | 'donor';
  phenotypeId:
    | 'a-positive'
    | 'a-negative'
    | 'b-positive'
    | 'b-negative'
    | 'ab-positive'
    | 'ab-negative'
    | 'o-positive'
    | 'o-negative';
  phenotypeName: string;
  antiA: boolean;
  antiB: boolean;
  antiD: boolean;
}

export interface ProteinRescueEvidenceDraft {
  evidenceType: 'protein-rescue';
  workstationId: 'protein-rescue';
  recordId: string;
  patientId: string;
  patientName: string;
  sampleEvidence: readonly ProteinRescueSampleEvidence[];
  digestionTrials: readonly DigestionTrial[];
  claimedGenotype: DracaseGenotype;
  recommendedFoodIds: readonly DragonFoodId[];
  explanation: string;
}

export type DragonLessonEvidenceDraft =
  | AlleleExpressionEvidenceDraft
  | BreedingBatchEvidenceDraft
  | BloodTestEvidenceDraft
  | ProteinRescueEvidenceDraft;

interface DragonLessonEvidenceMetadata {
  schemaVersion: 1;
  evidenceId: string;
  studentId: string;
  pathId: DragonPathContextId;
  lessonId: string;
  source: 'student';
  capturedAtIso: string;
  branchId?: string;
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
  if (value['evidenceType'] === 'blood-test') {
    const draft = normalizeBloodTest(value);
    return draft ? { ...metadata, ...draft } : null;
  }
  if (value['evidenceType'] === 'protein-rescue') {
    const draft = normalizeProteinRescue(value);
    return draft ? { ...metadata, ...draft } : null;
  }
  return null;
}

export function dragonLessonEvidenceTitle(record: DragonLessonEvidenceRecord): string {
  if (record.evidenceType === 'allele-expression') {
    return `${record.genotype} → ${record.phenotype}`;
  }
  if (record.evidenceType === 'blood-test') {
    return `${record.sampleCode} → ${record.phenotypeName}`;
  }
  if (record.evidenceType === 'protein-rescue') {
    return `${record.patientName} · ${record.claimedGenotype} · ${record.digestionTrials.length} food trial${record.digestionTrials.length === 1 ? '' : 's'}`;
  }
  return `${record.sampleSize} offspring: ${record.buckets
    .map((bucket) => `${bucket.count} ${bucket.label}`)
    .join(' · ')}`;
}

export function dragonLessonEvidenceDetail(record: DragonLessonEvidenceRecord): string {
  if (record.evidenceType === 'blood-test') {
    return `${record.dragonName} · ${record.specimenRole === 'patient' ? 'Patient' : 'Donor'} blood evidence`;
  }
  if (record.evidenceType === 'protein-rescue') {
    return `${record.sampleEvidence.length} chromosome copies · Molecular Rescue Record`;
  }
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
    ...(stringValue(value['branchId']) ? { branchId: stringValue(value['branchId']) } : {}),
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

function normalizeBloodTest(value: Record<string, unknown>): BloodTestEvidenceDraft | null {
  if (value['workstationId'] !== 'blood-type-lab') return null;
  const specimenId = stringValue(value['specimenId']);
  const sampleCode = stringValue(value['sampleCode']);
  const dragonId = stringValue(value['dragonId']);
  const dragonName = stringValue(value['dragonName']);
  const specimenRole = value['specimenRole'];
  const phenotypeId = value['phenotypeId'];
  const phenotypeName = stringValue(value['phenotypeName']);
  const antiD =
    typeof value['antiD'] === 'boolean'
      ? value['antiD']
      : typeof phenotypeId === 'string' && phenotypeId.endsWith('-positive');
  if (
    !specimenId ||
    !sampleCode ||
    !dragonId ||
    !dragonName ||
    (specimenRole !== 'patient' && specimenRole !== 'donor') ||
    !isBloodPhenotypeId(phenotypeId) ||
    !phenotypeName ||
    typeof value['antiA'] !== 'boolean' ||
    typeof value['antiB'] !== 'boolean'
  ) {
    return null;
  }
  return {
    evidenceType: 'blood-test',
    workstationId: 'blood-type-lab',
    specimenId,
    sampleCode,
    dragonId,
    dragonName,
    specimenRole,
    phenotypeId,
    phenotypeName,
    antiA: value['antiA'],
    antiB: value['antiB'],
    antiD,
  };
}

function normalizeProteinRescue(
  value: Record<string, unknown>,
): ProteinRescueEvidenceDraft | null {
  if (value['workstationId'] !== 'protein-rescue') return null;
  const recordId = stringValue(value['recordId']);
  const patientId = stringValue(value['patientId']);
  const patientName = stringValue(value['patientName']);
  const claimedGenotype = value['claimedGenotype'];
  const explanation = stringValue(value['explanation']);
  const sampleEvidence = Array.isArray(value['sampleEvidence'])
    ? value['sampleEvidence'].flatMap(normalizeProteinSampleEvidence)
    : [];
  const digestionTrials = Array.isArray(value['digestionTrials'])
    ? value['digestionTrials'].flatMap(normalizeDigestionTrial)
    : [];
  const recommendedFoodIds = Array.isArray(value['recommendedFoodIds'])
    ? value['recommendedFoodIds'].filter(isDragonFoodId)
    : [];
  if (
    !recordId ||
    !patientId ||
    !patientName ||
    !isDracaseGenotype(claimedGenotype) ||
    sampleEvidence.length !== 2 ||
    !digestionTrials.length ||
    !recommendedFoodIds.length ||
    !explanation
  ) {
    return null;
  }
  return {
    evidenceType: 'protein-rescue',
    workstationId: 'protein-rescue',
    recordId,
    patientId,
    patientName,
    sampleEvidence,
    digestionTrials,
    claimedGenotype,
    recommendedFoodIds,
    explanation,
  };
}

function normalizeProteinSampleEvidence(value: unknown): ProteinRescueSampleEvidence[] {
  if (!isRecord(value)) return [];
  const sampleCode = stringValue(value['sampleCode']);
  const codingDna = stringValue(value['codingDna']);
  const templateDna = stringValue(value['templateDna']);
  const mrna = stringValue(value['mrna']);
  const aminoAcids = Array.isArray(value['aminoAcids'])
    ? value['aminoAcids'].filter((candidate): candidate is string => typeof candidate === 'string')
    : [];
  if (
    !sampleCode ||
    !codingDna ||
    !templateDna ||
    !mrna ||
    typeof value['stoppedEarly'] !== 'boolean' ||
    typeof value['enzymeWorks'] !== 'boolean'
  ) return [];
  return [{
    sampleCode,
    codingDna,
    templateDna,
    mrna,
    aminoAcids,
    stoppedEarly: value['stoppedEarly'],
    enzymeWorks: value['enzymeWorks'],
  }];
}

function normalizeDigestionTrial(value: unknown): DigestionTrial[] {
  if (!isRecord(value)) return [];
  const id = stringValue(value['id']);
  const foodId = value['foodId'];
  const foodName = stringValue(value['foodName']);
  const result = value['result'];
  const energy = value['energy'];
  const symptoms = stringValue(value['symptoms']);
  const explanation = stringValue(value['explanation']);
  const testedAtIso = stringValue(value['testedAtIso']);
  if (
    !id ||
    !isDragonFoodId(foodId) ||
    !foodName ||
    !['digested', 'managed', 'no-dracose', 'undigested'].includes(String(result)) ||
    typeof value['sugarSplit'] !== 'boolean' ||
    (energy !== 'steady' && energy !== 'reduced') ||
    !symptoms ||
    !explanation ||
    !testedAtIso
  ) return [];
  return [value as unknown as DigestionTrial];
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

function isBloodPhenotypeId(
  value: unknown,
): value is BloodTestEvidenceDraft['phenotypeId'] {
  return [
    'a-positive',
    'a-negative',
    'b-positive',
    'b-negative',
    'ab-positive',
    'ab-negative',
    'o-positive',
    'o-negative',
  ].includes(String(value));
}

function isDracaseGenotype(value: unknown): value is DracaseGenotype {
  return value === 'DD' || value === 'Dd' || value === 'dd';
}

function isDragonFoodId(value: unknown): value is DragonFoodId {
  return [
    'moonmilk',
    'fermented-moonmilk',
    'emberroot-stew',
    'enzyme-treated-moonmilk',
  ].includes(String(value));
}
