import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { isMiniGenome } from '../companion-show/mini-dragon.genetics';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  BreedingProgram,
  KennelDragon,
  StoredBreedingPrograms,
  WORKING_ROLE_BY_ID,
  WorkingRoleId,
} from './viking-breeding.models';
import { buildFounderStock } from './viking-breeding.domain';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.viking-breeding.v1';

/**
 * Device persistence for breeding programmes.
 *
 * Genomes are stored rather than regenerated from a seed, because a line the student spent six
 * seasons building must read back exactly — the animals are the work.
 */
@Service()
export class VikingBreedingRepository {
  load(studentId: string): StoredBreedingPrograms {
    const normalized = normalizeWorkstationStudentId(studentId);
    const fallback = emptyBreedingPrograms(normalized);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalized}`, fallback, (value) =>
      normalizeStored(value, fallback),
    );
  }

  save(stored: StoredBreedingPrograms): void {
    const studentId = normalizeWorkstationStudentId(stored.studentId);
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${studentId}`, { ...stored, studentId });
  }
}

export function emptyBreedingPrograms(studentId: string): StoredBreedingPrograms {
  return {
    schemaVersion: 1,
    studentId: normalizeWorkstationStudentId(studentId),
    programs: {},
  };
}

export function createProgram(roleId: WorkingRoleId, studentId: string): BreedingProgram {
  const now = new Date().toISOString();
  const normalized = normalizeWorkstationStudentId(studentId);
  return {
    schemaVersion: 1,
    roleId,
    studentId: normalized,
    season: 1,
    kennel: buildFounderStock(WORKING_ROLE_BY_ID[roleId], `${normalized}:${roleId}`),
    litters: [],
    releasedIds: [],
    plan: '',
    deliveredDragonId: null,
    startedAtIso: now,
    updatedAtIso: now,
  };
}

function normalizeStored(value: unknown, fallback: StoredBreedingPrograms): StoredBreedingPrograms {
  if (!isRecord(value) || value['schemaVersion'] !== 1) return fallback;
  const raw = isRecord(value['programs']) ? value['programs'] : {};
  const programs = Object.fromEntries(
    Object.entries(raw).flatMap(([roleId, program]) => {
      if (!WORKING_ROLE_BY_ID[roleId] || !isRecord(program)) return [];
      return [[roleId, normalizeProgram(roleId as WorkingRoleId, program, fallback.studentId)]];
    }),
  );
  return { schemaVersion: 1, studentId: fallback.studentId, programs };
}

function normalizeProgram(
  roleId: WorkingRoleId,
  value: Record<string, unknown>,
  studentId: string,
): BreedingProgram {
  const base = createProgram(roleId, studentId);
  const kennel = Array.isArray(value['kennel'])
    ? value['kennel'].filter(isKennelDragon)
    : base.kennel;
  return {
    ...base,
    season: clampSeason(value['season']),
    // A programme with no animals left cannot be resumed, so fall back to fresh stock.
    kennel: kennel.length ? kennel : base.kennel,
    litters: Array.isArray(value['litters'])
      ? (value['litters'].filter(isRecord) as unknown as BreedingProgram['litters'])
      : [],
    releasedIds: Array.isArray(value['releasedIds'])
      ? value['releasedIds'].filter((id): id is string => typeof id === 'string')
      : [],
    plan: typeof value['plan'] === 'string' ? value['plan'] : '',
    deliveredDragonId:
      typeof value['deliveredDragonId'] === 'string' ? value['deliveredDragonId'] : null,
    startedAtIso:
      typeof value['startedAtIso'] === 'string' ? value['startedAtIso'] : base.startedAtIso,
    updatedAtIso:
      typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : base.updatedAtIso,
  };
}

function clampSeason(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 40 ? parsed : 1;
}

function isKennelDragon(value: unknown): value is KennelDragon {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    (value['sex'] === 'female' || value['sex'] === 'male') &&
    isMiniGenome(value['genome']) &&
    Array.isArray(value['founderIds'])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
