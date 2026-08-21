import { Component, computed, input, output } from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenThumbComponent } from '../../../../shared/assembly/preview/specimen-thumb.component';
import { CellModelComponent } from './cell-model.component';
import {
  DragonCardChromosomeId,
  DragonCardGeneReadout,
  DragonCardGenomeView,
} from './dragon-card-genome';

export interface DragonFlipCardStat {
  id: string;
  label: string;
  value: number;
}

export type DragonCardBloodType = 'A' | 'B' | 'AB' | 'O';

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
  imports: [SpecimenThumbComponent, CellModelComponent],
  templateUrl: './dragon-flip-card.component.html',
  styleUrl: './dragon-flip-card.component.scss',
})
export class DragonFlipCardComponent {
  readonly card = input.required<DragonFlipCardView>();
  readonly genome = input.required<DragonCardGenomeView>();
  readonly selectedChromosome = input<DragonCardChromosomeId>('Chr 1');
  readonly selectedGene = input<DragonCardGeneReadout['id'] | null>(null);
  readonly flipped = input(false);
  readonly active = input(true);
  readonly renderPortrait = input(true);
  readonly footerLeft = input('');
  readonly footerRight = input('');
  readonly bloodType = input<DragonCardBloodType | null>(null);

  readonly bloodTypeLabel = computed(() =>
    this.bloodType() ? `Blood type ${this.bloodType()}` : 'Blood type not tested',
  );

  readonly flipRequested = output<void>();
  readonly chromosomeSelected = output<string>();
  readonly geneSelected = output<DragonCardGeneReadout['id']>();

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

  selectGene(geneId: DragonCardGeneReadout['id']): void {
    if (this.active()) this.geneSelected.emit(geneId);
  }
}
