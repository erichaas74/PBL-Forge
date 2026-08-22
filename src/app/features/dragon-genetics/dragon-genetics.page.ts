import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ProjectActivityViewModel,
  ProjectHubViewModel,
} from '../project/domain/project-hub.models';
import { DragonProjectHubFacade } from './project/dragon-project-hub.facade';
import { DragonArenaSagaPreviewComponent } from './project/dragon-arena-saga-preview.component';
import { MiniDragonSagaPreviewComponent } from './project/mini-dragon-saga-preview.component';
import { WiseDragonGuideService } from './wise-dragon/wise-dragon-guide.service';
import { DragonJourneyFacade } from './journey/dragon-journey.facade';

/** Radius of the progress dial's arc, in the face's 128-unit viewBox. */
const DIAL_RADIUS = 44;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

@Component({
  selector: 'app-dragon-genetics-page',
  imports: [RouterLink, DragonArenaSagaPreviewComponent, MiniDragonSagaPreviewComponent],
  templateUrl: './dragon-genetics.page.html',
  styleUrl: './dragon-genetics.page.scss',
})
export class DragonGeneticsPage {
  readonly hub = inject(DragonProjectHubFacade);
  readonly journey = inject(DragonJourneyFacade);
  readonly wiseDragonGuide = inject(WiseDragonGuideService);
  private readonly router = inject(Router);
  readonly viewModel = this.hub.viewModel;
  readonly sagaForgeOpen = signal(false);
  readonly expandedSagaPathId = signal<string | null>(null);

  /** Engraved marks around the dial's bezel, every 15°. */
  readonly dialTicks = Array.from({ length: 24 }, (_, index) => index * 15);

  constructor() {
    this.hub.refresh();
  }

  /**
   * The filled span of the progress arc.
   *
   * A dash of the swept length followed by the whole circumference leaves exactly one gap, so
   * the arc stops where the work does rather than repeating around the plate.
   */
  dialDash(progressPercent: number): string {
    const swept = (Math.max(0, Math.min(100, progressPercent)) / 100) * DIAL_CIRCUMFERENCE;
    return `${swept.toFixed(2)} ${DIAL_CIRCUMFERENCE.toFixed(2)}`;
  }

  selectPath(event: Event): void {
    const control = event.currentTarget as HTMLSelectElement | HTMLButtonElement;
    const pathId = control.value;
    if (!pathId || !this.journey.choosePath(pathId)) return;
    void this.router.navigate(['/dragon-genetics/journey', pathId]);
  }

  pathOffered(pathId: string): boolean {
    return this.journey.pathOptions().some((path) => path.id === pathId);
  }

  toggleSagaForge(): void {
    this.sagaForgeOpen.update((open) => !open);
    if (!this.sagaForgeOpen()) this.expandedSagaPathId.set(null);
  }

  toggleSagaPreview(pathId: string): void {
    this.expandedSagaPathId.update((current) => (current === pathId ? null : pathId));
  }

  statusLabel(activity: ProjectActivityViewModel): string {
    return {
      'not-started': 'Ready',
      'in-progress': 'In progress',
      submitted: 'Submitted',
      'needs-revision': 'Needs revision',
      complete: 'Complete',
    }[activity.status];
  }

  statusSymbol(activity: ProjectActivityViewModel): string {
    if (activity.status === 'complete') return '✓';
    if (activity.status === 'needs-revision') return '!';
    if (activity.isNextAction || activity.status === 'in-progress') return '●';
    return '○';
  }

  evidenceCount(view: ProjectHubViewModel): number {
    return view.stages
      .flatMap((stage) => stage.activities)
      .reduce((total, activity) => total + activity.evidenceCount, 0);
  }
}
