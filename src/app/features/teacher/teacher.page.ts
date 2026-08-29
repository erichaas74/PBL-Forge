/**
 * Runtime status: RETIRED — /teacher now loads DragonTeacherPage instead of this generic dashboard.
 * Former inputs/signals: session identity and published-project Observable.
 * Former data access: ProjectRepository and SessionService.
 * Former connections: generic catalog/project authoring links.
 */
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { SessionService } from '../../core/firebase/session.service';

@Component({
  selector: 'app-teacher-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './teacher.page.html',
  styleUrl: './teacher.page.scss',
})
export class TeacherPage {
  readonly repository = inject(ProjectRepository);
  readonly session = inject(SessionService);
}
