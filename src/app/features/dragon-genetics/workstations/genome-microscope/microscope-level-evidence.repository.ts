import { Service } from '@angular/core';
import { GenomeMicroscopeEvidence, GenomeMicroscopeLevel } from './genome-microscope.models';

export interface MicroscopeLevelEvidenceRecord extends GenomeMicroscopeEvidence {
  recordedAtIso: string;
}

const STORAGE_PREFIX = 'pbl-forge.dragon-genetics.microscope-level-evidence.v1';
const MAX_RECORDS = 20;

@Service()
export class MicroscopeLevelEvidenceRepository {
  load(studentId: string, level: GenomeMicroscopeLevel): readonly MicroscopeLevelEvidenceRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const value = JSON.parse(localStorage.getItem(key(studentId, level)) ?? '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(isEvidenceRecord).slice(-MAX_RECORDS);
    } catch {
      return [];
    }
  }

  record(
    studentId: string,
    evidence: GenomeMicroscopeEvidence,
  ): readonly MicroscopeLevelEvidenceRecord[] {
    const current = this.load(studentId, evidence.level);
    const signature = evidenceSignature(evidence);
    const withoutDuplicate = current.filter((record) => evidenceSignature(record) !== signature);
    const next = [
      ...withoutDuplicate,
      { ...evidence, recordedAtIso: new Date().toISOString() },
    ].slice(-MAX_RECORDS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key(studentId, evidence.level), JSON.stringify(next));
    }
    return next;
  }
}

function key(studentId: string, level: GenomeMicroscopeLevel): string {
  return `${STORAGE_PREFIX}.${encodeURIComponent(studentId)}.${level}`;
}

function evidenceSignature(evidence: GenomeMicroscopeEvidence): string {
  return [
    evidence.level,
    evidence.dragonId ?? '',
    evidence.chromosome,
    evidence.geneId ?? '',
    evidence.alleleCopy,
    evidence.enzymeId ?? '',
    evidence.productId ?? '',
  ].join('|');
}

function isEvidenceRecord(value: unknown): value is MicroscopeLevelEvidenceRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<MicroscopeLevelEvidenceRecord>;
  return (
    typeof record.level === 'string' &&
    typeof record.chromosome === 'string' &&
    (record.alleleCopy === 0 || record.alleleCopy === 1) &&
    typeof record.recordedAtIso === 'string'
  );
}
