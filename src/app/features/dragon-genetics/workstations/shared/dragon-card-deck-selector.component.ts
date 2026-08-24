import { Component, computed, input, output, signal } from '@angular/core';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { AccountDragonRecord } from './account-genetics-library.models';
import { buildAccountDragonCardView } from './dragon-account-card';
import {
  buildDragonCardGenomeView,
  DragonCardChromosomeId,
  DragonCardGeneReadout,
} from './dragon-card-genome';
import { DragonCardBloodType } from './dragon-flip-card.component';
import { GeneticsCardDeckComponent } from './genetics-card-deck.component';
import { GeneticsCardBundle, GeneticsSpecimen } from './genetics-program.models';

@Component({
  selector: 'app-dragon-card-deck-selector',
  imports: [GeneticsCardDeckComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-card-deck-selector.component.html',
  styleUrl: './dragon-card-deck-selector.component.scss',
})
export class DragonCardDeckSelectorComponent {
  readonly dragons = input.required<readonly AccountDragonRecord[]>();
  readonly selectedDragonId = input<string | null>(null);
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly ariaLabel = input('Dragon card deck selector');
  readonly bloodTypeByDragonId = input<
    Readonly<Partial<Record<string, DragonCardBloodType>>>
  >({});
  readonly selectedGeneId = input<DragonCardGeneReadout['id'] | null>(null);
  readonly revealedGeneIds = input<readonly string[]>([]);
  readonly selectableGeneIds = input<readonly string[] | null>(null);

  readonly dragonSelected = output<AccountDragonRecord>();
  readonly geneSelected = output<DragonCardGeneReadout['id']>();

  readonly flippedDragonId = signal<string | null>(null);
  readonly selectedCardChromosomes = signal<Readonly<Record<string, DragonCardChromosomeId>>>({});
  readonly chromosomeSelectionGeneIds = signal<Readonly<Record<string, string | null>>>({});
  readonly activeId = computed(() => {
    const dragons = this.dragons();
    const requested = this.selectedDragonId();
    return dragons.some((dragon) => dragon.id === requested) ? requested! : (dragons[0]?.id ?? '');
  });
  readonly cardViews = computed(
    () =>
      new Map(
        this.dragons().map((dragon) => [dragon.id, buildAccountDragonCardView(dragon)] as const),
      ),
  );
  readonly genomeViews = computed(
    () =>
      new Map(
        this.dragons().map(
          (dragon) => [dragon.id, buildDragonCardGenomeView(dragon, dragon.sex)] as const,
        ),
      ),
  );
  readonly cardBundles = computed<readonly GeneticsCardBundle[]>(() =>
    this.dragons().map((dragon) => ({
      id: dragon.id,
      specimen: {
        id: dragon.id,
        name: dragon.name,
        title: dragon.title,
        sex: dragon.sex,
        generation: dragon.generation ?? 0,
        genome: dragon.genome,
        renderSource: this.cardViews().get(dragon.id)?.source ?? null,
      },
      card: this.cardViews().get(dragon.id)!,
      genome: this.genomeViews().get(dragon.id)!,
      footerLeft: dragon.source === 'foundation' ? 'Foundation dragon' : 'Student dragon',
      bloodType: this.bloodTypeByDragonId()[dragon.id] ?? null,
    })),
  );

  readonly isActiveFlipped = computed(() => this.flippedDragonId() === this.activeId());

  readonly labelFor = (dragon: AccountDragonRecord): string => dragon.name;
  readonly subtitleFor = (dragon: AccountDragonRecord): string => dragon.title;

  selectDragon(dragon: AccountDragonRecord): void {
    if (this.disabled()) return;
    this.flippedDragonId.set(null);
    this.dragonSelected.emit(dragon);
  }

  selectSpecimen(specimen: GeneticsSpecimen): void {
    const dragon = this.dragons().find((candidate) => candidate.id === specimen.id);
    if (dragon) this.selectDragon(dragon);
  }

  toggleCard(dragonId: string): void {
    if (this.disabled() || dragonId !== this.activeId()) return;
    this.flippedDragonId.update((current) => (current === dragonId ? null : dragonId));
  }

  selectedChromosome(dragonId: string): DragonCardChromosomeId {
    const selectedGeneId = this.selectedGeneId();
    const manuallySelected = this.selectedCardChromosomes()[dragonId];
    if (
      manuallySelected &&
      this.chromosomeSelectionGeneIds()[dragonId] === selectedGeneId
    ) {
      return manuallySelected;
    }
    if (selectedGeneId) {
      const genome = this.genomeViews().get(dragonId);
      for (const [chromosomeId, genes] of genome?.genesByChromosome ?? []) {
        if (genes.some((gene) => gene.id === selectedGeneId)) return chromosomeId;
      }
    }
    return this.selectedCardChromosomes()[dragonId] ?? 'Chr 1';
  }

  selectChromosome(dragonId: string, chromosomeId: string): void {
    this.selectedCardChromosomes.update((current) => ({
      ...current,
      [dragonId]: chromosomeId as DragonCardChromosomeId,
    }));
    this.chromosomeSelectionGeneIds.update((current) => ({
      ...current,
      [dragonId]: this.selectedGeneId(),
    }));
  }

  selectGene(geneId: DragonCardGeneReadout['id']): void {
    if (!this.disabled()) this.geneSelected.emit(geneId);
  }
}
