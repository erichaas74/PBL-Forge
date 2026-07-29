import { DRAGON_PARENTS } from '../../../../migration-archive/physics-coupled-dragon-genetics/domain/dragon-inheritance';
import {
  academicMasteryPercent,
  challengeScore,
  createDefaultDragonSnapshot,
  expectedPredictions,
  genotypeDistribution,
  materializeDragon,
  runDragonBatch,
} from './dragon-genetics.domain';
import { StudentDragonRecord } from './dragon-genetics.models';

describe('Dragon Genetics domain', () => {
  it('predicts a 50 percent winged phenotype for Ww × ww', () => {
    const predictions = expectedPredictions(DRAGON_PARENTS[0], DRAGON_PARENTS[1]);
    expect(predictions.wings).toBe(50);
  });

  it('predicts the complete genotype distribution for Ww × ww', () => {
    expect(genotypeDistribution(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 'wings')).toBe('0-50-50');
  });

  it('runs deterministic batches for the same parents and run number', () => {
    const first = runDragonBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 40, 8);
    const second = runDragonBatch(DRAGON_PARENTS[0], DRAGON_PARENTS[1], 40, 8);
    expect(first.dominantCounts).toEqual(second.dominantCounts);
    expect(first.sample.map(dragon => dragon.genome)).toEqual(second.sample.map(dragon => dragon.genome));
  });

  it('removes wing assembly parts from a wingless genotype', () => {
    const record: StudentDragonRecord = {
      id: 'wingless-test',
      name: 'Wingless Test',
      title: 'Test dragon',
      color: '#586f5f',
      accentColor: '#b8ca9d',
      parentIds: ['test-a', 'test-b'],
      generation: 1,
      genome: {
        wings: ['w', 'w'],
        fire: ['f', 'f'],
        scales: ['s', 's'],
        horns: ['h', 'h'],
      },
    };
    const dragon = materializeDragon(record);
    expect(dragon.assembly.parts.some(part => part.roles?.includes('wing'))).toBeFalse();
  });

  it('keeps battle points separate from academic skill mastery', () => {
    const snapshot = {
      ...createDefaultDragonSnapshot(),
      battleResult: {
        won: true,
        winnerName: 'Test champion',
        elapsedSeconds: 12,
        remainingHealthPercent: 75,
      },
    };
    expect(challengeScore(snapshot).battle).toBe(25);
    expect(academicMasteryPercent(snapshot)).toBe(0);
  });
});
