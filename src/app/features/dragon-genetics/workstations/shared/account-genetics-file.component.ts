import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import {
  DRAGON_TRAITS,
  genotypeLabel,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  accountGeneticsDragPayload,
} from './account-genetics-library.models';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';
import { accountDragonPerformance, dragonGeneration } from './dragon-account-card';
import { DragonCardDeckSelectorComponent } from './dragon-card-deck-selector.component';

@Component({
  selector: 'app-account-genetics-file',
  imports: [DragonCardDeckSelectorComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './account-genetics-file.component.html',
  styleUrl: './account-genetics-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountGeneticsFileComponent {
  private readonly library = inject(AccountGeneticsLibraryService);

  readonly studentId = input.required<string>();
  readonly selectedRecordId = input<string | null>(null);
  readonly dragonsOnly = input(false);
  readonly compact = input(false);
  readonly initiallyOpen = input(false);
  readonly disabled = input(false);
  readonly label = input<string | null>(null);
  readonly sexFilter = input<DragonSex | null>(null);
  readonly eligibleDragonIds = input<readonly string[] | null>(null);
  readonly recordSelected = output<AccountGeneticsRecord>();

  readonly open = linkedSignal(() => this.initiallyOpen());
  readonly tab = linkedSignal<AccountGeneticsRecord['kind']>(() => 'dragon');
  readonly inspectedRecordId = linkedSignal<string | null>(() => this.selectedRecordId());
  readonly snapshot = computed(() => this.library.recordsFor(this.studentId()));
  readonly visibleRecords = computed<readonly AccountGeneticsRecord[]>(() => {
    if (!this.dragonsOnly() && this.tab() === 'chromosome') return this.snapshot().chromosomes;

    const eligibleIds = this.eligibleDragonIds();
    const sex = this.sexFilter();
    return this.snapshot().dragons.filter(
      (dragon) => (!sex || dragon.sex === sex) && (!eligibleIds || eligibleIds.includes(dragon.id)),
    );
  });
  readonly visibleDragons = computed<readonly AccountDragonRecord[]>(() =>
    this.visibleRecords().filter(
      (record): record is AccountDragonRecord => record.kind === 'dragon',
    ),
  );
  readonly activeDragonId = computed(() => {
    const dragons = this.visibleDragons();
    const inspectedId = this.inspectedRecordId();
    if (inspectedId && dragons.some((dragon) => dragon.id === inspectedId)) return inspectedId;
    const selectedId = this.selectedRecordId();
    if (selectedId && dragons.some((dragon) => dragon.id === selectedId)) return selectedId;
    return dragons[0]?.id ?? '';
  });
  readonly activeDeckDragon = computed(
    () =>
      this.visibleDragons().find((dragon) => dragon.id === this.activeDragonId()) ??
      this.visibleDragons()[0] ??
      null,
  );
  readonly inspectedRecord = computed(() => {
    const id = this.inspectedRecordId();
    return id ? (this.visibleRecords().find((record) => record.id === id) ?? null) : null;
  });
  readonly inspectedDragon = computed(() => {
    const record = this.inspectedRecord();
    return record?.kind === 'dragon'
      ? record
      : this.tab() === 'dragon'
        ? this.activeDeckDragon()
        : null;
  });
  readonly activeRecord = computed(() => {
    const id = this.selectedRecordId();
    if (!id) return null;
    return (
      this.snapshot().dragons.find((record) => record.id === id) ??
      this.snapshot().chromosomes.find((record) => record.id === id) ??
      null
    );
  });
  readonly inventoryLabel = computed(
    () =>
      this.label() ??
      (this.sexFilter()
        ? `${this.sexFilter() === 'female' ? 'Female' : 'Male'} dragon inventory`
        : this.dragonsOnly()
          ? 'Dragon inventory'
          : 'Genetics inventory'),
  );
  readonly traitReadouts = computed(() => {
    const dragon = this.inspectedDragon();
    if (!dragon) return [];
    return DRAGON_TRAITS.map((trait) => ({
      id: trait.id,
      name: trait.name,
      genotype: genotypeLabel(dragon.genome[trait.id]),
      phenotype: showsDominantPhenotype(dragon.genome[trait.id], trait.id)
        ? trait.dominantPhenotype
        : trait.recessivePhenotype,
    }));
  });
  readonly performance = computed(() => {
    const dragon = this.inspectedDragon();
    return dragon ? accountDragonPerformance(dragon) : null;
  });

  selectDeckDragon(dragon: AccountDragonRecord): void {
    if (this.disabled()) return;
    this.inspectedRecordId.set(dragon.id);
  }

  inspect(record: AccountGeneticsRecord): void {
    if (!this.disabled()) this.inspectedRecordId.set(record.id);
  }

  use(record: AccountGeneticsRecord): void {
    if (!this.disabled()) this.recordSelected.emit(record);
  }

  startDrag(event: DragEvent, record: AccountGeneticsRecord): void {
    if (this.disabled() || this.selectedRecordId() !== record.id) {
      event.preventDefault();
      return;
    }
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
      JSON.stringify(accountGeneticsDragPayload(record)),
    );
    event.dataTransfer.setData('text/plain', `${record.kind}:${record.id}`);
  }

  recordTitle(record: AccountGeneticsRecord): string {
    return record.kind === 'dragon' ? record.name : `${record.dragonName} · ${record.chromosome}`;
  }

  recordDetail(record: AccountGeneticsRecord): string {
    return record.kind === 'dragon'
      ? `${record.sex === 'female' ? 'Female' : 'Male'} · ${record.title}`
      : `${record.traitName} · ${record.alleles.join('/')}`;
  }

  dragonGeneration(dragon: AccountDragonRecord): string {
    return dragonGeneration(dragon);
  }
}
