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
    return evidence.evidenceType === 'allele-expression'
      ? `${evidence.genotype} → ${evidence.phenotype}`
      : `${evidence.sampleSize} offspring · ${evidence.buckets
          .map((bucket) => `${bucket.count} ${bucket.label}`)
          .join(' · ')}`;
  });
}
