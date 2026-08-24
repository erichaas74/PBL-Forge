import { SpecimenMotionDefinition } from '../../../../shared/assembly/preview/specimen-motion';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';

export type MysteryPairClassification = 'genetic' | 'learned';

export interface MysteryPairSpecimen {
  id: string;
  name: string;
  recordLabel: string;
  source: SpecimenSource;
}

export interface MysteryPairComparison {
  id: string;
  label: string;
  kind: 'appearance' | 'ability' | 'behavior';
  firstResult: string;
  secondResult: string;
  evidenceHint: string;
  motion?: SpecimenMotionDefinition;
  respondingSpecimenId?: string;
}

export interface MysteryPairInvestigation {
  pathId: DragonPathContextId;
  title: string;
  purpose: string;
  specimens: readonly [MysteryPairSpecimen, MysteryPairSpecimen];
  comparisons: readonly MysteryPairComparison[];
}

export interface MysteryPairNotebookEntry {
  id: string;
  comparisonId: string;
  observation: string;
  classification: MysteryPairClassification;
  evidence: string;
  updatedAtIso: string;
}

export interface MysteryPairNotebookSnapshot {
  schemaVersion: 1;
  studentId: string;
  pathId: DragonPathContextId;
  openedSpecimenIds: readonly string[];
  testedComparisonIds: readonly string[];
  entries: readonly MysteryPairNotebookEntry[];
  updatedAtIso: string;
}
