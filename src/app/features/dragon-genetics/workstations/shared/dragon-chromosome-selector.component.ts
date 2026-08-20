import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
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
import { CellModelComponent } from './cell-model.component';
import { DRAGON_AUTOSOME_LABELS } from './dragon-chromosome.catalog';
import { buildDragonChromosomePairs, chromosomePairViewportItems } from './dragon-chromosome-pairs';

export interface DragonChromosomeSelection {
  dragon: AccountDragonRecord;
  chromosome: AlleleVaultGene['chromosome'];
}

/**
 * Workstation-neutral specimen picker. It keeps dragon identity, the complete
 * homologous chromosome set, and chromosome selection on one shared surface.
 */
@Component({
  selector: 'app-dragon-chromosome-selector',
  imports: [SpecimenViewportComponent, CellModelComponent],
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
  readonly label = input('Dragon and chromosome selector');
  readonly disabled = input(false);

  readonly dragonSelected = output<AccountDragonRecord>();
  readonly chromosomeSelected = output<DragonChromosomeSelection>();

  readonly selectedDragonId = linkedSignal(
    () => this.initialDragonId() ?? this.dragons()[0]?.id ?? null,
  );
  readonly selectedChromosomeId = linkedSignal(() => this.initialChromosome());
  readonly selectedDragon = computed(
    () =>
      this.dragons().find((dragon) => dragon.id === this.selectedDragonId()) ??
      this.dragons()[0] ??
      null,
  );
  readonly specimenSource = computed<SpecimenSource | null>(() => {
    const dragon = this.selectedDragon();
    return dragon ? dragonParentCanvasSource(dragon, dragon.sex) : null;
  });
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

  selectDragon(dragon: AccountDragonRecord): void {
    if (this.disabled() || !this.dragons().some((candidate) => candidate.id === dragon.id)) return;
    this.selectedDragonId.set(dragon.id);
    this.dragonSelected.emit(dragon);
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
}
