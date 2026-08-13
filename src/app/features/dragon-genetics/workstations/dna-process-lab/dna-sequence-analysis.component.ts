import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

export type DnaBase = 'A' | 'T' | 'C' | 'G';
export type DnaEvidenceTool = 'align' | 'pair' | 'copy' | 'rna' | 'mutation' | 'repair';

export interface DnaEvidenceResult {
  caseId: string;
  tool: DnaEvidenceTool;
  observation: string;
  supported: boolean;
}

export interface DnaAnalysisCase {
  id: string;
  sampleLabel: string;
  chromosomeLabel?: string;
  geneLabel?: string;
  locusLabel?: string;
  referenceSampleLabel?: string;
  comparisonSampleLabel?: string;
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
  readonly activeTool = input<DnaEvidenceTool>('align');
  readonly analysisCompleted = output<DnaAnalysisResult>();
  readonly evidenceCompleted = output<DnaEvidenceResult>();

  readonly selectedPosition = signal<number | null>(null);
  readonly mutationType = signal<string | null>(null);
  readonly transcript = signal<string | null>(null);
  readonly showComplement = signal(false);
  readonly showCodons = signal(false);
  readonly submitted = signal(false);
  readonly selectedComplement = signal<string | null>(null);
  readonly selectedCopyCount = signal<number | null>(null);
  readonly selectedRepairBase = signal<string | null>(null);
  readonly lastSupported = signal<boolean | null>(null);
  readonly bases = ['A', 'T', 'C', 'G'] as const;

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

  constructor() {
    effect(() => {
      this.analysisCase();
      untracked(() => {
        this.selectedPosition.set(null);
        this.mutationType.set(null);
        this.transcript.set(null);
        this.showComplement.set(false);
        this.showCodons.set(false);
        this.submitted.set(false);
        this.selectedComplement.set(null);
        this.selectedCopyCount.set(null);
        this.selectedRepairBase.set(null);
        this.lastSupported.set(null);
      });
    });
    effect(() => {
      this.activeTool();
      untracked(() => this.lastSupported.set(null));
    });
  }

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

  testPosition(): void {
    const position = this.selectedPosition();
    if (position === null) return;
    this.emitEvidence(
      'align',
      `Position ${position + 1}`,
      this.changedPositions().includes(position),
    );
  }

  testComplement(sequence: string): void {
    this.selectedComplement.set(sequence);
    this.emitEvidence('pair', sequence, sequence === this.complement());
  }

  testCopyCount(count: number): void {
    this.selectedCopyCount.set(count);
    this.emitEvidence('copy', `${count} DNA product${count === 1 ? '' : 's'}`, count === 2);
  }

  testMutationType(type: string): void {
    this.selectMutation(type);
    this.emitEvidence('mutation', type, type === this.analysisCase().mutationType);
  }

  testTranscript(sequence: string): void {
    this.selectTranscript(sequence);
    this.emitEvidence('rna', sequence, sequence === this.correctTranscript());
  }

  testRepairBase(base: string): void {
    this.selectedRepairBase.set(base);
    const position = this.selectedPosition();
    const supported = position !== null && base === this.referenceBases()[position];
    this.emitEvidence('repair', position === null ? base : `${base} at ${position + 1}`, supported);
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

  private emitEvidence(tool: DnaEvidenceTool, observation: string, supported: boolean): void {
    this.lastSupported.set(supported);
    this.evidenceCompleted.emit({ caseId: this.analysisCase().id, tool, observation, supported });
  }
}
