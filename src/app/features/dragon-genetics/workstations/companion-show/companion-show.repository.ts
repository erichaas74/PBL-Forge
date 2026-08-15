import { Injectable } from '@angular/core';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniGeneId,
  isMiniPhenotypeFormId,
} from './mini-dragon.genetics';
import {
  BreedStandardTarget,
  COMPANION_LITTER_SIZES,
  CompanionLitterSize,
  CompanionShowSnapshot,
  LitterRecord,
  RegistryEntry,
} from './companion-show.models';

/**
 * Version 2 of the key. Version 1 stored a breeding program for the four-gene lab
 * dragon; the mini dragon is a different species with different loci, so a v1
 * record cannot be migrated into one — there is no mapping from "winged" to a
 * coat, a horn curl, or an ember. A stale v1 payload is simply ignored and the
 * student starts a mini dragon program.
 */
const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.companion-show.v2';

/** Replaceable device-backed persistence boundary for one student's breeding program. */
@Injectable({ providedIn: 'root' })
export class CompanionShowRepository {
  load(studentId: string): CompanionShowSnapshot {
    const normalizedStudentId = normalizeStudentId(studentId);
    const fallback = emptyCompanionShowSnapshot(normalizedStudentId);
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const parsed = JSON.parse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`) ?? 'null',
      ) as unknown;
      return normalizeSnapshot(parsed, fallback);
    } catch {
      // Invalid or unavailable device data falls back to an empty program.
      return fallback;
    }
  }

  save(snapshot: CompanionShowSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    const studentId = normalizeStudentId(snapshot.studentId);
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}.${studentId}`,
        JSON.stringify({ ...snapshot, studentId }),
      );
    } catch {
      // The workstation stays usable when browser storage is unavailable or full.
    }
  }
}

export function emptyCompanionShowSnapshot(studentId: string): CompanionShowSnapshot {
  return {
    schemaVersion: 2,
    studentId: normalizeStudentId(studentId),
    breedName: '',
    targets: [],
    kennelFounderIds: [],
    pairIds: [null, null],
    litterSize: 6,
    litters: [],
    nextRunNumber: 1,
    championId: null,
    citedLitterIds: [],
    claim: '',
    registry: [],
    updatedAtIso: '',
  };
}

function normalizeSnapshot(value: unknown, fallback: CompanionShowSnapshot): CompanionShowSnapshot {
  if (!isRecord(value) || value['schemaVersion'] !== 2) return fallback;
  const litters = (Array.isArray(value['litters']) ? value['litters'] : [])
    .filter(isLitterRecord)
    // A litter is judged against the standard it was whelped under, so its own
    // copy of that standard goes through the same validation as the live one.
    .map((litter) => ({ ...litter, targets: normalizeTargets(litter.targets) }));

  return {
    schemaVersion: 2,
    studentId: fallback.studentId,
    breedName: typeof value['breedName'] === 'string' ? value['breedName'].slice(0, 60) : '',
    targets: normalizeTargets(value['targets']),
    kennelFounderIds: stringList(value['kennelFounderIds']).filter((id) =>
      MINI_FOUNDERS.some((founder) => founder.id === id),
    ),
    pairIds: normalizePairIds(value['pairIds']),
    litterSize: isLitterSize(value['litterSize']) ? value['litterSize'] : fallback.litterSize,
    litters,
    nextRunNumber:
      typeof value['nextRunNumber'] === 'number' && value['nextRunNumber'] > 0
        ? Math.floor(value['nextRunNumber'])
        : Math.max(1, ...litters.map((litter) => litter.runNumber + 1)),
    championId: typeof value['championId'] === 'string' ? value['championId'] : null,
    citedLitterIds: stringList(value['citedLitterIds']),
    claim: typeof value['claim'] === 'string' ? value['claim'].slice(0, 600) : '',
    registry: Array.isArray(value['registry']) ? value['registry'].filter(isRegistryEntry) : [],
    updatedAtIso: typeof value['updatedAtIso'] === 'string' ? value['updatedAtIso'] : '',
  };
}

/**
 * Keeps at most one target per gene and drops any form id the gene catalog no
 * longer recognizes, so a renamed phenotype cannot resurrect a standard that no
 * dragon could ever meet.
 */
function normalizeTargets(value: unknown): readonly BreedStandardTarget[] {
  if (!Array.isArray(value)) return [];
  const byGene = new Map<MiniGeneId, BreedStandardTarget>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const geneId = entry['geneId'];
    if (!isGeneId(geneId) || !isMiniPhenotypeFormId(geneId, entry['formId'])) continue;
    byGene.set(geneId, { geneId, formId: entry['formId'] as string });
  }
  return MINI_DRAGON_GENES.map((gene) => byGene.get(gene.id)).filter(
    (target): target is BreedStandardTarget => Boolean(target),
  );
}

function isLitterRecord(value: unknown): value is LitterRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['runNumber'] === 'number' &&
    typeof value['generation'] === 'number' &&
    isStringPair(value['parentIds']) &&
    isLitterSize(value['size']) &&
    Array.isArray(value['targets']) &&
    Array.isArray(value['keptPupIds']) &&
    value['keptPupIds'].every((id) => typeof id === 'string') &&
    typeof value['whelpedAtIso'] === 'string'
  );
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['breedName'] === 'string' &&
    Array.isArray(value['targets']) &&
    typeof value['championId'] === 'string' &&
    typeof value['claim'] === 'string' &&
    typeof value['consistencyPercent'] === 'number' &&
    typeof value['submittedAtIso'] === 'string'
  );
}

function isLitterSize(value: unknown): value is CompanionLitterSize {
  return (
    typeof value === 'number' && COMPANION_LITTER_SIZES.includes(value as CompanionLitterSize)
  );
}

function isGeneId(value: unknown): value is MiniGeneId {
  return typeof value === 'string' && MINI_DRAGON_GENES.some((gene) => gene.id === value);
}

function normalizePairIds(value: unknown): readonly [string | null, string | null] {
  if (!Array.isArray(value) || value.length !== 2) return [null, null];
  return [
    typeof value[0] === 'string' ? value[0] : null,
    typeof value[1] === 'string' ? value[1] : null,
  ];
}

function stringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isStringPair(value: unknown): value is readonly [string, string] {
  return (
    Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'string')
  );
}

function normalizeStudentId(studentId: string): string {
  return normalizeWorkstationStudentId(studentId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
