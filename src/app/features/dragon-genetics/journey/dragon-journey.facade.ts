import { computed, effect, inject, Service, signal } from '@angular/core';
import { DragonAdaptiveStore } from '../adaptive/dragon-adaptive.store';
import { DragonArenaMissionRepository } from '../capstones/arena/dragon-arena-mission.repository';
import { DragonProjectHubFacade } from '../project/dragon-project-hub.facade';
import { CompanionShowRepository } from '../workstations/companion-show/companion-show.repository';
import { DragonHatcheryBreedingRepository } from '../workstations/dragon-hatchery/dragon-hatchery-breeding.repository';
import {
  DRAGON_JOURNEY_PATHS,
  DRAGON_LESSONS,
  dragonJourneyLesson,
  dragonJourneyPath,
} from './config/dragon-journey.registry';
import { DragonJourneyProgressRepository } from './data/dragon-journey-progress.repository';
import { DragonJourneyRosterRepository } from './data/dragon-journey-roster.repository';
import {
  DragonJourneyMetric,
  DragonJourneyProgressSnapshot,
  DragonJourneyRosterSnapshot,
  DragonLearningPathDefinition,
  DragonLearningPathId,
  DragonLessonDefinition,
  DragonLessonId,
  DragonLessonViewModel,
  DragonRequirementResult,
  DragonRosterViewModel,
} from './domain/dragon-journey.models';

@Service()
export class DragonJourneyFacade {
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly hub = inject(DragonProjectHubFacade);
  private readonly rosterRepository = inject(DragonJourneyRosterRepository);
  private readonly progressRepository = inject(DragonJourneyProgressRepository);
  private readonly hatcheryRepository = inject(DragonHatcheryBreedingRepository);
  private readonly companionRepository = inject(CompanionShowRepository);
  private readonly arenaRepository = inject(DragonArenaMissionRepository);
  private readonly refreshVersion = signal(0);
  private readonly rosterSnapshotSignal = signal<DragonJourneyRosterSnapshot | null>(null);
  private readonly progressSnapshotSignal = signal<DragonJourneyProgressSnapshot | null>(null);
  private hydratedContext = '';
  private publishSignature = '';

  readonly studentId = this.hub.studentId;
  readonly assignment = this.adaptiveStore.assignment;
  readonly selectedPathId = computed<DragonLearningPathId | null>(() => {
    const selected = this.hub.selectedPathId();
    return dragonJourneyPath(selected)?.id ?? null;
  });
  readonly plan = computed(() => this.assignment().journeyPlan);
  readonly pathSelectionLocked = this.hub.pathSelectionLocked;
  readonly pathOptions = computed(() =>
    this.plan()
      .offeredPathIds.map((pathId) => dragonJourneyPath(pathId))
      .filter((path): path is DragonLearningPathDefinition => Boolean(path)),
  );
  readonly selectedPath = computed(() => dragonJourneyPath(this.selectedPathId()));
  readonly progressSnapshot = this.progressSnapshotSignal.asReadonly();

  readonly lessons = computed<readonly DragonLessonViewModel[]>(() => {
    this.refreshVersion();
    const path = this.selectedPath();
    if (!path) return [];
    const setting = this.plan().pathSettings[path.id];
    const definitions = setting.lessonIds
      .map((lessonId) => dragonJourneyLesson(lessonId))
      .filter((lesson): lesson is DragonLessonDefinition => Boolean(lesson));
    const results = definitions.map((definition, index) => ({
      definition,
      order: index + 1,
      required: setting.requiredLessonIds.includes(definition.id),
      requirements: this.requirementsFor(definition),
      complete: false,
      active: false,
    }));
    const withCompletion = results.map((lesson) => ({
      ...lesson,
      complete: lesson.requirements.every((requirement) => requirement.met),
    }));
    const nextRequired = withCompletion.find((lesson) => lesson.required && !lesson.complete);
    const nextAny = withCompletion.find((lesson) => !lesson.complete);
    const activeId = (nextRequired ?? nextAny)?.definition.id ?? path.capstoneLessonId;
    return withCompletion.map((lesson) => ({
      ...lesson,
      active: lesson.definition.id === activeId,
    }));
  });

  readonly nextLesson = computed(
    () => this.lessons().find((lesson) => lesson.active) ?? this.lessons().at(-1) ?? null,
  );
  readonly completedLessonCount = computed(
    () => this.lessons().filter((lesson) => lesson.complete).length,
  );
  readonly progressPercent = computed(() => {
    const lessons = this.lessons();
    return lessons.length ? Math.round((100 * this.completedLessonCount()) / lessons.length) : 0;
  });
  readonly capstoneReady = computed(() => {
    const path = this.selectedPath();
    if (!path) return false;
    return this.lessons()
      .filter((lesson) => lesson.required && lesson.definition.id !== path.capstoneLessonId)
      .every((lesson) => lesson.complete);
  });
  readonly roster = computed<DragonRosterViewModel | null>(() => {
    this.refreshVersion();
    const path = this.selectedPath();
    const snapshot = this.rosterSnapshotSignal();
    if (!path || !snapshot || snapshot.pathId !== path.id) return null;
    const bredCount = this.metricValue('roster.bred-dragons');
    const availableCount =
      path.lineage === 'classic'
        ? snapshot.starters.length +
          this.hatcheryRepository.load(this.studentId()).fertilizations.length
        : snapshot.starters.length +
          this.companionRepository
            .load(this.studentId())
            .litters.flatMap((litter) => litter.keptPupIds).length;
    return { lineage: path.lineage, starters: snapshot.starters, bredCount, availableCount };
  });
  readonly sideQuests = computed(() => {
    const enabled = new Set(this.plan().sideQuestActivityIds);
    return this.hub.definition.activities.filter((activity) => enabled.has(activity.id));
  });
  readonly freePlayActivities = computed(() => {
    const ids = new Set(this.selectedPath()?.freePlayActivityIds ?? []);
    return this.hub.definition.activities.filter((activity) => ids.has(activity.id));
  });

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      const assignment = this.assignment();
      const path = this.selectedPath();
      const context = `${studentId}:${assignment.id}:${path?.id ?? 'none'}`;
      if (context === this.hydratedContext) return;
      this.hydratedContext = context;
      this.progressSnapshotSignal.set(this.progressRepository.load(studentId, assignment.id));
      if (!path) {
        this.rosterSnapshotSignal.set(null);
        return;
      }
      const setting = assignment.journeyPlan.pathSettings[path.id];
      const roster = this.rosterRepository.loadOrCreate(
        studentId,
        assignment.id,
        path.id,
        setting.starterPairPresetId,
      );
      this.rosterSnapshotSignal.set(roster);
      this.seedStarterPair(roster);
      this.saveProgress({ selectedPathId: path.id });
      this.refresh();
    });

    effect(() => {
      if (!this.adaptiveStore.ready()) return;
      const path = this.selectedPath();
      const progress = this.progressSnapshotSignal();
      if (!path || !progress) return;
      const completeLessonIds = this.lessons()
        .filter((lesson) => lesson.complete)
        .map((lesson) => lesson.definition.id);
      const signature = [
        progress.studentId,
        progress.assignmentId,
        path.id,
        progress.lastLessonId ?? 'none',
        completeLessonIds.join(','),
        this.capstoneReady(),
        this.metricValue('roster.bred-dragons'),
      ].join(':');
      if (signature === this.publishSignature) return;
      this.publishSignature = signature;
      void this.progressRepository
        .publish(
          progress,
          this.assignment(),
          completeLessonIds,
          this.capstoneReady(),
          this.metricValue('roster.bred-dragons'),
        )
        .catch((error: unknown) => console.error('Dragon journey progress could not sync.', error));
    });
  }

  choosePath(pathId: string): boolean {
    const path = dragonJourneyPath(pathId);
    if (!path || !this.plan().offeredPathIds.includes(path.id)) return false;
    if (this.pathSelectionLocked()) return this.selectedPathId() === path.id;
    this.hub.selectPath(path.id);
    return this.selectedPathId() === path.id;
  }

  visitLesson(lessonId: DragonLessonId): void {
    const lesson = dragonJourneyLesson(lessonId);
    if (!lesson) return;
    const visited = this.progressSnapshotSignal()?.visitedLessonIds ?? [];
    this.saveProgress({
      selectedPathId: lesson.pathId,
      lastLessonId: lesson.id,
      visitedLessonIds: visited.includes(lesson.id) ? visited : [...visited, lesson.id],
    });
  }

  lessonView(lessonId: string): DragonLessonViewModel | null {
    const configured = this.lessons().find((lesson) => lesson.definition.id === lessonId);
    if (configured) return configured;
    const definition = dragonJourneyLesson(lessonId);
    const path = this.selectedPath();
    if (!definition || !path || definition.pathId !== path.id) return null;
    const requirements = this.requirementsFor(definition);
    return {
      definition,
      order: path.lessonIds.indexOf(definition.id) + 1,
      required: false,
      requirements,
      complete: requirements.every((requirement) => requirement.met),
      active: false,
    };
  }

  refresh(): void {
    this.hub.refresh();
    this.refreshVersion.update((version) => version + 1);
  }

  private requirementsFor(lesson: DragonLessonDefinition): DragonRequirementResult[] {
    const overrides = this.plan().pathSettings[lesson.pathId].requirementOverrides;
    return lesson.requirements.map((requirement) => {
      const current =
        requirement.kind === 'activity-complete'
          ? this.activityComplete(requirement.activityId)
            ? 1
            : 0
          : this.metricValue(requirement.metric);
      const required =
        requirement.kind === 'activity-complete'
          ? 1
          : (overrides[requirement.id]?.minimum ?? requirement.minimum);
      return { requirement, current, required, met: current >= required };
    });
  }

  private activityComplete(activityId: string): boolean {
    return this.hub.studentState().activityProgress[activityId]?.status === 'complete';
  }

  private metricValue(metric: DragonJourneyMetric): number {
    this.refreshVersion();
    const studentId = this.studentId();
    const path = this.selectedPath();
    const roster = this.rosterSnapshotSignal();
    const companion = this.companionRepository.load(studentId);
    const hatchery = this.hatcheryRepository.load(studentId);
    const arena = this.arenaRepository.load(studentId);
    const progress = this.hub.studentState().activityProgress;
    const values: Record<DragonJourneyMetric, number> = {
      'roster.starter-dragons': roster?.starters.length ?? 0,
      'roster.bred-dragons':
        path?.lineage === 'mini'
          ? companion.litters.reduce((total, litter) => total + litter.size, 0)
          : hatchery.fertilizations.length,
      'trait.claims': progress['trait-evidence']?.evidenceIds.length ?? 0,
      'notebook.experiments': this.adaptiveStore.geneticsNotebook().experiments.length,
      'hatchery.fertilizations': hatchery.fertilizations.length,
      'companion.standard-targets': companion.targets.length,
      'companion.selected-parents': companion.pairIds.filter(Boolean).length,
      'companion.litters': companion.litters.length,
      'companion.kept-dragons': new Set(companion.litters.flatMap((litter) => litter.keptPupIds))
        .size,
      'companion.pedigree-candidates': companion.rareCandidateIds.length,
      'companion.training-sessions': companion.trainingSessions.length,
      'companion.show-runs': companion.showRuns.length,
      'companion.registry-entries': companion.registry.length,
      'arena.trials': arena.trials.length,
    };
    return values[metric];
  }

  private seedStarterPair(roster: DragonJourneyRosterSnapshot): void {
    const [female, male] = roster.starters;
    if (roster.pathId === 'dragon-arena') {
      const hatchery = this.hatcheryRepository.load(roster.studentId);
      if (hatchery.eggParentId && hatchery.spermParentId) return;
      this.hatcheryRepository.save({
        ...hatchery,
        eggParentId: hatchery.eggParentId ?? female.dragonId,
        spermParentId: hatchery.spermParentId ?? male.dragonId,
      });
      return;
    }
    const companion = this.companionRepository.load(roster.studentId);
    const founderIds = [
      ...new Set([...companion.kennelFounderIds, female.dragonId, male.dragonId]),
    ];
    const pairIds: readonly [string | null, string | null] = [
      companion.pairIds[0] ?? female.dragonId,
      companion.pairIds[1] ?? male.dragonId,
    ];
    if (
      founderIds.length === companion.kennelFounderIds.length &&
      pairIds[0] === companion.pairIds[0] &&
      pairIds[1] === companion.pairIds[1]
    )
      return;
    this.companionRepository.save({
      ...companion,
      kennelFounderIds: founderIds,
      pairIds,
      updatedAtIso: new Date().toISOString(),
    });
  }

  private saveProgress(
    change: Partial<
      Pick<DragonJourneyProgressSnapshot, 'selectedPathId' | 'lastLessonId' | 'visitedLessonIds'>
    >,
  ): void {
    const current =
      this.progressSnapshotSignal() ??
      this.progressRepository.load(this.studentId(), this.assignment().id);
    const next: DragonJourneyProgressSnapshot = {
      ...current,
      ...change,
      studentId: this.studentId(),
      assignmentId: this.assignment().id,
      updatedAtIso: new Date().toISOString(),
    };
    this.progressSnapshotSignal.set(next);
    this.progressRepository.save(next);
  }
}

export function journeyLessonIdsForPath(pathId: DragonLearningPathId): readonly DragonLessonId[] {
  return DRAGON_JOURNEY_PATHS.find((path) => path.id === pathId)?.lessonIds ?? [];
}

export function journeyLessonsForPath(
  pathId: DragonLearningPathId,
): readonly DragonLessonDefinition[] {
  const ids = new Set(journeyLessonIdsForPath(pathId));
  return DRAGON_LESSONS.filter((lesson) => ids.has(lesson.id));
}
