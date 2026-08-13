import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { SpecimenThumbComponent } from '../../../../shared/assembly/preview/specimen-thumb.component';
import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import {
  DEFAULT_EXPRESSIVE_DRAGON,
  ExpressiveDragonProfile,
} from '../../simulation/domain/dragon-expressive-genome';
import {
  createExpressiveDragonBenchBuild,
  provideDragonSpecimenProfile,
} from '../../simulation/domain/dragon-specimen.profile';
import {
  DeducedDragonState,
  deducePedigree,
  modelUniverse,
  observedPhenotypeOf,
  truePhenotype,
  writeGenotype,
} from './pedigree-deduction';
import {
  PedigreeLayout,
  layoutPedigree,
  pedigreeSymbol,
} from './pedigree-layout';
import {
  RelatednessAssessment,
  assessRelatedness,
  bloodlineStats,
  descendantIds,
  lineToAncestor,
  mergeHatchlings,
  breedClutch,
} from './pedigree-lab.domain';
import {
  ARCHIVE_YEAR,
  BloodlineInvestigation,
  CARRIER_STATUS_GLYPHS,
  CARRIER_STATUS_LABELS,
  PedigreeCarrierStatus,
  INHERITANCE_MODELS,
  INHERITANCE_MODEL_LABELS,
  INHERITANCE_MODEL_SUMMARIES,
  InheritanceModel,
  PEDIGREE_DRAGON_DRAG_TYPE,
  PedigreeCarrierNote,
  PedigreeDragon,
  PedigreeGeneId,
  PedigreeInvestigationRecord,
  PedigreeLabSnapshot,
  createEmptyInvestigationRecord,
  dragonDisplayName,
  dragonLifespanLabel,
  modelAlleleSymbols,
  parsePedigreeDragonDragPayload,
  pedigreeGene,
} from './pedigree-lab.models';
import {
  BLOODLINE_INVESTIGATIONS,
  PEDIGREE_ARCHIVE,
  investigationById,
} from './pedigree-population';
import { PedigreeLabRepository, createEmptySnapshot } from './pedigree-lab.repository';

export interface PedigreeCanvasNode {
  dragonId: string;
  dragon: PedigreeDragon;
  state: DeducedDragonState | null;
  x: number;
  y: number;
  symbol: 'square' | 'circle';
  inLineage: boolean;
  onTraceLine: boolean;
  isFocus: boolean;
  isSelected: boolean;
  inTray: boolean;
  ariaLabel: string;
}

export interface RegisterEntry {
  dragon: PedigreeDragon;
  state: DeducedDragonState | null;
  inTray: boolean;
}

const CLUTCH_SIZE = 6;

@Component({
  selector: 'app-dragon-pedigree-lab',
  imports: [SpecimenThumbComponent],
  templateUrl: './dragon-pedigree-lab.component.html',
  styleUrl: './dragon-pedigree-lab.component.scss',
  providers: [provideDragonSpecimenProfile()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonPedigreeLabComponent {
  private readonly repository = inject(PedigreeLabRepository);

  readonly studentId = input('local-student');
  readonly goal = input(
    'Determine which living dragons still carry an allele that stopped being visible generations ago.',
  );
  /**
   * A bloodline to open on arrival, from a deep link on the mission map.
   *
   * It overrides the investigation the student left open, because following a
   * named link should land on that bloodline. Anything unrecognised is ignored
   * rather than throwing — a stale link is not worth a broken laboratory.
   */
  readonly openInvestigationId = input<string | null>(null);

  readonly archiveYear = ARCHIVE_YEAR;
  readonly investigations = BLOODLINE_INVESTIGATIONS;
  readonly inheritanceModels = INHERITANCE_MODELS;
  readonly modelLabels = INHERITANCE_MODEL_LABELS;
  readonly modelSummaries = INHERITANCE_MODEL_SUMMARIES;
  readonly statusLabels = CARRIER_STATUS_LABELS;
  readonly statusGlyphs = CARRIER_STATUS_GLYPHS;
  readonly clutchSize = CLUTCH_SIZE;
  readonly legendStatuses: readonly PedigreeCarrierStatus[] = [
    'shows-trait',
    'confirmed-carrier',
    'possible-carrier',
    'eliminated',
  ];
  readonly callOptions: readonly PedigreeCarrierNote['status'][] = [
    'carrier',
    'not-carrier',
    'uncertain',
  ];

  readonly snapshot = signal<PedigreeLabSnapshot>(createEmptySnapshot('local-student'));
  readonly focusId = signal<string>(BLOODLINE_INVESTIGATIONS[0].ancestorId);
  readonly selectedId = signal<string | null>(BLOODLINE_INVESTIGATIONS[0].ancestorId);
  readonly ancestorDepth = signal(2);
  readonly descendantDepth = signal(3);
  readonly zoom = signal(1);
  readonly traceMode = signal(false);
  readonly archiveOpen = signal(true);
  readonly guideOpen = signal(false);
  readonly testGeneId = signal<PedigreeGeneId | null>(null);
  readonly stagedDragonId = signal<string | null>(null);
  readonly message = signal('');

  readonly predictedMotherGenotype = signal('');
  readonly predictedFatherGenotype = signal('');
  readonly predictedPercent = signal<number | null>(null);
  readonly justification = signal('');

  private loadedStudentId: string | null = null;
  private lastInvestigationId = BLOODLINE_INVESTIGATIONS[0].id;

  readonly investigation = computed<BloodlineInvestigation>(() =>
    investigationById(this.snapshot().activeInvestigationId),
  );
  readonly gene = computed(() => pedigreeGene(this.investigation().geneId));
  readonly record = computed<PedigreeInvestigationRecord>(
    () => this.snapshot().investigations[this.investigation().id] ?? createEmptyInvestigationRecord(),
  );
  readonly population = computed(() => mergeHatchlings(PEDIGREE_ARCHIVE, this.record().hatchlings));
  readonly byId = computed(() => new Map(this.population().map((dragon) => [dragon.id, dragon])));
  readonly ancestor = computed(() => this.byId().get(this.investigation().ancestorId) ?? null);

  readonly model = computed(() => this.record().model);
  readonly symbols = computed(() =>
    modelAlleleSymbols(this.investigation(), this.model() ?? 'autosomal-recessive'),
  );
  readonly deduction = computed(() => {
    const model = this.model();
    if (!model) return null;
    return deducePedigree({
      population: this.population(),
      investigation: this.investigation(),
      model,
      dnaTests: this.record().dnaTests,
    });
  });

  /**
   * The harmful recessive riding in the same bloodline.
   *
   * Read under a stated autosomal recessive reading — the archive plainly
   * records flightless hatchlings from two winged parents, and the panel says so
   * — because the decision this panel supports is whether a pair is worth the
   * risk, not what the second locus's inheritance pattern is.
   */
  readonly riskDeduction = computed(() => {
    const riskGeneId = this.investigation().riskGeneId;
    if (!riskGeneId) return null;
    const riskGene = pedigreeGene(riskGeneId);
    return deducePedigree({
      population: this.population(),
      investigation: {
        ...this.investigation(),
        id: `${this.investigation().id}:risk`,
        geneId: riskGeneId,
        lostPhenotype: riskGene.recessivePhenotype,
        riskGeneId: null,
      },
      model: 'autosomal-recessive',
      dnaTests: this.record().dnaTests,
    });
  });
  readonly riskGene = computed(() => {
    const riskGeneId = this.investigation().riskGeneId;
    // `id` is restated after the spread so it keeps the narrow pedigree-locus
    // type the sequencing controls need, rather than the whole trait catalog's.
    return riskGeneId ? { ...pedigreeGene(riskGeneId), id: riskGeneId } : null;
  });

  readonly stats = computed(() =>
    bloodlineStats(this.population(), this.investigation(), this.deduction()),
  );
  /** The first few conflicting records, which is as many as the console can usefully name. */
  readonly contradictions = computed(() => this.deduction()?.contradictions.slice(0, 5) ?? []);
  /**
   * The gap the *archive* records, ignoring anything the student has hatched.
   *
   * A recovered hatchling is a living dragon showing the trait, so once one
   * exists the merged register's "last recorded" is this year. The headline the
   * recovery earns is the historical gap it closed, which only the archive knows.
   */
  readonly archiveGapYears = computed(
    () => bloodlineStats(PEDIGREE_ARCHIVE, this.investigation(), null).yearsSinceObserved,
  );
  readonly lineageIds = computed(() => {
    const ids = new Set(descendantIds(this.population(), this.investigation().ancestorId));
    ids.add(this.investigation().ancestorId);
    return ids;
  });

  readonly layout = computed<PedigreeLayout>(() =>
    layoutPedigree({
      population: this.population(),
      focusId: this.focusId(),
      ancestorDepth: this.ancestorDepth(),
      descendantDepth: this.descendantDepth(),
    }),
  );
  readonly tracePathIds = computed(() => {
    const selected = this.selectedId();
    if (!selected) return new Set<string>();
    return new Set(lineToAncestor(this.population(), selected, this.investigation().ancestorId));
  });

  readonly canvasNodes = computed<readonly PedigreeCanvasNode[]>(() => {
    const byId = this.byId();
    const deduction = this.deduction();
    const lineage = this.lineageIds();
    const trace = this.tracePathIds();
    const tray = new Set(this.record().trayDragonIds);
    const focusId = this.focusId();
    const selectedId = this.selectedId();

    return this.layout()
      .nodes.map((node) => {
        const dragon = byId.get(node.dragonId);
        if (!dragon) return null;
        const state = deduction?.states.get(dragon.id) ?? null;
        return {
          dragonId: dragon.id,
          dragon,
          state,
          x: node.x,
          y: node.y,
          symbol: pedigreeSymbol(dragon),
          inLineage: lineage.has(dragon.id),
          onTraceLine: trace.has(dragon.id),
          isFocus: dragon.id === focusId,
          isSelected: dragon.id === selectedId,
          inTray: tray.has(dragon.id),
          ariaLabel: this.describeNode(dragon, state),
        } satisfies PedigreeCanvasNode;
      })
      .filter((node): node is PedigreeCanvasNode => node !== null);
  });

  readonly unions = computed(() => this.layout().unions);
  readonly rows = computed(() => this.layout().rows);
  readonly canvasWidth = computed(() => Math.round(this.layout().width * this.zoom()));
  readonly canvasHeight = computed(() => Math.round(this.layout().height * this.zoom()));
  readonly canvasViewBox = computed(() => `0 0 ${this.layout().width} ${this.layout().height}`);

  readonly selectedDragon = computed(() => {
    const id = this.selectedId();
    return id ? (this.byId().get(id) ?? null) : null;
  });
  readonly selectedState = computed(() => {
    const dragon = this.selectedDragon();
    return dragon ? (this.deduction()?.states.get(dragon.id) ?? null) : null;
  });
  readonly selectedRiskState = computed(() => {
    const dragon = this.selectedDragon();
    return dragon ? (this.riskDeduction()?.states.get(dragon.id) ?? null) : null;
  });
  readonly selectedParents = computed(() => {
    const dragon = this.selectedDragon();
    if (!dragon) return [];
    return [dragon.motherId, dragon.fatherId]
      .map((id) => (id ? this.byId().get(id) : null))
      .filter((parent): parent is PedigreeDragon => !!parent);
  });
  readonly selectedOffspring = computed(() => {
    const dragon = this.selectedDragon();
    if (!dragon) return [];
    return dragon.offspringIds
      .map((id) => this.byId().get(id))
      .filter((child): child is PedigreeDragon => !!child);
  });
  readonly selectedSpecimen = computed<SpecimenSource | null>(() => {
    const dragon = this.selectedDragon();
    return dragon ? specimenFor(dragon) : null;
  });
  readonly ancestorSpecimen = computed<SpecimenSource | null>(() => {
    const ancestor = this.ancestor();
    return ancestor ? specimenFor(ancestor) : null;
  });
  readonly selectedNote = computed<PedigreeCarrierNote | null>(() => {
    const id = this.selectedId();
    return this.record().carrierNotes.find((note) => note.dragonId === id) ?? null;
  });

  readonly livingRegister = computed<readonly RegisterEntry[]>(() => {
    const deduction = this.deduction();
    const lineage = this.lineageIds();
    const tray = new Set(this.record().trayDragonIds);
    const rank: Record<string, number> = {
      'shows-trait': 0,
      'confirmed-carrier': 1,
      'possible-carrier': 2,
      unrecorded: 3,
      contradiction: 4,
      eliminated: 5,
    };
    return this.population()
      .filter((dragon) => dragon.alive && lineage.has(dragon.id))
      .map((dragon) => ({
        dragon,
        state: deduction?.states.get(dragon.id) ?? null,
        inTray: tray.has(dragon.id),
      }))
      .sort(
        (left, right) =>
          (rank[left.state?.status ?? 'unrecorded'] ?? 9) -
            (rank[right.state?.status ?? 'unrecorded'] ?? 9) ||
          left.dragon.birthYear - right.dragon.birthYear,
      );
  });

  readonly trayDragons = computed(() =>
    this.record()
      .trayDragonIds.map((id) => this.byId().get(id))
      .filter((dragon): dragon is PedigreeDragon => !!dragon),
  );
  readonly breedingPair = computed(() => {
    const [first, second] = this.trayDragons();
    if (!first || !second || first.sex === second.sex) return null;
    const mother = first.sex === 'female' ? first : second;
    const father = first.sex === 'male' ? first : second;
    return { mother, father };
  });
  readonly relatedness = computed<RelatednessAssessment | null>(() => {
    const pair = this.breedingPair();
    return pair
      ? assessRelatedness(this.population(), pair.mother.id, pair.father.id)
      : null;
  });
  readonly genotypeOptions = computed(() => {
    const model = this.model();
    const pair = this.breedingPair();
    if (!model || !pair) return { mother: [] as string[], father: [] as string[] };
    const symbols = this.symbols();
    return {
      mother: modelUniverse(model, pair.mother.sex).map((genotype) =>
        writeGenotype(genotype, symbols),
      ),
      father: modelUniverse(model, pair.father.sex).map((genotype) =>
        writeGenotype(genotype, symbols),
      ),
    };
  });

  readonly testsSpent = computed(() => this.record().dnaTests.length);
  readonly testsRemaining = computed(() =>
    Math.max(0, this.investigation().dnaTestBudget - this.testsSpent()),
  );
  readonly hatchRecords = computed(() => this.record().hatchRecords);
  readonly recovered = computed(() => this.record().recoveredAtIso !== null);
  readonly recoveredHatchling = computed(() => {
    const investigation = this.investigation();
    return (
      this.record().hatchlings.find(
        (hatchling) =>
          truePhenotype(investigation.geneId, hatchling.genome[investigation.geneId]) ===
          investigation.lostPhenotype,
      ) ?? null
    );
  });
  readonly recoveryLine = computed(() => {
    const hatchling = this.recoveredHatchling();
    if (!hatchling) return [];
    return lineToAncestor(this.population(), hatchling.id, this.investigation().ancestorId)
      .map((id) => this.byId().get(id))
      .filter((dragon): dragon is PedigreeDragon => !!dragon);
  });

  readonly notebookRows = computed(() => {
    const deduction = this.deduction();
    const notes = new Map(this.record().carrierNotes.map((note) => [note.dragonId, note]));
    const ids = new Set([
      ...this.record().dnaTests.map((test) => test.dragonId),
      ...this.record().carrierNotes.map((note) => note.dragonId),
      ...this.record().trayDragonIds,
    ]);
    return [...ids]
      .map((id) => this.byId().get(id))
      .filter((dragon): dragon is PedigreeDragon => !!dragon)
      .map((dragon) => ({
        dragon,
        state: deduction?.states.get(dragon.id) ?? null,
        note: notes.get(dragon.id) ?? null,
      }))
      .sort((left, right) => left.dragon.generation - right.dragon.generation);
  });

  readonly authorizationBlockers = computed<readonly string[]>(() => {
    const blockers: string[] = [];
    if (!this.model()) blockers.push('Choose an inheritance model.');
    if (!this.breedingPair()) {
      blockers.push('Stage one female and one male living dragon on the board.');
    }
    if (!this.predictedMotherGenotype() || !this.predictedFatherGenotype()) {
      blockers.push('Record a predicted genotype for each candidate.');
    }
    const percent = this.predictedPercent();
    if (percent === null || Number.isNaN(percent)) {
      blockers.push('Record the share of hatchlings you predict will show the trait.');
    }
    if (this.justification().trim().length < 20) {
      blockers.push('Write why this pairing is worth making.');
    }
    return blockers;
  });
  readonly canAuthorize = computed(() => this.authorizationBlockers().length === 0);

  constructor() {
    effect(() => {
      const studentId = this.studentId().trim() || 'local-student';
      if (studentId === this.loadedStudentId) return;
      this.loadedStudentId = studentId;
      const loaded = this.repository.load(studentId);
      this.snapshot.set(loaded);
      this.lastInvestigationId = loaded.activeInvestigationId;
      const investigation = investigationById(loaded.activeInvestigationId);
      this.focusId.set(investigation.ancestorId);
      this.selectedId.set(investigation.ancestorId);
      this.testGeneId.set(investigation.geneId);
      this.resetAuthorizationForm();
    });

    effect(() => {
      const requested = this.openInvestigationId();
      if (!requested || !BLOODLINE_INVESTIGATIONS.some((item) => item.id === requested)) return;
      if (untracked(() => this.snapshot().activeInvestigationId) === requested) return;
      this.openInvestigation(requested);
    });

    effect(() => {
      const investigation = this.investigation();
      if (investigation.id === this.lastInvestigationId) return;
      this.lastInvestigationId = investigation.id;
      this.focusId.set(investigation.ancestorId);
      this.selectedId.set(investigation.ancestorId);
      this.testGeneId.set(investigation.geneId);
      this.ancestorDepth.set(2);
      this.descendantDepth.set(3);
      this.resetAuthorizationForm();
      this.message.set('');
    });
  }

  // -------------------------------------------------------------------------
  // Investigation and model
  // -------------------------------------------------------------------------

  openInvestigation(id: string): void {
    this.updateSnapshot((snapshot) => ({ ...snapshot, activeInvestigationId: id }));
  }

  chooseModel(model: InheritanceModel): void {
    this.updateRecord((record) => ({ ...record, model }));
    this.predictedMotherGenotype.set('');
    this.predictedFatherGenotype.set('');
    this.message.set(
      `Reading the register as ${INHERITANCE_MODEL_LABELS[model].toLowerCase()}. Conflicting records are listed under the model.`,
    );
  }

  clearModel(): void {
    this.updateRecord((record) => ({ ...record, model: null }));
    this.message.set('Model cleared. The canvas now shows recorded appearances only.');
  }

  // -------------------------------------------------------------------------
  // Canvas
  // -------------------------------------------------------------------------

  /**
   * Opening a dragon re-roots the canvas on them.
   *
   * Selecting and framing are the same action here: the question a student is
   * asking when they click a dragon is "where did this one's alleles come from
   * and where could they have gone", and every cousin and in-law still on screen
   * is noise against that. The canvas redraws to this dragon's own line —
   * ancestors above, descendants below, and the mates needed to explain them.
   *
   * Nothing is lost by hiding the rest: the living register, the inspector's
   * parent and offspring links, and the whole-bloodline button all re-open it.
   */
  selectDragon(dragonId: string): void {
    this.selectedId.set(dragonId);
    this.focusId.set(dragonId);
  }

  expandAncestors(): void {
    this.ancestorDepth.update((depth) => Math.min(6, depth + 1));
  }

  collapseAncestors(): void {
    this.ancestorDepth.update((depth) => Math.max(0, depth - 1));
  }

  expandDescendants(): void {
    this.descendantDepth.update((depth) => Math.min(6, depth + 1));
  }

  collapseDescendants(): void {
    this.descendantDepth.update((depth) => Math.max(0, depth - 1));
  }

  zoomIn(): void {
    this.zoom.update((value) => Math.min(1.8, Math.round((value + 0.2) * 10) / 10));
  }

  zoomOut(): void {
    this.zoom.update((value) => Math.max(0.6, Math.round((value - 0.2) * 10) / 10));
  }

  toggleTrace(): void {
    this.traceMode.update((value) => !value);
  }

  // -------------------------------------------------------------------------
  // Genetic testing
  // -------------------------------------------------------------------------

  selectTestGene(geneId: PedigreeGeneId): void {
    this.testGeneId.set(geneId);
  }

  runDnaTest(dragonId: string): void {
    const dragon = this.byId().get(dragonId);
    const geneId = this.testGeneId() ?? this.investigation().geneId;
    if (!dragon) return;
    if (!dragon.dnaAvailable) {
      this.message.set(`No usable sample survives for ${dragon.name}.`);
      return;
    }
    if (this.record().dnaTests.some((test) => test.dragonId === dragonId && test.geneId === geneId)) {
      this.message.set(`${dragon.name} has already been sequenced at this locus.`);
      return;
    }
    if (this.testsRemaining() <= 0) {
      this.message.set('No sequencing runs remain for this investigation.');
      return;
    }

    const alleles = dragon.genome[geneId];
    this.updateRecord((record) => ({
      ...record,
      dnaTests: [
        ...record.dnaTests,
        { dragonId, geneId, alleles, testedAtIso: new Date().toISOString() },
      ],
      testedDragonIds: [...new Set([...record.testedDragonIds, dragonId])],
    }));
    this.message.set(
      `Sequenced ${dragon.name} at the ${pedigreeGene(geneId).name.toLowerCase()} locus.`,
    );
  }

  // -------------------------------------------------------------------------
  // Notebook
  // -------------------------------------------------------------------------

  markCarrier(status: PedigreeCarrierNote['status']): void {
    const dragonId = this.selectedId();
    if (!dragonId) return;
    this.updateRecord((record) => ({
      ...record,
      carrierNotes: [
        ...record.carrierNotes.filter((note) => note.dragonId !== dragonId),
        {
          dragonId,
          status,
          note: record.carrierNotes.find((note) => note.dragonId === dragonId)?.note ?? '',
          updatedAtIso: new Date().toISOString(),
        },
      ],
    }));
  }

  writeNote(value: string): void {
    const dragonId = this.selectedId();
    if (!dragonId) return;
    this.updateRecord((record) => ({
      ...record,
      carrierNotes: [
        ...record.carrierNotes.filter((note) => note.dragonId !== dragonId),
        {
          dragonId,
          status: record.carrierNotes.find((note) => note.dragonId === dragonId)?.status ?? 'uncertain',
          note: value.slice(0, 400),
          updatedAtIso: new Date().toISOString(),
        },
      ],
    }));
  }

  writeHypothesis(value: string): void {
    this.updateRecord((record) => ({ ...record, hypothesis: value.slice(0, 1200) }));
  }

  // -------------------------------------------------------------------------
  // Breeding board
  // -------------------------------------------------------------------------

  stageDragon(dragonId: string): void {
    this.stagedDragonId.set(dragonId);
    this.message.set('Candidate selected. Choose the breeding board to place it.');
  }

  placeStagedDragon(): void {
    const dragonId = this.stagedDragonId();
    if (!dragonId) return;
    this.addToTray(dragonId);
    this.stagedDragonId.set(null);
  }

  addToTray(dragonId: string): void {
    const dragon = this.byId().get(dragonId);
    if (!dragon) return;
    if (!dragon.alive) {
      this.message.set(`${dragon.name} is not living and cannot be bred.`);
      return;
    }
    if (this.record().trayDragonIds.includes(dragonId)) return;
    if (this.record().trayDragonIds.length >= 2) {
      this.message.set('The board holds two candidates. Remove one before adding another.');
      return;
    }
    this.updateRecord((record) => ({
      ...record,
      trayDragonIds: [...record.trayDragonIds, dragonId],
    }));
    this.predictedMotherGenotype.set('');
    this.predictedFatherGenotype.set('');
    this.message.set(`${dragon.name} staged on the breeding board.`);
  }

  removeFromTray(dragonId: string): void {
    this.updateRecord((record) => ({
      ...record,
      trayDragonIds: record.trayDragonIds.filter((id) => id !== dragonId),
    }));
    this.predictedMotherGenotype.set('');
    this.predictedFatherGenotype.set('');
  }

  startDragonDrag(event: DragEvent, dragonId: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(PEDIGREE_DRAGON_DRAG_TYPE, JSON.stringify({ dragonId }));
    event.dataTransfer.setData('text/plain', dragonId);
  }

  allowDragonDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(PEDIGREE_DRAGON_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropDragon(event: DragEvent): void {
    event.preventDefault();
    const dragonId = parsePedigreeDragonDragPayload(
      event.dataTransfer?.getData(PEDIGREE_DRAGON_DRAG_TYPE) ?? '',
    );
    if (dragonId) this.addToTray(dragonId);
  }

  authorizeBreeding(): void {
    const pair = this.breedingPair();
    const investigation = this.investigation();
    if (!pair || !this.canAuthorize()) return;

    const attempt = this.record().hatchRecords.length + 1;
    const outcome = breedClutch({
      investigationId: investigation.id,
      investigation,
      population: this.population(),
      mother: pair.mother,
      father: pair.father,
      attempt,
      clutchSize: CLUTCH_SIZE,
      predictedPercent: this.predictedPercent() ?? 0,
    });

    const recovered = outcome.record.recoveredCount > 0;
    this.updateRecord((record) => ({
      ...record,
      hatchRecords: [outcome.record, ...record.hatchRecords],
      hatchlings: [...record.hatchlings, ...outcome.hatchlings],
      recoveredAtIso: record.recoveredAtIso ?? (recovered ? new Date().toISOString() : null),
    }));

    this.message.set(
      recovered
        ? `${outcome.record.recoveredCount} of ${CLUTCH_SIZE} hatchlings show ${investigation.lostPhenotype.toLowerCase()}.`
        : `No hatchling in clutch ${attempt} shows ${investigation.lostPhenotype.toLowerCase()}. The prediction was a probability, not a promise.`,
    );
    if (recovered) {
      const hatchling = outcome.hatchlings.find(
        (candidate) =>
          truePhenotype(investigation.geneId, candidate.genome[investigation.geneId]) ===
          investigation.lostPhenotype,
      );
      if (hatchling) this.selectedId.set(hatchling.id);
    }
  }

  // -------------------------------------------------------------------------
  // Form plumbing
  // -------------------------------------------------------------------------

  onNoteInput(event: Event): void {
    this.writeNote((event.target as HTMLTextAreaElement).value);
  }

  onHypothesisInput(event: Event): void {
    this.writeHypothesis((event.target as HTMLTextAreaElement).value);
  }

  onJustificationInput(event: Event): void {
    this.justification.set((event.target as HTMLTextAreaElement).value.slice(0, 600));
  }

  onPercentInput(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this.predictedPercent.set(Number.isNaN(value) ? null : Math.max(0, Math.min(100, value)));
  }

  onGenotypeSelect(event: Event, side: 'mother' | 'father'): void {
    const value = (event.target as HTMLSelectElement).value;
    if (side === 'mother') this.predictedMotherGenotype.set(value);
    else this.predictedFatherGenotype.set(value);
  }

  // -------------------------------------------------------------------------
  // Canvas geometry
  // -------------------------------------------------------------------------

  unionMidX(union: { motherX: number; fatherX: number }): number {
    return (union.motherX + union.fatherX) / 2;
  }

  sibBarY(union: { parentY: number; childY: number }): number {
    return union.parentY + (union.childY - union.parentY) * 0.6;
  }

  /**
   * The sibship bar spans the children *and* the point the descent line drops
   * from, so the couple is never left connected to thin air. The layout centres
   * a sibship under its parents, but a row dense enough to push a block sideways
   * can still leave the midpoint outside the children's span.
   */
  sibBarStart(union: {
    childXs: readonly number[];
    motherX: number;
    fatherX: number;
  }): number {
    return Math.min(this.unionMidX(union), ...union.childXs);
  }

  sibBarEnd(union: { childXs: readonly number[]; motherX: number; fatherX: number }): number {
    return Math.max(this.unionMidX(union), ...union.childXs);
  }

  unionOnTraceLine(union: { motherId: string; fatherId: string; childIds: readonly string[] }): boolean {
    if (!this.traceMode()) return false;
    const trace = this.tracePathIds();
    const parentOnLine = trace.has(union.motherId) || trace.has(union.fatherId);
    return parentOnLine && union.childIds.some((childId) => trace.has(childId));
  }

  // -------------------------------------------------------------------------
  // Readouts
  // -------------------------------------------------------------------------

  displayName(dragon: PedigreeDragon): string {
    return dragonDisplayName(dragon);
  }

  lifespan(dragon: PedigreeDragon): string {
    return dragonLifespanLabel(dragon);
  }

  observed(dragon: PedigreeDragon, geneId = this.investigation().geneId): string | null {
    return observedPhenotypeOf(dragon, geneId);
  }

  sequencedGenotype(dragonId: string): string | null {
    const investigation = this.investigation();
    const test = this.record().dnaTests.find(
      (candidate) => candidate.dragonId === dragonId && candidate.geneId === investigation.geneId,
    );
    if (!test) return null;
    const symbols = this.symbols();
    const traced =
      investigation.lostPhenotype === this.gene().recessivePhenotype
        ? this.gene().recessiveAllele
        : this.gene().dominantAllele;
    return [...test.alleles]
      .map((allele) =>
        allele === 'Y' ? 'Y' : allele === traced ? symbols.traced : symbols.alternate,
      )
      .sort((left, right) => rankAllele(left) - rankAllele(right))
      .join('');
  }

  testedAt(dragonId: string, geneId: PedigreeGeneId): boolean {
    return this.record().dnaTests.some(
      (test) => test.dragonId === dragonId && test.geneId === geneId,
    );
  }

  private describeNode(dragon: PedigreeDragon, state: DeducedDragonState | null): string {
    const observed = observedPhenotypeOf(dragon, this.investigation().geneId);
    const status = state ? CARRIER_STATUS_LABELS[state.status] : 'No model chosen';
    return `${dragonDisplayName(dragon)}, ${dragon.sex}, generation ${dragon.generation}, ${
      dragon.alive ? 'living' : 'deceased'
    }. Recorded appearance: ${observed ?? 'not recorded'}. ${status}. Select to redraw the canvas around this dragon's line.`;
  }

  private resetAuthorizationForm(): void {
    this.predictedMotherGenotype.set('');
    this.predictedFatherGenotype.set('');
    this.predictedPercent.set(null);
    this.justification.set('');
  }

  private updateRecord(
    update: (record: PedigreeInvestigationRecord) => PedigreeInvestigationRecord,
  ): void {
    const investigationId = this.investigation().id;
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      investigations: {
        ...snapshot.investigations,
        [investigationId]: update(
          snapshot.investigations[investigationId] ?? createEmptyInvestigationRecord(),
        ),
      },
    }));
  }

  private updateSnapshot(update: (snapshot: PedigreeLabSnapshot) => PedigreeLabSnapshot): void {
    const next: PedigreeLabSnapshot = {
      ...update(this.snapshot()),
      studentId: this.studentId().trim() || 'local-student',
      updatedAtIso: new Date().toISOString(),
    };
    this.snapshot.set(next);
    this.repository.save(next);
  }
}

function rankAllele(letter: string): number {
  return letter === 'Y' ? 2 : letter === letter.toUpperCase() ? 0 : 1;
}

/**
 * The selected dragon, rendered by the real assembly renderer.
 *
 * Built only from loci whose record survives: a dragon whose chronicle lost a
 * description has no honest portrait, and inventing the missing part would hand
 * a student evidence the archive does not have. Memoised per dragon because
 * expressing a genome rebuilds a whole blueprint.
 */
const specimenCache = new Map<string, SpecimenSource | null>();

function specimenFor(dragon: PedigreeDragon): SpecimenSource | null {
  const cached = specimenCache.get(dragon.id);
  if (cached !== undefined) return cached;

  const complete = (['wings', 'scales', 'body-color', 'tail', 'eye-color'] as const).every(
    (geneId) => dragon.recordedGeneIds.includes(geneId),
  );
  if (!complete) {
    specimenCache.set(dragon.id, null);
    return null;
  }

  const profile: ExpressiveDragonProfile = {
    sex: dragon.sex,
    genome: {
      ...DEFAULT_EXPRESSIVE_DRAGON.genome,
      wings: [...dragon.genome.wings] as [string, string],
      scales: [...dragon.genome.scales] as [string, string],
      'body-color': [...dragon.genome['body-color']] as [string, string],
      tail: [...dragon.genome.tail] as [string, string],
      'eye-color': [...dragon.genome['eye-color']] as [string, string],
    },
  };
  const source = createExpressiveDragonBenchBuild(`pedigree-${dragon.id}`, profile, {
    label: dragon.name,
    generation: dragon.generation,
  }).source;
  specimenCache.set(dragon.id, source);
  return source;
}
