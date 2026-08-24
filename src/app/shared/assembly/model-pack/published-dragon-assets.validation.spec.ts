import dragonModelPackJson from '../../../../../model-packs/dragon-model-pack.v1.json';
import { TEST_SCENARIO_CATALOG } from '../../creation-library/data/test-scenario-catalog';
import { parsePublishedDragonAssets } from './published-dragon-assets.validation';

describe('published dragon assets validation', () => {
  const arena = TEST_SCENARIO_CATALOG.find(scenario => scenario.id === 'dragon-duel-ring')!;
  const valid = {
    schemaVersion: 1,
    versionId: '1.2.0-test',
    modelPack: dragonModelPackJson,
    arenaScenario: arena,
    publishedBy: 'teacher-1',
    publishedAt: null,
    releaseNotes: 'Validated publication',
  };

  it('parses a complete versioned model and arena publication', () => {
    const parsed = parsePublishedDragonAssets(valid);
    expect(parsed.versionId).toBe('1.2.0-test');
    expect(parsed.arenaScenario.id).toBe('dragon-duel-ring');
  });

  it('rejects unsafe versions and malformed arena settings', () => {
    expect(() => parsePublishedDragonAssets({ ...valid, versionId: '../current' })).toThrow(/unsafe/i);
    expect(() => parsePublishedDragonAssets({
      ...valid,
      arenaScenario: { ...arena, environment: { ...arena.environment, wallHeight: -1 } },
    })).toThrow(/wallHeight/i);
  });
});
