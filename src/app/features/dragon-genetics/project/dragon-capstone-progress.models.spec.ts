import { DragonArenaMissionSnapshot } from '../capstones/arena/dragon-arena-mission.models';
import { emptyCompanionShowSnapshot } from '../workstations/companion-show/companion-show.repository';
import {
  advanceIslandGeneration,
  createInitialWorld,
} from '../workstations/island-diversity/island-diversity.domain';
import { ISLAND_IDS } from '../workstations/island-diversity/island-diversity.models';
import {
  summarizeDragonArena,
  summarizeIslandDiversity,
  summarizeMiniDragonShow,
} from './dragon-capstone-progress.models';

describe('Dragon capstone progress summaries', () => {
  it('summarizes arena trial evidence without copying the champion genome', () => {
    const snapshot: DragonArenaMissionSnapshot = {
      schemaVersion: 2,
      studentId: 'student-1',
      selectedChampionId: 'champion-1',
      trials: [
        {
          id: 'trial-1',
          championId: 'champion-1',
          won: true,
          winnerName: 'Champion',
          elapsedSeconds: 30,
          remainingHealthPercent: 68,
          score: 85,
          scoreBreakdown: {
            outcomePoints: 50,
            conditionPoints: 24,
            pacePoints: 11,
            total: 85,
          },
          traitEvidence: [],
          completedAtIso: '2026-08-14T00:00:00.000Z',
        },
      ],
    };

    expect(summarizeDragonArena(snapshot)).toEqual({
      status: 'complete',
      selectedChampionId: 'champion-1',
      trialCount: 1,
      winCount: 1,
      bestScore: 85,
      bestRemainingHealthPercent: 68,
      latestAtIso: '2026-08-14T00:00:00.000Z',
    });
  });

  it('uses the registered show entry as the completed outcome', () => {
    const snapshot = {
      ...emptyCompanionShowSnapshot('student-1'),
      registry: [
        {
          id: 'breed-1',
          breedName: 'Cloud Puff',
          targets: [],
          championId: 'champion-1',
          championName: 'Nimbus',
          citedLitterIds: ['litter-1', 'litter-2'],
          claim: 'Evidence-backed breeding claim.',
          generations: 3,
          consistencyPercent: 84,
          pupsObserved: 12,
          inbreedingPercent: 0,
          ribbons: 4,
          submittedAtIso: '2026-08-14T01:00:00.000Z',
        },
      ],
    };

    expect(summarizeMiniDragonShow(snapshot)).toEqual(
      jasmine.objectContaining({
        status: 'complete',
        breedName: 'Cloud Puff',
        consistencyPercent: 84,
        ribbons: 4,
        generations: 3,
      }),
    );
  });

  it('scores managed island populations as stable or rising', () => {
    let world = createInitialWorld('student-1');
    world = advanceIslandGeneration(world, 'stormbreak');

    const summary = summarizeIslandDiversity(world);

    expect(summary.status).toBe('in-progress');
    expect(summary.managedPopulationCount).toBe(1);
    expect(summary.successPercent).toBeGreaterThanOrEqual(0);
    expect(summary.successPercent).toBeLessThanOrEqual(100);
  });

  it('completes Island Diversity after every population has been managed', () => {
    let world = createInitialWorld('student-1');
    for (const islandId of ISLAND_IDS) world = advanceIslandGeneration(world, islandId);

    expect(summarizeIslandDiversity(world).status).toBe('complete');
  });
});
