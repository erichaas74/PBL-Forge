import { PINEWOOD_DERBY_CAR_PRESET } from '../../assembly-garage/data/presets/pinewood-derby-car';
import { TEST_SCENARIO_CATALOG } from './test-scenario-catalog';

describe('TEST_SCENARIO_CATALOG', () => {
  it('keeps pinewood derby cars inside the track lanes with clearance', () => {
    const scenario = TEST_SCENARIO_CATALOG.find(item => item.id === 'pinewood-derby-test');
    expect(scenario).toBeTruthy();

    const railPositions = scenario!.environment.obstacles
      .filter(obstacle => obstacle.id.includes('rail'))
      .map(obstacle => obstacle.position.z)
      .sort((a, b) => a - b);
    const laneWidth = Math.min(
      Math.abs(railPositions[1] - railPositions[0]),
      Math.abs(railPositions[2] - railPositions[1]),
    );
    const carHalfWidth = Math.max(
      ...PINEWOOD_DERBY_CAR_PRESET.state.parts.map(part =>
        Math.abs(part.position.z) + part.dimensions.y / 2,
      ),
    );

    expect(laneWidth).toBeGreaterThan(carHalfWidth * 2 + 0.3);
    expect(scenario!.participants.every(participant =>
      participant.defaultAssemblyAssetId === 'pinewood-derby-car',
    )).toBeTrue();
  });
});
