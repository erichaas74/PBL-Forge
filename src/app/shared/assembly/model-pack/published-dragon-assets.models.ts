import { CreationTestScenarioDefinition } from '../../creation-library/models/test-scenario.models';
import { DragonModelPackV1 } from './dragon-model-pack.models';

export const PUBLISHED_DRAGON_ASSETS_DOCUMENT = 'publishedDragonAssets/current';
export const PREVIEW_DRAGON_ASSETS_DOCUMENT = 'publishedDragonAssets/preview';
export const DRAGON_ASSET_VERSIONS_COLLECTION = 'dragonAssetVersions';

/** Firestore payload shared by the private Garage and the student application. */
export interface PublishedDragonAssetsV1 {
  schemaVersion: 1;
  versionId: string;
  modelPack: DragonModelPackV1;
  arenaScenario: CreationTestScenarioDefinition;
  publishedBy: string;
  publishedAt: unknown;
  releaseNotes: string;
}
