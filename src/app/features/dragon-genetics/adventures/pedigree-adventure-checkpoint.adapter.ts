/**
 * Runtime status: ACTIVE — translates open pedigree-lab records into story checkpoints.
 * Inputs/signals: a persisted investigation record and its authored adventure identity.
 * Data access: pure adapter; the page loads the snapshot through PedigreeLabRepository.
 * Connects to: DragonAdventurePage, pedigree deduction engine, and adventure checkpoint rail.
 */
import { deducePedigree, PedigreeDeduction } from '../workstations/pedigree-lab/pedigree-deduction';
import { PedigreeInvestigationRecord } from '../workstations/pedigree-lab/pedigree-lab.models';
import {
  PEDIGREE_ARCHIVE,
  investigationById,
} from '../workstations/pedigree-lab/pedigree-population';

export type PedigreeAdventureId = 'pedigree-reading' | 'pedigree-models';

export interface PedigreeAdventureCheckpointState {
  completedCheckpointIds: readonly string[];
  deduction: PedigreeDeduction | null;
  cleanModel: boolean;
  summary: string;
}

export function resolvePedigreeAdventureCheckpoints(
  adventureId: PedigreeAdventureId,
  record: PedigreeInvestigationRecord,
): PedigreeAdventureCheckpointState {
  const investigationId = adventureId === 'pedigree-reading' ? 'frost-scale' : 'stonewake-tail';
  const deduction = record.model
    ? deducePedigree({
        population: PEDIGREE_ARCHIVE,
        investigation: investigationById(investigationId),
        model: record.model,
        dnaTests: record.dnaTests,
      })
    : null;
  const cleanModel = Boolean(
    deduction && !deduction.contradictions.length && !deduction.unexplainedPhenotypes.length,
  );
  const completed: string[] = [];

  if (adventureId === 'pedigree-reading') {
    if (record.model) completed.push('model-selected');
    if (
      record.carrierNotes.some(
        (note) => note.status === 'carrier' && note.note.trim().length >= 8,
      )
    ) completed.push('carrier-supported');
  } else {
    if (new Set(record.modelHistory).size >= 2) completed.push('models-compared');
    if (cleanModel) completed.push('contradictions-resolved');
  }
  if (record.dnaTests.length) completed.push('sequence-recorded');
  if (record.hypothesis.trim().length >= 16) completed.push('verdict-written');

  const conflictCount =
    (deduction?.contradictions.length ?? 0) + (deduction?.unexplainedPhenotypes.length ?? 0);
  const summary = !record.model
    ? 'No inheritance model has been recorded yet.'
    : cleanModel
      ? `${readable(record.model)} explains the recorded pedigree without a remaining contradiction.`
      : `${readable(record.model)} leaves ${conflictCount} contradiction${conflictCount === 1 ? '' : 's'} to resolve.`;

  return { completedCheckpointIds: completed, deduction, cleanModel, summary };
}

function readable(value: string): string {
  return value
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
