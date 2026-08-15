import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import {
  DRAGON_TRAITS,
  genotypeLabel,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import {
  createDragonBenchBuild,
  dragonParentCanvasSource,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  accountGeneticsDragPayload,
} from './account-genetics-library.models';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';

@Component({
  selector: 'app-account-genetics-file',
  imports: [SpecimenViewportComponent],
  providers: [provideDragonSpecimenProfile()],
  templateUrl: './account-genetics-file.component.html',
  styleUrl: './account-genetics-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountGeneticsFileComponent {
  private readonly library = inject(AccountGeneticsLibraryService);

  readonly studentId = input('local-student');
  readonly selectedRecordId = input<string | null>(null);
  readonly dragonsOnly = input(false);
  readonly compact = input(false);
  readonly disabled = input(false);
  readonly label = input<string | null>(null);
  readonly sexFilter = input<DragonSex | null>(null);
  readonly eligibleDragonIds = input<readonly string[] | null>(null);
  readonly recordSelected = output<AccountGeneticsRecord>();

  readonly open = signal(false);
  readonly tab = signal<AccountGeneticsRecord['kind']>('dragon');
  readonly inspectedRecordId = signal<string | null>(null);
  readonly snapshot = computed(() => this.library.recordsFor(this.studentId()));
  readonly visibleRecords = computed<readonly AccountGeneticsRecord[]>(() => {
    if (!this.dragonsOnly() && this.tab() === 'chromosome') return this.snapshot().chromosomes;

    const eligibleIds = this.eligibleDragonIds();
    const sex = this.sexFilter();
    return this.snapshot().dragons.filter(
      (dragon) =>
        (!sex || dragon.sex === sex) &&
        (!eligibleIds || eligibleIds.includes(dragon.id)),
    );
  });
  readonly inspectedRecord = computed(() => {
    const id = this.inspectedRecordId();
    return id ? this.visibleRecords().find((record) => record.id === id) ?? null : null;
  });
  readonly inspectedDragon = computed(() => {
    const record = this.inspectedRecord();
    return record?.kind === 'dragon' ? record : null;
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
  readonly specimenSource = computed(() => {
    const dragon = this.inspectedDragon();
    return dragon ? dragonParentCanvasSource(dragon, dragon.sex) : null;
  });
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
    if (!dragon) return null;
    const build = createDragonBenchBuild(dragon.id, dragon.genome, {
      label: dragon.name,
      generation: dragon.generation ?? 0,
      identity: { color: dragon.color, accentColor: dragon.accentColor },
    });
    const parts = Object.values(build.combatProfile.parts);
    const abilities = new Set(build.combatProfile.abilityIds);
    if (build.fireBreathing) abilities.add('fire-breath');
    return {
      health: parts.reduce((total, part) => total + part.maxHealth, 0),
      armor: Math.round(
        (parts.reduce((total, part) => total + part.armor, 0) / Math.max(parts.length, 1)) * 100,
      ),
      abilities: [...abilities].map((ability) => this.abilityLabel(ability)),
    };
  });

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
    return `Generation ${dragon.generation ?? (dragon.source === 'foundation' ? 0 : 1)}`;
  }

  private abilityLabel(value: string): string {
    return value
      .split('-')
      .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
