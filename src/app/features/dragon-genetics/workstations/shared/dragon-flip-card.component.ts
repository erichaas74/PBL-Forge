import { Component, DestroyRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenThumbComponent } from '../../../../shared/assembly/preview/specimen-thumb.component';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { AssemblyAbilityId } from '../../../../shared/assembly/combat/assembly-abilities';
import { DRAGON_CARD_IDLE } from '../../../../shared/assembly/preview/specimen-stance';
import { CellModelComponent } from './cell-model.component';
import {
  DragonCardChromosomeId,
  DragonCardGeneReadout,
  DragonCardGenomeView,
} from './dragon-card-genome';

export interface DragonFlipCardStat {
  id: string;
  label: string;
  value: string | number;
}

export type DragonCardBloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface DragonFlipCardView {
  id: string;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  source: SpecimenSource | null;
  seriesLabel: string;
  catalogNumber: string;
  arenaRating: number | null;
  battleRole: string;
  stats: readonly DragonFlipCardStat[];
}

@Component({
  selector: 'app-dragon-flip-card',
  imports: [SpecimenThumbComponent, SpecimenViewportComponent, CellModelComponent],
  templateUrl: './dragon-flip-card.component.html',
  styleUrl: './dragon-flip-card.component.scss',
})
export class DragonFlipCardComponent {
  readonly cardIdleMotion = DRAGON_CARD_IDLE;
  readonly cardShowcaseAbilities: readonly AssemblyAbilityId[] = ['bite', 'claw-rake'];
  readonly card = input.required<DragonFlipCardView>();
  readonly genome = input.required<DragonCardGenomeView>();
  readonly selectedChromosome = input<DragonCardChromosomeId>('Chr 1');
  readonly selectedGene = input<DragonCardGeneReadout['id'] | null>(null);
  readonly flipped = input(false);
  readonly active = input(true);
  readonly renderPortrait = input(true);
  /** Uses the live idle renderer for the active card; background cards stay baked. */
  readonly animatedPortrait = input(true);
  /** Lets heavy workstations paint their controls before mounting the live portrait renderer. */
  readonly deferAnimatedPortrait = input(false);
  readonly footerLeft = input('');
  readonly footerRight = input('');
  readonly bloodType = input<DragonCardBloodType | null>(null);
  readonly revealedGeneIds = input<readonly string[]>([]);
  /** Null means every catalog gene is available; workstations may expose a supported subset. */
  readonly selectableGeneIds = input<readonly string[] | null>(null);
  /** Hidden when the surrounding deck provides its own flip control. */
  readonly showFlipControl = input(true);
  readonly flipTestId = input<string | null>(null);

  readonly bloodTypeLabel = computed(() =>
    this.bloodType() ? `Blood type ${this.bloodType()}` : 'Blood type not tested',
  );

  readonly flipRequested = output<void>();
  readonly chromosomeSelected = output<string>();
  readonly geneSelected = output<DragonCardGeneReadout['id']>();
  readonly animatedPortraitReady = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedGenes = computed(
    () => this.genome().genesByChromosome.get(this.selectedChromosome()) ?? [],
  );

  constructor() {
    afterNextRender(() => {
      const revealPortrait = () => {
        if (!this.destroyRef.destroyed) this.animatedPortraitReady.set(true);
      };
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(revealPortrait, { timeout: 1500 });
      } else {
        window.setTimeout(revealPortrait, 250);
      }
    });
  }

  requestFlip(): void {
    if (this.active()) this.flipRequested.emit();
  }

  selectChromosome(chromosomeId: string): void {
    if (this.active()) this.chromosomeSelected.emit(chromosomeId);
  }

  selectGene(geneId: DragonCardGeneReadout['id']): void {
    if (this.active()) this.geneSelected.emit(geneId);
  }

  isGeneRevealed(geneId: string): boolean {
    return this.revealedGeneIds().includes(geneId);
  }

  isGeneSelectable(geneId: string): boolean {
    const selectable = this.selectableGeneIds();
    return !selectable || selectable.includes(geneId);
  }

  geneReferenceLabel(gene: DragonCardGeneReadout): string {
    if (!this.isGeneSelectable(gene.id)) {
      return `${gene.sampleCode}. This gene is not available in this workstation.`;
    }
    return this.isGeneRevealed(gene.id)
      ? `Select ${gene.sampleCode}. Gene ${gene.name}. Phenotype: ${gene.phenotype}.`
      : `Select ${gene.sampleCode}. Gene unknown. Phenotype unknown.`;
  }
}
