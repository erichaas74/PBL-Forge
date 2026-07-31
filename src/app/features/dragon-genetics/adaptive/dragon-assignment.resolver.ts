import {
  DragonAssignment,
  DragonSimulationId,
  InstructionLevel,
  ResolvedSimulationSettings,
} from './dragon-simulation.models';
import { LEVEL_PROFILES } from './dragon-simulation.registry';

export function resolveSimulationSettings(
  assignment: DragonAssignment,
  simulationId: DragonSimulationId,
  studentId: string,
  previewLevel: InstructionLevel | null = null,
): ResolvedSimulationSettings {
  const simulation = assignment.simulationSettings[simulationId];
  const student = assignment.studentOverrides[studentId];
  const level = previewLevel
    ?? student?.simulationLevels?.[simulationId]
    ?? student?.defaultLevel
    ?? simulation?.level
    ?? assignment.defaultLevel;
  return {
    assignmentId: assignment.id,
    assignmentVersion: assignment.assignmentVersion,
    ownerId: assignment.ownerId,
    level,
    enabled: simulation?.enabled ?? true,
    questionCount: Math.max(
      1,
      Math.min(6, simulation?.questionCount ?? LEVEL_PROFILES[level].questionCount),
    ),
    hintsAllowed: simulation?.hintsAllowed ?? LEVEL_PROFILES[level].hintsAllowed,
  };
}
