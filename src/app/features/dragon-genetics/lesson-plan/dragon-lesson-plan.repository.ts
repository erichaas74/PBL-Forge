import { Service, computed, signal } from '@angular/core';
import {
  DEFAULT_DRAGON_LESSON_PLAN,
  DragonLessonPlanDocument,
  DragonLessonPlanWorkstation,
  DragonSharedLesson,
  normalizeDragonLessonPlan,
} from './dragon-lesson-plan.models';

const STORAGE_KEY = 'pbl-forge.dragon-genetics.lesson-plan.v6';

@Service()
export class DragonLessonPlanRepository {
  private readonly documentSignal = signal(loadDocument());
  readonly document = this.documentSignal.asReadonly();
  readonly publishedLessons = computed(() => this.document().lessons.filter((lesson) => lesson.published));

  save(change: (document: DragonLessonPlanDocument) => DragonLessonPlanDocument): void {
    const current = this.documentSignal();
    const next = normalizeDragonLessonPlan({
      ...change(structuredClone(current)),
      schemaVersion: 6,
      revision: current.revision + 1,
      updatedAtIso: new Date().toISOString(),
    });
    this.documentSignal.set(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  addLesson(): DragonSharedLesson {
    const current = this.documentSignal();
    const nextNumber = current.lessons.length + 1;
    const lesson: DragonSharedLesson = {
      id: uniqueLessonId(current, `lesson-${nextNumber}`),
      title: `Lesson ${nextNumber}`,
      learningGoal: '',
      guide: '',
      published: false,
      questions: [],
      workstations: [],
    };
    this.save((document) => ({ ...document, lessons: [...document.lessons, lesson] }));
    return lesson;
  }

  updateLesson(id: string, change: Partial<Pick<DragonSharedLesson, 'title' | 'learningGoal' | 'guide' | 'published'>>): void {
    this.save((document) => ({
      ...document,
      lessons: document.lessons.map((lesson) => lesson.id === id ? { ...lesson, ...change } : lesson),
    }));
  }

  setLessonWorkstations(
    id: string,
    workstations: readonly DragonLessonPlanWorkstation[],
  ): void {
    this.save((document) => ({
      ...document,
      lessons: document.lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, workstations: [...workstations] } : lesson,
      ),
    }));
  }

  moveLesson(id: string, direction: -1 | 1): void {
    this.save((document) => {
      const lessons = [...document.lessons];
      const current = lessons.findIndex((lesson) => lesson.id === id);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= lessons.length) return document;
      [lessons[current], lessons[target]] = [lessons[target], lessons[current]];
      return { ...document, lessons };
    });
  }
}

function loadDocument(): DragonLessonPlanDocument {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_DRAGON_LESSON_PLAN);
  try {
    return normalizeDragonLessonPlan(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return structuredClone(DEFAULT_DRAGON_LESSON_PLAN);
  }
}

function uniqueLessonId(document: DragonLessonPlanDocument, seed: string): string {
  let id = seed;
  let suffix = 2;
  while (document.lessons.some((lesson) => lesson.id === id)) id = `${seed}-${suffix++}`;
  return id;
}
