import { Injectable } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  ISLAND_IDS,
  IslandDiversityWorld,
  IslandId,
  IslandPopulation,
  PopulationDragon,
  StoredIslandDiversityWorld,
} from './island-diversity.models';
import { createInitialWorld } from './island-diversity.domain';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.island-diversity.v1';

/** Replaceable device-backed persistence boundary for the student's archipelago. */
@Injectable({ providedIn: 'root' })
export class IslandDiversityRepository {
  load(studentId: string): IslandDiversityWorld {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const fallback = createInitialWorld(normalizedStudentId);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`, fallback, (value) => {
      const stored = value as Partial<StoredIslandDiversityWorld> | null;
      return stored?.schemaVersion === 1 && isWorld(stored.world) ? stored.world : fallback;
    });
  }

  save(studentId: string, world: IslandDiversityWorld): IslandDiversityWorld {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const stored: StoredIslandDiversityWorld = {
      schemaVersion: 1,
      studentId: normalizedStudentId,
      world,
    };
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`, stored);
    return world;
  }
}

function isWorld(value: unknown): value is IslandDiversityWorld {
  if (!isRecord(value) || value['schemaVersion'] !== 1 || !isRecord(value['islands'])) return false;
  const islands = value['islands'];
  return (
    typeof value['seed'] === 'string' &&
    typeof value['researchCredits'] === 'number' &&
    Array.isArray(value['scannedDragonIds']) &&
    value['scannedDragonIds'].every((id) => typeof id === 'string') &&
    Array.isArray(value['admittedAccountDragonIds']) &&
    value['admittedAccountDragonIds'].every((id) => typeof id === 'string') &&
    ISLAND_IDS.every((id) => isPopulation(islands[id], id)) &&
    Array.isArray(value['relocations']) &&
    isRecord(value['notes']) &&
    typeof value['updatedAtIso'] === 'string'
  );
}

function isPopulation(value: unknown, islandId: IslandId): value is IslandPopulation {
  if (!isRecord(value)) return false;
  return (
    value['islandId'] === islandId &&
    typeof value['generation'] === 'number' &&
    typeof value['previousPopulation'] === 'number' &&
    Array.isArray(value['dragons']) &&
    value['dragons'].every(isDragon) &&
    Array.isArray(value['protectedPair']) &&
    value['protectedPair'].length === 2 &&
    value['protectedPair'].every((id) => id === null || typeof id === 'string') &&
    Array.isArray(value['timeline'])
  );
}

function isDragon(value: unknown): value is PopulationDragon {
  if (!isRecord(value) || !isRecord(value['genome'])) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    (value['sex'] === 'female' || value['sex'] === 'male') &&
    typeof value['ageGenerations'] === 'number' &&
    typeof value['lineageId'] === 'string' &&
    Array.isArray(value['parents']) &&
    isPair(value['genome']['horn']) &&
    isPair(value['genome']['heat']) &&
    isPair(value['genome']['moonfade']) &&
    typeof value['color'] === 'string' &&
    typeof value['accentColor'] === 'string' &&
    (value['accountDragonId'] === null || typeof value['accountDragonId'] === 'string')
  );
}

function isPair(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((allele) => typeof allele === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
