/**
 * Runtime status: ACTIVE — browser-local persistence for optional adventure chapters/checkpoints.
 * Inputs/signals: student/path/adventure identity plus chapter, checkpoint, and outcome updates.
 * Data access: normalized local JSON; scientific records remain in their workstation repositories.
 * Connects to: DragonAdventurePage and DragonAdventureShellComponent.
 */
import { Service } from '@angular/core';
import { readStoredJson, writeStoredJson } from '../../../shared/assembly/persistence/json-local-storage';
import {
  DragonPathContextId,
  isDragonPathContextId,
} from '../lesson-plan/dragon-lesson-plan.models';
import { DRAGON_ADVENTURE_BY_ID, isDragonAdventureId } from './dragon-adventure.registry';
import {
  DragonAdventureId,
  DragonAdventureProgress,
  DragonAdventureRuntimeState,
} from './dragon-adventure.models';

const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.adventure-progress.v1';

@Service()
export class DragonAdventureProgressRepository {
  load(
    studentId: string,
    pathId: DragonPathContextId,
    adventureId: DragonAdventureId,
  ): DragonAdventureProgress {
    const empty = emptyDragonAdventureProgress(studentId, pathId, adventureId);
    return readStoredJson(storageKey(studentId, pathId, adventureId), empty, (value) =>
      normalizeProgress(value, empty),
    );
  }

  save(progress: DragonAdventureProgress): DragonAdventureProgress {
    const next = { ...progress, updatedAtIso: new Date().toISOString() };
    writeStoredJson(storageKey(next.studentId, next.pathId, next.adventureId), next);
    return next;
  }
}

export function emptyDragonAdventureProgress(
  studentId: string,
  pathId: DragonPathContextId,
  adventureId: DragonAdventureId,
): DragonAdventureProgress {
  return {
    schemaVersion: 1,
    studentId,
    pathId,
    adventureId,
    runtimeState: 'offered',
    currentChapterId: DRAGON_ADVENTURE_BY_ID[adventureId].chapters[0].id,
    completedCheckpointIds: [],
    citedEvidenceIds: [],
    decisions: {},
    outcomeMessage: '',
    acceptedAtIso: null,
    completedAtIso: null,
    earnedRewardIds: [],
    updatedAtIso: new Date().toISOString(),
  };
}

function normalizeProgress(
  value: unknown,
  fallback: DragonAdventureProgress,
): DragonAdventureProgress {
  if (!isRecord(value) || value['schemaVersion'] !== 1) return fallback;
  const adventureId = isDragonAdventureId(stringValue(value['adventureId']))
    ? stringValue(value['adventureId']) as DragonAdventureId
    : fallback.adventureId;
  const definition = DRAGON_ADVENTURE_BY_ID[adventureId];
  const chapterId = stringValue(value['currentChapterId']);
  return {
    schemaVersion: 1,
    studentId: fallback.studentId,
    pathId: isDragonPathContextId(stringValue(value['pathId']))
      ? stringValue(value['pathId']) as DragonPathContextId
      : fallback.pathId,
    adventureId,
    runtimeState: normalizeState(value['runtimeState']),
    currentChapterId: definition.chapters.some((chapter) => chapter.id === chapterId)
      ? chapterId
      : definition.chapters[0].id,
    completedCheckpointIds: stringArray(value['completedCheckpointIds']),
    citedEvidenceIds: stringArray(value['citedEvidenceIds']),
    decisions: isRecord(value['decisions'])
      ? Object.fromEntries(
          Object.entries(value['decisions']).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {},
    outcomeMessage: stringValue(value['outcomeMessage']),
    acceptedAtIso: nullableString(value['acceptedAtIso']),
    completedAtIso: nullableString(value['completedAtIso']),
    earnedRewardIds: stringArray(value['earnedRewardIds']),
    updatedAtIso: stringValue(value['updatedAtIso']) || fallback.updatedAtIso,
  };
}

function normalizeState(value: unknown): DragonAdventureRuntimeState {
  return ['offered', 'investigating', 'revision-needed', 'resolved'].includes(String(value))
    ? value as DragonAdventureRuntimeState
    : 'offered';
}

function storageKey(
  studentId: string,
  pathId: DragonPathContextId,
  adventureId: DragonAdventureId,
): string {
  return `${STORAGE_KEY_PREFIX}.${encodeURIComponent(studentId)}.${pathId}.${adventureId}`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((candidate): candidate is string => typeof candidate === 'string'))]
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
