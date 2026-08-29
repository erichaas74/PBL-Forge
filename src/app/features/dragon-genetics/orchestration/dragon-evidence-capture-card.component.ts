/**
 * Runtime status: ACTIVE — reusable confirmation UI for attaching workstation evidence.
 * Inputs/signals: evidence draft, title/detail/message inputs; attach/discard outputs notify the page.
 * Data access: none directly; owning route containers call the evidence repository.
 * Connects to: allele, breeding, blood, and protein route containers and shared lessons/cases.
 */
import { Component, computed, input, output } from '@angular/core';
import { DragonLessonEvidenceDraft } from './dragon-lesson-evidence.models';

@Component({
  selector: 'app-dragon-evidence-capture-card',
  templateUrl: './dragon-evidence-capture-card.component.html',
  styleUrl: './dragon-evidence-capture-card.component.scss',
})
export class DragonEvidenceCaptureCardComponent {
  readonly evidence = input.required<DragonLessonEvidenceDraft>();
  readonly capture = output<void>();
  readonly dismiss = output<void>();
  readonly summary = computed(() => {
    const evidence = this.evidence();
    if (evidence.evidenceType === 'allele-expression') {
      return `${evidence.genotype} → ${evidence.phenotype}`;
    }
    if (evidence.evidenceType === 'blood-test') {
      return `${evidence.sampleCode} · ${evidence.phenotypeName} · ${evidence.specimenRole}`;
    }
    if (evidence.evidenceType === 'protein-rescue') {
      return `${evidence.patientName} · ${evidence.claimedGenotype} · ${evidence.digestionTrials.length} food trial${evidence.digestionTrials.length === 1 ? '' : 's'}`;
    }
    return `${evidence.sampleSize} offspring · ${evidence.buckets
      .map((bucket) => `${bucket.count} ${bucket.label}`)
      .join(' · ')}`;
  });

  readonly prompt = computed(() =>
    ['blood-test', 'protein-rescue'].includes(this.evidence().evidenceType)
      ? 'Attach this scientific record to the current case?'
      : 'Attach this result to your lesson synthesis?',
  );
}
