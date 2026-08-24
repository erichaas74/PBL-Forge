import { Service, signal } from '@angular/core';

/** Shared launcher state lets in-page Wise Dragon buttons open the global guide drawer. */
@Service()
export class WiseDragonGuideService {
  readonly open = signal(false);

  show(): void {
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open.update((open) => !open);
  }
}
