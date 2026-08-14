import { DragonCapstonePathId } from './dragon-capstone-paths';

export interface DragonProjectSelectionSnapshot {
  schemaVersion: 1;
  studentId: string;
  assignmentId: string;
  selectedPathId: DragonCapstonePathId | null;
}

