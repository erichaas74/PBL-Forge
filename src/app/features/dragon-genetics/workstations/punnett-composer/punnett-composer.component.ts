import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  DRAGON_TRAITS,
  normalizeGenotype,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import {
  DragonParentProfile,
  DragonTraitDefinition,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import { AccountGeneticsFileComponent } from '../shared/account-genetics-file.component';
import {
  LOCAL_WORKSTATION_STUDENT_ID,
  normalizeWorkstationStudentId,
} from '../shared/dragon-workstation-context.models';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountGeneticsRecord,
  parseAccountGeneticsDragPayload,
} from '../shared/account-genetics-library.models';
import { AccountGeneticsLibraryService } from '../shared/account-genetics-library.service';
import {
  createEmptyPunnettSnapshot,
  PendingPunnettGamete,
  PUNNETT_GAMETE_DRAG_TYPE,
  PunnettComposerSnapshot,
  PunnettGameteSlots,
  PunnettOffspringCellModel,
  PunnettParentSide,
  PunnettSavedCross,
} from './punnett-composer.models';
import { PunnettComposerRepository } from './punnett-composer.repository';

@Component({
  selector: 'app-punnett-composer',
  imports: [AccountGeneticsFileComponent],
  templateUrl: './punnett-composer.component.html',
  styleUrl: './punnett-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PunnettComposerComponent {
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);
  private readonly repository = inject(PunnettComposerRepository);

  readonly studentId = input.required<string>();
  readonly goal = input(
    'Determine how one allele from each parent combines in possible offspring.',
  );
  readonly crossSaved = output<PunnettSavedCross>();

  readonly traits = DRAGON_TRAITS;
  readonly snapshot = signal<PunnettComposerSnapshot>(
    createEmptyPunnettSnapshot(LOCAL_WORKSTATION_STUDENT_ID),
  );
  readonly stagedAccountRecord = signal<AccountGeneticsRecord | null>(null);
  readonly pendingGamete = signal<PendingPunnettGamete | null>(null);
  readonly selectedCellIndex = signal<number | null>(null);
  readonly recordMessage = signal('');
  private loadedStudentId: string | null = null;

  readonly accountSnapshot = computed(() => this.accountLibrary.recordsFor(this.studentId()));
  readonly parent1 = computed(() => this.parentById(this.snapshot().parent1Id));
  readonly parent2 = computed(() => this.parentById(this.snapshot().parent2Id));
  readonly activeTrait = computed<DragonTraitDefinition>(
    () => this.traits.find((trait) => trait.id === this.snapshot().traitId) ?? this.traits[0],
  );
  readonly parent1Alleles = computed<readonly string[]>(
    () => this.parent1()?.genome[this.snapshot().traitId] ?? [],
  );
  readonly parent2Alleles = computed<readonly string[]>(
    () => this.parent2()?.genome[this.snapshot().traitId] ?? [],
  );
  readonly cells = computed<readonly PunnettOffspringCellModel[]>(() => {
    const state = this.snapshot();
    const trait = this.activeTrait();
    return Array.from({ length: 4 }, (_, index) => {
      const row = Math.floor(index / 2);
      const column = index % 2;
      const parent1Allele = state.parent1Gametes[column];
      const parent2Allele = state.parent2Gametes[row];
      if (!parent1Allele || !parent2Allele) {
        return {
          index,
          row,
          column,
          parent1Allele,
          parent2Allele,
          genotype: null,
          phenotype: null,
        };
      }
      const genotypePair = normalizeGenotype([parent1Allele, parent2Allele]);
      return {
        index,
        row,
        column,
        parent1Allele,
        parent2Allele,
        genotype: genotypePair.join(''),
        phenotype: showsDominantPhenotype(genotypePair, trait.id)
          ? trait.dominantPhenotype
          : trait.recessivePhenotype,
      };
    });
  });
  readonly selectedCell = computed(() => {
    const index = this.selectedCellIndex();
    return index === null ? null : (this.cells()[index] ?? null);
  });
  readonly squareComplete = computed(() => this.cells().every((cell) => !!cell.genotype));
  readonly genotypeCounts = computed(() => countCellValues(this.cells(), 'genotype'));
  readonly phenotypeCounts = computed(() => countCellValues(this.cells(), 'phenotype'));
  readonly savedCrosses = computed(() => this.snapshot().savedCrosses);
  readonly placementStatus = computed(() => {
    const staged = this.stagedAccountRecord();
    if (staged) {
      const label =
        staged.kind === 'dragon' ? staged.name : `${staged.dragonName} ${staged.chromosome}`;
      return `${label} selected. Choose Parent 1 or Parent 2.`;
    }
    const gamete = this.pendingGamete();
    if (gamete) {
      return `${this.parentLabel(gamete.parent)} gamete ${gamete.allele} selected. Choose one of its axis boxes.`;
    }
    return 'Select and place records or drag them directly onto matching boxes.';
  });

  constructor() {
    effect(() => {
      const studentId = normalizeWorkstationStudentId(this.studentId());
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      this.snapshot.set(this.sanitizeSnapshot(this.repository.load(studentId)));
      this.stagedAccountRecord.set(null);
      this.pendingGamete.set(null);
      this.selectedCellIndex.set(null);
    });
  }

  selectAccountRecord(record: AccountGeneticsRecord): void {
    this.stagedAccountRecord.set(record);
    this.pendingGamete.set(null);
    this.recordMessage.set('');
  }

  loadStagedRecord(side: PunnettParentSide): void {
    const record = this.stagedAccountRecord();
    if (!record) return;
    this.loadAccountRecord(record, side);
  }

  loadAccountRecord(record: AccountGeneticsRecord, side: PunnettParentSide): void {
    const dragonId = record.kind === 'dragon' ? record.id : record.dragonId;
    if (!this.parentById(dragonId)) return;
    if (record.kind === 'chromosome') this.selectTrait(record.traitId);
    this.updateSnapshot((state) => ({
      ...state,
      [side === 'parent1' ? 'parent1Id' : 'parent2Id']: dragonId,
      [side === 'parent1' ? 'parent1Gametes' : 'parent2Gametes']: [null, null],
    }));
    this.stagedAccountRecord.set(null);
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('');
  }

  dropAccountRecord(event: DragEvent, side: PunnettParentSide): void {
    event.preventDefault();
    const payload = parseAccountGeneticsDragPayload(
      event.dataTransfer?.getData(ACCOUNT_GENETICS_RECORD_DRAG_TYPE) ?? '',
    );
    if (!payload) return;
    const record = this.accountLibrary.recordById(this.studentId(), payload.id);
    if (!record || record.kind !== payload.kind) return;
    this.loadAccountRecord(record, side);
  }

  allowAccountDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(ACCOUNT_GENETICS_RECORD_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  selectTrait(traitId: DragonTraitId): void {
    if (this.snapshot().traitId === traitId) return;
    this.updateSnapshot((state) => ({
      ...state,
      traitId,
      parent1Gametes: [null, null],
      parent2Gametes: [null, null],
    }));
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('');
  }

  selectGamete(parent: PunnettParentSide, sourceIndex: number): void {
    const source = parent === 'parent1' ? this.parent1() : this.parent2();
    const allele = source?.genome[this.snapshot().traitId][sourceIndex];
    if (!allele) return;
    this.pendingGamete.set({ parent, sourceIndex, allele });
    this.stagedAccountRecord.set(null);
    this.recordMessage.set('');
  }

  startGameteDrag(event: DragEvent, parent: PunnettParentSide, sourceIndex: number): void {
    const source = parent === 'parent1' ? this.parent1() : this.parent2();
    const allele = source?.genome[this.snapshot().traitId][sourceIndex];
    if (!event.dataTransfer || !allele) return;
    const payload: PendingPunnettGamete = { parent, sourceIndex, allele };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(PUNNETT_GAMETE_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', `${this.parentLabel(parent)} gamete ${allele}`);
  }

  placePendingGamete(parent: PunnettParentSide, slotIndex: number): void {
    const pending = this.pendingGamete();
    if (!pending || pending.parent !== parent) return;
    this.placeGamete(parent, slotIndex, pending.allele);
  }

  dropGamete(event: DragEvent, parent: PunnettParentSide, slotIndex: number): void {
    event.preventDefault();
    const pending = parseGametePayload(event.dataTransfer?.getData(PUNNETT_GAMETE_DRAG_TYPE) ?? '');
    if (!pending || pending.parent !== parent) return;
    this.placeGamete(parent, slotIndex, pending.allele);
  }

  allowGameteDrop(event: DragEvent, parent: PunnettParentSide): void {
    const pending = parseGametePayload(event.dataTransfer?.getData(PUNNETT_GAMETE_DRAG_TYPE) ?? '');
    if (
      pending?.parent === parent ||
      event.dataTransfer?.types.includes(PUNNETT_GAMETE_DRAG_TYPE)
    ) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  clearSquare(): void {
    this.updateSnapshot((state) => ({
      ...state,
      parent1Gametes: [null, null],
      parent2Gametes: [null, null],
    }));
    this.pendingGamete.set(null);
    this.selectedCellIndex.set(null);
    this.recordMessage.set('Square cleared. Parent records remain loaded.');
  }

  selectCell(index: number): void {
    this.selectedCellIndex.set(index);
  }

  saveCross(): void {
    const parent1 = this.parent1();
    const parent2 = this.parent2();
    const trait = this.activeTrait();
    if (!parent1 || !parent2 || !this.squareComplete()) return;
    const savedAtIso = new Date().toISOString();
    const record: PunnettSavedCross = {
      id: `${parent1.id}:${parent2.id}:${trait.id}:${Date.now()}`,
      parent1Id: parent1.id,
      parent1Name: parent1.name,
      parent2Id: parent2.id,
      parent2Name: parent2.name,
      traitId: trait.id,
      traitName: trait.name,
      genotypeCounts: this.genotypeCounts(),
      phenotypeCounts: this.phenotypeCounts(),
      savedAtIso,
    };
    this.updateSnapshot((state) => ({
      ...state,
      savedCrosses: [record, ...state.savedCrosses].slice(0, 24),
    }));
    this.recordMessage.set(`Saved ${parent1.name} × ${parent2.name} for ${trait.name}.`);
    this.crossSaved.emit(record);
  }

  slotValue(parent: PunnettParentSide, index: number): string | null {
    return parent === 'parent1'
      ? this.snapshot().parent1Gametes[index]
      : this.snapshot().parent2Gametes[index];
  }

  slotAriaLabel(parent: PunnettParentSide, index: number): string {
    const value = this.slotValue(parent, index);
    return value
      ? `${this.parentLabel(parent)} axis box ${index + 1}, loaded with allele ${value}`
      : `${this.parentLabel(parent)} axis box ${index + 1}, empty`;
  }

  cellAriaLabel(cell: PunnettOffspringCellModel): string {
    return cell.genotype
      ? `Offspring cell ${cell.index + 1}, genotype ${cell.genotype}, ${cell.phenotype}`
      : `Offspring cell ${cell.index + 1}, incomplete. Select to examine missing gametes.`;
  }

  countEntries(values: Readonly<Record<string, number>>): readonly [string, number][] {
    return Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  }

  parentLabel(parent: PunnettParentSide): string {
    return parent === 'parent1' ? 'Parent 1' : 'Parent 2';
  }

  private placeGamete(parent: PunnettParentSide, slotIndex: number, allele: string): void {
    const source = parent === 'parent1' ? this.parent1() : this.parent2();
    if (!source?.genome[this.snapshot().traitId].includes(allele)) return;
    const key = parent === 'parent1' ? 'parent1Gametes' : 'parent2Gametes';
    this.updateSnapshot((state) => {
      const slots = [...state[key]] as [string | null, string | null];
      const availableCopies = source.genome[state.traitId].filter(
        (candidate) => candidate === allele,
      ).length;
      const loadedElsewhere = slots.filter(
        (candidate, index) => index !== slotIndex && candidate === allele,
      ).length;
      if (loadedElsewhere >= availableCopies) {
        const previousSlot = slots.findIndex(
          (candidate, index) => index !== slotIndex && candidate === allele,
        );
        if (previousSlot >= 0) slots[previousSlot] = null;
      }
      slots[slotIndex] = allele;
      return { ...state, [key]: slots };
    });
    this.pendingGamete.set(null);
    this.recordMessage.set('');
  }

  private parentById(id: string | null): DragonParentProfile | null {
    return this.accountSnapshot().dragons.find((dragon) => dragon.id === id) ?? null;
  }

  private updateSnapshot(
    update: (snapshot: PunnettComposerSnapshot) => PunnettComposerSnapshot,
  ): void {
    const next = {
      ...update(this.snapshot()),
      studentId: normalizeWorkstationStudentId(this.studentId()),
      updatedAtIso: new Date().toISOString(),
    };
    this.snapshot.set(next);
    this.repository.save(next);
  }

  private sanitizeSnapshot(snapshot: PunnettComposerSnapshot): PunnettComposerSnapshot {
    const parent1 = this.parentById(snapshot.parent1Id);
    const parent2 = this.parentById(snapshot.parent2Id);
    return {
      ...snapshot,
      parent1Id: parent1?.id ?? null,
      parent2Id: parent2?.id ?? null,
      parent1Gametes: validGametes(parent1, snapshot.traitId, snapshot.parent1Gametes),
      parent2Gametes: validGametes(parent2, snapshot.traitId, snapshot.parent2Gametes),
    };
  }
}

function parseGametePayload(value: string): PendingPunnettGamete | null {
  try {
    const candidate = JSON.parse(value) as Partial<PendingPunnettGamete>;
    if (
      (candidate.parent === 'parent1' || candidate.parent === 'parent2') &&
      typeof candidate.sourceIndex === 'number' &&
      typeof candidate.allele === 'string'
    ) {
      return {
        parent: candidate.parent,
        sourceIndex: candidate.sourceIndex,
        allele: candidate.allele,
      };
    }
  } catch {
    // Ignore data from unrelated drag sources.
  }
  return null;
}

function validGametes(
  parent: DragonParentProfile | null,
  traitId: DragonTraitId,
  gametes: PunnettGameteSlots,
): PunnettGameteSlots {
  if (!parent) return [null, null];
  const remaining = [...parent.genome[traitId]];
  return gametes.map((allele) => {
    const match = allele ? remaining.indexOf(allele) : -1;
    if (match < 0) return null;
    remaining.splice(match, 1);
    return allele;
  }) as [string | null, string | null];
}

function countCellValues(
  cells: readonly PunnettOffspringCellModel[],
  key: 'genotype' | 'phenotype',
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const cell of cells) {
    const value = cell[key];
    if (value) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
