import { Vector3Data } from './domain/assembly.models';

/**
 * Emitted by AssemblyViewportComponent (or a wrapping panel) when a physics
 * test run ends. Games map this to their own result format.
 */
export interface PhysicsTestResult {
  assemblyAssetId: string;
  scenarioId?: string;
  durationSeconds: number;
  finalPosition: Vector3Data;
  peakVelocityMs: number;
  distanceTraveled: number;
  winConditionMet: boolean;
  /** Game-specific derived metrics, e.g. { finishTime: 12.4, maxHeight: 3.2 } */
  metrics: Record<string, number>;
}
