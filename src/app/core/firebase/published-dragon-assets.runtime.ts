import { inject } from '@angular/core';
import { installPublishedDragonModelPack } from '../../data/published-dragon-models';
import { installPublishedDragonArena } from '../../shared/assembly-arena/data/arena-setups';
import { PublishedDragonAssetsRepository } from './published-dragon-assets.repository';

export async function hydratePublishedDragonAssets(): Promise<void> {
  const repository = inject(PublishedDragonAssetsRepository);
  try {
    const assets = await repository.load();
    if (!assets) return;
    installPublishedDragonModelPack(assets.modelPack);
    installPublishedDragonArena(assets.arenaScenario);
  } catch (error) {
    console.warn('Using bundled dragon assets because Firebase hydration failed.', error);
  }
}
