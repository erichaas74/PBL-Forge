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
  MiniShowDivisionId,
  MiniShowRunRecord,
  MiniTrainingSessionRecord,
  MiniTrainingSkillId,
  RegistryEntry,
} from './companion-show.models';
import { MINI_SHOW_DIVISIONS, MINI_TRAINING_SKILLS } from './mini-dragon.show';
import { MINI_RARE_TRAIT_TARGETS } from './mini-dragon.pedigree';

/**
 * Version 4 adds the rare-trait pedigree hunt and flagged breeding candidates.
 * Version 3 adds show divisions, learned-skill practice, and 50/50 judge cards.
 * Version 2 is migrated in place so an established kennel and its litters survive.
 * Version 1 stored a breeding program for the four-gene lab
 * dragon; the mini dragon is a different species with different loci, so a v1
 * record cannot be migrated into one — there is no mapping from "winged" to a
 * coat, a horn curl, or an ember. A stale v1 payload is simply ignored and the
 * student starts a mini dragon program.
 */
const STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.companion-show.v4';
const VERSION_3_STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.companion-show.v3';
const VERSION_2_STORAGE_KEY_PREFIX = 'pbl-forge.dragon-genetics.companion-show.v2';

/** Replaceable device-backed persistence boundary for one student's breeding program. */
@Injectable({ providedIn: 'root' })
export class CompanionShowRepository {
  load(studentId: string): CompanionShowSnapshot {
    const normalizedStudentId = normalizeStudentId(studentId);
    const fallback = emptyCompanionShowSnapshot(normalizedStudentId);
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const current = localStorage.getItem(`${STORAGE_KEY_PREFIX}.${normalizedStudentId}`);
      const version3 = localStorage.getItem(
        `${VERSION_3_STORAGE_KEY_PREFIX}.${normalizedStudentId}`,
      );
      const previous = localStorage.getItem(`${VERSION_2_STORAGE_KEY_PREFIX}.${normalizedStudentId}`);
      const parsed = JSON.parse(current ?? version3 ?? previous ?? 'null') as unknown;
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
    schemaVersion: 4,
    studentId: normalizeStudentId(studentId),
    breedName: '',
    targets: [],
    kennelFounderIds: [],
    pairIds: [null, null],
    litterSize: 6,
    litters: [],
    nextRunNumber: 1,
    championId: null,
    showDivisionId: null,
    trainingSessions: [],
    showRuns: [],
    rareTraitGeneId: null,
    rareCandidateIds: [],
    citedLitterIds: [],
    claim: '',
    registry: [],
    updatedAtIso: '',
  };
}

function normalizeSnapshot(value: unknown, fallback: CompanionShowSnapshot): CompanionShowSnapshot {
  if (
    !isRecord(value) ||
    ![2, 3, 4].includes(value['schemaVersion'] as number)
  ) return fallback;
  const litters = (Array.isArray(value['litters']) ? value['litters'] : [])
    .filter(isLitterRecord)
    // A litter is judged against the standard it was whelped under, so its own
    // copy of that standard goes through the same validation as the live one.
    .map((litter) => ({ ...litter, targets: normalizeTargets(litter.targets) }));

  return {
    schemaVersion: 4,
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
    showDivisionId: isShowDivisionId(value['showDivisionId']) ? value['showDivisionId'] : null,
    trainingSessions: Array.isArray(value['trainingSessions'])
      ? value['trainingSessions'].filter(isTrainingSession)
      : [],
    showRuns: Array.isArray(value['showRuns'])
      ? value['showRuns'].filter(isShowRun).map(normalizeShowRun)
      : [],
    rareTraitGeneId: isRareTraitGeneId(value['rareTraitGeneId'])
      ? value['rareTraitGeneId']
      : null,
    rareCandidateIds: stringList(value['rareCandidateIds']),
    citedLitterIds: stringList(value['citedLitterIds']),
    claim: typeof value['claim'] === 'string' ? value['claim'].slice(0, 600) : '',
    registry: Array.isArray(value['registry'])
      ? value['registry'].filter(isRegistryEntry).map(normalizeRegistryEntry)
      : [],
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

function normalizeRegistryEntry(value: RegistryEntry): RegistryEntry {
  const divisionId = isShowDivisionId(value.showDivisionId)
    ? value.showDivisionId
    : 'hearth-companion';
  return {
    ...value,
    targets: normalizeTargets(value.targets),
    showDivisionId: divisionId,
    showRunId: typeof value.showRunId === 'string' ? value.showRunId : '',
    geneticScore: finiteScore(value.geneticScore),
    trainingScore: finiteScore(value.trainingScore),
    combinedScore: finiteScore(value.combinedScore),
    award: typeof value.award === 'string' ? value.award : 'Legacy registry entry',
  };
}

function isTrainingSession(value: unknown): value is MiniTrainingSessionRecord {
  return Boolean(
    isRecord(value) &&
      typeof value['id'] === 'string' &&
      typeof value['dragonId'] === 'string' &&
      isTrainingSkillId(value['skillId']) &&
      typeof value['practicedAtIso'] === 'string',
  );
}

function isShowRun(value: unknown): value is MiniShowRunRecord {
  return Boolean(
    isRecord(value) &&
      typeof value['id'] === 'string' &&
      typeof value['dragonId'] === 'string' &&
      isShowDivisionId(value['divisionId']) &&
      typeof value['geneticScore'] === 'number' &&
      typeof value['trainingScore'] === 'number' &&
      typeof value['combinedScore'] === 'number' &&
      typeof value['award'] === 'string' &&
      isRecord(value['trainingLevels']) &&
      typeof value['judgedAtIso'] === 'string',
  );
}

function normalizeShowRun(run: MiniShowRunRecord): MiniShowRunRecord {
  return {
    ...run,
    geneticScore: finiteScore(run.geneticScore),
    trainingScore: finiteScore(run.trainingScore),
    combinedScore: finiteScore(run.combinedScore),
    trainingLevels: Object.fromEntries(
      MINI_TRAINING_SKILLS.map((skill) => [
        skill.id,
        finiteLevel(run.trainingLevels[skill.id]),
      ]),
    ) as Record<MiniTrainingSkillId, number>,
  };
}

function isLitterSize(value: unknown): value is CompanionLitterSize {
  return (
    typeof value === 'number' && COMPANION_LITTER_SIZES.includes(value as CompanionLitterSize)
  );
}

function isGeneId(value: unknown): value is MiniGeneId {
  return typeof value === 'string' && MINI_DRAGON_GENES.some((gene) => gene.id === value);
}

function isRareTraitGeneId(value: unknown): value is MiniGeneId {
  return (
    isGeneId(value) && MINI_RARE_TRAIT_TARGETS.some((target) => target.geneId === value)
  );
}

function isShowDivisionId(value: unknown): value is MiniShowDivisionId {
  return typeof value === 'string' && MINI_SHOW_DIVISIONS.some((division) => division.id === value);
}

function isTrainingSkillId(value: unknown): value is MiniTrainingSkillId {
  return typeof value === 'string' && MINI_TRAINING_SKILLS.some((skill) => skill.id === value);
}

function finiteScore(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value * 10) / 10))
    : 0;
}

function finiteLevel(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(4, Math.floor(value)))
    : 0;
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
