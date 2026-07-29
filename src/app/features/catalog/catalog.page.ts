import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { PblProject } from '../../core/models/pbl.models';

@Component({
  selector: 'app-catalog-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPage {
  readonly repository = inject(ProjectRepository);
  readonly projects$ = this.repository.publishedProjects$;

  projectLink(project: PblProject): string[] {
    return project.experienceType === 'dragon-genetics'
      ? ['/dragon-genetics']
      : ['/project', project.id];
  }
}
