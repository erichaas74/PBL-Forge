/**
 * Runtime status: ACTIVE — embeds portable investigations inside the current shared lesson route.
 * Inputs/signals: path, lesson, and workstation definition plus workstation interaction outputs.
 * Data access: existing workstation context/repositories; lesson evidence remains browser-local.
 * Connects to: shared lesson reflection, direct open-lab fallbacks, and retained progress services.
 */
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DragonAdaptiveStore } from '../adaptive/dragon-adaptive.store';
import {
  DragonLessonPlanWorkstation,
  DragonPathContextId,
} from '../lesson-plan/dragon-lesson-plan.models';
import {
  AlleleExpressionEvidenceDraft,
  BreedingBatchEvidenceDraft,
} from './dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from './dragon-lesson-evidence.repository';
import { DragonEvidenceCaptureCardComponent } from './dragon-evidence-capture-card.component';
import { AlleleVaultWorkbenchComponent } from '../workstations/allele-workbench/allele-vault-workbench.component';
import {
  AlleleClaimFeedback,
  AlleleWorkbenchInteraction,
} from '../workstations/allele-workbench/allele-vault.models';
import { DragonHatcheryBreedingLabComponent } from '../workstations/dragon-hatchery/dragon-hatchery-breeding-lab.component';
import { MiniMeiosisHatcheryComponent } from '../workstations/dragon-hatchery/mini-meiosis-hatchery.component';
import { GeneticsMicroscopeComponent } from '../workstations/genome-microscope/genetics-microscope.component';
import { GenomeMicroscopeComponent } from '../workstations/genome-microscope/genome-microscope.component';
import {
  GenomeMicroscopeEvidence,
  GenomeMicroscopeLevel,
} from '../workstations/genome-microscope/genome-microscope.models';
import { MicroscopeLevelEvidenceRepository } from '../workstations/genome-microscope/microscope-level-evidence.repository';
import {
  MICROSCOPE_LEVEL_WORKSTATIONS,
  MicroscopeLevelWorkstationDefinition,
} from '../workstations/genome-microscope/microscope-level-workstations';
import { IncubatorSamplerComponent } from '../workstations/incubator-sampler/incubator-sampler.component';
import { IncubatorBatchRecord } from '../workstations/incubator-sampler/incubator-sampler.models';
import { MysteryPairComponent } from '../workstations/mystery-pair/mystery-pair.component';
import { DragonWorkstationContextService } from '../workstations/shared/dragon-workstation-context.service';
import { GeneticsProgramResolver } from '../workstations/shared/genetics-program.resolver';

type PendingLessonEvidence = AlleleExpressionEvidenceDraft | BreedingBatchEvidenceDraft;

@Component({
  selector: 'app-dragon-inline-workstation',
  imports: [
    RouterLink,
    DragonEvidenceCaptureCardComponent,
    MysteryPairComponent,
    IncubatorSamplerComponent,
    GeneticsMicroscopeComponent,
    AlleleVaultWorkbenchComponent,
    DragonHatcheryBreedingLabComponent,
    MiniMeiosisHatcheryComponent,
    GenomeMicroscopeComponent,
  ],
  templateUrl: './dragon-inline-workstation.component.html',
  styleUrl: './dragon-inline-workstation.component.scss',
})
export class DragonInlineWorkstationComponent {
  readonly pathId = input.required<DragonPathContextId>();
  readonly lessonId = input.required<string>();
  readonly workstation = input.required<DragonLessonPlanWorkstation>();
  readonly evidenceCaptured = output<void>();

  private readonly router = inject(Router);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly microscopeEvidenceRepository = inject(MicroscopeLevelEvidenceRepository);
  private readonly programs = inject(GeneticsProgramResolver);
  readonly context = inject(DragonWorkstationContextService);

  readonly studentId = this.context.studentId;
  readonly program = computed(() => this.programs.resolve(this.pathId()));
  /**
   * Lesson context plus whatever the lesson authored for this workstation.
   *
   * A workstation that hosts several authored investigations needs the lesson to say which one it
   * opens; lesson context always wins, so a launch parameter cannot forge `path` or `lesson`.
   */
  readonly launchQueryParams = computed(() => ({
    ...(this.workstation().launchParams ?? {}),
    path: this.pathId(),
    lesson: this.lessonId(),
  }));
  readonly revealedGeneIds = computed(() =>
    Object.keys(this.context.geneticsNotebook().discoveries),
  );
  readonly hatcherySeed = computed(
    () => `${this.pathId()}:${this.studentId()}:${this.lessonId()}`,
  );
  readonly claimFeedback = signal<AlleleClaimFeedback | null>(null);
  readonly pendingEvidence = signal<PendingLessonEvidence | null>(null);
  readonly evidenceMessage = signal('');
  readonly microscopeDefinition = computed<MicroscopeLevelWorkstationDefinition | null>(() => {
    const workstation = this.workstation();
    return (
      MICROSCOPE_LEVEL_WORKSTATIONS.find(
        (candidate) => candidate.id === workstation.id || candidate.route === workstation.route,
      ) ?? null
    );
  });
  readonly microscopeLevelScope = computed<readonly GenomeMicroscopeLevel[]>(() => {
    const definition = this.microscopeDefinition();
    return definition ? [definition.level] : [];
  });
  readonly savedMicroscopeRecordCount = signal(0);

  constructor() {
    effect(() => {
      const definition = this.microscopeDefinition();
      const studentId = this.studentId();
      untracked(() => {
        this.savedMicroscopeRecordCount.set(
          definition
            ? this.microscopeEvidenceRepository.load(studentId, definition.level).length
            : 0,
        );
      });
    });
  }

  handleAlleleInteraction(event: AlleleWorkbenchInteraction): void {
    if (event.type === 'dna-analysis-requested' && event.pairIds) {
      void this.router.navigate(['/dragon-genetics/dna-process-lab'], {
        queryParams: {
          path: this.pathId(),
          lesson: this.lessonId(),
          gene: event.geneId,
          sampleA: event.pairIds[0],
          sampleB: event.pairIds[1],
        },
      });
      return;
    }
    if (event.type === 'expression-run' && event.pairIds && event.phenotype) {
      this.adaptiveStore.recordAlleleExperiment(event.geneId, event.pairIds, event.phenotype);
      this.pendingEvidence.set({
        evidenceType: 'allele-expression',
        workstationId: 'allele-workbench',
        geneId: event.geneId,
        pairIds: event.pairIds,
        genotype: event.genotype ?? event.pairIds.join(' × '),
        phenotype: event.phenotype,
      });
      this.evidenceMessage.set('');
      return;
    }
    if (
      event.type === 'discovery-claim' &&
      event.traitId &&
      event.dominantAlleleId &&
      event.recessiveAlleleId
    ) {
      const status = this.adaptiveStore.submitAlleleDiscovery(
        event.geneId,
        event.traitId,
        event.dominantAlleleId,
        event.recessiveAlleleId,
      );
      this.claimFeedback.set({
        geneId: event.geneId,
        status,
        revision: (this.claimFeedback()?.revision ?? 0) + 1,
      });
    }
  }

  handleBatchSaved(batch: IncubatorBatchRecord): void {
    this.pendingEvidence.set({
      evidenceType: 'breeding-batch',
      workstationId: 'breeding-incubator',
      batchId: batch.id,
      parentIds: batch.parentIds,
      geneId: batch.traitId,
      sampleSize: batch.size,
      buckets: batch.results.map(({ id, label, count, percentage }) => ({
        id,
        label,
        count,
        percentage,
      })),
    });
    this.evidenceMessage.set('');
  }

  capturePendingEvidence(): void {
    const evidence = this.pendingEvidence();
    if (!evidence) return;
    this.evidenceRepository.capture(
      this.studentId(),
      this.pathId(),
      this.lessonId(),
      evidence,
    );
    this.pendingEvidence.set(null);
    this.evidenceMessage.set('Evidence attached below for your reflection.');
    this.evidenceCaptured.emit();
  }

  recordMicroscopeEvidence(evidence: GenomeMicroscopeEvidence): void {
    const records = this.microscopeEvidenceRepository.record(this.studentId(), evidence);
    this.savedMicroscopeRecordCount.set(records.length);
  }
}
