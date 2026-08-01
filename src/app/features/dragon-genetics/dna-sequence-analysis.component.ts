import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export type DnaBase = 'A' | 'T' | 'C' | 'G';

export interface DnaAnalysisCase {
  id: string;
  sampleLabel: string;
  reference: string;
  sample: string;
  mutationType: 'substitution' | 'insertion' | 'deletion';
}

export interface DnaAnalysisResult {
  caseId: string;
  correct: boolean;
  changedPosition: number | null;
  mutationType: string | null;
  transcript: string | null;
}

export const DEFAULT_DNA_ANALYSIS_CASE: DnaAnalysisCase = {
  id: 'scale-pigment-01',
  sampleLabel: 'Dragon scale-cell sample',
  reference: 'ATGCCTGAATTT',
  sample: 'ATGCATGAATTT',
  mutationType: 'substitution',
};

export const TEST_DNA_ANALYSIS_CASE: DnaAnalysisCase = {
  id: 'test-wing-pigment-01',
  sampleLabel: 'Test case · Wing-pigment cell sample',
  reference: 'ATGCCGTAACGA',
  sample: 'ATGCTGTAACGA',
  mutationType: 'substitution',
};

@Component({
  selector: 'app-dna-sequence-analysis',
  templateUrl: './dna-sequence-analysis.component.html',
  styleUrl: './dna-sequence-analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaSequenceAnalysisComponent {
  readonly analysisCase = input<DnaAnalysisCase>(DEFAULT_DNA_ANALYSIS_CASE);
  readonly analysisCompleted = output<DnaAnalysisResult>();

  readonly selectedPosition = signal<number | null>(null);
  readonly mutationType = signal<string | null>(null);
  readonly transcript = signal<string | null>(null);
  readonly showComplement = signal(false);
  readonly showCodons = signal(false);
  readonly submitted = signal(false);

  readonly referenceBases = computed(() => this.analysisCase().reference.split(''));
  readonly sampleBases = computed(() => this.analysisCase().sample.split(''));
  readonly changedPositions = computed(() => {
    const reference = this.referenceBases();
    const sample = this.sampleBases();
    const length = Math.max(reference.length, sample.length);
    return Array.from({ length }, (_, index) => index).filter(
      (index) => reference[index] !== sample[index],
    );
  });
  readonly complement = computed(() =>
    this.sampleBases()
      .map((base) => this.complementFor(base as DnaBase))
      .join(''),
  );
  readonly correctTranscript = computed(() =>
    this.sampleBases()
      .map((base) => this.rnaFor(base as DnaBase))
      .join(''),
  );
  readonly transcriptOptions = computed(() => {
    const correct = this.correctTranscript();
    const referenceTranscript = this.analysisCase()
      .reference.split('')
      .map((base) => this.rnaFor(base as DnaBase))
      .join('');
    return [correct, this.analysisCase().sample.replaceAll('T', 'U'), referenceTranscript].filter(
      (value, index, values) => values.indexOf(value) === index,
    );
  });
  readonly positionCorrect = computed(() => {
    const selected = this.selectedPosition();
    return selected !== null && this.changedPositions().includes(selected);
  });
  readonly mutationCorrect = computed(
    () => this.mutationType() === this.analysisCase().mutationType,
  );
  readonly transcriptCorrect = computed(() => this.transcript() === this.correctTranscript());
  readonly allCorrect = computed(
    () => this.positionCorrect() && this.mutationCorrect() && this.transcriptCorrect(),
  );

  selectPosition(index: number): void {
    if (!this.submitted()) this.selectedPosition.set(index);
  }

  selectMutation(type: string): void {
    if (!this.submitted()) this.mutationType.set(type);
  }

  selectTranscript(sequence: string): void {
    if (!this.submitted()) this.transcript.set(sequence);
  }

  submit(): void {
    if (
      this.selectedPosition() === null ||
      this.mutationType() === null ||
      this.transcript() === null
    ) {
      return;
    }

    this.submitted.set(true);
    this.analysisCompleted.emit({
      caseId: this.analysisCase().id,
      correct: this.allCorrect(),
      changedPosition:
        this.selectedPosition() === null ? null : (this.selectedPosition() as number) + 1,
      mutationType: this.mutationType(),
      transcript: this.transcript(),
    });
  }

  revise(): void {
    this.submitted.set(false);
  }

  baseAt(sequence: string, index: number): string {
    return sequence[index] ?? '—';
  }

  private complementFor(base: DnaBase): DnaBase {
    return ({ A: 'T', T: 'A', C: 'G', G: 'C' } as const)[base];
  }

  private rnaFor(base: DnaBase): string {
    return ({ A: 'U', T: 'A', C: 'G', G: 'C' } as const)[base];
  }
}
