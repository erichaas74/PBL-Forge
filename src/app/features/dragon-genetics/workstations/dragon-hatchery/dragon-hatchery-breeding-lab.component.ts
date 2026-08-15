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
  fertilizeLabGametes,
  genotypeLabel,
  getTrait,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import { normalizeWorkstationStudentId } from '../shared/dragon-workstation-context.models';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountDragonRecord,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
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
    MeiosisGameteSelectorComponent,
    DragonHatcheryStationComponent,
    AccountGeneticsFileComponent,
  ],
  templateUrl: './dragon-hatchery-breeding-lab.component.html',
  styleUrl: './dragon-hatchery-breeding-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonHatcheryBreedingLabComponent {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(DragonHatcheryBreedingRepository);

  readonly studentId = input.required<string>();
  readonly seed = input('dragon-hatchery');

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
  readonly statusMessage = signal('Choose one female dragon and one male dragon for this family.');

  readonly account = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly eggParent = computed(() => this.findDragon(this.eggParentId()));
  readonly spermParent = computed(() => this.findDragon(this.spermParentId()));
  readonly parentsReady = computed(() => Boolean(this.eggParent() && this.spermParent()));
  readonly targetTrait = computed(() => getTrait(this.targetTraitId()));
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

  selectParent(role: ParentRole, dragon: AccountDragonRecord): void {
    this.assignParent(role, dragon);
  }

  selectInventoryParent(role: ParentRole, record: AccountGeneticsRecord): void {
    if (record.kind === 'dragon') this.assignParent(role, record);
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
    this.assignParent(role, record);
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
    const createdAtIso = new Date(stamp).toISOString();
    const record: HatcheryFertilizationRecord = {
      id: recordId,
      eggParentId: eggParent.id,
      spermParentId: spermParent.id,
      targetTraitId: this.targetTraitId(),
      eggSelection,
      spermSelection,
      offspringId,
      offspringGenome: offspring.genome,
      createdAtIso,
    };
    this.accountLibrary.saveDragon(this.studentId(), this.inventoryRecordFor(offspring, record));
    this.clutch.update((current) => [...current, offspring]);
    this.fertilizations.update((current) => [...current, record]);
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.activeRole.set('female');
    this.statusMessage.set(`Egg ${sequence} was fertilized and saved to your Dragon inventory.`);
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
    if (dragon.sex !== role) {
      this.statusMessage.set(
        `Choose a ${role} dragon for the ${role === 'female' ? 'egg' : 'sperm'} parent.`,
      );
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
    const eggParent = this.findDragon(snapshot.eggParentId);
    const spermParent = this.findDragon(snapshot.spermParentId);
    this.eggParentId.set(eggParent?.sex === 'female' ? eggParent.id : null);
    this.spermParentId.set(spermParent?.sex === 'male' ? spermParent.id : null);
    this.targetTraitId.set(snapshot.targetTraitId);
    this.eggSelection.set(eggParent?.sex === 'female' ? snapshot.pendingEggSelection : null);
    this.spermSelection.set(spermParent?.sex === 'male' ? snapshot.pendingSpermSelection : null);
    this.fertilizations.set(snapshot.fertilizations);
    const clutch = this.restoreClutch(snapshot.fertilizations);
    this.clutch.set(clutch);
    this.syncClutchToInventory(clutch, snapshot.fertilizations);
    this.activeRole.set(this.eggSelection() ? 'male' : 'female');
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

  private syncClutchToInventory(
    clutch: readonly DragonOffspring[],
    records: readonly HatcheryFertilizationRecord[],
  ): void {
    const existingIds = new Set(this.account().dragons.map((dragon) => dragon.id));
    const missing = clutch.flatMap((offspring) => {
      if (existingIds.has(offspring.id)) return [];
      const record = records.find((candidate) => candidate.offspringId === offspring.id);
      return record ? [this.inventoryRecordFor(offspring, record)] : [];
    });
    if (missing.length) this.accountLibrary.saveDragons(this.studentId(), missing);
  }

  private inventoryRecordFor(
    offspring: DragonOffspring,
    record: HatcheryFertilizationRecord,
  ): AccountDragonRecord {
    const sexChromosome = record.spermSelection.gamete.chromosomes.find(
      (chromosome) => chromosome.chromosome === 'Chr X',
    )?.sexChromosome;
    return {
      kind: 'dragon',
      id: offspring.id,
      name: offspring.name,
      title: offspring.title,
      color: offspring.color,
      accentColor: offspring.accentColor,
      genome: offspring.genome,
      sex: sexChromosome === 'Y' ? 'male' : 'female',
      source: 'student',
      storedAtIso: record.createdAtIso,
      generation: offspring.generation,
      parentIds: offspring.parentIds,
      originRecordId: record.id,
    };
  }

  private persist(): void {
    const snapshot: DragonHatcheryBreedingSnapshot = {
      schemaVersion: 1,
      studentId: normalizeWorkstationStudentId(this.studentId()),
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
