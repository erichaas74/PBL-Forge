import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { GeneticsCardDeckComponent } from '../shared/genetics-card-deck.component';
import {
  GeneticsBreedingBatch,
  GeneticsProgram,
  GeneticsSpecimen,
} from '../shared/genetics-program.models';

interface StoredGenericIncubator {
  schemaVersion: 1;
  programId: string;
  parentIds: readonly [string | null, string | null];
  geneId: string;
  sampleSize: number;
  runNumber: number;
}

@Component({
  selector: 'app-genetics-incubator',
  imports: [GeneticsCardDeckComponent, SpecimenViewportComponent],
  templateUrl: './genetics-incubator.component.html',
  styleUrl: './genetics-incubator.component.scss',
})
export class GeneticsIncubatorComponent {
  readonly program = input.required<GeneticsProgram>();
  readonly studentId = input.required<string>();
  readonly revealedGeneIds = input<readonly string[]>([]);
  readonly goal = input('Compare how visible inherited traits appear across many offspring.');
  readonly batchSaved = output<GeneticsBreedingBatch>();

  readonly selectedCandidateId = signal<string | null>(null);
  readonly parentIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly selectedGeneId = signal('');
  readonly sampleSize = signal(8);
  readonly runNumber = signal(1);
  readonly latestBatch = signal<GeneticsBreedingBatch | null>(null);
  readonly statusMessage = signal('Choose two dragon cards to load the incubator.');

  readonly specimens = computed(() => this.program().specimens(this.studentId()));
  readonly cardBundles = computed(() => this.specimens().map((item) => this.program().cardBundle(item)));
  readonly genes = computed(() => this.program().genes);
  readonly selectedCandidate = computed(() => this.specimen(this.selectedCandidateId()));
  readonly parentA = computed(() => this.specimen(this.parentIds()[0]));
  readonly parentB = computed(() => this.specimen(this.parentIds()[1]));
  readonly parentsReady = computed(() => Boolean(this.parentA() && this.parentB()));
  readonly selectableGeneIds = computed(() => this.genes().map((gene) => gene.id));

  constructor() {
    effect(() => {
      const program = this.program();
      const studentId = this.studentId();
      untracked(() => program.prepare?.(studentId));
      const specimens = this.specimens();
      untracked(() => this.restore(program, studentId, specimens));
    });
  }

  selectCandidate(specimen: GeneticsSpecimen): void {
    this.selectedCandidateId.set(specimen.id);
  }

  loadParent(slot: 0 | 1): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;
    const current = [...this.parentIds()] as [string | null, string | null];
    const other = slot === 0 ? 1 : 0;
    if (current[other] === candidate.id) {
      this.statusMessage.set('Choose two different parent dragons.');
      return;
    }
    current[slot] = candidate.id;
    this.parentIds.set(current);
    this.statusMessage.set(`${candidate.name} loaded as Parent ${slot === 0 ? 'A' : 'B'}.`);
    this.persist();
  }

  setGene(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!this.genes().some((gene) => gene.id === value)) return;
    this.selectedGeneId.set(value);
    this.persist();
  }

  setSampleSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (![4, 8, 12, 25, 50, 100].includes(value)) return;
    this.sampleSize.set(value);
    this.persist();
  }

  runBatch(): void {
    const first = this.parentA();
    const second = this.parentB();
    const geneId = this.selectedGeneId();
    if (!first || !second || !geneId) return;
    const batch = this.program().breed(
      first,
      second,
      geneId,
      this.sampleSize(),
      `${this.studentId()}:${this.program().id}:incubator:${this.runNumber()}`,
    );
    this.latestBatch.set(batch);
    this.runNumber.update((value) => value + 1);
    this.statusMessage.set(
      `${batch.size} offspring sorted: ${batch.buckets.map((bucket) => `${bucket.count} ${bucket.label}`).join(' · ')}.`,
    );
    this.persist();
    this.batchSaved.emit(batch);
  }

  geneName(geneId: string): string {
    return this.genes().find((gene) => gene.id === geneId)?.name ?? geneId;
  }

  private specimen(id: string | null): GeneticsSpecimen | null {
    return this.specimens().find((candidate) => candidate.id === id) ?? null;
  }

  private restore(
    program: GeneticsProgram,
    studentId: string,
    specimens: readonly GeneticsSpecimen[],
  ): void {
    const stored = loadStored(storageKey(program.id, studentId));
    const available = new Set(specimens.map((specimen) => specimen.id));
    const parents = stored?.programId === program.id
      ? stored.parentIds.map((id) => id && available.has(id) ? id : null) as [string | null, string | null]
      : [null, null] as const;
    this.parentIds.set(parents);
    this.selectedCandidateId.set(parents[0] ?? specimens[0]?.id ?? null);
    const defaultGene = program.genes[0]?.id ?? '';
    this.selectedGeneId.set(
      stored && program.genes.some((gene) => gene.id === stored.geneId) ? stored.geneId : defaultGene,
    );
    const storedSize = stored?.sampleSize ?? 8;
    this.sampleSize.set([4, 8, 12, 25, 50, 100].includes(storedSize) ? storedSize : 8);
    this.runNumber.set(stored?.runNumber ?? 1);
    this.latestBatch.set(null);
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    const value: StoredGenericIncubator = {
      schemaVersion: 1,
      programId: this.program().id,
      parentIds: this.parentIds(),
      geneId: this.selectedGeneId(),
      sampleSize: this.sampleSize(),
      runNumber: this.runNumber(),
    };
    localStorage.setItem(storageKey(this.program().id, this.studentId()), JSON.stringify(value));
  }
}

function storageKey(programId: string, studentId: string): string {
  return `pbl-forge.dragon-genetics.incubator.v2.${programId}.${studentId}`;
}

function loadStored(key: string): StoredGenericIncubator | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as StoredGenericIncubator | null;
    return value?.schemaVersion === 1 ? value : null;
  } catch {
    return null;
  }
}
