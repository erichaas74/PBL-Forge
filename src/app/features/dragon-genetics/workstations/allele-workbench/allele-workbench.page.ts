import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { DragonLessonPlanRepository } from '../../lesson-plan/dragon-lesson-plan.repository';
import { DragonEvidenceCaptureCardComponent } from '../../orchestration/dragon-evidence-capture-card.component';
import { DragonLessonEvidenceRepository } from '../../orchestration/dragon-lesson-evidence.repository';
import { AlleleExpressionEvidenceDraft } from '../../orchestration/dragon-lesson-evidence.models';
import { DragonWorkstationHostShellComponent } from '../../orchestration/dragon-workstation-host-shell.component';
import { resolveDragonWorkstationLaunchContext } from '../../orchestration/dragon-workstation-launch-context';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { AlleleVaultWorkbenchComponent } from './allele-vault-workbench.component';
import { AlleleClaimFeedback, AlleleWorkbenchInteraction } from './allele-vault.models';

const WORKSTATION_ID = 'allele-workbench';
const WORKSTATION_ROUTE = '/dragon-genetics/allele-workbench';

@Component({
  selector: 'app-allele-workbench-page',
  imports: [
    DragonWorkstationHostShellComponent,
    DragonEvidenceCaptureCardComponent,
    AlleleVaultWorkbenchComponent,
  ],
  templateUrl: './allele-workbench.page.html',
  styleUrl: './allele-workbench.page.scss',
})
export class AlleleWorkbenchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  readonly context = inject(DragonWorkstationContextService);
  readonly claimFeedback = signal<AlleleClaimFeedback | null>(null);
  readonly pendingEvidence = signal<AlleleExpressionEvidenceDraft | null>(null);
  readonly evidenceMessage = signal('');
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly launchContext = computed(() =>
    resolveDragonWorkstationLaunchContext(this.lessonPlan.document(), {
      pathId: this.queryParams().get('path'),
      lessonId: this.queryParams().get('lesson'),
      workstationId: WORKSTATION_ID,
      workstationRoute: WORKSTATION_ROUTE,
    }),
  );

  handleInteraction(event: AlleleWorkbenchInteraction): void {
    if (event.type === 'dna-analysis-requested' && event.pairIds) {
      void this.router.navigate(['/dragon-genetics/dna-process-lab'], {
        queryParams: {
          path: this.launchContext()?.pathId,
          lesson: this.launchContext()?.lessonId,
          gene: event.geneId,
          sampleA: event.pairIds[0],
          sampleB: event.pairIds[1],
        },
      });
      return;
    }
    if (event.type === 'expression-run' && event.pairIds && event.phenotype) {
      this.adaptiveStore.recordAlleleExperiment(event.geneId, event.pairIds, event.phenotype);
      if (this.launchContext()) {
        this.pendingEvidence.set({
          evidenceType: 'allele-expression',
          workstationId: 'allele-workbench',
          geneId: event.geneId,
          pairIds: event.pairIds,
          genotype: event.genotype ?? event.pairIds.join(' × '),
          phenotype: event.phenotype,
        });
        this.evidenceMessage.set('');
      }
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
