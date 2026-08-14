import {
  DragonAssignment,
  DragonSimulationDefinition,
  DragonSimulationId,
  InstructionLevel,
} from '../adaptive/dragon-simulation.models';
import {
  DragonCapstoneProgressSummaryV1,
  DragonCapstoneStatus,
} from './dragon-capstone-progress.models';

export interface DragonStudentProgressDocument {
  id: string;
  studentId: string;
  completedSimulationIds?: DragonSimulationId[];
  activeSimulationId?: DragonSimulationId | null;
  simulationLevels?: Partial<Record<DragonSimulationId, InstructionLevel>>;
  simulationScores?: Partial<Record<DragonSimulationId, number>>;
  capstoneProgress?: DragonCapstoneProgressSummaryV1;
  activityProgress?: Partial<
    Record<DragonSimulationId, { status: 'not-started' | 'in-progress' | 'complete' }>
  >;
}

export interface DragonTeacherAttentionItem {
  studentId: string;
  kind: 'reteach' | 'not-started' | 'behind';
  reason: string;
}

export interface DragonTeacherActivityRow {
  id: DragonSimulationId;
  module: number;
  title: string;
  completeCount: number;
  activeCount: number;
  completionPercent: number;
}

export interface DragonTeacherStudentRow {
  studentId: string;
  completedCount: number;
  averageScore: number;
  capstonePath: string;
  capstoneStatus: DragonCapstoneStatus;
  capstoneResult: string;
}

export interface DragonTeacherOperations {
  students: readonly DragonStudentProgressDocument[];
  assignedSimulationIds: readonly DragonSimulationId[];
  studentCount: number;
  assignedCount: number;
  completedRunCount: number;
  completionPercent: number;
  averageScore: number;
  onTrackCount: number;
  attention: readonly DragonTeacherAttentionItem[];
  activities: readonly DragonTeacherActivityRow[];
  studentRows: readonly DragonTeacherStudentRow[];
}

const RETEACH_SCORE = 70;
const BEHIND_BY = 2;
const SCORELESS_ACTIVITY_IDS = new Set<DragonSimulationId>(['trait-evidence']);

export function buildDragonTeacherOperations(
  students: readonly DragonStudentProgressDocument[],
  assignment: DragonAssignment,
  simulations: readonly DragonSimulationDefinition[],
): DragonTeacherOperations {
  const assignedSimulations = simulations.filter(
    (simulation) => assignment.simulationSettings[simulation.id]?.enabled !== false,
  );
  const assignedSimulationIds = assignedSimulations.map((simulation) => simulation.id);
  const assignedIdSet = new Set(assignedSimulationIds);
  const completionCounts = students.map(
    (student) => assignedCompletions(student, assignedIdSet).length,
  );
  const classMedian = median(completionCounts);
  const scores = students.flatMap((student) => assignedScores(student, assignedSimulationIds));
  const completedRunCount = completionCounts.reduce((sum, count) => sum + count, 0);

  const attention = students
    .map((student) => attentionFor(student, assignedSimulationIds, assignedIdSet, classMedian))
    .filter((item): item is DragonTeacherAttentionItem => item !== null)
    .sort(
      (first, second) =>
        attentionRank(first.kind) - attentionRank(second.kind) ||
        first.studentId.localeCompare(second.studentId),
    );

  return {
    students,
    assignedSimulationIds,
    studentCount: students.length,
    assignedCount: assignedSimulationIds.length,
    completedRunCount,
    completionPercent: percent(completedRunCount, students.length * assignedSimulationIds.length),
    averageScore: average(scores),
    onTrackCount: students.length - attention.length,
    attention,
    activities: assignedSimulations.map((simulation) => {
      const completeCount = students.filter((student) =>
        hasCompleted(student, simulation.id),
      ).length;
      return {
        id: simulation.id,
        module: simulation.module,
        title: simulation.shortTitle,
        completeCount,
        activeCount: students.filter((student) => student.activeSimulationId === simulation.id)
          .length,
        completionPercent: percent(completeCount, students.length),
      };
    }),
    studentRows: students.map((student) => {
      const capstone = capstoneDetails(student.capstoneProgress);
      return {
        studentId: student.studentId,
        completedCount: assignedCompletions(student, assignedIdSet).length,
        averageScore: average(assignedScores(student, assignedSimulationIds)),
        ...capstone,
      };
    }),
  };
}

function attentionFor(
  student: DragonStudentProgressDocument,
  assignedSimulationIds: readonly DragonSimulationId[],
  assignedIdSet: ReadonlySet<DragonSimulationId>,
  classMedian: number,
): DragonTeacherAttentionItem | null {
  const lowScore = assignedSimulationIds
    .filter((simulationId) => !SCORELESS_ACTIVITY_IDS.has(simulationId))
    .map((simulationId) => ({
      simulationId,
      score: student.simulationScores?.[simulationId],
    }))
    .filter(
      (entry): entry is { simulationId: DragonSimulationId; score: number } =>
        Number.isFinite(entry.score) && (entry.score ?? RETEACH_SCORE) < RETEACH_SCORE,
    )
    .sort((first, second) => first.score - second.score)[0];
  if (lowScore) {
    return {
      studentId: student.studentId,
      kind: 'reteach',
      reason: `${lowScore.score}% evidence score`,
    };
  }

  const completedCount = assignedCompletions(student, assignedIdSet).length;
  if (assignedSimulationIds.length > 0 && completedCount === 0) {
    return {
      studentId: student.studentId,
      kind: 'not-started',
      reason: 'No completed investigations',
    };
  }

  const gap = classMedian - completedCount;
  if (gap >= BEHIND_BY) {
    return {
      studentId: student.studentId,
      kind: 'behind',
      reason: `${gap} investigations behind class pace`,
    };
  }

  return null;
}

function assignedCompletions(
  student: DragonStudentProgressDocument,
  assignedIdSet: ReadonlySet<DragonSimulationId>,
): DragonSimulationId[] {
  return [...assignedIdSet].filter((simulationId) => hasCompleted(student, simulationId));
}

function hasCompleted(
  student: DragonStudentProgressDocument,
  simulationId: DragonSimulationId,
): boolean {
  return (
    student.completedSimulationIds?.includes(simulationId) === true ||
    student.activityProgress?.[simulationId]?.status === 'complete'
  );
}

function assignedScores(
  student: DragonStudentProgressDocument,
  assignedSimulationIds: readonly DragonSimulationId[],
): number[] {
  return assignedSimulationIds
    .filter((simulationId) => !SCORELESS_ACTIVITY_IDS.has(simulationId))
    .map((simulationId) => student.simulationScores?.[simulationId])
    .filter((score): score is number => Number.isFinite(score));
}

function average(values: readonly number[]): number {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function attentionRank(kind: DragonTeacherAttentionItem['kind']): number {
  return { reteach: 0, 'not-started': 1, behind: 2 }[kind];
}

function capstoneDetails(
  progress: DragonCapstoneProgressSummaryV1 | undefined,
): Pick<DragonTeacherStudentRow, 'capstonePath' | 'capstoneStatus' | 'capstoneResult'> {
  if (!progress?.selectedPathId) {
    return { capstonePath: 'Not selected', capstoneStatus: 'not-started', capstoneResult: '—' };
  }

  if (progress.selectedPathId === 'dragon-arena') {
    const arena = progress.arena;
    const bestScore = arena && Number.isFinite(arena.bestScore) ? arena.bestScore : 0;
    return {
      capstonePath: 'Dragon Arena',
      capstoneStatus: arena?.status ?? 'not-started',
      capstoneResult: arena
        ? `Best ${bestScore} · ${arena.winCount}/${arena.trialCount} wins`
        : 'No trial yet',
    };
  }

  if (progress.selectedPathId === 'mini-dragon-show') {
    const show = progress.miniDragonShow;
    return {
      capstonePath: 'Mini Dragon Show',
      capstoneStatus: show?.status ?? 'not-started',
      capstoneResult: show
        ? `${show.consistencyPercent}% consistency · ${show.ribbons} ribbons`
        : 'No registry entry yet',
    };
  }

  const island = progress.islandDiversity;
  return {
    capstonePath: 'Island Diversity',
    capstoneStatus: island?.status ?? 'not-started',
    capstoneResult: island
      ? `${island.successPercent}% success · ${island.managedPopulationCount} populations`
      : 'No managed populations yet',
  };
}
