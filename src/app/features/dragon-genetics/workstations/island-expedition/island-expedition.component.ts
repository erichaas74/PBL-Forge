import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  ECOLOGY_FACTOR_LABELS,
  EXPEDITION_ISLANDS,
  EXPEDITION_ISLAND_BY_ID,
  EXPEDITION_LOCI,
  EXPEDITION_LOCUS_BY_ID,
  ExpeditionIslandId,
  ExpeditionLocusId,
  ExpeditionQuest,
  FACTOR_SCALE_WORDS,
  IslandEcology,
  SurveyedDragon,
} from './island-expedition.models';
import { EXPEDITION_QUESTS, evaluateIslandChoice, questTargetBreakdown } from './island-expedition.quests';
import { islandFrequencies, islandPressures, pressureSummary } from './island-expedition.selection';
import {
  evaluateDragon,
  sequenceLocus,
  surveyIsland,
  visibleFormLabel,
} from './island-expedition.survey';
import { createAttempt, IslandExpeditionRepository } from './island-expedition.repository';
import { ExpeditionAttempt } from './island-expedition.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';

/**
 * Island Expedition — pick the island where selection would have made your target common.
 *
 * The instrument is open: the student may read any island, survey in any order, and spend budget
 * however they like. The only constraints are the survey and sequencing budgets, which are model
 * constraints in the sense the workstation rules allow — they make reasoning worth doing without
 * prescribing a step order.
 *
 * Nothing here gates on the prediction field. Whether the student committed a reason before
 * surveying is *recorded* (`reasonedFirst`) rather than enforced, so the lab reports a habit
 * instead of policing one.
 */
@Component({
  selector: 'app-island-expedition',
  templateUrl: './island-expedition.component.html',
  styleUrl: './island-expedition.component.scss',
})
export class IslandExpeditionComponent {
  private readonly repository = inject(IslandExpeditionRepository);

  readonly studentId = input.required<string>();
  /** Lets a host open the map straight onto one brief. */
  readonly initialQuestId = input<string | null>(null);
  readonly goal = input(
    'Work out which island selection would have stocked with the dragon you need, then go and find it.',
  );
  readonly attemptChanged = output<ExpeditionAttempt>();

  readonly islands = EXPEDITION_ISLANDS;
  readonly loci = EXPEDITION_LOCI;
  readonly quests = EXPEDITION_QUESTS;
  readonly factorLabels = ECOLOGY_FACTOR_LABELS;
  readonly factorKeys = Object.keys(ECOLOGY_FACTOR_LABELS) as (keyof IslandEcology)[];

  private readonly attemptsSignal = signal<Readonly<Record<string, ExpeditionAttempt>>>({});
  private readonly hydratedFor = signal<string | null>(null);

  readonly activeQuestId = signal<string>(EXPEDITION_QUESTS[0].id);
  readonly selectedIslandId = signal<ExpeditionIslandId | null>(null);
  readonly inspectedDragonId = signal<string | null>(null);
  readonly debriefOpen = signal(false);
  readonly guideOpen = signal(false);
  readonly message = signal<string | null>(null);

  readonly activeQuest = computed<ExpeditionQuest>(
    () => EXPEDITION_QUESTS.find((quest) => quest.id === this.activeQuestId()) ?? EXPEDITION_QUESTS[0],
  );

  readonly attempt = computed<ExpeditionAttempt>(() => {
    this.hydrate();
    return (
      this.attemptsSignal()[this.activeQuestId()] ??
      createAttempt(this.activeQuestId(), this.studentId())
    );
  });

  readonly selectedIsland = computed(() => {
    const id = this.selectedIslandId();
    return id ? EXPEDITION_ISLAND_BY_ID[id] : null;
  });

  readonly predictedIslandName = computed(() => {
    const id = this.attempt().predictedIslandId;
    return id ? EXPEDITION_ISLAND_BY_ID[id].name : null;
  });

  /** Survey and sequencing spend so far, against the brief's allowance. */
  readonly surveysUsed = computed(() => this.attempt().surveys.length);
  readonly surveysLeft = computed(() =>
    Math.max(0, this.activeQuest().surveyBudget - this.surveysUsed()),
  );
  readonly sequencesUsed = computed(() => this.attempt().sequencedDragonLoci.length);
  readonly sequencesLeft = computed(() =>
    Math.max(0, this.activeQuest().sequenceBudget - this.sequencesUsed()),
  );

  /** Every dragon seen so far, with any sequencing the student has paid for applied. */
  readonly surveyedDragons = computed<readonly SurveyedDragon[]>(() => {
    const attempt = this.attempt();
    const sequenced = attempt.sequencedDragonLoci;
    return attempt.surveys.flatMap((survey) =>
      survey.dragons.map((dragon) => {
        const loci = sequenced
          .filter((entry) => entry.dragonId === dragon.id)
          .map((entry) => entry.locusId);
        return loci.reduce((current, locusId) => sequenceLocus(current, locusId), dragon);
      }),
    );
  });

  readonly matches = computed(() =>
    this.surveyedDragons().map((dragon) => evaluateDragon(dragon, this.activeQuest())),
  );

  readonly confirmedMatches = computed(() => this.matches().filter((match) => match.confirmed));
  readonly candidateMatches = computed(() => this.matches().filter((match) => match.candidate));

  readonly capturedDragon = computed(() => {
    const id = this.attempt().capturedDragonId;
    return id ? (this.surveyedDragons().find((dragon) => dragon.id === id) ?? null) : null;
  });

  readonly inspectedDragon = computed(() => {
    const id = this.inspectedDragonId();
    return id ? (this.surveyedDragons().find((dragon) => dragon.id === id) ?? null) : null;
  });

  /** Which loci this brief actually cares about, so the field card stays readable. */
  readonly questLocusIds = computed(() =>
    this.activeQuest().targets.map((target) => target.locusId),
  );

  readonly islandBreakdown = computed(() => {
    const islandId = this.selectedIslandId();
    return islandId ? questTargetBreakdown(this.activeQuest(), islandId) : [];
  });

  readonly islandPressureRows = computed(() => {
    const islandId = this.selectedIslandId();
    if (!islandId) return [];
    return islandPressures(islandId).map((pressure) => ({
      ...pressure,
      locusName: EXPEDITION_LOCUS_BY_ID[pressure.locusId].name,
      summary: pressureSummary(islandId, pressure.locusId),
    }));
  });

  /** Only offered once the expedition is over, so it cannot be used as a shortcut. */
  readonly debrief = computed(() => {
    const attempt = this.attempt();
    const chosen = attempt.surveys[0]?.islandId ?? attempt.predictedIslandId;
    if (!chosen) return null;
    const evaluation = evaluateIslandChoice(this.activeQuest(), chosen);
    return {
      ...evaluation,
      islandName: EXPEDITION_ISLAND_BY_ID[evaluation.islandId].name,
      bestIslandName: EXPEDITION_ISLAND_BY_ID[evaluation.bestIslandId].name,
      reasonedFirst: attempt.surveys[0]?.reasonedFirst ?? false,
    };
  });

  readonly expeditionOver = computed(
    () => this.attempt().complete || (this.surveysLeft() === 0 && this.surveysUsed() > 0),
  );

  // --- Reading the map -------------------------------------------------------

  factorWord(value: number): string {
    return FACTOR_SCALE_WORDS[Math.max(0, Math.min(FACTOR_SCALE_WORDS.length - 1, value))];
  }

  selectIsland(islandId: ExpeditionIslandId): void {
    this.selectedIslandId.set(islandId);
    this.message.set(null);
  }

  selectQuest(questId: string): void {
    this.activeQuestId.set(questId);
    this.inspectedDragonId.set(null);
    this.debriefOpen.set(false);
    this.message.set(null);
  }

  /** Surveyed dragons drawn from this island, for the field list grouping. */
  dragonsFrom(islandId: ExpeditionIslandId): readonly SurveyedDragon[] {
    return this.surveyedDragons().filter((dragon) => dragon.islandId === islandId);
  }

  formLabel(dragon: SurveyedDragon, locusId: ExpeditionLocusId): string {
    return visibleFormLabel(dragon, locusId);
  }

  locusName(locusId: ExpeditionLocusId): string {
    return EXPEDITION_LOCUS_BY_ID[locusId].name;
  }

  /** What the student is entitled to know: the pair once sequenced, otherwise a masked slot. */
  genotypeLabel(dragon: SurveyedDragon, locusId: ExpeditionLocusId): string {
    const locus = EXPEDITION_LOCUS_BY_ID[locusId];
    if (!dragon.sequencedLoci.includes(locusId)) {
      return dragon.genotypes[locusId] === 'homozygous-recessive'
        ? `${locus.recessiveAllele}${locus.recessiveAllele}`
        : `${locus.dominantAllele}?`;
    }
    switch (dragon.genotypes[locusId]) {
      case 'homozygous-dominant':
        return `${locus.dominantAllele}${locus.dominantAllele}`;
      case 'heterozygous':
        return `${locus.dominantAllele}${locus.recessiveAllele}`;
      default:
        return `${locus.recessiveAllele}${locus.recessiveAllele}`;
    }
  }

  isSequenced(dragon: SurveyedDragon, locusId: ExpeditionLocusId): boolean {
    return dragon.sequencedLoci.includes(locusId);
  }

  // --- Acting ----------------------------------------------------------------

  setPrediction(islandId: ExpeditionIslandId | null, reasoning: string): void {
    this.updateAttempt((attempt) => ({
      ...attempt,
      predictedIslandId: islandId,
      prediction: reasoning,
    }));
  }

  commitPredictionFromField(event: Event): void {
    const reasoning = (event.target as HTMLTextAreaElement).value;
    this.setPrediction(this.attempt().predictedIslandId ?? this.selectedIslandId(), reasoning);
  }

  predictSelectedIsland(): void {
    const islandId = this.selectedIslandId();
    if (!islandId) return;
    this.setPrediction(islandId, this.attempt().prediction);
    this.message.set(
      `Recorded ${EXPEDITION_ISLAND_BY_ID[islandId].name} as your predicted island.`,
    );
  }

  runSurvey(): void {
    const islandId = this.selectedIslandId();
    const quest = this.activeQuest();
    if (!islandId) {
      this.message.set('Choose an island on the map first.');
      return;
    }
    if (this.surveysLeft() <= 0) {
      this.message.set('No survey flights left for this brief.');
      return;
    }
    const attempt = this.attempt();
    const index = attempt.surveys.length;
    const seed = `${attempt.studentId}:${quest.id}:${index}`;
    const dragons = surveyIsland(islandId, quest.sampleSize, seed);
    this.updateAttempt((current) => ({
      ...current,
      surveys: [
        ...current.surveys,
        {
          id: seed,
          questId: quest.id,
          islandId,
          atIso: new Date().toISOString(),
          dragons,
          // Recorded, never required — a habit to report, not a gate to pass.
          reasonedFirst: !!current.predictedIslandId && current.prediction.trim().length > 0,
        },
      ],
    }));
    this.message.set(
      `Surveyed ${quest.sampleSize} dragons on ${EXPEDITION_ISLAND_BY_ID[islandId].name}.`,
    );
  }

  sequence(dragon: SurveyedDragon, locusId: ExpeditionLocusId): void {
    if (this.sequencesLeft() <= 0) {
      this.message.set('No sequencing runs left for this brief.');
      return;
    }
    if (dragon.sequencedLoci.includes(locusId)) return;
    this.updateAttempt((attempt) => ({
      ...attempt,
      sequencedDragonLoci: [
        ...attempt.sequencedDragonLoci,
        { dragonId: dragon.id, locusId },
      ],
    }));
    this.message.set(`Sequenced ${this.locusName(locusId)} for ${dragon.name}.`);
  }

  capture(dragon: SurveyedDragon): void {
    const match = evaluateDragon(dragon, this.activeQuest());
    if (!match.confirmed) {
      this.message.set(
        match.candidate
          ? `${dragon.name} still has an unsequenced locus the brief asks about.`
          : `${dragon.name} does not meet the brief.`,
      );
      return;
    }
    this.updateAttempt((attempt) => ({
      ...attempt,
      capturedDragonId: dragon.id,
      complete: true,
    }));
    this.debriefOpen.set(true);
    this.message.set(`${dragon.name} secured. Expedition complete.`);
  }

  inspect(dragon: SurveyedDragon): void {
    this.inspectedDragonId.update((current) => (current === dragon.id ? null : dragon.id));
  }

  toggleGuide(): void {
    this.guideOpen.update((open) => !open);
  }

  toggleDebrief(): void {
    this.debriefOpen.update((open) => !open);
  }

  resetExpedition(): void {
    this.updateAttempt(() => createAttempt(this.activeQuestId(), this.studentId()));
    this.debriefOpen.set(false);
    this.inspectedDragonId.set(null);
    this.message.set('Brief reset. Budgets restored.');
  }

  /** Frequencies for the selected island — available only after it has been surveyed. */
  surveyedFrequency(locusId: ExpeditionLocusId): number | null {
    const islandId = this.selectedIslandId();
    if (!islandId) return null;
    if (!this.attempt().surveys.some((survey) => survey.islandId === islandId)) return null;
    return islandFrequencies(islandId)[locusId].dominantForm;
  }

  private hydrate(): void {
    const studentId = normalizeWorkstationStudentId(this.studentId());
    if (this.hydratedFor() === studentId) return;
    this.hydratedFor.set(studentId);
    this.attemptsSignal.set(this.repository.load(studentId).attempts);
    const requested = this.initialQuestId();
    if (requested && EXPEDITION_QUESTS.some((quest) => quest.id === requested)) {
      this.activeQuestId.set(requested);
    }
  }

  private updateAttempt(change: (attempt: ExpeditionAttempt) => ExpeditionAttempt): void {
    const questId = this.activeQuestId();
    const studentId = normalizeWorkstationStudentId(this.studentId());
    const current = this.attemptsSignal()[questId] ?? createAttempt(questId, studentId);
    const next = { ...change(current), updatedAtIso: new Date().toISOString() };
    const attempts = { ...this.attemptsSignal(), [questId]: next };
    this.attemptsSignal.set(attempts);
    this.repository.save({ schemaVersion: 1, studentId, attempts });
    this.attemptChanged.emit(next);
  }
}
