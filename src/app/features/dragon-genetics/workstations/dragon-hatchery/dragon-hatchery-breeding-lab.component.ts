import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  DRAGON_TRAITS,
  fertilizeLabGametes,
  genotypeLabel,
  getTrait,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { DragonHatcheryBreedingRepository } from './dragon-hatchery-breeding.repository';
import {
  DragonHatcheryBreedingSnapshot,
  HatcheryFertilizationRecord,
} from './dragon-hatchery-breeding.models';
import { DragonHatcheryStationComponent } from './dragon-hatchery-station.component';
import { coreGameteGenome, gameteAlleleSummary } from './meiosis-gamete.domain';
import {
  MEIOSIS_GAMETE_DRAG_TYPE,
  MeiosisRun,
  SelectedMeiosisGamete,
} from './meiosis-gamete.models';
import { MeiosisGameteSelectorComponent } from './meiosis-gamete-selector.component';

type ParentRole = 'female' | 'male';

@Component({
  selector: 'app-dragon-hatchery-breeding-lab',
  imports: [
    AccountGeneticsFileComponent,
    MeiosisGameteSelectorComponent,
    DragonHatcheryStationComponent,
  ],
  templateUrl: './dragon-hatchery-breeding-lab.component.html',
  styleUrl: './dragon-hatchery-breeding-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonHatcheryBreedingLabComponent {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(DragonHatcheryBreedingRepository);

  readonly studentId = input('local-student');
  readonly seed = input('dragon-hatchery');

  readonly traits = DRAGON_TRAITS;
  readonly selectedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly eggParentId = signal<string | null>(null);
  readonly spermParentId = signal<string | null>(null);
  readonly targetTraitId = signal<DragonTraitId>('scales');
  readonly activeRole = signal<ParentRole>('female');
  readonly eggSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly spermSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly femaleRun = signal<MeiosisRun | null>(null);
  readonly maleRun = signal<MeiosisRun | null>(null);
  readonly fertilizations = signal<readonly HatcheryFertilizationRecord[]>([]);
  readonly clutch = signal<readonly DragonOffspring[]>([]);
  readonly statusMessage = signal('Choose a dragon record, then load it into a parent chamber.');

  readonly account = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly eggParent = computed(() => this.findDragon(this.eggParentId()));
  readonly spermParent = computed(() => this.findDragon(this.spermParentId()));
  readonly parentsReady = computed(() => Boolean(this.eggParent() && this.spermParent()));
  readonly selectedDragon = computed(() => {
    const record = this.selectedAccountRecord();
    return record?.kind === 'dragon' ? record : null;
  });
  readonly targetTrait = computed(() => getTrait(this.targetTraitId()));
  readonly targetPossible = computed(() => {
    const eggParent = this.eggParent();
    const spermParent = this.spermParent();
    const target = this.targetTrait();
    if (!eggParent || !spermParent) return false;
    return (
      eggParent.genome[target.id].includes(target.recessiveAllele) &&
      spermParent.genome[target.id].includes(target.recessiveAllele)
    );
  });
  readonly selectedPair = computed<readonly [DragonParentProfile, DragonParentProfile] | null>(() => {
    const eggParent = this.eggParent();
    const spermParent = this.spermParent();
    return eggParent && spermParent ? [eggParent, spermParent] : null;
  });
  readonly canFertilize = computed(() => Boolean(this.eggSelection() && this.spermSelection()));
  readonly activeParent = computed(() =>
    this.activeRole() === 'female' ? this.eggParent() : this.spermParent(),
  );

  constructor() {
    effect(() => this.restore(this.studentId()));
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.selectedAccountRecord.set(record);
    this.statusMessage.set(
      record.kind === 'dragon'
        ? `${record.name} is ready. Choose the egg-parent or sperm-parent chamber.`
        : `${record.dragonName}'s ${record.chromosome} record can be examined here, but meiosis starts from the whole dragon.`,
    );
  }

  loadSelectedParent(role: ParentRole): void {
    const dragon = this.selectedDragon();
    if (!dragon) {
      this.statusMessage.set('Select a whole dragon record from the account file first.');
      return;
    }
    this.assignParent(role, dragon);
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dropParent(role: ParentRole, event: DragEvent): void {
    event.preventDefault();
    const value = event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE);
    if (!value) return;
    const payload = parseAccountGeneticsDragPayload(value);
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (record?.kind !== 'dragon') {
      this.statusMessage.set('A parent chamber accepts a whole dragon record, not one chromosome.');
      return;
    }
    this.selectedAccountRecord.set(record);
    this.assignParent(role, record);
  }

  setTarget(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DragonTraitId;
    if (!DRAGON_TRAITS.some((trait) => trait.id === value)) return;
    this.targetTraitId.set(value);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.activeRole.set('female');
    this.statusMessage.set('The target changed. Run both parent cells again for this allele hunt.');
    this.persist();
  }

  selectGamete(role: ParentRole, selection: SelectedMeiosisGamete): void {
    if (role === 'female') {
      this.eggSelection.set(selection);
      this.activeRole.set('male');
      this.statusMessage.set('Egg gamete secured. Run the sperm parent’s meiosis next.');
    } else {
      this.spermSelection.set(selection);
      this.statusMessage.set('Sperm gamete secured. The fertilization chamber is ready.');
    }
    this.persist();
  }

  captureRun(role: ParentRole, run: MeiosisRun): void {
    if (role === 'female') this.femaleRun.set(run);
    else this.maleRun.set(run);
  }

  dropGamete(role: ParentRole, event: DragEvent): void {
    event.preventDefault();
    const id = event.dataTransfer?.getData(MEIOSIS_GAMETE_DRAG_TYPE);
    const run = role === 'female' ? this.femaleRun() : this.maleRun();
    const gamete = run?.gametes.find((candidate) => candidate.id === id);
    if (!run || !gamete) return;
    this.selectGamete(role, {
      run,
      gamete,
      reason: '',
      selectedAtIso: new Date().toISOString(),
    });
  }

  fertilize(): void {
    const eggParent = this.eggParent();
    const spermParent = this.spermParent();
    const eggSelection = this.eggSelection();
    const spermSelection = this.spermSelection();
    if (!eggParent || !spermParent || !eggSelection || !spermSelection) return;

    const sequence = this.clutch().length + 1;
    const stamp = Date.now();
    const recordId = `fertilization-${stamp}-${sequence}`;
    const offspringId = `selected-clutch-${stamp}-${sequence}`;
    const offspring = fertilizeLabGametes(
      eggParent,
      spermParent,
      coreGameteGenome(eggSelection.gamete),
      coreGameteGenome(spermSelection.gamete),
      offspringId,
      1,
      `Hatchling ${sequence}`,
      sequence,
    );
    const record: HatcheryFertilizationRecord = {
      id: recordId,
      eggParentId: eggParent.id,
      spermParentId: spermParent.id,
      targetTraitId: this.targetTraitId(),
      eggSelection,
      spermSelection,
      offspringId,
      offspringGenome: offspring.genome,
      createdAtIso: new Date(stamp).toISOString(),
    };
    this.clutch.update((current) => [...current, offspring]);
    this.fertilizations.update((current) => [...current, record]);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.activeRole.set('female');
    this.statusMessage.set(
      `Egg ${sequence} was fertilized from the two selected gametes and moved to the Hatchery.`,
    );
    this.persist();
  }

  newFamily(): void {
    this.eggParentId.set(null);
    this.spermParentId.set(null);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.femaleRun.set(null);
    this.maleRun.set(null);
    this.fertilizations.set([]);
    this.clutch.set([]);
    this.activeRole.set('female');
    this.statusMessage.set('Choose two dragons for a new family.');
    this.persist();
  }

  parentGenotype(parent: DragonParentProfile): string {
    return genotypeLabel(parent.genome[this.targetTraitId()]);
  }

  selectionSummary(selection: SelectedMeiosisGamete | null): string {
    return selection ? gameteAlleleSummary(selection.gamete) : 'Drop or send a gamete here';
  }

  private assignParent(role: ParentRole, dragon: AccountDragonRecord): void {
    if (this.clutch().length) {
      this.statusMessage.set('Start a new family before changing parents for this clutch.');
      return;
    }
    const otherId = role === 'female' ? this.spermParentId() : this.eggParentId();
    if (otherId === dragon.id) {
      this.statusMessage.set('Choose two different account dragons for this family.');
      return;
    }
    if (role === 'female') this.eggParentId.set(dragon.id);
    else this.spermParentId.set(dragon.id);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.activeRole.set('female');
    this.statusMessage.set(`${dragon.name} loaded as the ${role === 'female' ? 'egg' : 'sperm'} parent.`);
    this.persist();
  }

  private restore(studentId: string): void {
    const snapshot = this.repository.load(studentId);
    this.eggParentId.set(snapshot.eggParentId);
    this.spermParentId.set(snapshot.spermParentId);
    this.targetTraitId.set(snapshot.targetTraitId);
    this.eggSelection.set(snapshot.pendingEggSelection);
    this.spermSelection.set(snapshot.pendingSpermSelection);
    this.fertilizations.set(snapshot.fertilizations);
    this.clutch.set(this.restoreClutch(snapshot.fertilizations));
    this.activeRole.set(snapshot.pendingEggSelection ? 'male' : 'female');
  }

  private restoreClutch(
    records: readonly HatcheryFertilizationRecord[],
  ): readonly DragonOffspring[] {
    return records.flatMap((record, index) => {
      const eggParent = this.findDragon(record.eggParentId);
      const spermParent = this.findDragon(record.spermParentId);
      if (!eggParent || !spermParent) return [];
      try {
        return [
          fertilizeLabGametes(
            eggParent,
            spermParent,
            coreGameteGenome(record.eggSelection.gamete),
            coreGameteGenome(record.spermSelection.gamete),
            record.offspringId,
            1,
            `Hatchling ${index + 1}`,
            index + 1,
          ),
        ];
      } catch {
        return [];
      }
    });
  }

  private persist(): void {
    const snapshot: DragonHatcheryBreedingSnapshot = {
      schemaVersion: 1,
      studentId: this.studentId().trim() || 'local-student',
      eggParentId: this.eggParentId(),
      spermParentId: this.spermParentId(),
      targetTraitId: this.targetTraitId(),
      pendingEggSelection: this.eggSelection(),
      pendingSpermSelection: this.spermSelection(),
      fertilizations: this.fertilizations(),
    };
    this.repository.save(snapshot);
  }

  private findDragon(id: string | null): AccountDragonRecord | null {
    if (!id) return null;
    return this.account().dragons.find((dragon) => dragon.id === id) ?? null;
  }
}
