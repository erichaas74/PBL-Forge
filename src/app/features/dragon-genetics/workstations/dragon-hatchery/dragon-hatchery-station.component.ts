import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import {
  DragonHatcheryDisplayComponent,
  DragonHatcheryFeedback,
} from './dragon-hatchery-display.component';
import {
  DragonHatcheryToolId,
  DragonVisualBridge,
  DragonVisualMetric,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  DragonVisualStageEvent,
  HATCHERY_SELECTION_SEQUENCE,
} from '../../../../shared/dragon-visuals';
import {
  DEFAULT_HATCHERY_EVIDENCE,
  HATCHERY_MISCONCEPTION_NOTES,
  hatcheryClutchCopy,
} from './dragon-hatchery-content';
import {
  DRAGON_TRAITS,
  genotypeLabel,
  getTrait,
  phenotypeLabel,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonHatcheryMode,
  HatcheryEggOutcome,
  HatcheryEvidenceOption,
  HatcheryMisconception,
  HatcheryRunRecord,
} from './dragon-hatchery.models';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import { createDragonHatcheryScene } from './dragon-hatchery-scene.adapter';
import {
  dragonParentCanvasSource,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';

interface RunState {
  phase: DragonVisualPhase;
  activeEggId: string | null;
  examinedIds: readonly string[];
  sampledIds: readonly string[];
  hatchedIds: readonly string[];
  selectedEggIds: readonly string[];
  examinesUsed: number;
  samplesUsed: number;
  prediction: number | null;
  predictionLocked: boolean;
  hatchCommitted: boolean;
  evidenceMarkId: string | null;
  evidenceAttempts: number;
  saved: boolean;
  openedAtMs: number;
}

type PrimaryActionKind = 'begin' | 'lock' | 'stage' | 'hatch' | 'explain' | 'save' | 'done';

interface PrimaryAction {
  label: string;
  disabled: boolean;
  kind: PrimaryActionKind;
}

/**
 * Dragon Hatchery station: the lesson half of the shared clutch instrument.
 *
 * A module drops this in, hands it a clutch, and chooses which tools it offers — candling only,
 * DNA sampling only, or the full examine/sample/hatch loop — plus how scarce those tools are.
 * The station owns the teaching loop (read, predict, examine, hatch, explain, save), the
 * comparison against the prediction, misconception diagnosis, and the saved record.
 * `DragonHatcheryDisplayComponent` draws the published scene and reports stage events back here.
 */
@Component({
  selector: 'app-dragon-hatchery-station',
  imports: [DragonHatcheryDisplayComponent, SpecimenViewportComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-hatchery-station.component.html',
  styleUrl: './dragon-hatchery-station.component.scss',
})
export class DragonHatcheryStationComponent {
  private readonly bridge = inject(DragonVisualBridge);

  readonly clutch = input.required<readonly DragonOffspring[]>();
  readonly parents = input<readonly [DragonParentProfile, DragonParentProfile] | null>(null);
  /** Removes the lesson sequence and opens every hatchery tool immediately. */
  readonly openLab = input(false);
  readonly showClutchRecord = input(true);
  readonly motherSource = computed(() => {
    const parents = this.parents();
    return parents ? dragonParentCanvasSource(parents[0], 'female') : null;
  });
  readonly fatherSource = computed(() => {
    const parents = this.parents();
    return parents ? dragonParentCanvasSource(parents[1], 'male') : null;
  });
  readonly clutchId = input('clutch');
  readonly clutchLabel = input('Incubation clutch');
  /** Gene the hosting module is teaching. Without one, every trait is shown equally. */
  readonly focusTraitId = input<DragonTraitId | null>(null);
  readonly tools = input<readonly DragonHatcheryToolId[]>(['examine', 'sample', 'hatch']);
  /** `null` is an unlimited budget; a number makes students choose which eggs to spend it on. */
  readonly examineBudget = input<number | null>(null);
  readonly sampleBudget = input<number | null>(null);
  readonly hatchLimit = input<number | null>(2);
  readonly mode = input<DragonHatcheryMode>('learn');
  readonly moduleId = input('module');
  readonly seed = input('hatchery');
  readonly prompt = input(
    'Examine the clutch, sample the DNA you need, and choose which eggs to hatch.',
  );
  readonly evidence = input<readonly HatcheryEvidenceOption[]>(DEFAULT_HATCHERY_EVIDENCE);
  readonly correctEvidenceId = input<string | null>('genotype-record');
  /** Turned off by modules that only need the instrument for free exploration. */
  readonly requirePrediction = input(true);

  readonly recordSaved = output<HatcheryRunRecord>();
  readonly hatchedDragons = output<readonly DragonOffspring[]>();
  readonly stageEvent = output<DragonVisualStageEvent>();

  readonly misconceptionNotes = HATCHERY_MISCONCEPTION_NOTES;

  private readonly feedbackState = signal<DragonHatcheryFeedback | null>(null);
  private readonly misconceptionCounts = signal<Readonly<Record<string, number>>>({});
  private readonly run = linkedSignal<RunState>(() =>
    createRun({
      clutch: this.clutch(),
      mode: this.mode(),
      clutchId: this.clutchId(),
      openLab: this.openLab(),
    }),
  );

  readonly feedback = this.feedbackState.asReadonly();
  readonly focusTrait = computed(() => {
    const traitId = this.focusTraitId();
    return traitId ? getTrait(traitId) : null;
  });
  readonly showsPrediction = computed(() => this.requirePrediction() && !!this.focusTrait());
  readonly predictionOptions = computed(() =>
    Array.from({ length: this.clutch().length + 1 }, (_, index) => index),
  );
  readonly prediction = computed(() => this.run().prediction);
  readonly predictionLocked = computed(() => this.run().predictionLocked);
  readonly evidenceMarkId = computed(() => this.run().evidenceMarkId);
  readonly phase = computed(() => this.run().phase);
  readonly finished = computed(() => this.run().saved);

  readonly examinedEggs = computed(() => this.eggsById(this.run().examinedIds));
  readonly sampledEggs = computed(() => this.eggsById(this.run().sampledIds));
  readonly hatchedEggs = computed(() => this.eggsById(this.run().hatchedIds));

  readonly examinesLeft = computed(() => remaining(this.examineBudget(), this.run().examinesUsed));
  readonly samplesLeft = computed(() => remaining(this.sampleBudget(), this.run().samplesUsed));

  /** True count across the whole clutch, including eggs the student never opened. */
  readonly actualDominantCount = computed(() => {
    const trait = this.focusTrait();
    if (!trait) return null;
    return this.clutch().filter((egg) => showsDominantPhenotype(egg.genome[trait.id], trait.id))
      .length;
  });
  readonly hatchedDominantCount = computed(() => {
    const trait = this.focusTrait();
    if (!trait) return null;
    return this.hatchedEggs().filter((egg) =>
      showsDominantPhenotype(egg.genome[trait.id], trait.id),
    ).length;
  });

  readonly copy = computed(() =>
    hatcheryClutchCopy({
      clutchId: this.clutchId(),
      clutchLabel: this.clutchLabel(),
      eggIds: this.clutch().map((egg) => egg.id),
      evidence: this.evidence(),
    }),
  );

  readonly openMisconceptions = computed(() =>
    Object.entries(this.misconceptionCounts())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([flag, count]) => ({ flag: flag as HatcheryMisconception, count })),
  );

  readonly scene = computed<DragonVisualScene>(() => {
    const run = this.run();
    return createDragonHatcheryScene(this.sceneId(), this.visualMode(), run.phase, {
      clutchId: this.clutchId(),
      eggs: this.clutch(),
      parents: this.parents(),
      examinedEggIds: run.examinedIds,
      sampledEggIds: run.sampledIds,
      hatchedEggIds: run.hatchedIds,
      focusGeneId: this.focusTrait()?.geneSymbol,
      activeEggId: run.activeEggId,
      selectedEggIds: run.selectedEggIds,
      activeToolId: run.phase === 'reveal' ? 'hatch' : undefined,
      availableToolIds: this.tools(),
      examinesRemaining: this.examinesLeft(),
      samplesRemaining: this.samplesLeft(),
      hatchLimit: this.hatchLimit(),
      hatchCommitted: run.hatchCommitted,
      metrics: this.metrics(),
      evidenceMarks: this.evidence().map((mark) => ({
        id: mark.id,
        labelId: `evidence.${mark.id}`,
        anchorId: mark.anchorId,
      })),
      evidenceMarkId: run.evidenceMarkId,
      showHints: this.mode() === 'learn' || this.mode() === 'reteach',
      seed: `${this.seed()}:${this.mode()}:${this.clutchId()}`,
    });
  });

  readonly primaryAction = computed<PrimaryAction>(() => {
    const run = this.run();
    if (run.saved) return { label: 'Hatchery record saved', disabled: true, kind: 'done' };
    switch (run.phase) {
      case 'observe':
        return { label: 'Open the incubation bay', disabled: false, kind: 'begin' };
      case 'predict':
        return {
          label: 'Lock this prediction',
          disabled: run.prediction === null,
          kind: 'lock',
        };
      case 'manipulate':
        return this.tools().includes('hatch')
          ? {
              label: 'Go to the hatch tray',
              disabled: !run.selectedEggIds.length,
              kind: 'stage',
            }
          : {
              label: 'Finish the examination',
              disabled: !run.examinedIds.length && !run.sampledIds.length,
              kind: 'stage',
            };
      case 'reveal':
        return run.hatchCommitted
          ? {
              label: this.evidence().length
                ? 'Explain what the records show'
                : 'Save the hatchery record',
              disabled: false,
              kind: this.evidence().length ? 'explain' : 'save',
            }
          : {
              label: `Hatch ${run.selectedEggIds.length} chosen egg${run.selectedEggIds.length === 1 ? '' : 's'}`,
              disabled: !run.selectedEggIds.length,
              kind: 'hatch',
            };
      default:
        return {
          label: 'Save the hatchery record',
          disabled: this.evidence().length > 0 && !run.evidenceMarkId,
          kind: 'save',
        };
    }
  });

  readonly stepHint = computed(() => {
    const run = this.run();
    if (run.saved) return 'The hatchery record is saved.';
    switch (run.phase) {
      case 'observe':
        return 'Step 1 — Read: every egg already carries a full genome. Nothing about it is visible yet.';
      case 'predict':
        return `Step 2 — Predict: how many of these ${this.clutch().length} eggs will show ${this.focusTrait()?.dominantPhenotype ?? 'the dominant trait'}?`;
      case 'manipulate':
        return this.tools().includes('hatch')
          ? 'Step 3 — Examine: candle or sample the eggs you need, then choose which ones to hatch.'
          : 'Step 3 — Examine: candle or sample the eggs your investigation needs.';
      case 'reveal':
        return run.hatchCommitted
          ? 'Step 4 — Compare: only the eggs you chose hatched. The rest of the clutch stayed sealed.'
          : 'Step 4 — Hatch: commit the tray. This cannot be taken back.';
      case 'explain':
        return 'Step 5 — Explain: pin the mark that reports what you actually observed.';
      default:
        return 'Review the hatchery record.';
    }
  });

  readonly modeLabel = computed(
    () =>
      ({
        learn: 'Learn · trait names and hints on',
        practice: 'Practice · hints off',
        official: 'Official · results locked until the record is saved',
        reteach: 'Reteach · same clutch, one misconception isolated',
      })[this.mode()],
  );

  constructor() {
    effect(() => this.bridge.showScene(this.scene()));
    effect(() => {
      const phase = this.run().phase;
      if (phase === 'manipulate' || phase === 'reveal' || phase === 'explain') {
        this.bridge.playSequence(HATCHERY_SELECTION_SEQUENCE, 'station');
      } else {
        this.bridge.stopSequence();
      }
    });
  }

  onStageEvent(event: DragonVisualStageEvent): void {
    this.stageEvent.emit(event);
    switch (event.type) {
      case 'specimen-selected':
        this.focusEgg(event.targetId);
        break;
      case 'reveal-requested':
        if (event.value === 'examine') this.examineEgg(event.targetId);
        if (event.value === 'sample') this.sampleEgg(event.targetId);
        break;
      case 'egg-marked':
        this.toggleStaged(event.targetId);
        break;
      case 'hatch-committed':
        this.commitHatch();
        break;
      default:
        break;
    }
  }

  runPrimaryAction(): void {
    const action = this.primaryAction();
    if (action.disabled) return;
    switch (action.kind) {
      case 'begin':
        this.setPhase(this.showsPrediction() ? 'predict' : 'manipulate');
        break;
      case 'lock':
        this.lockPrediction();
        break;
      case 'stage':
        this.setPhase(this.phaseAfterExamination());
        this.feedbackState.set(
          this.tools().includes('hatch')
            ? {
                tone: 'neutral',
                headline: 'The tray is ready.',
                detail: 'Committing the hatch opens only the eggs you chose.',
              }
            : null,
        );
        break;
      case 'hatch':
        this.commitHatch();
        break;
      case 'explain':
        this.setPhase('explain');
        this.feedbackState.set({
          tone: 'neutral',
          headline: 'Pin the mark that supports your claim.',
          detail: 'Only one mark reports what the instrument actually showed.',
        });
        break;
      case 'save':
        this.saveRun();
        break;
      default:
        break;
    }
  }

  setPrediction(value: number): void {
    if (this.run().predictionLocked) return;
    this.run.update((current) => ({ ...current, prediction: value }));
  }

  eggLabel(eggId: string): string {
    const index = this.clutch().findIndex((egg) => egg.id === eggId);
    return index < 0 ? eggId : `Egg ${index + 1}`;
  }

  eggPhenotype(eggId: string): string {
    const egg = this.clutch().find((candidate) => candidate.id === eggId);
    if (!egg) return '';
    const trait = this.focusTrait();
    return trait ? phenotypeLabel(egg, trait.id) : this.clutchTraitSummary(egg);
  }

  eggGenotype(eggId: string): string {
    const egg = this.clutch().find((candidate) => candidate.id === eggId);
    if (!egg) return '';
    const trait = this.focusTrait();
    return trait
      ? genotypeLabel(egg.genome[trait.id])
      : DRAGON_TRAITS.map((item) => genotypeLabel(egg.genome[item.id])).join(' ');
  }

  parentGenotype(parent: DragonParentProfile, traitId: DragonTraitId): string {
    return genotypeLabel(parent.genome[traitId]);
  }

  evidenceTextFor(markId: string | null): string {
    if (!markId) return '';
    return this.evidence().find((mark) => mark.id === markId)?.text ?? '';
  }

  private focusEgg(eggId: string): void {
    if (!this.clutch().some((egg) => egg.id === eggId)) return;
    this.run.update((current) => ({ ...current, activeEggId: eggId }));
  }

  private examineEgg(eggId: string): void {
    const run = this.run();
    if (run.phase !== 'manipulate' || !this.tools().includes('examine')) return;
    if (run.examinedIds.includes(eggId) || run.hatchedIds.includes(eggId)) return;
    if (!this.clutch().some((egg) => egg.id === eggId)) return;
    if (this.examinesLeft() === 0) {
      this.feedbackState.set({
        tone: 'warn',
        headline: 'No candling time left.',
        detail: 'Work from the eggs you already examined, or sample DNA instead.',
      });
      return;
    }

    this.run.update((current) => ({
      ...current,
      activeEggId: eggId,
      examinedIds: [...current.examinedIds, eggId],
      examinesUsed: current.examinesUsed + 1,
    }));

    if (this.mode() === 'official') {
      this.feedbackState.set({ tone: 'neutral', headline: `${this.eggLabel(eggId)} candled.` });
      return;
    }
    this.feedbackState.set({
      tone: 'neutral',
      headline: `${this.eggLabel(eggId)} shows ${this.eggPhenotype(eggId)}.`,
      detail: 'Candling reports the trait only. It cannot tell you which alleles produced it.',
    });
  }

  private sampleEgg(eggId: string): void {
    const run = this.run();
    if (run.phase !== 'manipulate' || !this.tools().includes('sample')) return;
    if (run.sampledIds.includes(eggId) || run.hatchedIds.includes(eggId)) return;
    if (!this.clutch().some((egg) => egg.id === eggId)) return;
    if (this.samplesLeft() === 0) {
      this.feedbackState.set({
        tone: 'warn',
        headline: 'No sampling kits left.',
        detail: 'Decide from the allele pairs you already read.',
      });
      return;
    }

    this.run.update((current) => ({
      ...current,
      activeEggId: eggId,
      sampledIds: [...current.sampledIds, eggId],
      samplesUsed: current.samplesUsed + 1,
    }));

    if (this.mode() === 'official') {
      this.feedbackState.set({ tone: 'neutral', headline: `${this.eggLabel(eggId)} sampled.` });
      return;
    }
    const genotype = this.eggGenotype(eggId);
    const heterozygous = genotype.length === 2 && genotype[0] !== genotype[1];
    this.feedbackState.set({
      tone: 'neutral',
      headline: `${this.eggLabel(eggId)} carries ${genotype}.`,
      detail: heterozygous
        ? 'One dominant allele is enough to show the dominant trait, so the recessive allele is carried without showing.'
        : 'Both alleles match here, so this egg can pass on only that allele.',
    });
  }

  private toggleStaged(eggId: string): void {
    const run = this.run();
    if (run.hatchCommitted || !this.tools().includes('hatch')) return;
    if (run.phase !== 'manipulate' && run.phase !== 'reveal') return;
    if (!this.clutch().some((egg) => egg.id === eggId)) return;

    const staged = run.selectedEggIds.includes(eggId);
    const limit = this.hatchLimit();
    if (!staged && limit !== null && run.selectedEggIds.length >= limit) {
      this.feedbackState.set({
        tone: 'warn',
        headline: `The tray holds ${limit} egg${limit === 1 ? '' : 's'}.`,
        detail: 'Remove one before choosing another.',
      });
      return;
    }
    this.run.update((current) => ({
      ...current,
      activeEggId: eggId,
      selectedEggIds: staged
        ? current.selectedEggIds.filter((id) => id !== eggId)
        : [...current.selectedEggIds, eggId],
    }));
  }

  private commitHatch(): void {
    const run = this.run();
    if (run.hatchCommitted || !this.tools().includes('hatch')) return;
    if (!run.selectedEggIds.length) return;
    // The display only offers the control in `reveal`; a lesson may arrive here from the rail.
    const hatchedIds = [...run.selectedEggIds];

    this.run.update((current) => ({
      ...current,
      phase: 'reveal',
      hatchCommitted: true,
      hatchedIds,
    }));

    this.hatchedDragons.emit(this.eggsById(hatchedIds));

    const trait = this.focusTrait();
    const prediction = run.prediction;
    if (!trait || prediction === null) {
      this.feedbackState.set({
        tone: 'neutral',
        headline: `${hatchedIds.length} egg${hatchedIds.length === 1 ? '' : 's'} hatched.`,
        detail: 'The rest of the clutch is still sealed, and its records are unchanged.',
      });
      return;
    }

    const actual = this.actualDominantCount() ?? 0;
    const hatchedShowing = this.hatchedDominantCount() ?? 0;
    if (this.mode() === 'official') {
      this.feedbackState.set({
        tone: 'neutral',
        headline: 'Hatch recorded.',
        detail:
          'Pin the evidence you would use to defend your reading. Results stay locked until you save.',
      });
      this.diagnosePrediction(prediction, actual);
      return;
    }
    if (prediction === actual) {
      this.feedbackState.set({
        tone: 'good',
        headline: `Your prediction matched the clutch: ${actual} of ${this.clutch().length} show ${trait.dominantPhenotype}.`,
        detail: `${hatchedShowing} of the ${hatchedIds.length} eggs you hatched show it. A small sample can still differ from the whole clutch.`,
      });
      return;
    }
    this.diagnosePrediction(prediction, actual);
    this.feedbackState.set({
      tone: 'neutral',
      headline: `You predicted ${prediction}; the clutch holds ${actual} of ${this.clutch().length} showing ${trait.dominantPhenotype}.`,
      detail: `${hatchedShowing} of the ${hatchedIds.length} eggs you hatched show it. A clutch this small often differs from the expected ratio, so a miss is not a mistake.`,
    });
  }

  pinEvidence(markId: string): void {
    const run = this.run();
    if (run.phase !== 'explain') return;
    const mark = this.evidence().find((candidate) => candidate.id === markId);
    if (!mark) return;
    if (this.mode() === 'official' && run.evidenceMarkId) return;

    this.run.update((current) => ({
      ...current,
      evidenceMarkId: markId,
      evidenceAttempts: current.evidenceAttempts + 1,
    }));

    if (this.mode() === 'official') {
      this.feedbackState.set({
        tone: 'neutral',
        headline: 'Evidence pinned.',
        detail: 'You can save this record.',
      });
      return;
    }
    if (!mark.misconception) {
      this.feedbackState.set({
        tone: 'good',
        headline: 'Evidence pinned.',
        detail: 'This mark reports what the instrument showed, which is what supports the claim.',
      });
      return;
    }
    this.flagMisconception(mark.misconception);
    this.feedbackState.set({
      tone: 'warn',
      headline: 'That mark does not report what you observed.',
      detail: `${this.misconceptionNotes[mark.misconception]} Choose again, or save and revisit it.`,
    });
  }

  private lockPrediction(): void {
    const prediction = this.run().prediction;
    if (prediction === null) return;
    this.run.update((current) => ({ ...current, predictionLocked: true, phase: 'manipulate' }));
    this.feedbackState.set({
      tone: 'neutral',
      headline: 'Prediction locked.',
      detail: 'Now gather the records that will let you defend or correct it.',
    });
  }

  private saveRun(): void {
    const run = this.run();
    if (run.saved) return;
    const trait = this.focusTrait();
    const mark = this.evidence().find((candidate) => candidate.id === run.evidenceMarkId);
    const actual = this.actualDominantCount();
    const evidenceCorrect = this.evidence().length
      ? run.evidenceMarkId === this.correctEvidenceId()
      : null;

    const record: HatcheryRunRecord = {
      sceneId: this.sceneId(),
      seed: `${this.seed()}:${this.mode()}:${this.clutchId()}`,
      moduleId: this.moduleId(),
      clutchId: this.clutchId(),
      mode: this.mode(),
      focusTraitId: trait?.id ?? null,
      focusGeneId: trait?.geneSymbol ?? null,
      clutchSize: this.clutch().length,
      examinedEggIds: [...run.examinedIds],
      sampledEggIds: [...run.sampledIds],
      hatchedEggIds: [...run.hatchedIds],
      predictedDominantCount: run.prediction,
      actualDominantCount: actual,
      hatchedDominantCount: this.hatchedDominantCount(),
      predictionCorrect:
        run.prediction === null || actual === null ? null : run.prediction === actual,
      evidenceMarkId: run.evidenceMarkId,
      evidenceCorrect,
      misconception: mark?.misconception ?? null,
      eggs: this.eggOutcomes(run),
      attempts: 1 + run.evidenceAttempts,
      elapsedMs: Math.max(0, now() - run.openedAtMs),
      createdAtIso: new Date().toISOString(),
    };

    this.run.update((current) => ({ ...current, saved: true, phase: 'review' }));
    this.feedbackState.set(null);
    this.recordSaved.emit(record);
  }

  private eggOutcomes(run: RunState): readonly HatcheryEggOutcome[] {
    return this.clutch().map((egg, index) => ({
      eggId: egg.id,
      position: index + 1,
      examined: run.examinedIds.includes(egg.id),
      sampled: run.sampledIds.includes(egg.id),
      hatched: run.hatchedIds.includes(egg.id),
      genotype: this.eggGenotype(egg.id),
      phenotype: this.eggPhenotype(egg.id),
    }));
  }

  private clutchTraitSummary(egg: DragonOffspring): string {
    return DRAGON_TRAITS.map((trait) => phenotypeLabel(egg, trait.id)).join(' · ');
  }

  private metrics(): readonly DragonVisualMetric[] {
    const run = this.run();
    const trait = this.focusTrait();
    const metrics: DragonVisualMetric[] = [
      { id: 'clutch-size', label: 'Eggs in clutch', value: this.clutch().length },
    ];
    if (trait && run.predictionLocked && run.prediction !== null) {
      metrics.push({
        id: 'prediction',
        label: `Predicted showing ${trait.dominantPhenotype}`,
        value: run.prediction,
      });
    }
    if (trait && run.hatchCommitted && this.mode() !== 'official') {
      metrics.push({
        id: 'hatched-showing',
        label: `Hatched showing ${trait.dominantPhenotype}`,
        value: this.hatchedDominantCount() ?? 0,
        referenceValue: this.actualDominantCount() ?? undefined,
      });
    }
    return metrics;
  }

  private phaseAfterExamination(): DragonVisualPhase {
    if (this.tools().includes('hatch')) return 'reveal';
    return this.evidence().length ? 'explain' : 'review';
  }

  private eggsById(ids: readonly string[]): readonly DragonOffspring[] {
    const clutch = this.clutch();
    return ids
      .map((id) => clutch.find((egg) => egg.id === id))
      .filter((egg): egg is DragonOffspring => !!egg);
  }

  /**
   * A prediction that misses the clutch by one or two is ordinary variation, not an error, so
   * only the diagnostic case is flagged: expecting every egg in the clutch to show the dominant
   * trait is the "dominant means common" misconception.
   */
  private diagnosePrediction(prediction: number, actual: number): void {
    const size = this.clutch().length;
    if (prediction === size && actual < size) this.flagMisconception('dominant-means-common');
  }

  private flagMisconception(flag: HatcheryMisconception): void {
    this.misconceptionCounts.update((counts) => ({ ...counts, [flag]: (counts[flag] ?? 0) + 1 }));
  }

  private setPhase(phase: DragonVisualPhase): void {
    this.run.update((current) => ({ ...current, phase }));
  }

  private sceneId(): string {
    return `${this.moduleId()}-dragon-hatchery-${this.mode()}`;
  }

  private visualMode(): DragonVisualMode {
    const mode = this.mode();
    return mode === 'official' ? 'official' : mode === 'practice' ? 'practice' : 'learn';
  }
}

/** A new clutch, module mode, or clutch ID restarts the run, so all three are read here. */
function createRun(source: {
  clutch: readonly DragonOffspring[];
  mode: DragonHatcheryMode;
  clutchId: string;
  openLab?: boolean;
}): RunState {
  return {
    phase: source.openLab ? 'manipulate' : 'observe',
    activeEggId: source.clutch[0]?.id ?? null,
    examinedIds: [],
    sampledIds: [],
    hatchedIds: [],
    selectedEggIds: [],
    examinesUsed: 0,
    samplesUsed: 0,
    prediction: null,
    predictionLocked: false,
    hatchCommitted: false,
    evidenceMarkId: null,
    evidenceAttempts: 0,
    saved: false,
    openedAtMs: now(),
  };
}

function remaining(budget: number | null, used: number): number | null {
  return budget === null ? null : Math.max(0, budget - used);
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
