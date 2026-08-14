import {
  ProjectActivityProgressRecord,
  StudentProjectState,
} from '../../project/domain/project-hub.models';
import { DragonSimulationRun } from '../adaptive/dragon-simulation.models';
import { DragonArenaMissionSnapshot } from '../capstones/arena/dragon-arena-mission.models';
import { CompanionShowSnapshot } from '../workstations/companion-show/companion-show.models';
import { DragonHatcheryBreedingSnapshot } from '../workstations/dragon-hatchery/dragon-hatchery-breeding.models';
import { IslandDiversityWorld } from '../workstations/island-diversity/island-diversity.models';
import { PedigreeLabSnapshot } from '../workstations/pedigree-lab/pedigree-lab.models';
import { ProteinRescueCaseRecord } from '../workstations/protein-rescue/protein-rescue.models';
import { BloodEmergencyRecord } from '../workstations/blood-compatibility/blood-compatibility.models';
import { GeneticsNotebookSnapshot } from '../workstations/shared/genetics-notebook.models';
import { TraitEvidenceSnapshot } from '../workstations/trait-evidence/trait-evidence.models';
import { traitEvidenceStatus } from '../workstations/trait-evidence/trait-evidence.domain';
import { DragonTestingProgressSnapshot } from './dragon-testing-progress.repository';

const SHARED_ADAPTIVE_ACTIVITY_IDS = new Set([
  'trait-evidence',
  'genome-microscope',
  'allele-workbench',
  'punnett-composer',
  'incubator-sampler',
  'dna-process-lab',
]);

export interface DragonProjectStateSources {
  studentId: string;
  assignmentId: string;
  selectedPathId: string | null;
  traitEvidence: TraitEvidenceSnapshot;
  runs: readonly DragonSimulationRun[];
  notebook: GeneticsNotebookSnapshot;
  hatchery: DragonHatcheryBreedingSnapshot;
  arena: DragonArenaMissionSnapshot;
  companionShow: CompanionShowSnapshot;
  islandDiversity: IslandDiversityWorld;
  pedigree: PedigreeLabSnapshot;
  proteinCases: readonly ProteinRescueCaseRecord[];
  bloodCases: readonly BloodEmergencyRecord[];
  testingProgress: DragonTestingProgressSnapshot;
}

export function buildDragonStudentProjectState(
  sources: DragonProjectStateSources,
): StudentProjectState {
  const activityProgress: Record<string, ProjectActivityProgressRecord> = {};

  for (const run of sources.runs) {
    if (!SHARED_ADAPTIVE_ACTIVITY_IDS.has(run.simulationId)) continue;
    activityProgress[run.simulationId] = progress(
      run.simulationId,
      run.complete ? 'complete' : 'in-progress',
      run.responses.map((response) => response.questionId),
      run.updatedAtIso,
      run.startedAtIso,
    );
  }

  const traitStatus = traitEvidenceStatus(sources.traitEvidence);
  if (traitStatus !== 'not-started') {
    activityProgress['trait-evidence'] = progress(
      'trait-evidence',
      traitStatus,
      sources.traitEvidence.claims.map((claim) => `${claim.specimenId}:${claim.observationId}`),
      sources.traitEvidence.updatedAtIso,
    );
  }

  if (sources.notebook.experiments.length) {
    const current = activityProgress['allele-workbench'];
    activityProgress['allele-workbench'] = progress(
      'allele-workbench',
      current?.status ?? 'in-progress',
      sources.notebook.experiments.map((experiment) => experiment.id),
      sources.notebook.updatedAtIso,
      current?.startedAtIso,
    );
  }

  if (sources.hatchery.fertilizations.length) {
    activityProgress['dragon-hatchery'] = progress(
      'dragon-hatchery',
      'complete',
      sources.hatchery.fertilizations.map((record) => record.id),
      latestIso(sources.hatchery.fertilizations.map((record) => record.createdAtIso)),
    );
  }

  if (sources.arena.trials.length) {
    activityProgress['dragon-arena'] = progress(
      'dragon-arena',
      'complete',
      sources.arena.trials.map((trial) => trial.id),
      latestIso(sources.arena.trials.map((trial) => trial.completedAtIso)),
    );
  }

  if (sources.companionShow.registry.length) {
    activityProgress['companion-show'] = progress(
      'companion-show',
      'complete',
      sources.companionShow.registry.map((entry) => entry.id),
      sources.companionShow.updatedAtIso,
    );
  } else if (sources.companionShow.litters.length) {
    activityProgress['companion-show'] = progress(
      'companion-show',
      'in-progress',
      sources.companionShow.litters.map((litter) => litter.id),
      sources.companionShow.updatedAtIso,
    );
  }

  const islandEvidenceIds = [
    ...sources.islandDiversity.relocations.map((record) => record.id),
    ...sources.islandDiversity.scannedDragonIds.map((id) => `scan:${id}`),
  ];
  if (islandEvidenceIds.length || hasAdvancedIslandGeneration(sources.islandDiversity)) {
    activityProgress['island-diversity'] = progress(
      'island-diversity',
      hasManagedEveryIsland(sources.islandDiversity) ? 'complete' : 'in-progress',
      islandEvidenceIds,
      sources.islandDiversity.updatedAtIso,
    );
  }

  const pedigreeRecords = Object.values(sources.pedigree.investigations);
  const pedigreeEvidenceIds = pedigreeRecords.flatMap((record) => [
    ...record.dnaTests.map((test) => `dna:${test.dragonId}:${test.geneId}`),
    ...record.hatchRecords.map((hatch) => hatch.id),
  ]);
  if (pedigreeRecords.some((record) => record.recoveredAtIso)) {
    activityProgress['pedigree-lab'] = progress(
      'pedigree-lab',
      'complete',
      pedigreeEvidenceIds,
      sources.pedigree.updatedAtIso,
    );
  } else if (pedigreeEvidenceIds.length || pedigreeRecords.some(hasPedigreeWork)) {
    activityProgress['pedigree-lab'] = progress(
      'pedigree-lab',
      'in-progress',
      pedigreeEvidenceIds,
      sources.pedigree.updatedAtIso,
    );
  }

  if (sources.proteinCases.length) {
    activityProgress['protein-rescue'] = progress(
      'protein-rescue',
      'complete',
      sources.proteinCases.map((record) => record.id),
      latestIso(sources.proteinCases.map((record) => record.savedAtIso)),
    );
  }

  if (sources.bloodCases.length) {
    activityProgress['blood-type-lab'] = progress(
      'blood-type-lab',
      'complete',
      sources.bloodCases.map((record) => record.id),
      latestIso(sources.bloodCases.map((record) => record.savedAtIso)),
    );
  }

  for (const [activityId, completedAtIso] of Object.entries(
    sources.testingProgress.completedAtByActivityId,
  )) {
    const authentic = activityProgress[activityId];
    activityProgress[activityId] = progress(
      activityId,
      'complete',
      authentic?.evidenceIds ?? [],
      completedAtIso,
      authentic?.startedAtIso,
    );
  }

  return {
    studentId: sources.studentId,
    assignmentId: sources.assignmentId,
    selectedPathId: sources.selectedPathId ?? undefined,
    activityProgress,
    mastery: {},
  };
}

function progress(
  activityId: string,
  status: ProjectActivityProgressRecord['status'],
  evidenceIds: readonly string[],
  updatedAtIso: string,
  startedAtIso?: string,
): ProjectActivityProgressRecord {
  return { activityId, status, evidenceIds, updatedAtIso, startedAtIso };
}

function latestIso(values: readonly string[]): string {
  return [...values].sort().at(-1) ?? new Date(0).toISOString();
}

function hasAdvancedIslandGeneration(world: IslandDiversityWorld): boolean {
  return Object.values(world.islands).some((island) => island.generation > 0);
}

function hasManagedEveryIsland(world: IslandDiversityWorld): boolean {
  return Object.values(world.islands).every((island) => island.generation > 0);
}

function hasPedigreeWork(record: PedigreeLabSnapshot['investigations'][string]): boolean {
  return Boolean(record.model || record.hypothesis.trim() || record.carrierNotes.length);
}
