/**
 * Runtime status: RETIRED — /catalog redirects to /dragon-genetics and no runtime module imports this page.
 * Former inputs/signals: published-project Observable from ProjectRepository.
 * Former data access: built-in and Firestore project records.
 * Former connections: generic project pages and the Dragon Genetics front door.
 */
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { PblProject } from '../../core/models/pbl.models';

@Component({
  selector: 'app-catalog-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.scss',
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
