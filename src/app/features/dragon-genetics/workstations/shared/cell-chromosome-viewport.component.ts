import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from './chromosome-svg.component';

export type CellChromosomeViewportLayout = 'overview' | 'inspect' | 'thumbnail';

/** Presentation data only. Scientific geometry and loci remain in ChromosomeSvgModel. */
export interface CellChromosomeViewportItem {
  id: string;
  label: string;
  shortLabel?: string;
  model: ChromosomeSvgModel;
  recombinant?: boolean;
}

export interface CellChromosomeLocusSelection {
  chromosomeId: string;
  locus: string;
}

@Component({
  selector: 'app-cell-chromosome-viewport',
  imports: [ChromosomeSvgComponent],
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

  readonly chromosomeSelected = output<string>();
  readonly locusSelected = output<CellChromosomeLocusSelection>();

  readonly resolvedSelectedChromosome = computed<string | null>(
    () =>
      this.selectedChromosome() ??
      (this.layout() === 'thumbnail' ? null : (this.chromosomes()[0]?.id ?? null)),
  );
  readonly selectedItem = computed(
    () =>
      this.chromosomes().find((item) => item.id === this.resolvedSelectedChromosome()) ??
      this.chromosomes()[0] ??
      null,
  );

  isSelected(item: CellChromosomeViewportItem): boolean {
    return item.id === this.resolvedSelectedChromosome();
  }

  displayShortLabel(item: CellChromosomeViewportItem): string {
    return item.shortLabel ?? item.label.replace(/^Chr\s*/i, '');
  }

  selectChromosome(chromosomeId: string): void {
    if (this.selectable()) this.chromosomeSelected.emit(chromosomeId);
  }

  selectLocus(chromosomeId: string, locus: string): void {
    if (!this.selectable() || !this.locusSelectable()) return;
    this.locusSelected.emit({ chromosomeId, locus });
  }

  chromosomeAriaLabel(item: CellChromosomeViewportItem): string {
    const state = this.isSelected(item) ? ', selected' : '';
    const recombinant = item.recombinant ? ', recombinant' : '';
    return `${item.label}${recombinant}${state}`;
  }
}
