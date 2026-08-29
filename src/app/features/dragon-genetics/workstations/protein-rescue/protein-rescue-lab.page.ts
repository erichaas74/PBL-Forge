/**
 * Runtime status: ACTIVE — explicit Protein Rescue open-lab and case workstation route.
 * Inputs/signals: path/lesson/branch query params and emitted molecular-rescue evidence drafts.
 * Data access: workstation identity plus browser-local lesson evidence and rescue repositories.
 * Connects to: ProteinRescueLabComponent, evidence capture card, and Food That Steals Fire case.
 */
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { DRAGON_CASE_BY_ID, isDragonCaseId } from '../../cases/dragon-case.registry';
import { isDragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonEvidenceCaptureCardComponent } from '../../orchestration/dragon-evidence-capture-card.component';
import { ProteinRescueEvidenceDraft } from '../../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../../orchestration/dragon-lesson-evidence.repository';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { ProteinRescueLabComponent } from './protein-rescue-lab.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { ProteinRescueCaseRecord } from './protein-rescue.models';

/** Full-screen app host for the portable Protein Synthesis and Dragon Diet Rescue workstation. */
@Component({
  selector: 'app-protein-rescue-lab-page',
  imports: [RouterLink, ProteinRescueLabComponent, DragonEvidenceCaptureCardComponent],
  templateUrl: './protein-rescue-lab.page.html',
  styleUrl: './protein-rescue-lab.page.scss',
})
export class ProteinRescueLabPage {
  private readonly context = inject(DragonWorkstationContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly evidenceRepository = inject(DragonLessonEvidenceRepository);
  private readonly fallbackExitUrl = inject(DragonJourneyNavigationService).workstationExitUrl;
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly studentId = this.context.studentId;
  readonly branchCase = computed(() => {
    const caseId = this.queryParams().get('branch');
    const pathId = this.queryParams().get('path');
    const lessonId = this.queryParams().get('lesson');
    if (!isDragonCaseId(caseId) || !isDragonPathContextId(pathId)) return null;
    const definition = DRAGON_CASE_BY_ID[caseId];
    return definition.workstation.id === 'protein-rescue' &&
      definition.anchorLessonId === lessonId &&
      definition.pathIds.includes(pathId)
      ? { definition, pathId, lessonId }
      : null;
  });
  readonly workstationExitUrl = computed(() => {
    const branch = this.branchCase();
    return branch
      ? `/dragon-genetics/path/${branch.pathId}/lesson/${branch.lessonId}/branch/${branch.definition.id}`
      : this.fallbackExitUrl();
  });
  readonly pendingEvidence = signal<ProteinRescueEvidenceDraft | null>(null);
  readonly evidenceMessage = signal('');

  handleRecordSaved(record: ProteinRescueCaseRecord): void {
    if (!this.branchCase()) return;
    this.pendingEvidence.set({
      evidenceType: 'protein-rescue',
      workstationId: 'protein-rescue',
      recordId: record.id,
      patientId: record.patientId,
      patientName: record.patientName,
      sampleEvidence: record.sampleEvidence,
      digestionTrials: record.digestionTrials,
      claimedGenotype: record.claimedGenotype,
      recommendedFoodIds: record.recommendedFoodIds,
      explanation: record.explanation,
    });
    this.evidenceMessage.set('');
  }

  capturePendingEvidence(): void {
    const branch = this.branchCase();
    const evidence = this.pendingEvidence();
    if (!branch || !evidence) return;
    this.evidenceRepository.capture(
      this.studentId(),
      branch.pathId,
      branch.lessonId,
      evidence,
      branch.definition.id,
    );
    this.pendingEvidence.set(null);
    this.evidenceMessage.set('Molecular Rescue Record attached to the Wasting Clutch case.');
  }
}
