import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  INHERITANCE_MODELS,
  InheritanceModel,
  PEDIGREE_GENE_IDS,
  PedigreeCarrierNote,
  PedigreeDnaTestRecord,
  PedigreeDragon,
  PedigreeGeneId,
  PedigreeHatchRecord,
  PedigreeInvestigationRecord,
  PedigreeLabSnapshot,
  createEmptyInvestigationRecord,
} from './pedigree-lab.models';
import { BLOODLINE_INVESTIGATIONS } from './pedigree-population';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.pedigree-lab.v1';

/**
 * Investigation state for one student, on this device.
 *
 * Everything a student spends or decides survives a reload: which dragons they
 * sequenced (the budget is only meaningful if it cannot be reset by refreshing),
 * their carrier calls, their written hypothesis, the breeding tray, and every
 * clutch they hatched. Swapping in a database later replaces this class and
 * nothing else.
 */
@Service()
export class PedigreeLabRepository {
  load(studentId: string): PedigreeLabSnapshot {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const empty = createEmptySnapshot(normalizedStudentId);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`, empty, (value) =>
      normalizeSnapshot(value, normalizedStudentId),
    );
  }

  save(snapshot: PedigreeLabSnapshot): void {
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${snapshot.studentId}`, snapshot);
  }
}

export function createEmptySnapshot(studentId: string): PedigreeLabSnapshot {
  return {
    schemaVersion: 1,
    studentId,
    activeInvestigationId: BLOODLINE_INVESTIGATIONS[0].id,
    investigations: Object.fromEntries(
      BLOODLINE_INVESTIGATIONS.map((investigation) => [
        investigation.id,
        createEmptyInvestigationRecord(),
      ]),
    ),
    updatedAtIso: new Date(0).toISOString(),
  };
}

function normalizeSnapshot(value: unknown, studentId: string): PedigreeLabSnapshot {
  const empty = createEmptySnapshot(studentId);
  if (!isRecord(value) || value['schemaVersion'] !== 1) return empty;

  const stored = isRecord(value['investigations']) ? value['investigations'] : {};
  const investigations = Object.fromEntries(
    BLOODLINE_INVESTIGATIONS.map((investigation) => [
      investigation.id,
      normalizeInvestigation(stored[investigation.id]),
    ]),
  );

  const activeId = value['activeInvestigationId'];
  return {
    schemaVersion: 1,
    studentId,
    activeInvestigationId: BLOODLINE_INVESTIGATIONS.some(
      (investigation) => investigation.id === activeId,
    )
      ? (activeId as string)
      : empty.activeInvestigationId,
    investigations,
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : empty.updatedAtIso,
  };
}

function normalizeInvestigation(value: unknown): PedigreeInvestigationRecord {
  const empty = createEmptyInvestigationRecord();
  if (!isRecord(value)) return empty;

  const dnaTests = asArray(value['dnaTests']).filter(isDnaTest);
  return {
    dnaTests,
    testedDragonIds: [...new Set(dnaTests.map((test) => test.dragonId))],
    model: INHERITANCE_MODELS.includes(value['model'] as InheritanceModel)
      ? (value['model'] as InheritanceModel)
      : null,
    carrierNotes: asArray(value['carrierNotes']).filter(isCarrierNote),
    hypothesis: typeof value['hypothesis'] === 'string' ? value['hypothesis'].slice(0, 1200) : '',
    trayDragonIds: asArray(value['trayDragonIds'])
      .filter((id): id is string => typeof id === 'string')
      .slice(0, 8),
    hatchRecords: asArray(value['hatchRecords']).filter(isHatchRecord).slice(0, 24),
    hatchlings: asArray(value['hatchlings']).filter(isHatchling).slice(0, 96),
    recoveredAtIso: typeof value['recoveredAtIso'] === 'string' ? value['recoveredAtIso'] : null,
  };
}

function isDnaTest(value: unknown): value is PedigreeDnaTestRecord {
  return (
    isRecord(value) &&
    typeof value['dragonId'] === 'string' &&
    isGeneId(value['geneId']) &&
    isAllelePair(value['alleles']) &&
    typeof value['testedAtIso'] === 'string'
  );
}

function isCarrierNote(value: unknown): value is PedigreeCarrierNote {
  return (
    isRecord(value) &&
    typeof value['dragonId'] === 'string' &&
    (value['status'] === 'carrier' ||
      value['status'] === 'not-carrier' ||
      value['status'] === 'uncertain') &&
    typeof value['note'] === 'string' &&
    typeof value['updatedAtIso'] === 'string'
  );
}

function isHatchRecord(value: unknown): value is PedigreeHatchRecord {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['motherId'] === 'string' &&
    typeof value['fatherId'] === 'string' &&
    typeof value['attempt'] === 'number' &&
    Array.isArray(value['hatchlingIds'])
  );
}

function isHatchling(value: unknown): value is PedigreeDragon {
  if (!isRecord(value) || value['origin'] !== 'hatched') return false;
  if (typeof value['id'] !== 'string' || typeof value['name'] !== 'string') return false;
  const genome = value['genome'];
  return isRecord(genome) && PEDIGREE_GENE_IDS.every((geneId) => isAllelePair(genome[geneId]));
}

function isGeneId(value: unknown): value is PedigreeGeneId {
  return PEDIGREE_GENE_IDS.includes(value as PedigreeGeneId);
}

function isAllelePair(value: unknown): value is readonly [string, string] {
  return (
    Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'string')
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
