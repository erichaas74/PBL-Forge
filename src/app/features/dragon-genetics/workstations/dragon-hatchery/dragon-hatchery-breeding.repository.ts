import { Service } from '@angular/core';
import {
  readStoredJson,
  writeStoredJson,
} from '../../../../shared/assembly/persistence/json-local-storage';
import { DRAGON_TRAITS } from '../../simulation/domain/dragon-inheritance';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  DragonHatcheryBreedingSnapshot,
  HatcheryFertilizationRecord,
} from './dragon-hatchery-breeding.models';
import { SelectedMeiosisGamete } from './meiosis-gamete.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.hatchery-breeding.v1';

/** Device-backed repository boundary for the open Hatchery breeding record. */
@Service()
export class DragonHatcheryBreedingRepository {
  load(studentId: string): DragonHatcheryBreedingSnapshot {
    const normalizedStudentId = normalizeWorkstationStudentId(studentId);
    const empty = emptySnapshot(normalizedStudentId);
    return readStoredJson(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`, empty, (raw) => {
      const value = raw as Partial<DragonHatcheryBreedingSnapshot> | null;
      if (!isSnapshot(value)) return empty;
      return {
        schemaVersion: 1,
        studentId: normalizedStudentId,
        eggParentId: value.eggParentId,
        spermParentId: value.spermParentId,
        targetTraitId: value.targetTraitId,
        pendingEggSelection: value.pendingEggSelection,
        pendingSpermSelection: value.pendingSpermSelection,
        fertilizations: value.fertilizations,
      };
    });
  }

  save(snapshot: DragonHatcheryBreedingSnapshot): void {
    writeStoredJson(`${STORAGE_KEY_PREFIX}.${snapshot.studentId}`, snapshot);
  }
}

function emptySnapshot(studentId: string): DragonHatcheryBreedingSnapshot {
  return {
    schemaVersion: 1,
    studentId,
    eggParentId: null,
    spermParentId: null,
    targetTraitId: 'scales',
    pendingEggSelection: null,
    pendingSpermSelection: null,
    fertilizations: [],
  };
}

function isSnapshot(
  value: Partial<DragonHatcheryBreedingSnapshot> | null,
): value is DragonHatcheryBreedingSnapshot {
  return Boolean(
    value &&
    value.schemaVersion === 1 &&
    (value.eggParentId === null || typeof value.eggParentId === 'string') &&
    (value.spermParentId === null || typeof value.spermParentId === 'string') &&
    isTraitId(value.targetTraitId) &&
    isSelectionOrNull(value.pendingEggSelection) &&
    isSelectionOrNull(value.pendingSpermSelection) &&
    Array.isArray(value.fertilizations) &&
    value.fertilizations.every(isFertilization),
  );
}

function isTraitId(value: unknown): value is DragonTraitId {
  return DRAGON_TRAITS.some((trait) => trait.id === value);
}

function isSelectionOrNull(value: unknown): value is SelectedMeiosisGamete | null {
  return value === null || isSelection(value);
}

function isSelection(value: unknown): value is SelectedMeiosisGamete {
  if (!isRecord(value) || !isRecord(value['run']) || !isRecord(value['gamete'])) return false;
  return (
    typeof value['reason'] === 'string' &&
    typeof value['selectedAtIso'] === 'string' &&
    typeof value['run']['seed'] === 'string' &&
    typeof value['run']['parentId'] === 'string' &&
    Array.isArray(value['run']['chromosomePairs']) &&
    Array.isArray(value['run']['gametes']) &&
    value['run']['gametes'].length === 4 &&
    typeof value['gamete']['id'] === 'string' &&
    Array.isArray(value['gamete']['chromosomes'])
  );
}

function isFertilization(value: unknown): value is HatcheryFertilizationRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['eggParentId'] === 'string' &&
    typeof value['spermParentId'] === 'string' &&
    isTraitId(value['targetTraitId']) &&
    isSelection(value['eggSelection']) &&
    isSelection(value['spermSelection']) &&
    typeof value['offspringId'] === 'string' &&
    isDragonLabGenome(value['offspringGenome']) &&
    typeof value['createdAtIso'] === 'string'
  );
}

function isDragonLabGenome(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return DRAGON_TRAITS.every((trait) => {
    const pair = value[trait.id];
    return (
      Array.isArray(pair) && pair.length === 2 && pair.every((allele) => typeof allele === 'string')
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
