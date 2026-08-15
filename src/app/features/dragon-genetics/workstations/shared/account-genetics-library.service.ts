import { Injectable, signal } from '@angular/core';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { DRAGON_PARENTS, DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { DragonLabGenome, DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import {
  AccountChromosomeRecord,
  AccountDragonRecord,
  AccountGeneticsLibrarySnapshot,
  AccountGeneticsRecord,
  StoredAccountGeneticsLibrary,
} from './account-genetics-library.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.account-library.v1';
const FOUNDATION_DATE = '2026-01-01T00:00:00.000Z';
const FOUNDATION_SEX: Readonly<Record<string, DragonSex>> = {
  ember: 'female',
  tide: 'male',
  moss: 'female',
  quartz: 'male',
};

/**
 * User-scoped source for dragons and their chromosome records.
 *
 * The current mock repository starts every account with the released founder dragons and merges
 * in dragons saved on this device. Chromosome records are always derived from each dragon's genome
 * and the shared trait catalog, so a workstation cannot drift from the specimen it loads.
 */
@Injectable({ providedIn: 'root' })
export class AccountGeneticsLibraryService {
  private readonly revision = signal(0);

  recordsFor(studentId: string): AccountGeneticsLibrarySnapshot {
    this.revision();
    const normalizedStudentId = studentId.trim() || 'local-student';
    const local = loadStoredLibrary(normalizedStudentId);
    const dragons = mergeDragons(foundationDragons(), local.dragons);
    return {
      studentId: normalizedStudentId,
      dragons,
      chromosomes: dragons.flatMap((dragon) => chromosomeRecordsFor(dragon)),
    };
  }

  recordById(studentId: string, id: string): AccountGeneticsRecord | null {
    const snapshot = this.recordsFor(studentId);
    return (
      snapshot.dragons.find((record) => record.id === id) ??
      snapshot.chromosomes.find((record) => record.id === id) ??
      null
    );
  }

  saveDragon(studentId: string, dragon: AccountDragonRecord): AccountGeneticsLibrarySnapshot {
    return this.saveDragons(studentId, [dragon]);
  }

  saveDragons(
    studentId: string,
    nextDragons: readonly AccountDragonRecord[],
  ): AccountGeneticsLibrarySnapshot {
    const normalizedStudentId = studentId.trim() || 'local-student';
    const stored = loadStoredLibrary(normalizedStudentId);
    const replacements = nextDragons.map((dragon) =>
      cloneDragon({ ...dragon, kind: 'dragon', source: 'student' }),
    );
    const replacementIds = new Set(replacements.map((dragon) => dragon.id));
    const dragons = [...stored.dragons.filter((dragon) => !replacementIds.has(dragon.id)), ...replacements];
    saveStoredLibrary({ schemaVersion: 1, studentId: normalizedStudentId, dragons });
    this.revision.update((value) => value + 1);
    return this.recordsFor(normalizedStudentId);
  }
}

function foundationDragons(): AccountDragonRecord[] {
  return DRAGON_PARENTS.map((dragon) => ({
    ...dragon,
    genome: cloneDragonGenome(dragon.genome),
    kind: 'dragon' as const,
    sex: FOUNDATION_SEX[dragon.id] ?? legacyDragonSex(dragon.id),
    source: 'foundation' as const,
    storedAtIso: FOUNDATION_DATE,
    generation: 0,
  }));
}

function chromosomeRecordsFor(dragon: AccountDragonRecord): AccountChromosomeRecord[] {
  return DRAGON_TRAITS.map((trait) => ({
    kind: 'chromosome' as const,
    id: `${dragon.id}:chr-${trait.chromosomeModel}`,
    dragonId: dragon.id,
    dragonName: dragon.name,
    chromosome: `Chr ${trait.chromosomeModel}`,
    traitId: trait.id,
    traitName: trait.name,
    alleles: [...dragon.genome[trait.id]] as readonly [string, string],
    storedAtIso: dragon.storedAtIso,
  }));
}

function mergeDragons(
  foundation: readonly AccountDragonRecord[],
  local: readonly AccountDragonRecord[],
): AccountDragonRecord[] {
  const localIds = new Set(local.map((dragon) => dragon.id));
  return [
    ...foundation.filter((dragon) => !localIds.has(dragon.id)).map(cloneDragon),
    ...local.map(cloneDragon),
  ];
}

function loadStoredLibrary(studentId: string): StoredAccountGeneticsLibrary {
  const empty: StoredAccountGeneticsLibrary = { schemaVersion: 1, studentId, dragons: [] };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const value = JSON.parse(
      localStorage.getItem(`${STORAGE_KEY_PREFIX}.${studentId}`) ?? 'null',
    ) as Partial<StoredAccountGeneticsLibrary> | null;
    if (value?.schemaVersion !== 1 || !Array.isArray(value.dragons)) return empty;
    return {
      schemaVersion: 1,
      studentId,
      dragons: value.dragons.filter(isAccountDragonRecord).map(cloneDragon),
    };
  } catch {
    return empty;
  }
}

function saveStoredLibrary(snapshot: StoredAccountGeneticsLibrary): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}.${snapshot.studentId}`, JSON.stringify(snapshot));
}

function isAccountDragonRecord(value: unknown): value is AccountDragonRecord {
  if (!isRecord(value) || value['kind'] !== 'dragon' || !isRecord(value['genome'])) return false;
  if (
    typeof value['id'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['title'] !== 'string' ||
    typeof value['color'] !== 'string' ||
    typeof value['accentColor'] !== 'string' ||
    typeof value['storedAtIso'] !== 'string' ||
    (value['sex'] !== undefined && value['sex'] !== 'female' && value['sex'] !== 'male')
  ) {
    return false;
  }
  const genome = value['genome'];
  return DRAGON_TRAITS.every((trait) => isAllelePair(genome[trait.id]));
}

function isAllelePair(value: unknown): value is readonly [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((allele) => typeof allele === 'string')
  );
}

function cloneDragon(dragon: AccountDragonRecord): AccountDragonRecord {
  return {
    ...dragon,
    sex: dragon.sex ?? legacyDragonSex(dragon.id),
    genome: cloneDragonGenome(dragon.genome),
  };
}

function legacyDragonSex(id: string): DragonSex {
  const parity = [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 2;
  return parity === 0 ? 'female' : 'male';
}

function cloneDragonGenome(genome: DragonLabGenome): DragonLabGenome {
  return Object.fromEntries(
    DRAGON_TRAITS.map((trait) => [trait.id, [...genome[trait.id]]]),
  ) as Record<DragonTraitId, [string, string]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
