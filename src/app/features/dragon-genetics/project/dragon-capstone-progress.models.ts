import { DragonArenaMissionSnapshot } from '../capstones/arena/dragon-arena-mission.models';
import { CompanionShowSnapshot } from '../workstations/companion-show/companion-show.models';
import { metricsForIsland } from '../workstations/island-diversity/island-diversity.domain';
import {
  ISLAND_IDS,
  IslandDiversityWorld,
} from '../workstations/island-diversity/island-diversity.models';
import { DragonCapstonePathId } from './dragon-capstone-paths';

export type DragonCapstoneStatus = 'not-started' | 'in-progress' | 'complete';

export interface DragonArenaProgressSummary {
  status: DragonCapstoneStatus;
  selectedChampionId: string | null;
  trialCount: number;
  winCount: number;
  bestScore: number;
  bestRemainingHealthPercent: number;
  latestAtIso: string;
}

export interface MiniDragonShowProgressSummary {
  status: DragonCapstoneStatus;
  breedName: string;
  registryCount: number;
  consistencyPercent: number;
  ribbons: number;
  generations: number;
  latestAtIso: string;
}

export interface IslandDiversityProgressSummary {
  status: DragonCapstoneStatus;
  managedPopulationCount: number;
  successfulPopulationCount: number;
  successPercent: number;
  averageDiversityPercent: number;
  totalPopulation: number;
  latestAtIso: string;
}

export interface DragonCapstoneProgressSummaryV1 {
  schemaVersion: 1;
  selectedPathId?: DragonCapstonePathId | null;
  arena?: DragonArenaProgressSummary;
  miniDragonShow?: MiniDragonShowProgressSummary;
  islandDiversity?: IslandDiversityProgressSummary;
}

export function summarizeDragonArena(
  snapshot: DragonArenaMissionSnapshot,
): DragonArenaProgressSummary {
  return {
    status: snapshot.trials.length
      ? 'complete'
      : snapshot.selectedChampionId
        ? 'in-progress'
        : 'not-started',
    selectedChampionId: snapshot.selectedChampionId,
    trialCount: snapshot.trials.length,
    winCount: snapshot.trials.filter((trial) => trial.won).length,
    bestScore: snapshot.trials.reduce((best, trial) => Math.max(best, trial.score), 0),
    bestRemainingHealthPercent: snapshot.trials.reduce(
      (best, trial) => Math.max(best, trial.remainingHealthPercent),
      0,
    ),
    latestAtIso: latestIso(snapshot.trials.map((trial) => trial.completedAtIso)),
  };
}

export function summarizeMiniDragonShow(
  snapshot: CompanionShowSnapshot,
): MiniDragonShowProgressSummary {
  const latestRegistryEntry = snapshot.registry.at(-1);
  const hasWork = Boolean(
    snapshot.breedName.trim() ||
      snapshot.targets.length ||
      snapshot.litters.length ||
      snapshot.championId,
  );
  return {
    status: latestRegistryEntry ? 'complete' : hasWork ? 'in-progress' : 'not-started',
    breedName: latestRegistryEntry?.breedName ?? snapshot.breedName.trim(),
    registryCount: snapshot.registry.length,
    consistencyPercent: latestRegistryEntry?.consistencyPercent ?? 0,
    ribbons: latestRegistryEntry?.ribbons ?? 0,
    generations: latestRegistryEntry?.generations ?? 0,
    latestAtIso: latestRegistryEntry?.submittedAtIso ?? snapshot.updatedAtIso,
  };
}

export function summarizeIslandDiversity(
  world: IslandDiversityWorld,
): IslandDiversityProgressSummary {
  const populations = ISLAND_IDS.map((islandId) => world.islands[islandId]);
  const managedPopulations = populations.filter((population) => population.generation > 0);
  const metrics = managedPopulations.map((population) => metricsForIsland(population));
  const successfulPopulationCount = metrics.filter(
    (record) => record.trend === 'Stable' || record.trend === 'Rising',
  ).length;
  const hasWork = Boolean(
    managedPopulations.length ||
      world.relocations.length ||
      world.scannedDragonIds.length ||
      world.admittedAccountDragonIds.length ||
      Object.keys(world.notes).length,
  );

  return {
    status:
      managedPopulations.length === ISLAND_IDS.length
        ? 'complete'
        : hasWork
          ? 'in-progress'
          : 'not-started',
    managedPopulationCount: managedPopulations.length,
    successfulPopulationCount,
    successPercent: percent(successfulPopulationCount, managedPopulations.length),
    averageDiversityPercent: average(metrics.map((record) => record.diversityPercent)),
    totalPopulation: metrics.reduce((total, record) => total + record.population, 0),
    latestAtIso: world.updatedAtIso,
  };
}

function average(values: readonly number[]): number {
  return values.length
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : 0;
}

function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

function latestIso(values: readonly string[]): string {
  return [...values].sort().at(-1) ?? '';
}
