import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { CellModelComponent } from './cell-model.component';
import { DragonCardChromosomeId, DragonCardGenomeView } from './dragon-card-genome';

export interface DragonFlipCardStat {
  id: string;
  label: string;
  value: number;
}

export interface DragonFlipCardView {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  source: SpecimenSource;
  seriesLabel: string;
  catalogNumber: string;
  arenaRating: number | null;
  battleRole: string;
  stats: readonly DragonFlipCardStat[];
}

@Component({
  selector: 'app-dragon-flip-card',
  imports: [SpecimenViewportComponent, CellModelComponent],
  templateUrl: './dragon-flip-card.component.html',
  styleUrl: './dragon-flip-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonFlipCardComponent {
  readonly card = input.required<DragonFlipCardView>();
  readonly genome = input.required<DragonCardGenomeView>();
  readonly selectedChromosome = input<DragonCardChromosomeId>('Chr 1');
  readonly flipped = input(false);
  readonly active = input(true);
  readonly renderLive = input(true);
  readonly footerLeft = input('');
  readonly footerRight = input('');

  readonly flipRequested = output<void>();
  readonly chromosomeSelected = output<string>();

  readonly selectedPairLabel = computed(() => {
    const chromosomeId = this.selectedChromosome();
    return (
      this.genome().chromosomes.find((chromosome) => chromosome.id === chromosomeId)?.label ??
      chromosomeId
    );
  });
  readonly selectedGenes = computed(
    () => this.genome().genesByChromosome.get(this.selectedChromosome()) ?? [],
  );

  requestFlip(): void {
    if (this.active()) this.flipRequested.emit();
  }

  selectChromosome(chromosomeId: string): void {
    if (this.active()) this.chromosomeSelected.emit(chromosomeId);
  }
}
