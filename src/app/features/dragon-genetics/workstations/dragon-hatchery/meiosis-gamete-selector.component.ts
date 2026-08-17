import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { getTrait } from '../../simulation/domain/dragon-inheritance';
import { DragonParentProfile, DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import {
  CellChromosomeLocusSelection,
  CellChromosomeViewportComponent,
  CellChromosomeViewportItem,
} from '../shared/cell-chromosome-viewport.component';
import { CellModelComponent } from '../shared/cell-model.component';
import { generateMeiosisRun, gameteAlleleSummary } from './meiosis-gamete.domain';
import { MeiosisStageView, meiosisStageView } from './meiosis-cell-stage';
import { meiosisGameteViewportItems } from './meiosis-gamete.viewport';
import {
  MEIOSIS_GAMETE_DRAG_TYPE,
  MeiosisGamete,
  MeiosisRun,
  SelectedMeiosisGamete,
} from './meiosis-gamete.models';

interface MeiosisPhase {
  name: string;
  cue: string;
}

interface GameteGeneAnalysis {
  chromosome: string;
  traitName: string;
  geneSymbol: string;
  allele: string;
  dominance: 'dominant' | 'recessive';
  recombinant: boolean;
}

const PHASES: readonly MeiosisPhase[] = [
  { name: 'Parent cell', cue: 'Five homologous chromosome pairs begin in one diploid cell.' },
  { name: 'S phase', cue: 'Every chromosome replicates into two joined sister chromatids.' },
  {
    name: 'Prophase I',
    cue: 'Homologues pair, and non-sister chromatids exchange matching DNA sections.',
  },
  { name: 'Metaphase I', cue: 'Homologous pairs line up along the cell equator.' },
  {
    name: 'Anaphase I',
    cue: 'Whole homologues move to opposite poles while sister chromatids remain joined.',
  },
  {
    name: 'Telophase I & Cytokinesis',
    cue: 'Nuclear envelopes form and the parent cell separates into two haploid cells.',
  },
  { name: 'Prophase II', cue: 'Chromosomes condense again inside both haploid cells.' },
  {
    name: 'Metaphase II',
    cue: 'Individual chromosomes line up between the top and bottom spindle poles.',
  },
  {
    name: 'Anaphase II',
    cue: 'Centromeres release and sister chromatids move toward the top and bottom poles.',
  },
  {
    name: 'Telophase II & Cytokinesis',
    cue: 'Nuclei reform and both cells divide, producing four unique haploid gametes.',
  },
];

@Component({
  selector: 'app-meiosis-gamete-selector',
  imports: [CellChromosomeViewportComponent, CellModelComponent],
  templateUrl: './meiosis-gamete-selector.component.html',
  styleUrl: './meiosis-gamete-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeiosisGameteSelectorComponent implements OnDestroy {
  readonly parent = input.required<DragonParentProfile>();
  readonly sex = input.required<DragonSex>();
  readonly targetTraitId = input.required<DragonTraitId>();
  readonly baseSeed = input.required<string>();
  readonly roleLabel = input.required<string>();
  readonly gameteSelected = output<SelectedMeiosisGamete>();
  readonly runChanged = output<MeiosisRun>();

  readonly phases = PHASES;
  readonly phaseIndex = signal(0);
  readonly playing = signal(false);
  readonly slowCrossing = signal(false);
  readonly runNumber = signal(1);
  readonly chosenGameteIndex = signal<number | null>(null);
  readonly reason = signal('');
  readonly run = signal<MeiosisRun | null>(null);
  readonly inspectedChromosomeByGamete = signal<Readonly<Record<string, string>>>({});
  readonly inspectedLocusByGamete = signal<Readonly<Record<string, string>>>({});

  readonly phase = computed(() => PHASES[this.phaseIndex()]);
  readonly complete = computed(() => this.phaseIndex() === PHASES.length - 1);
  readonly targetTrait = computed(() => getTrait(this.targetTraitId()));
  readonly chosenGamete = computed(() => {
    const index = this.chosenGameteIndex();
    return index === null ? null : (this.run()?.gametes[index] ?? null);
  });
  /** The cells the shared cell model draws for the current phase. */
  readonly stageView = computed<MeiosisStageView>(() =>
    meiosisStageView(this.run(), this.phaseIndex()),
  );
  readonly crossingOver = computed(
    () =>
      this.phaseIndex() === 2 &&
      (this.run()?.chromosomePairs ?? []).some((pair) => pair.crossoverPosition !== null),
  );
  readonly gameteChromosomeViews = computed<
    ReadonlyMap<string, readonly CellChromosomeViewportItem[]>
  >(
    () =>
      new Map(
        (this.run()?.gametes ?? []).map((gamete) => [
          gamete.id,
          meiosisGameteViewportItems(gamete.chromosomes),
        ]),
      ),
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const parent = this.parent();
      const sex = this.sex();
      const target = this.targetTraitId();
      const seed = `${this.baseSeed()}:${parent.id}:${sex}:${this.runNumber()}`;
      const nextRun = generateMeiosisRun(parent, sex, seed, target);
      this.run.set(nextRun);
      this.phaseIndex.set(0);
      this.playing.set(false);
      this.chosenGameteIndex.set(null);
      this.inspectedChromosomeByGamete.set({});
      this.inspectedLocusByGamete.set({});
      this.reason.set('');
      this.runChanged.emit(nextRun);
      this.stopTimer();
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  togglePlaying(): void {
    if (this.complete()) {
      this.restartAnimation();
      this.playing.set(true);
    } else {
      this.playing.update((value) => !value);
    }
    if (this.playing()) this.scheduleAdvance();
    else this.stopTimer();
  }

  previous(): void {
    this.playing.set(false);
    this.stopTimer();
    this.setPhase(Math.max(0, this.phaseIndex() - 1));
  }

  next(): void {
    this.playing.set(false);
    this.stopTimer();
    this.setPhase(Math.min(PHASES.length - 1, this.phaseIndex() + 1));
  }

  finishMeiosis(): void {
    this.playing.set(false);
    this.stopTimer();
    this.setPhase(PHASES.length - 1);
  }

  restartAnimation(): void {
    this.playing.set(false);
    this.stopTimer();
    this.setPhase(0);
  }

  rerunMeiosis(): void {
    this.runNumber.update((value) => value + 1);
  }

  choose(index: number): void {
    if (!this.complete()) return;
    this.chosenGameteIndex.set(index);
  }

  chooseAndSend(index: number): void {
    this.choose(index);
    this.sendChosenGamete();
  }

  sendChosenGamete(): void {
    const run = this.run();
    const gamete = this.chosenGamete();
    if (!run || !gamete) return;
    this.gameteSelected.emit({
      run,
      gamete,
      reason: this.reason().trim(),
      selectedAtIso: new Date().toISOString(),
    });
  }

  startGameteDrag(event: DragEvent, gamete: MeiosisGamete): void {
    if (!event.dataTransfer || !this.complete()) return;
    this.choose(gamete.index);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(MEIOSIS_GAMETE_DRAG_TYPE, gamete.id);
    event.dataTransfer.setData('text/plain', gamete.id);
  }

  alleleSummary(gamete: MeiosisGamete): string {
    return gameteAlleleSummary(gamete);
  }

  isRecombinant(gamete: MeiosisGamete): boolean {
    return gamete.chromosomes.some((chromosome) => chromosome.recombinant);
  }

  chromosomesForGamete(gameteId: string): readonly CellChromosomeViewportItem[] {
    return this.gameteChromosomeViews().get(gameteId) ?? [];
  }

  inspectedChromosome(gameteId: string): string | null {
    const targetChromosome = `Chr ${this.targetTrait().chromosomeModel}`;
    const chromosomes = this.chromosomesForGamete(gameteId);
    return (
      this.inspectedChromosomeByGamete()[gameteId] ??
      chromosomes.find((item) => item.id === targetChromosome)?.id ??
      chromosomes[0]?.id ??
      null
    );
  }

  inspectedLocus(gameteId: string): string | null {
    const selected = this.inspectedLocusByGamete()[gameteId];
    if (selected) return selected;
    const chromosomeId = this.inspectedChromosome(gameteId);
    const loci = this.chromosomesForGamete(gameteId).find(
      (item) => item.id === chromosomeId,
    )?.model.loci;
    return (
      loci?.find((locus) => locus.label === this.targetTrait().geneSymbol)?.label ??
      loci?.[0]?.label ??
      null
    );
  }

  inspectGameteChromosome(gameteId: string, chromosomeId: string): void {
    this.inspectedChromosomeByGamete.update((current) => ({
      ...current,
      [gameteId]: chromosomeId,
    }));
    const firstLocus = this.chromosomesForGamete(gameteId).find(
      (item) => item.id === chromosomeId,
    )?.model.loci[0]?.label;
    this.inspectedLocusByGamete.update((current) => {
      if (firstLocus) return { ...current, [gameteId]: firstLocus };
      const remaining: Record<string, string> = { ...current };
      delete remaining[gameteId];
      return remaining;
    });
  }

  inspectGameteLocus(gameteId: string, selection: CellChromosomeLocusSelection): void {
    this.inspectedChromosomeByGamete.update((current) => ({
      ...current,
      [gameteId]: selection.chromosomeId,
    }));
    this.inspectedLocusByGamete.update((current) => ({
      ...current,
      [gameteId]: selection.locus,
    }));
  }

  geneAnalysisForGamete(gameteId: string): GameteGeneAnalysis | null {
    const gamete = this.run()?.gametes.find((candidate) => candidate.id === gameteId);
    const chromosomeId = this.inspectedChromosome(gameteId);
    const locus = this.inspectedLocus(gameteId);
    const chromosome = gamete?.chromosomes.find((candidate) => candidate.chromosome === chromosomeId);
    const allele = chromosome?.loci.find((candidate) => candidate.geneSymbol === locus);
    if (!chromosome || !allele) return null;
    return {
      chromosome: chromosome.sexChromosome === 'Y' ? 'Chr Y' : chromosome.chromosome,
      traitName: allele.traitName,
      geneSymbol: allele.geneSymbol,
      allele: allele.allele,
      dominance: allele.dominance,
      recombinant: chromosome.recombinant,
    };
  }

  trackPhase(index: number): number {
    return index;
  }

  private setPhase(index: number): void {
    this.phaseIndex.set(index);
    if (this.playing()) this.scheduleAdvance();
  }

  private scheduleAdvance(): void {
    this.stopTimer();
    if (!this.playing() || this.complete()) {
      this.playing.set(false);
      return;
    }
    // The camera takes 900ms to move and the chromosomes 620ms to travel, so a
    // phase has to outlast both or the animation reads as a cut.
    const phaseDuration: Partial<Record<number, number>> = {
      1: 2400,
      2: 2800,
      4: 3400,
      5: 3000,
      8: 3400,
    };
    const delay =
      this.phaseIndex() === 2 && this.slowCrossing()
        ? 4200
        : (phaseDuration[this.phaseIndex()] ?? 1900);
    this.timer = setTimeout(() => this.setPhase(this.phaseIndex() + 1), delay);
  }

  private stopTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
