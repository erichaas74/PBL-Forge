import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CellModelChromosome, CellModelComponent } from './cell-model.component';
import { ChromosomeSvgComponent } from './chromosome-svg.component';

export type CellChromosomeViewportLayout = 'overview' | 'inspect' | 'thumbnail';
export type ChromosomeForm = 'single' | 'replicated';

/**
 * Presentation data only. Scientific geometry and loci remain in ChromosomeSvgModel,
 * and the cell itself is drawn by the shared `app-cell-model`.
 */
export type CellChromosomeViewportItem = CellModelChromosome;

export interface CellChromosomeLocusSelection {
  chromosomeId: string;
  locus: string;
}

@Component({
  selector: 'app-cell-chromosome-viewport',
  imports: [CellModelComponent, ChromosomeSvgComponent],
  templateUrl: './cell-chromosome-viewport.component.html',
  styleUrl: './cell-chromosome-viewport.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellChromosomeViewportComponent {
  readonly chromosomes = input<readonly CellChromosomeViewportItem[]>([]);
  readonly selectedChromosome = input<string | null>(null);
  readonly selectable = input(true);
  readonly showLoci = input(true);
  readonly locusSelectable = input(false);
  readonly selectedLocus = input<string | null>(null);
  readonly layout = input<CellChromosomeViewportLayout>('overview');
  readonly ariaLabel = input('Cell chromosome viewport');
  readonly allowReplicatedView = input(false);
  /**
   * Whether an unset selection falls back to the first chromosome. Turn it off
   * for a surface that should open with nothing chosen and no detail shown.
   */
  readonly autoSelectFirst = input(true);

  readonly chromosomeForm = signal<ChromosomeForm>('single');

  readonly chromosomeSelected = output<string>();
  readonly locusSelected = output<CellChromosomeLocusSelection>();

  readonly resolvedSelectedChromosome = computed<string | null>(() => {
    const selected = this.selectedChromosome();
    if (selected) return selected;
    if (this.layout() === 'thumbnail' || !this.autoSelectFirst()) return null;
    return this.chromosomes()[0]?.id ?? null;
  });
  readonly selectedItem = computed(
    () =>
      this.chromosomes().find((item) => item.id === this.resolvedSelectedChromosome()) ?? null,
  );
  readonly replicated = computed(() => this.chromosomeForm() === 'replicated');

  isSelected(item: CellChromosomeViewportItem): boolean {
    return item.id === this.resolvedSelectedChromosome();
  }

  displayShortLabel(item: CellChromosomeViewportItem): string {
    return item.shortLabel ?? item.label.replace(/^Chr\s*/i, '');
  }

  selectChromosome(chromosomeId: string): void {
    if (this.selectable()) this.chromosomeSelected.emit(chromosomeId);
  }

  setChromosomeForm(form: ChromosomeForm): void {
    this.chromosomeForm.set(form);
  }

  selectLocus(chromosomeId: string, locus: string): void {
    if (!this.selectable() || !this.locusSelectable()) return;
    this.locusSelected.emit({ chromosomeId, locus });
  }
}
