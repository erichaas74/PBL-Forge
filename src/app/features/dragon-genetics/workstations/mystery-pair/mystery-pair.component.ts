import { Component, QueryList, ViewChildren, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { mysteryPairInvestigation } from './mystery-pair.content';
import {
  MysteryPairClassification,
  MysteryPairComparison,
  MysteryPairNotebookEntry,
} from './mystery-pair.models';
import { MysteryPairRepository } from './mystery-pair.repository';

interface MysteryNotebookFormModel {
  observation: string;
  classification: MysteryPairClassification;
  evidence: string;
}

@Component({
  selector: 'app-mystery-pair',
  imports: [FormField, SpecimenViewportComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './mystery-pair.component.html',
  styleUrl: './mystery-pair.component.scss',
})
export class MysteryPairComponent {
  readonly studentId = input.required<string>();
  readonly pathId = input.required<DragonPathContextId>();

  @ViewChildren(SpecimenViewportComponent) private viewports?: QueryList<SpecimenViewportComponent>;

  private readonly repository = inject(MysteryPairRepository);
  readonly investigation = computed(() => mysteryPairInvestigation(this.pathId()));
  readonly snapshot = computed(() => this.repository.load(this.studentId(), this.pathId()));
  readonly revision = signal(0);
  readonly activeComparisonId = signal<string | null>(null);
  private readonly notebookModel = signal<MysteryNotebookFormModel>({
    observation: '',
    classification: 'genetic',
    evidence: '',
  });
  readonly notebookForm = form(this.notebookModel, (notebook) => {
    required(notebook.observation, { message: 'Describe the observed difference.' });
    required(notebook.evidence, { message: 'Name evidence for the claim.' });
  });
  readonly runningComparisonId = signal<string | null>(null);

  readonly activeComparison = computed(() => {
    this.revision();
    return this.investigation().comparisons.find((item) => item.id === this.activeComparisonId()) ?? null;
  });
  readonly notebookEntries = computed(() => {
    this.revision();
    return this.repository.load(this.studentId(), this.pathId()).entries;
  });

  isOpen(specimenId: string): boolean {
    this.revision();
    return this.repository.load(this.studentId(), this.pathId()).openedSpecimenIds.includes(specimenId);
  }

  openCard(specimenId: string): void {
    const snapshot = this.repository.load(this.studentId(), this.pathId());
    if (snapshot.openedSpecimenIds.includes(specimenId)) return;
    this.persist({ ...snapshot, openedSpecimenIds: [...snapshot.openedSpecimenIds, specimenId] });
  }

  selectComparison(comparison: MysteryPairComparison): void {
    this.activeComparisonId.set(comparison.id);
    const entry = this.notebookEntries().find((item) => item.comparisonId === comparison.id);
    this.notebookModel.set({
      observation: entry?.observation ?? '',
      classification: entry?.classification ?? 'genetic',
      evidence: entry?.evidence ?? '',
    });
    this.markTested(comparison.id);
  }

  async runComparison(comparison: MysteryPairComparison): Promise<void> {
    this.selectComparison(comparison);
    if (!comparison.motion || this.runningComparisonId()) return;
    this.runningComparisonId.set(comparison.id);
    try {
      const [first, second] = this.investigation().specimens;
      if (comparison.respondingSpecimenId === first.id) await this.viewportFor(first.id)?.playMotion(comparison.motion);
      if (comparison.respondingSpecimenId === second.id) await this.viewportFor(second.id)?.playMotion(comparison.motion);
    } finally {
      this.runningComparisonId.set(null);
    }
  }

  saveEntry(): void {
    const comparison = this.activeComparison();
    const formValue = this.notebookModel();
    const observation = formValue.observation.trim();
    const evidence = formValue.evidence.trim();
    if (!comparison || !this.notebookForm().valid()) return;
    const snapshot = this.repository.load(this.studentId(), this.pathId());
    const entry: MysteryPairNotebookEntry = {
      id: `${this.pathId()}:${comparison.id}`,
      comparisonId: comparison.id,
      observation,
      classification: formValue.classification,
      evidence,
      updatedAtIso: new Date().toISOString(),
    };
    const entries = snapshot.entries.some((item) => item.id === entry.id)
      ? snapshot.entries.map((item) => item.id === entry.id ? entry : item)
      : [...snapshot.entries, entry];
    this.persist({ ...snapshot, entries });
  }

  comparisonLabel(comparisonId: string): string {
    return this.investigation().comparisons.find((item) => item.id === comparisonId)?.label ?? comparisonId;
  }

  editEntry(comparisonId: string): void {
    const comparison = this.investigation().comparisons.find((item) => item.id === comparisonId);
    if (comparison) this.selectComparison(comparison);
  }

  private viewportFor(specimenId: string): SpecimenViewportComponent | undefined {
    const opened = this.investigation().specimens.filter((specimen) => this.isOpen(specimen.id));
    return this.viewports?.get(opened.findIndex((specimen) => specimen.id === specimenId));
  }

  private markTested(comparisonId: string): void {
    const snapshot = this.repository.load(this.studentId(), this.pathId());
    if (snapshot.testedComparisonIds.includes(comparisonId)) return;
    this.persist({ ...snapshot, testedComparisonIds: [...snapshot.testedComparisonIds, comparisonId] });
  }

  private persist(snapshot: ReturnType<MysteryPairRepository['load']>): void {
    this.repository.save({ ...snapshot, updatedAtIso: new Date().toISOString() });
    this.revision.update((value) => value + 1);
  }
}
