import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, shareReplay, switchMap } from 'rxjs';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { ActivityType } from '../../core/models/pbl.models';

@Component({
  selector: 'app-project-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './project.page.html',
  styleUrl: './project.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ProjectRepository);

  readonly projectId$ = this.route.paramMap.pipe(
    map((params) => params.get('projectId') ?? ''),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly project$ = this.projectId$.pipe(
    switchMap((projectId) => this.repository.project$(projectId))
  );
  readonly activities$ = this.projectId$.pipe(
    switchMap((projectId) => this.repository.activities$(projectId))
  );

  activityLabel(type: ActivityType): string {
    return {
      choice: 'Decision point',
      matching: 'Systems match',
      reflection: 'Written reflection'
    }[type];
  }

  activitySymbol(type: ActivityType): string {
    return { choice: 'A', matching: '↔', reflection: '✎' }[type];
  }
}
