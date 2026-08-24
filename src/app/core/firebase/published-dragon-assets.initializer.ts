import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';

/** Hydrates runtime registries; bundled assets remain active on any Firebase failure. */
export function initializePublishedDragonAssets(): void {
  const injector = inject(EnvironmentInjector);
  void import('./published-dragon-assets.runtime').then(runtime =>
    runInInjectionContext(injector, () => runtime.hydratePublishedDragonAssets()));
}
