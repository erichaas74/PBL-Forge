import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DragonPathContextId, isDragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonLessonPlanRepository } from '../../lesson-plan/dragon-lesson-plan.repository';
import { DragonEvidenceCaptureCardComponent } from '../../orchestration/dragon-evidence-capture-card.component';
import { BreedingBatchEvidenceDraft } from '../../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../../orchestration/dragon-lesson-evidence.repository';
import { DragonWorkstationHostShellComponent } from '../../orchestration/dragon-workstation-host-shell.component';
import { resolveDragonWorkstationLaunchContext } from '../../orchestration/dragon-workstation-launch-context';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { GeneticsBreedingBatch } from '../shared/genetics-program.models';
import { GeneticsProgramResolver } from '../shared/genetics-program.resolver';
import { GeneticsIncubatorComponent } from './genetics-incubator.component';

const WORKSTATION_ID = 'breeding-incubator';
const WORKSTATION_ROUTE = '/dragon-genetics/breeding-incubator';

@Component({
  selector: 'app-breeding-incubator-page',
  imports: [
    DragonWorkstationHostShellComponent,
    DragonEvidenceCaptureCardComponent,
    GeneticsIncubatorComponent,
  ],
  templateUrl: './breeding-incubator.page.html',
  styleUrl: './breeding-incubator.page.scss',
})
export class BreedingIncubatorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly programs = inject(GeneticsProgramResolver);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly context = inject(DragonWorkstationContextService);
  readonly pathId = computed<DragonPathContextId>(() => {
    const value = this.queryParams().get('path');
    return isDragonPathContextId(value) ? value : 'arena';
  });
  readonly studentId = this.context.studentId;
  readonly program = computed(() => this.programs.resolve(this.pathId()));
  readonly revealedGeneIds = computed(() =>
    Object.keys(this.context.geneticsNotebook().discoveries),
  );
  readonly launchContext = computed(() =>
    resolveDragonWorkstationLaunchContext(this.lessonPlan.document(), {
      pathId: this.queryParams().get('path'),
      lessonId: this.queryParams().get('lesson'),
      workstationId: WORKSTATION_ID,
      workstationRoute: WORKSTATION_ROUTE,
    }),
  );
  readonly pendingEvidence = signal<BreedingBatchEvidenceDraft | null>(null);
  readonly evidenceMessage = signal('');

  handleBatchSaved(batch: GeneticsBreedingBatch): void {
    if (!this.launchContext()) return;
    this.pendingEvidence.set({
      evidenceType: 'breeding-batch',
      workstationId: 'breeding-incubator',
      batchId: batch.id,
      parentIds: batch.parentIds,
      geneId: batch.geneId,
      sampleSize: batch.size,
      buckets: batch.buckets.map(({ id, label, count, percentage }) => ({
        id,
        label,
        count,
        percentage,
      })),
    });
    this.evidenceMessage.set('');
  }

  capturePendingEvidence(): void {
    const launchContext = this.launchContext();
    const evidence = this.pendingEvidence();
    if (!launchContext || !evidence) return;
    this.evidenceRepository.capture(
      this.context.studentId(),
      launchContext.pathId,
      launchContext.lessonId,
      evidence,
    );
    this.pendingEvidence.set(null);
    this.evidenceMessage.set('Evidence attached to lesson synthesis.');
  }
}
