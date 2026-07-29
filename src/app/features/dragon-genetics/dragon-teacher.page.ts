import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { SessionService } from '../../core/firebase/session.service';
import { GeneticsSkill, MasteryRecord } from './dragon-genetics.models';

interface ProgressDocument {
  id: string;
  studentId: string;
  activeModule: number;
  completedModules: number[];
  mastery: Partial<Record<GeneticsSkill, MasteryRecord>>;
  misconceptionFlags: string[];
  licensePassed: boolean;
  officialAttemptsUsed: number;
  championId: string | null;
  battleResult: { won: boolean } | null;
}

@Component({
  selector: 'app-dragon-teacher-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './dragon-teacher.page.html',
  styleUrl: './dragon-teacher.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonTeacherPage {
  private readonly firestore = inject(Firestore);
  readonly session = inject(SessionService);
  readonly error = signal<string | null>(null);
  readonly skills: GeneticsSkill[] = ['GEN-1', 'GEN-2', 'GEN-3', 'GEN-4', 'GEN-5', 'GEN-6', 'GEN-7', 'GEN-8'];
  readonly progress$ = toObservable(this.session.user).pipe(
    switchMap(() => {
      this.error.set(null);
      return collectionData(collection(this.firestore, 'dragonLabProgress'), { idField: 'id' }).pipe(
        map(documents => (documents as ProgressDocument[]).sort((a, b) =>
          b.completedModules.length - a.completedModules.length || a.studentId.localeCompare(b.studentId))),
        catchError((error: unknown) => {
          console.error('Dragon Genetics teacher dashboard could not load.', error);
          this.error.set('Sign in with a teacher account to view student records.');
          return of([] as ProgressDocument[]);
        }),
      );
    }),
  );

  isLocalTeacher(): boolean {
    return this.session.isLocalTeacher();
  }

  async signInDemoTeacher(): Promise<void> {
    await this.session.signInAsLocalTeacher();
  }

  studentLabel(studentId: string): string {
    return `Student ${studentId.slice(0, 7)}`;
  }

  masteryLevel(student: ProgressDocument, skill: GeneticsSkill): number {
    return student.mastery?.[skill]?.level ?? 0;
  }

  averageLevel(students: ProgressDocument[], skill: GeneticsSkill): string {
    if (!students.length) return '—';
    const sum = students.reduce((total, student) => total + this.masteryLevel(student, skill), 0);
    return (sum / students.length).toFixed(1);
  }

  countLicensed(students: ProgressDocument[]): number {
    return students.filter(student => student.licensePassed).length;
  }

  countOfficialBreeders(students: ProgressDocument[]): number {
    return students.filter(student => student.officialAttemptsUsed > 0).length;
  }

  misconceptionCounts(students: ProgressDocument[]): { flag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const flag of students.flatMap(student => student.misconceptionFlags ?? [])) {
      counts.set(flag, (counts.get(flag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
}
