import { Component, computed, input, output, signal } from '@angular/core';
import { DragonCardGeneReadout } from './dragon-card-genome';
import { DragonFlipCardComponent } from './dragon-flip-card.component';
import { FannedCardDeckComponent } from './fanned-card-deck.component';
import { GeneticsCardBundle, GeneticsSpecimen } from './genetics-program.models';

@Component({
  selector: 'app-genetics-card-deck',
  imports: [DragonFlipCardComponent, FannedCardDeckComponent],
  templateUrl: './genetics-card-deck.component.html',
  styleUrl: './genetics-card-deck.component.scss',
})
export class GeneticsCardDeckComponent {
  readonly bundles = input.required<readonly GeneticsCardBundle[]>();
  readonly selectedSpecimenId = input<string | null>(null);
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly ariaLabel = input('Dragon card deck selector');
  readonly selectedGeneId = input<string | null>(null);
  readonly revealedGeneIds = input<readonly string[]>([]);
  readonly selectableGeneIds = input<readonly string[] | null>(null);

  readonly specimenSelected = output<GeneticsSpecimen>();
  readonly geneSelected = output<DragonCardGeneReadout['id']>();
  readonly chromosomeSelected = output<{ specimenId: string; chromosomeId: string }>();
  readonly flippedSpecimenId = signal<string | null>(null);
  readonly selectedChromosomes = signal<Readonly<Record<string, string>>>({});

  readonly activeId = computed(() => {
    const requested = this.selectedSpecimenId();
    const bundles = this.bundles();
    return bundles.some((bundle) => bundle.specimen.id === requested)
      ? requested!
      : (bundles[0]?.specimen.id ?? '');
  });
  readonly isActiveFlipped = computed(() => this.flippedSpecimenId() === this.activeId());
  readonly labelFor = (bundle: GeneticsCardBundle): string => bundle.specimen.name;
  readonly subtitleFor = (bundle: GeneticsCardBundle): string => bundle.specimen.title;

  selectBundle(bundle: GeneticsCardBundle): void {
    if (this.disabled()) return;
    this.flippedSpecimenId.set(null);
    this.specimenSelected.emit(bundle.specimen);
  }

  toggleCard(specimenId: string): void {
    if (this.disabled() || specimenId !== this.activeId()) return;
    this.flippedSpecimenId.update((current) => current === specimenId ? null : specimenId);
  }

  selectedChromosome(bundle: GeneticsCardBundle): string {
    const manuallySelected = this.selectedChromosomes()[bundle.specimen.id];
    if (manuallySelected) return manuallySelected;
    const selectedGene = this.selectedGeneId();
    if (selectedGene) {
      for (const [chromosomeId, genes] of bundle.genome.genesByChromosome) {
        if (genes.some((gene) => gene.id === selectedGene)) return chromosomeId;
      }
    }
    return bundle.genome.chromosomes[0]?.id ?? '';
  }

  selectChromosome(specimenId: string, chromosomeId: string): void {
    this.selectedChromosomes.update((current) => ({ ...current, [specimenId]: chromosomeId }));
    this.chromosomeSelected.emit({ specimenId, chromosomeId });
  }
}
