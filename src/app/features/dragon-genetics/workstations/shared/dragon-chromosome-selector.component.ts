import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  dragonParentCanvasSource,
  dragonParentExpressiveProfile,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import { AccountDragonRecord } from './account-genetics-library.models';
import { DragonCardChromosomeId, buildDragonCardGenomeView } from './dragon-card-genome';
import { DragonFlipCardComponent, DragonFlipCardView } from './dragon-flip-card.component';
import { DRAGON_AUTOSOME_LABELS } from './dragon-chromosome.catalog';
import { buildDragonChromosomePairs, chromosomePairViewportItems } from './dragon-chromosome-pairs';
import { FannedCardDeckComponent, FannedDeckItem } from './fanned-card-deck.component';

export interface DragonChromosomeSelection {
  dragon: AccountDragonRecord;
  chromosome: AlleleVaultGene['chromosome'];
}

export interface DragonGeneSelection extends DragonChromosomeSelection {
  geneId: AlleleVaultGene['id'];
}

/** Shared physical card deck for choosing one dragon and one chromosome pair. */
@Component({
  selector: 'app-dragon-chromosome-selector',
  imports: [FannedCardDeckComponent, DragonFlipCardComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './dragon-chromosome-selector.component.html',
  styleUrl: './dragon-chromosome-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonChromosomeSelectorComponent {
  readonly dragons = input<readonly AccountDragonRecord[]>([]);
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly initialDragonId = input<string | null>(null);
  readonly initialChromosome = input<AlleleVaultGene['chromosome']>('Chr 1');
  readonly selectedGene = input<AlleleVaultGene['id'] | null>(null);
  readonly label = input('Dragon and chromosome selector');
  readonly disabled = input(false);
  readonly compact = input(false);

  readonly dragonSelected = output<AccountDragonRecord>();
  readonly chromosomeSelected = output<DragonChromosomeSelection>();
  readonly geneSelected = output<DragonGeneSelection>();

  readonly selectedDragonId = linkedSignal(
    () => this.initialDragonId() ?? this.dragons()[0]?.id ?? null,
  );
  readonly selectedChromosomeId = linkedSignal(() => this.initialChromosome());
  readonly flippedDragonIds = signal<readonly string[]>([]);
  readonly selectedDragon = computed(
    () =>
      this.dragons().find((dragon) => dragon.id === this.selectedDragonId()) ??
      this.dragons()[0] ??
      null,
  );
  readonly cardViews = computed(
    () =>
      new Map(
        this.dragons().map((dragon) => [
          dragon.id,
          {
            id: dragon.id,
            name: dragon.name,
            title: dragon.title,
            color: dragon.color,
            accentColor: dragon.accentColor,
            source: dragonParentCanvasSource(dragon, dragon.sex),
            seriesLabel: 'GENETICS SPECIMEN',
            catalogNumber: `GEN ${dragon.generation ?? 0}`,
            arenaRating: null,
            battleRole: `${dragon.sex === 'female' ? 'Female' : 'Male'} genome · ${dragon.sex === 'female' ? 'XX' : 'XY'}`,
            stats: [],
          } satisfies DragonFlipCardView,
        ]),
      ),
  );
  readonly cardGenomeViews = computed(
    () =>
      new Map(
        this.dragons().map((dragon) => [dragon.id, buildDragonCardGenomeView(dragon, dragon.sex)]),
      ),
  );
  readonly chromosomePairs = computed(() => {
    const dragon = this.selectedDragon();
    if (!dragon) return [];
    const profile = dragonParentExpressiveProfile(dragon, dragon.sex);
    return buildDragonChromosomePairs({
      genes: this.genes(),
      alleles: this.alleles(),
      chromosomes: [...DRAGON_AUTOSOME_LABELS, 'Chr X'],
      sex: dragon.sex,
      genotypeForGene: (geneId) => profile.genome[geneId],
    });
  });
  readonly cellChromosomes = computed(() => chromosomePairViewportItems(this.chromosomePairs()));
  readonly selectedChromosome = computed(
    () =>
      this.cellChromosomes().find((item) => item.id === this.selectedChromosomeId()) ??
      this.cellChromosomes()[0] ??
      null,
  );
  readonly selectedGeneCount = computed(() => {
    const chromosome = this.selectedChromosome();
    return chromosome ? this.genes().filter((gene) => gene.chromosome === chromosome.id).length : 0;
  });
  readonly cardLabel = (item: FannedDeckItem): string =>
    this.cardViews().get(item.id)?.name ?? item.id;
  readonly cardSubtitle = (item: FannedDeckItem): string =>
    this.cardViews().get(item.id)?.battleRole ?? '';

  selectDragon(dragon: AccountDragonRecord): void {
    if (this.disabled() || !this.dragons().some((candidate) => candidate.id === dragon.id)) return;
    this.selectedDragonId.set(dragon.id);
    this.dragonSelected.emit(dragon);
  }

  toggleCard(dragonId: string): void {
    this.flippedDragonIds.update((ids) =>
      ids.includes(dragonId)
        ? ids.filter((candidate) => candidate !== dragonId)
        : [...ids, dragonId],
    );
  }

  isCardFlipped(dragonId: string): boolean {
    return this.flippedDragonIds().includes(dragonId);
  }

  selectedCardChromosome(): DragonCardChromosomeId {
    return this.selectedChromosomeId();
  }

  selectChromosome(chromosome: string): void {
    if (this.disabled()) return;
    const item = this.cellChromosomes().find((candidate) => candidate.id === chromosome);
    const dragon = this.selectedDragon();
    if (!item || !dragon) return;
    const chromosomeId = item.id as AlleleVaultGene['chromosome'];
    this.selectedChromosomeId.set(chromosomeId);
    this.chromosomeSelected.emit({ dragon, chromosome: chromosomeId });
  }

  selectGene(geneId: AlleleVaultGene['id']): void {
    if (this.disabled()) return;
    const dragon = this.selectedDragon();
    const chromosome = this.selectedChromosomeId();
    const gene = this.genes().find(
      (candidate) => candidate.id === geneId && candidate.chromosome === chromosome,
    );
    if (!dragon || !gene) return;
    this.geneSelected.emit({ dragon, chromosome, geneId });
  }
}
