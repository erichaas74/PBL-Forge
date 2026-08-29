/**
 * Runtime status: RETIRED — no active route container or component imports this hatchery variant.
 * Former inputs/signals: student ID, released specimens, stage/selection state, and meiosis records.
 * Former data access: shared genetics catalogs and hatchery repository/domain state.
 * Former connections: embedded adaptive simulation experience; active routes use newer hatchery surfaces.
 */
import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { GeneticsCardDeckComponent } from '../shared/genetics-card-deck.component';
import {
  GeneticsGamete,
  GeneticsProgram,
  GeneticsSpecimen,
} from '../shared/genetics-program.models';

@Component({
  selector: 'app-genetics-meiosis-hatchery',
  imports: [GeneticsCardDeckComponent, SpecimenViewportComponent],
  templateUrl: './genetics-meiosis-hatchery.component.html',
  styleUrl: './genetics-meiosis-hatchery.component.scss',
})
export class GeneticsMeiosisHatcheryComponent {
  readonly program = input.required<GeneticsProgram>();
  readonly studentId = input.required<string>();
  readonly revealedGeneIds = input<readonly string[]>([]);
  readonly goal = input('Use meiosis and selected gametes to form a genetically new dragon egg.');

  readonly selectedCandidateId = signal<string | null>(null);
  readonly parentIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly selectedGeneId = signal('');
  readonly firstGametes = signal<readonly GeneticsGamete[]>([]);
  readonly secondGametes = signal<readonly GeneticsGamete[]>([]);
  readonly selectedGameteIds = signal<readonly [string | null, string | null]>([null, null]);
  readonly offspring = signal<GeneticsSpecimen | null>(null);
  readonly runNumber = signal(1);
  readonly statusMessage = signal('Choose two dragon cards to load the parent chambers.');

  readonly specimens = computed(() => this.program().specimens(this.studentId()));
  readonly cardBundles = computed(() => this.specimens().map((item) => this.program().cardBundle(item)));
  readonly genes = computed(() => this.program().genes);
  readonly selectableGeneIds = computed(() => this.genes().map((gene) => gene.id));
  readonly selectedCandidate = computed(() => this.specimen(this.selectedCandidateId()));
  readonly firstParent = computed(() => this.specimen(this.parentIds()[0]));
  readonly secondParent = computed(() => this.specimen(this.parentIds()[1]));
  readonly selectedFirstGamete = computed(() =>
    this.firstGametes().find((gamete) => gamete.id === this.selectedGameteIds()[0]) ?? null,
  );
  readonly selectedSecondGamete = computed(() =>
    this.secondGametes().find((gamete) => gamete.id === this.selectedGameteIds()[1]) ?? null,
  );
  readonly gameteColumns = computed<
    readonly { side: 0 | 1; gametes: readonly GeneticsGamete[] }[]
  >(() => [
    { side: 0, gametes: this.firstGametes() },
    { side: 1, gametes: this.secondGametes() },
  ]);

  constructor() {
    effect(() => {
      const program = this.program();
      const studentId = this.studentId();
      untracked(() => program.prepare?.(studentId));
      const specimens = this.specimens();
      untracked(() => {
        this.selectedCandidateId.set(specimens[0]?.id ?? null);
        this.selectedGeneId.set(program.genes[0]?.id ?? '');
        this.parentIds.set([null, null]);
        this.resetExperiment();
      });
    });
  }

  selectCandidate(specimen: GeneticsSpecimen): void {
    this.selectedCandidateId.set(specimen.id);
  }

  loadParent(slot: 0 | 1): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;
    const parents = [...this.parentIds()] as [string | null, string | null];
    const other = slot === 0 ? 1 : 0;
    if (parents[other] === candidate.id) {
      this.statusMessage.set('Choose two different parent dragons.');
      return;
    }
    parents[slot] = candidate.id;
    this.parentIds.set(parents);
    this.resetExperiment();
    this.statusMessage.set(`${candidate.name} loaded into Parent ${slot === 0 ? 'A' : 'B'} chamber.`);
  }

  setGene(geneId: string): void {
    if (this.genes().some((gene) => gene.id === geneId)) this.selectedGeneId.set(geneId);
  }

  runMeiosis(): void {
    const first = this.firstParent();
    const second = this.secondParent();
    if (!first || !second) return;
    const seed = `${this.studentId()}:${this.program().id}:meiosis:${this.runNumber()}`;
    this.firstGametes.set(this.program().meiosis(first, `${seed}:first`));
    this.secondGametes.set(this.program().meiosis(second, `${seed}:second`));
    this.selectedGameteIds.set([null, null]);
    this.offspring.set(null);
    this.statusMessage.set('Four cells formed from each parent. Choose one cell from each side.');
  }

  selectGamete(slot: 0 | 1, gamete: GeneticsGamete): void {
    const selected = [...this.selectedGameteIds()] as [string | null, string | null];
    selected[slot] = gamete.id;
    this.selectedGameteIds.set(selected);
    if (this.selectedFirstGamete() && this.selectedSecondGamete()) {
      this.statusMessage.set('Both gametes are staged. Form the dragon egg when ready.');
    }
  }

  fertilize(): void {
    const first = this.firstParent();
    const second = this.secondParent();
    const firstGamete = this.selectedFirstGamete();
    const secondGamete = this.selectedSecondGamete();
    if (!first || !second || !firstGamete || !secondGamete) return;
    const child = this.program().fertilize(
      first,
      second,
      firstGamete,
      secondGamete,
      `${this.studentId()}:${this.program().id}:egg:${this.runNumber()}`,
    );
    this.offspring.set(child);
    this.runNumber.update((value) => value + 1);
    this.statusMessage.set(`${child.name} formed from the two selected gametes.`);
  }

  allele(gamete: GeneticsGamete, geneId: string): string {
    return gamete.alleleByGene[geneId] ?? '?';
  }

  geneName(geneId: string): string {
    return this.genes().find((gene) => gene.id === geneId)?.name ?? geneId;
  }

  private specimen(id: string | null): GeneticsSpecimen | null {
    return this.specimens().find((candidate) => candidate.id === id) ?? null;
  }

  private resetExperiment(): void {
    this.firstGametes.set([]);
    this.secondGametes.set([]);
    this.selectedGameteIds.set([null, null]);
    this.offspring.set(null);
  }
}
