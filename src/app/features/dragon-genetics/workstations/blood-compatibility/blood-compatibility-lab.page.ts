/**
 * Runtime status: ACTIVE — explicit Blood Compatibility open-lab and case workstation route.
 * Inputs/signals: path/lesson/branch query params and emitted blood-test evidence drafts.
 * Data access: workstation identity plus browser-local lesson evidence storage.
 * Connects to: BloodCompatibilityLabComponent, evidence capture card, and Dragon in the Ash case.
 */
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DRAGON_CASE_BY_ID, isDragonCaseId } from '../../cases/dragon-case.registry';
import { isDragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { DragonEvidenceCaptureCardComponent } from '../../orchestration/dragon-evidence-capture-card.component';
import { BloodTestEvidenceDraft } from '../../orchestration/dragon-lesson-evidence.models';
import { DragonLessonEvidenceRepository } from '../../orchestration/dragon-lesson-evidence.repository';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { BloodCompatibilityLabComponent } from './blood-compatibility-lab.component';
import { DragonJourneyNavigationService } from '../../journey/dragon-journey-navigation.service';
import { BloodTestObservation } from './blood-compatibility.models';

/** Full-screen app host for the portable Dragon Blood Type Compatibility workstation. */
@Component({
  selector: 'app-blood-compatibility-lab-page',
  imports: [RouterLink, BloodCompatibilityLabComponent, DragonEvidenceCaptureCardComponent],
  templateUrl: './blood-compatibility-lab.page.html',
  styleUrl: './blood-compatibility-lab.page.scss',
})
export class BloodCompatibilityLabPage {
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
    return definition.workstation.id === 'blood-type-lab' &&
      definition.anchorLessonId === lessonId && definition.pathIds.includes(pathId)
      ? { definition, pathId, lessonId }
      : null;
  });
  readonly workstationExitUrl = computed(() => {
    const branch = this.branchCase();
    return branch
      ? `/dragon-genetics/path/${branch.pathId}/lesson/${branch.lessonId}/branch/${branch.definition.id}`
      : this.fallbackExitUrl();
  });
  readonly pendingEvidence = signal<BloodTestEvidenceDraft | null>(null);
  readonly evidenceMessage = signal('');

  handleEvidenceObserved(observation: BloodTestObservation): void {
    if (!this.branchCase()) return;
    this.pendingEvidence.set({
      evidenceType: 'blood-test',
      workstationId: 'blood-type-lab',
      specimenId: observation.specimen.id,
      sampleCode: observation.specimen.sampleCode,
      dragonId: observation.specimen.dragonId,
      dragonName: observation.specimen.dragonName,
      specimenRole: observation.specimenRole,
      phenotypeId: observation.phenotype.id,
      phenotypeName: observation.phenotype.name,
      antiA: observation.evidence.antiA!,
      antiB: observation.evidence.antiB!,
      antiD: observation.evidence.antiD!,
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
    this.evidenceMessage.set('Blood evidence attached to the Rockfall case.');
  }
}
