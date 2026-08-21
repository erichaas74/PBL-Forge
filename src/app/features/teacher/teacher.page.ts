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
