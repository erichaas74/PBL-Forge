import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ProjectActivityViewModel,
  ProjectHubViewModel,
  ProjectNextAction,
} from '../project/domain/project-hub.models';
import { DragonProjectHubFacade } from './project/dragon-project-hub.facade';

@Component({
  selector: 'app-dragon-genetics-page',
  imports: [RouterLink],
  templateUrl: './dragon-genetics.page.html',
  styleUrl: './dragon-genetics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonGeneticsPage {
  readonly hub = inject(DragonProjectHubFacade);
  readonly viewModel = this.hub.viewModel;

  constructor() {
    this.hub.refresh();
  }

  selectPath(event: Event): void {
    this.hub.selectPath((event.target as HTMLSelectElement).value || null);
  }

  actionLabel(action: ProjectNextAction): string {
    return {
      'needs-revision': 'Revise',
      resume: 'Continue',
      start: 'Enter lab',
      extension: 'Explore',
    }[action.reason];
  }

  statusLabel(activity: ProjectActivityViewModel): string {
    if (activity.availability === 'locked' && activity.status === 'not-started') return 'Locked';
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
    if (activity.availability === 'locked') return '–';
    return '○';
  }

  evidenceCount(view: ProjectHubViewModel): number {
    return view.stages
      .flatMap((stage) => stage.activities)
      .reduce((total, activity) => total + activity.evidenceCount, 0);
  }
}
