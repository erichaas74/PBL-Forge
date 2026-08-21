import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  DEFAULT_DNA_ANALYSIS_CASE,
  DnaAlignmentColumn,
  DnaAnalysisCase,
  DnaBase,
  DnaDifferenceKind,
  DnaEvidenceResult,
  DnaLabTool,
  DnaMutationAction,
  DnaRepairAction,
  DnaSequenceChanged,
} from './dna-process.models';
import { DRAGON_DNA_BASE_COLORS } from '../shared/dragon-gene-dna.catalog';

interface DifferenceCounts {
  substitutions: number;
  insertions: number;
  deletions: number;
}

interface AnimationCell {
  base: DnaBase | null;
  focus: boolean;
}

interface DnaAnimationSnapshot {
  kind: DnaMutationAction | 'repair';
  label: string;
  position: number;
  beforeBase: DnaBase | null;
  afterBase: DnaBase | null;
  cells: readonly AnimationCell[];
}

@Component({
  selector: 'app-dna-sequence-analysis',
  templateUrl: './dna-sequence-analysis.component.html',
  styleUrl: './dna-sequence-analysis.component.scss',
})
export class DnaSequenceAnalysisComponent {
  readonly baseColors = DRAGON_DNA_BASE_COLORS;
  readonly analysisCase = input<DnaAnalysisCase>(DEFAULT_DNA_ANALYSIS_CASE);
  readonly evidenceCompleted = output<DnaEvidenceResult>();
  readonly sequenceChanged = output<DnaSequenceChanged>();

  readonly mode = signal<DnaLabTool>('compare');
  readonly workingSample = signal(DEFAULT_DNA_ANALYSIS_CASE.sample);
  readonly selectedColumn = signal<number | null>(null);
  readonly mutationAction = signal<DnaMutationAction>('substitution');
  readonly repairAction = signal<DnaRepairAction>('replace');
  readonly selectedBase = signal<DnaBase>('A');
  readonly animationSnapshot = signal<DnaAnimationSnapshot | null>(null);
  readonly animationPlaying = signal(false);
  readonly bases = ['A', 'T', 'C', 'G'] as const;

  private activeCaseId = '';
  private animationStartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef = inject(DestroyRef);

  readonly alignment = computed(() =>
    alignDnaSequences(this.analysisCase().reference, this.workingSample()),
  );
  readonly differenceColumns = computed(() =>
    this.alignment()
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => column.kind !== 'match'),
  );
  readonly changedPositions = computed(() => this.differenceColumns().map(({ index }) => index));
  readonly selectedAlignment = computed(() => {
    const index = this.selectedColumn();
    return index === null ? null : (this.alignment()[index] ?? null);
  });
  readonly differenceCounts = computed<DifferenceCounts>(() => {
    const columns = this.differenceColumns();
    return {
      substitutions: columns.filter(({ column }) => column.kind === 'substitution').length,
      insertions: columns.filter(({ column }) => column.kind === 'insertion').length,
      deletions: columns.filter(({ column }) => column.kind === 'deletion').length,
    };
  });
  readonly differenceCount = computed(() => this.differenceColumns().length);
  readonly matchingBaseCount = computed(
    () => this.alignment().filter((column) => column.kind === 'match').length,
  );
  readonly similarity = computed(() => {
    const total = this.alignment().length;
    return total === 0 ? 100 : Math.round((this.matchingBaseCount() / total) * 100);
  });
  readonly selectedDifferenceOrdinal = computed(() => {
    const selected = this.selectedColumn();
    return this.differenceColumns().findIndex(({ index }) => index === selected);
  });
  readonly canApplyMutation = computed(() => {
    const column = this.selectedAlignment();
    if (!column) return false;
    return this.mutationAction() === 'insertion' || column.comparisonIndex !== null;
  });
  readonly canApplyRepair = computed(() => {
    const column = this.selectedAlignment();
    if (!column) return false;
    return this.repairAction() === 'insert' || column.comparisonIndex !== null;
  });

  constructor() {
    effect(() => {
      const analysis = this.analysisCase();
      if (analysis.id === this.activeCaseId) return;
      this.activeCaseId = analysis.id;
      const alignment = alignDnaSequences(analysis.reference, analysis.sample);
      const firstDifference = alignment.findIndex((column) => column.kind !== 'match');
      const initialColumn = firstDifference >= 0 ? firstDifference : alignment.length ? 0 : null;
      untracked(() => {
        this.workingSample.set(analysis.sample);
        this.mode.set('compare');
        this.selectedColumn.set(initialColumn);
        this.animationPlaying.set(false);
        this.animationSnapshot.set(
          initialColumn === null
            ? null
            : snapshotForColumn(alignment[initialColumn], initialColumn, analysis.reference),
        );
      });
    });

    this.destroyRef.onDestroy(() => this.clearAnimationTimers());
  }

  selectMode(mode: DnaLabTool): void {
    this.mode.set(mode);
    if (mode === 'repair' && this.selectedAlignment()?.kind === 'deletion') {
      this.repairAction.set('insert');
    } else if (mode === 'repair' && this.selectedAlignment()?.kind === 'insertion') {
      this.repairAction.set('remove');
    }
  }

  selectColumn(index: number): void {
    this.selectedColumn.set(index);
    this.animationPlaying.set(false);
    const column = this.alignment()[index];
    if (column) {
      this.animationSnapshot.set(snapshotForColumn(column, index, this.analysisCase().reference));
      if (this.mode() === 'repair') this.suggestRepairFor(column);
    }
  }

  moveToDifference(direction: -1 | 1): void {
    const differences = this.differenceColumns();
    if (!differences.length) return;
    const current = this.selectedDifferenceOrdinal();
    const next = current < 0 ? 0 : (current + direction + differences.length) % differences.length;
    this.selectColumn(differences[next].index);
  }

  chooseMutationAction(action: DnaMutationAction): void {
    this.mutationAction.set(action);
  }

  chooseRepairAction(action: DnaRepairAction): void {
    this.repairAction.set(action);
  }

  chooseBase(base: DnaBase): void {
    this.selectedBase.set(base);
  }

  recordComparison(): void {
    this.evidenceCompleted.emit({
      caseId: this.analysisCase().id,
      tool: 'compare',
      observation: this.comparisonSummary(),
      differenceCount: this.differenceCount(),
    });
  }

  replayDifference(): void {
    const index = this.selectedColumn();
    const column = this.selectedAlignment();
    if (index === null || !column) return;
    this.playAnimation(snapshotForColumn(column, index, this.analysisCase().reference));
  }

  applyMutation(): void {
    const column = this.selectedAlignment();
    const selectedIndex = this.selectedColumn();
    if (!column || selectedIndex === null || !this.canApplyMutation()) return;

    const action = this.mutationAction();
    const beforeSequence = this.workingSample();
    const sequence = beforeSequence.split('') as DnaBase[];
    const beforeCount = this.differenceCount();
    let position = column.comparisonIndex ?? sequence.length;
    let beforeBase: DnaBase | null = null;
    let afterBase: DnaBase | null = null;

    if (action === 'substitution' && column.comparisonIndex !== null) {
      position = column.comparisonIndex;
      beforeBase = sequence[position] ?? null;
      afterBase = this.selectedBase();
      sequence[position] = afterBase;
    } else if (action === 'insertion') {
      position = column.comparisonIndex ?? sequence.length;
      afterBase = this.selectedBase();
      sequence.splice(position, 0, afterBase);
    } else if (action === 'deletion' && column.comparisonIndex !== null) {
      position = column.comparisonIndex;
      beforeBase = sequence[position] ?? null;
      sequence.splice(position, 1);
    }

    this.commitSequence(
      sequence.join(''),
      'mutation',
      `${capitalize(action)} at comparison base ${position + 1}: ${displayBase(beforeBase)} → ${displayBase(afterBase)} · ${beforeCount} → ${this.pendingDifferenceCount(sequence.join(''))} differences`,
    );
    this.playAnimation(
      buildAnimationSnapshot(
        action,
        `${capitalize(action)} mutation`,
        beforeSequence,
        position,
        beforeBase,
        afterBase,
      ),
    );
    this.selectNearestColumn(selectedIndex);
  }

  applyRepair(): void {
    const column = this.selectedAlignment();
    const selectedIndex = this.selectedColumn();
    if (!column || selectedIndex === null || !this.canApplyRepair()) return;

    const action = this.repairAction();
    const beforeSequence = this.workingSample();
    const sequence = beforeSequence.split('') as DnaBase[];
    const beforeCount = this.differenceCount();
    let position = column.comparisonIndex ?? sequence.length;
    let beforeBase: DnaBase | null = null;
    let afterBase: DnaBase | null = null;

    if (action === 'replace' && column.comparisonIndex !== null) {
      position = column.comparisonIndex;
      beforeBase = sequence[position] ?? null;
      afterBase = this.selectedBase();
      sequence[position] = afterBase;
    } else if (action === 'insert') {
      position = insertionIndexFor(column, this.alignment(), selectedIndex, sequence.length);
      afterBase = this.selectedBase();
      sequence.splice(position, 0, afterBase);
    } else if (action === 'remove' && column.comparisonIndex !== null) {
      position = column.comparisonIndex;
      beforeBase = sequence[position] ?? null;
      sequence.splice(position, 1);
    }

    this.commitSequence(
      sequence.join(''),
      'repair',
      `${repairLabel(action)} at comparison base ${position + 1}: ${beforeCount} → ${this.pendingDifferenceCount(sequence.join(''))} differences`,
    );
    this.playAnimation(
      buildAnimationSnapshot(
        'repair',
        `${repairLabel(action)} repair`,
        beforeSequence,
        position,
        beforeBase,
        afterBase,
      ),
    );
    this.selectNearestColumn(selectedIndex);
  }

  resetComparison(): void {
    const original = this.analysisCase().sample;
    this.workingSample.set(original);
    this.animationPlaying.set(false);
    this.sequenceChanged.emit({ caseId: this.analysisCase().id, sequence: original });
    const firstDifference =
      this.differenceColumns()[0]?.index ?? (this.alignment().length ? 0 : null);
    this.selectedColumn.set(firstDifference);
    if (firstDifference !== null) {
      this.animationSnapshot.set(
        snapshotForColumn(
          this.alignment()[firstDifference],
          firstDifference,
          this.analysisCase().reference,
        ),
      );
    }
  }

  differenceSymbol(kind: DnaDifferenceKind): string {
    return ({ match: '·', substitution: 'S', insertion: '+', deletion: '−' } as const)[kind];
  }

  baseLabel(base: DnaBase | null): string {
    return displayBase(base);
  }

  complementBase(base: DnaBase | null): DnaBase | null {
    if (!base) return null;
    return ({ A: 'T', T: 'A', C: 'G', G: 'C' } as const)[base];
  }

  columnLabel(column: DnaAlignmentColumn, index: number): string {
    return `Aligned position ${index + 1}: reference ${displayBase(column.referenceBase)}, comparison ${displayBase(column.comparisonBase)}, ${column.kind}`;
  }

  private comparisonSummary(): string {
    const counts = this.differenceCounts();
    return `${this.similarity()}% match · ${counts.substitutions} substitutions · ${counts.insertions} insertions · ${counts.deletions} deletions`;
  }

  private pendingDifferenceCount(sequence: string): number {
    return alignDnaSequences(this.analysisCase().reference, sequence).filter(
      (column) => column.kind !== 'match',
    ).length;
  }

  private commitSequence(sequence: string, tool: 'mutation' | 'repair', observation: string): void {
    this.workingSample.set(sequence);
    this.sequenceChanged.emit({ caseId: this.analysisCase().id, sequence });
    this.evidenceCompleted.emit({
      caseId: this.analysisCase().id,
      tool,
      observation,
      differenceCount: this.differenceCount(),
    });
  }

  private selectNearestColumn(preferredIndex: number): void {
    const alignment = this.alignment();
    if (!alignment.length) {
      this.selectedColumn.set(null);
      return;
    }
    this.selectedColumn.set(Math.min(preferredIndex, alignment.length - 1));
  }

  private suggestRepairFor(column: DnaAlignmentColumn): void {
    if (column.kind === 'deletion') {
      this.repairAction.set('insert');
      if (column.referenceBase) this.selectedBase.set(column.referenceBase);
    } else if (column.kind === 'insertion') {
      this.repairAction.set('remove');
    } else if (column.kind === 'substitution') {
      this.repairAction.set('replace');
    }
  }

  private playAnimation(snapshot: DnaAnimationSnapshot): void {
    this.clearAnimationTimers();
    this.animationPlaying.set(false);
    this.animationSnapshot.set(snapshot);
    this.animationStartTimer = setTimeout(() => this.animationPlaying.set(true), 0);
  }

  private clearAnimationTimers(): void {
    if (this.animationStartTimer) clearTimeout(this.animationStartTimer);
    this.animationStartTimer = null;
  }
}

export function alignDnaSequences(reference: string, comparison: string): DnaAlignmentColumn[] {
  const referenceBases = reference.split('') as DnaBase[];
  const comparisonBases = comparison.split('') as DnaBase[];
  const rows = referenceBases.length + 1;
  const columns = comparisonBases.length + 1;
  const distance = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let i = 0; i < rows; i += 1) distance[i][0] = i;
  for (let j = 0; j < columns; j += 1) distance[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      const substitutionCost = referenceBases[i - 1] === comparisonBases[j - 1] ? 0 : 1;
      distance[i][j] = Math.min(
        distance[i - 1][j - 1] + substitutionCost,
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
      );
    }
  }

  const aligned: DnaAlignmentColumn[] = [];
  let i = referenceBases.length;
  let j = comparisonBases.length;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      distance[i][j] ===
        distance[i - 1][j - 1] + (referenceBases[i - 1] === comparisonBases[j - 1] ? 0 : 1)
    ) {
      const referenceBase = referenceBases[i - 1];
      const comparisonBase = comparisonBases[j - 1];
      aligned.push({
        referenceBase,
        comparisonBase,
        referenceIndex: i - 1,
        comparisonIndex: j - 1,
        kind: referenceBase === comparisonBase ? 'match' : 'substitution',
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && distance[i][j] === distance[i - 1][j] + 1) {
      aligned.push({
        referenceBase: referenceBases[i - 1],
        comparisonBase: null,
        referenceIndex: i - 1,
        comparisonIndex: null,
        kind: 'deletion',
      });
      i -= 1;
    } else {
      aligned.push({
        referenceBase: null,
        comparisonBase: comparisonBases[j - 1],
        referenceIndex: null,
        comparisonIndex: j - 1,
        kind: 'insertion',
      });
      j -= 1;
    }
  }
  return aligned.reverse();
}

function snapshotForColumn(
  column: DnaAlignmentColumn,
  alignedIndex: number,
  reference: string,
): DnaAnimationSnapshot {
  const kind = column.kind === 'match' ? 'substitution' : column.kind;
  const position = column.referenceIndex ?? column.comparisonIndex ?? alignedIndex;
  return buildAnimationSnapshot(
    kind,
    column.kind === 'match' ? 'Matching base pair' : `${capitalize(column.kind)} difference`,
    reference,
    position,
    column.referenceBase,
    column.comparisonBase,
  );
}

function buildAnimationSnapshot(
  kind: DnaMutationAction | 'repair',
  label: string,
  contextSequence: string,
  position: number,
  beforeBase: DnaBase | null,
  afterBase: DnaBase | null,
): DnaAnimationSnapshot {
  const context = contextSequence.split('') as DnaBase[];
  const cells = Array.from({ length: 5 }, (_, offset): AnimationCell => {
    const relative = offset - 2;
    const contextIndex = position + relative;
    return {
      base: relative === 0 ? beforeBase : (context[contextIndex] ?? null),
      focus: relative === 0,
    };
  });
  return { kind, label, position: position + 1, beforeBase, afterBase, cells };
}

function insertionIndexFor(
  column: DnaAlignmentColumn,
  alignment: readonly DnaAlignmentColumn[],
  selectedIndex: number,
  fallback: number,
): number {
  if (column.comparisonIndex !== null) return column.comparisonIndex;
  const nextComparison = alignment
    .slice(selectedIndex + 1)
    .find((candidate) => candidate.comparisonIndex !== null)?.comparisonIndex;
  return nextComparison ?? fallback;
}

function displayBase(base: DnaBase | null): string {
  return base ?? 'gap';
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function repairLabel(action: DnaRepairAction): string {
  return (
    {
      replace: 'Base replacement',
      insert: 'Missing-base insertion',
      remove: 'Extra-base excision',
    } as const
  )[action];
}
