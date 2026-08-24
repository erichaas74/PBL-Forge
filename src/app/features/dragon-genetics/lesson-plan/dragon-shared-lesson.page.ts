import { Component, computed, effect, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DragonLessonEvidenceRecord,
  dragonLessonEvidenceDetail,
  dragonLessonEvidenceTitle,
} from '../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../orchestration/dragon-lesson-evidence.repository';
import { DragonWorkstationContextService } from '../workstations/shared/dragon-workstation-context.service';
import { DragonLessonPlanRepository } from './dragon-lesson-plan.repository';
import { isDragonPathContextId } from './dragon-lesson-plan.models';

@Component({
  selector: 'app-dragon-shared-lesson-page',
  imports: [RouterLink],
  templateUrl: './dragon-shared-lesson.page.html',
  styleUrl: './dragon-paths.page.scss',
})
export class DragonSharedLessonPage {
  readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly workstationContext = inject(DragonWorkstationContextService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly pathId = computed(() => this.routeParams().get('pathId'));
  readonly lessonId = computed(() => this.routeParams().get('lessonId') ?? '');
  readonly responses = linkedSignal<Readonly<Record<string, string>>>(() => this.loadResponses());
  readonly evidence = linkedSignal<readonly DragonLessonEvidenceRecord[]>(() => this.loadEvidence());
  readonly path = computed(() => {
    const pathId = this.pathId();
    return isDragonPathContextId(pathId) ? this.lessonPlan.document().paths[pathId] : null;
  });
  readonly lesson = computed(() =>
    this.lessonPlan.publishedLessons().find((lesson) => lesson.id === this.lessonId()) ?? null,
  );
  readonly evidenceCaptureEnabled = computed(
    () =>
      this.lesson()?.workstations.some((workstation) =>
        ['allele-workbench', 'breeding-incubator'].includes(workstation.id),
      ) ?? false,
  );
  readonly nextLesson = computed(() => {
    const lessons = this.lessonPlan.publishedLessons();
    return lessons[lessons.findIndex((lesson) => lesson.id === this.lessonId()) + 1] ?? null;
  });

  constructor() {
    effect(() => {
      if (!isDragonPathContextId(this.pathId())) {
        void this.router.navigate(['/dragon-genetics'], { replaceUrl: true });
      }
    });
  }

  updateResponse(questionId: string, event: Event): void {
    const responses = {
      ...this.responses(),
      [questionId]: (event.target as HTMLTextAreaElement).value,
    };
    this.responses.set(responses);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.responseKey(), JSON.stringify(responses));
    }
  }

  responseFor(questionId: string): string {
    return this.responses()[questionId] || '';
  }

  evidenceTitle(record: DragonLessonEvidenceRecord): string {
    return dragonLessonEvidenceTitle(record);
  }

  evidenceDetail(record: DragonLessonEvidenceRecord): string {
    return dragonLessonEvidenceDetail(record);
  }

  removeEvidence(evidenceId: string): void {
    const pathId = this.pathId();
    if (!isDragonPathContextId(pathId)) return;
    this.evidence.set(
      this.evidenceRepository.remove(
        this.workstationContext.studentId(),
        pathId,
        this.lessonId(),
        evidenceId,
      ),
    );
  }

  private loadResponses(): Readonly<Record<string, string>> {
    if (typeof localStorage === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(this.responseKey()) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  private loadEvidence(): readonly DragonLessonEvidenceRecord[] {
    const pathId = this.pathId();
    if (!isDragonPathContextId(pathId)) return [];
    return this.evidenceRepository.load(
      this.workstationContext.studentId(),
      pathId,
      this.lessonId(),
    );
  }

  private responseKey(): string {
    return `pbl-forge.dragon-genetics.lesson-responses.v1.${this.workstationContext.studentId()}.${this.pathId()}.${this.lessonId()}`;
  }
}
