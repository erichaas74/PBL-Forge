import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { DragonParentProfile, DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { getTrait } from '../../simulation/domain/dragon-inheritance';
import {
  ChromosomeBand,
  ChromosomeSvgComponent,
  ChromosomeSvgModel,
} from '../shared/chromosome-svg.component';
import { chromosomeVisual, DRAGON_LOCUS_COLORS } from '../shared/dragon-chromosome.catalog';
import { generateMeiosisRun, gameteAlleleSummary } from './meiosis-gamete.domain';
import {
  MEIOSIS_GAMETE_DRAG_TYPE,
  MeiosisChromosomePair,
  MeiosisGamete,
  MeiosisGameteChromosome,
  MeiosisLocusAllele,
  MeiosisRun,
  SelectedMeiosisGamete,
} from './meiosis-gamete.models';

interface MeiosisPhase {
  name: string;
  cue: string;
}

const PHASES: readonly MeiosisPhase[] = [
  { name: 'Parent cell', cue: 'Five homologous chromosome pairs begin in one diploid cell.' },
  { name: 'S phase', cue: 'Every chromosome replicates into two joined sister chromatids.' },
  { name: 'Prophase I', cue: 'Homologous chromosomes pair to form tetrads.' },
  { name: 'Crossing over', cue: 'Non-sister chromatids exchange matching physical segments.' },
  { name: 'Recombinant check', cue: 'Compare the new allele combinations before division.' },
  { name: 'Meiosis I', cue: 'Homologous chromosomes separate into two cells.' },
  { name: 'Prophase II', cue: 'Each cell prepares for a second division.' },
  { name: 'Metaphase II', cue: 'Chromatids line up independently in both cells.' },
  { name: 'Anaphase II', cue: 'Sister chromatids move to opposite poles.' },
  { name: 'Four gametes', cue: 'Inspect four genetically distinct haploid gametes.' },
];

@Component({
  selector: 'app-meiosis-gamete-selector',
  imports: [ChromosomeSvgComponent],
  templateUrl: './meiosis-gamete-selector.component.html',
  styleUrl: './meiosis-gamete-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeiosisGameteSelectorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('meiosisCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

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
  readonly phase = computed(() => PHASES[this.phaseIndex()]);
  readonly complete = computed(() => this.phaseIndex() === PHASES.length - 1);
  readonly chosenGamete = computed(() => {
    const index = this.chosenGameteIndex();
    return index === null ? null : (this.run()?.gametes[index] ?? null);
  });
  readonly targetTrait = computed(() => getTrait(this.targetTraitId()));

  private timer: ReturnType<typeof setTimeout> | null = null;
  private animationFrame = 0;
  private phaseStartedAt = 0;
  private contextReady = false;

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
      this.reason.set('');
      this.runChanged.emit(nextRun);
      this.stopTimer();
      this.queueDraw();
    });
  }

  ngAfterViewInit(): void {
    this.contextReady = true;
    this.queueDraw();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    cancelAnimationFrame(this.animationFrame);
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

  /** Angular templates cannot hold a predicate, so the crossover check lives here. */
  isRecombinant(gamete: MeiosisGamete): boolean {
    return gamete.chromosomes.some((chromosome) => chromosome.recombinant);
  }

  gameteChromosomeModel(chromosome: MeiosisGameteChromosome): ChromosomeSvgModel {
    const label = this.chromosomeLabel(chromosome.chromosome, chromosome.sexChromosome);
    const visual = chromosomeVisual(label);
    const arm = label.replace('Chr ', '');
    const highlightBands: ChromosomeBand[] = chromosome.loci.map((locus, index) => ({
      start: Math.max(0, locus.position - 0.055),
      end: Math.min(1, locus.position + 0.055),
      color: this.locusColor(label, locus.position, index),
      pattern: locus.dominance === 'dominant' ? 'stripe-a' : 'stripe-b',
      patternPlacement: 'center',
    }));

    return {
      length: visual.length,
      leftLabel: `${arm}p`,
      rightLabel: `${arm}q`,
      centromere: visual.centromere,
      bands: [...visual.bands, ...highlightBands],
      loci: chromosome.loci.map((locus, index) => ({
        position: locus.position,
        label: locus.geneSymbol,
        symbol: locus.allele,
        color: this.locusColor(label, locus.position, index),
      })),
    };
  }

  trackPhase(index: number): number {
    return index;
  }

  private setPhase(index: number): void {
    this.phaseStartedAt = performance.now();
    this.phaseIndex.set(index);
    this.queueDraw();
    if (this.playing()) this.scheduleAdvance();
  }

  private scheduleAdvance(): void {
    this.stopTimer();
    if (!this.playing() || this.complete()) {
      this.playing.set(false);
      return;
    }
    const delay = this.phaseIndex() === 3 && this.slowCrossing() ? 3200 : 1500;
    this.timer = setTimeout(() => {
      this.setPhase(this.phaseIndex() + 1);
    }, delay);
  }

  private stopTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private queueDraw(): void {
    if (!this.contextReady) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame((time) => this.draw(time));
  }

  private draw(time: number): void {
    const canvas = this.canvasRef?.nativeElement;
    const run = this.run();
    if (!canvas || !run) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(720, Math.round(rect.width || 960));
    const height = Math.round(width * 0.56);
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform((ratio * width) / 1000, 0, 0, (ratio * height) / 560, 0, 0);
    this.drawBackground(context);
    this.drawPhase(context, run, time);

    if (this.phaseIndex() === 3) {
      const duration = this.slowCrossing() ? 3000 : 1250;
      if (time - this.phaseStartedAt < duration) this.queueDraw();
    }
  }

  private drawBackground(context: CanvasRenderingContext2D): void {
    const gradient = context.createRadialGradient(500, 280, 40, 500, 280, 600);
    gradient.addColorStop(0, '#2d2351');
    gradient.addColorStop(0.58, '#17142f');
    gradient.addColorStop(1, '#090b1b');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1000, 560);
    context.fillStyle = 'rgba(145, 119, 205, 0.12)';
    for (let index = 0; index < 32; index += 1) {
      const x = ((index * 197) % 980) + 10;
      const y = ((index * 83) % 535) + 12;
      context.beginPath();
      context.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawPhase(context: CanvasRenderingContext2D, run: MeiosisRun, time: number): void {
    const phase = this.phaseIndex();
    if (phase <= 4) {
      this.drawCell(context, 500, 292, 430, 225, phase < 1);
      if (phase === 0) this.drawUnreplicatedPairs(context, run);
      else if (phase === 1) this.drawReplicatedPairs(context, run, false);
      else if (phase === 2) this.drawReplicatedPairs(context, run, true);
      else if (phase === 3) this.drawCrossingOver(context, run, time);
      else this.drawRecombinantComparison(context, run);
      return;
    }
    if (phase <= 7) {
      this.drawTwoCells(context, run, phase);
      return;
    }
    this.drawFourCells(context, run, phase === 9);
  }

  private drawCell(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    nucleus: boolean,
  ): void {
    context.save();
    context.strokeStyle = '#65598f';
    context.lineWidth = 4;
    context.fillStyle = 'rgba(55, 44, 91, 0.26)';
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (nucleus) {
      context.strokeStyle = 'rgba(181, 160, 231, .42)';
      context.setLineDash([9, 8]);
      context.beginPath();
      context.ellipse(x, y, radiusX * 0.72, radiusY * 0.75, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  private drawUnreplicatedPairs(context: CanvasRenderingContext2D, run: MeiosisRun): void {
    run.chromosomePairs.forEach((pair, index) => {
      const x = 245 + index * 128;
      const homologA = pair.chromatids[0];
      const homologB = pair.chromatids[3];
      const heightA = this.chromatidHeight(
        pair.length * 1.35,
        pair.chromosome,
        homologA.sexChromosome,
      );
      const heightB = this.chromatidHeight(
        pair.length * 1.35,
        pair.chromosome,
        homologB.sexChromosome,
      );
      this.drawRod(
        context,
        x - 17,
        292 - heightA / 2,
        heightA,
        this.chromosomeLabel(pair.chromosome, homologA.sexChromosome),
        homologA.loci,
        homologA.origin,
      );
      this.drawRod(
        context,
        x + 17,
        292 - heightB / 2,
        heightB,
        this.chromosomeLabel(pair.chromosome, homologB.sexChromosome),
        homologB.loci,
        homologB.origin,
      );
      this.drawLabel(context, pair.chromosome.replace('Chr ', ''), x, 402);
    });
  }

  private drawReplicatedPairs(
    context: CanvasRenderingContext2D,
    run: MeiosisRun,
    paired: boolean,
  ): void {
    run.chromosomePairs.forEach((pair, index) => {
      const centerX = 245 + index * 128;
      const spread = paired ? 16 : 30;
      const homologA = pair.chromatids[0];
      const homologB = pair.chromatids[3];
      const heightA = this.chromatidHeight(
        pair.length * 1.35,
        pair.chromosome,
        homologA.sexChromosome,
      );
      const heightB = this.chromatidHeight(
        pair.length * 1.35,
        pair.chromosome,
        homologB.sexChromosome,
      );
      this.drawXChromosome(
        context,
        centerX - spread,
        292,
        heightA,
        this.chromosomeLabel(pair.chromosome, homologA.sexChromosome),
        homologA.loci,
        homologA.origin,
      );
      this.drawXChromosome(
        context,
        centerX + spread,
        292,
        heightB,
        this.chromosomeLabel(pair.chromosome, homologB.sexChromosome),
        homologB.loci,
        homologB.origin,
      );
      if (paired && pair.crossoverPosition !== null) {
        const crossoverY = 292 - heightA / 2 + heightA * pair.crossoverPosition;
        context.fillStyle = '#ffe99a';
        context.beginPath();
        context.arc(centerX, crossoverY, 5, 0, Math.PI * 2);
        context.fill();
      }
      this.drawLabel(context, pair.chromosome.replace('Chr ', ''), centerX, 414);
    });
  }

  private drawCrossingOver(context: CanvasRenderingContext2D, run: MeiosisRun, time: number): void {
    const duration = this.slowCrossing() ? 3000 : 1250;
    const raw = Math.min(1, Math.max(0, (time - this.phaseStartedAt) / duration));
    const progress = raw * raw * (3 - 2 * raw);
    run.chromosomePairs.forEach((pair, index) => {
      const centerX = 245 + index * 128;
      const height = pair.length * 1.35;
      const top = 292 - height / 2;
      const positions = [centerX - 27, centerX - 9, centerX + 9, centerX + 27];
      const crossover = pair.crossoverPosition;
      if (crossover === null || pair.chromatids[1].loci.length === 0) {
        pair.chromatids.forEach((chromatid, chromatidIndex) => {
          const chromatidHeight = this.chromatidHeight(
            height,
            pair.chromosome,
            chromatid.sexChromosome,
          );
          this.drawSegmentedRod(
            context,
            positions[chromatidIndex],
            292 - chromatidHeight / 2,
            chromatidHeight,
            this.chromosomeLabel(pair.chromosome, chromatid.sexChromosome),
            chromatid.loci,
            chromatid.origin,
          );
        });
      } else {
        this.drawSegmentedRod(
          context,
          positions[0],
          top,
          height,
          pair.chromosome,
          pair.chromatids[0].loci,
          pair.chromatids[0].origin,
        );
        this.drawSegmentedRod(
          context,
          positions[3],
          top,
          height,
          pair.chromosome,
          pair.chromatids[3].loci,
          pair.chromatids[3].origin,
        );
        this.drawChromosomeSegment(
          context,
          positions[1],
          top,
          height,
          pair.chromosome,
          0,
          crossover,
          'homolog-a',
        );
        this.drawChromosomeSegment(
          context,
          positions[2],
          top,
          height,
          pair.chromosome,
          0,
          crossover,
          'homolog-b',
        );
        const arc = Math.sin(progress * Math.PI) * 20;
        this.drawChromosomeSegment(
          context,
          positions[1] + (positions[2] - positions[1]) * progress,
          top + arc,
          height,
          pair.chromosome,
          crossover,
          1,
          'homolog-a',
        );
        this.drawChromosomeSegment(
          context,
          positions[2] + (positions[1] - positions[2]) * progress,
          top - arc,
          height,
          pair.chromosome,
          crossover,
          1,
          'homolog-b',
        );
        this.drawMovingLoci(context, pair, positions[1], positions[2], top, height, progress, arc);
      }
      this.drawLabel(context, pair.chromosome.replace('Chr ', ''), centerX, 414);
    });
    context.fillStyle = 'rgba(255,255,255,.86)';
    context.font = '600 15px system-ui';
    context.textAlign = 'center';
    context.fillText('Matching segments detach, cross, and reconnect', 500, 505);
  }

  private drawMovingLoci(
    context: CanvasRenderingContext2D,
    pair: MeiosisChromosomePair,
    leftX: number,
    rightX: number,
    top: number,
    height: number,
    progress: number,
    arc: number,
  ): void {
    const split = pair.crossoverAfterLocusIndex ?? pair.chromatids[0].loci.length;
    pair.chromatids[0].loci.slice(split).forEach((locus) => {
      this.drawAlleleMarker(
        context,
        leftX + (rightX - leftX) * progress,
        top + height * locus.position + arc,
        locus,
        pair.chromosome,
      );
    });
    pair.chromatids[3].loci.slice(split).forEach((locus) => {
      this.drawAlleleMarker(
        context,
        rightX + (leftX - rightX) * progress,
        top + height * locus.position - arc,
        locus,
        pair.chromosome,
      );
    });
  }

  private drawRecombinantComparison(context: CanvasRenderingContext2D, run: MeiosisRun): void {
    run.chromosomePairs.forEach((pair, index) => {
      const centerX = 245 + index * 128;
      const height = pair.length * 1.24;
      pair.chromatids.forEach((chromatid, chromatidIndex) => {
        const chromatidHeight = this.chromatidHeight(
          height,
          pair.chromosome,
          chromatid.sexChromosome,
        );
        this.drawSegmentedRod(
          context,
          centerX - 27 + chromatidIndex * 18,
          284 - chromatidHeight / 2,
          chromatidHeight,
          this.chromosomeLabel(pair.chromosome, chromatid.sexChromosome),
          chromatid.loci,
          chromatid.origin,
        );
      });
      if (pair.crossoverPosition !== null) {
        context.fillStyle = '#ffe99a';
        context.font = '700 12px system-ui';
        context.textAlign = 'center';
        context.fillText('RECOMBINANT', centerX, 410);
      }
      this.drawLabel(context, pair.chromosome.replace('Chr ', ''), centerX, 438);
    });
  }

  private drawTwoCells(context: CanvasRenderingContext2D, run: MeiosisRun, phase: number): void {
    this.drawCell(context, 280, 292, 200, 210, false);
    this.drawCell(context, 720, 292, 200, 210, false);
    context.strokeStyle = 'rgba(166,141,225,.45)';
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(500, 82);
    context.lineTo(500, 500);
    context.stroke();
    context.setLineDash([]);
    run.chromosomePairs.forEach((pair, index) => {
      const y = 170 + index * 61;
      const height = pair.length * 0.46;
      const leftX = phase === 7 ? 280 : 245 + (index % 2) * 56;
      const rightX = phase === 7 ? 720 : 685 + (index % 2) * 56;
      const leftChromatid = pair.chromatids[1];
      const rightChromatid = pair.chromatids[2];
      const leftHeight = this.chromatidHeight(height, pair.chromosome, leftChromatid.sexChromosome);
      const rightHeight = this.chromatidHeight(
        height,
        pair.chromosome,
        rightChromatid.sexChromosome,
      );
      this.drawXChromosome(
        context,
        leftX,
        y,
        leftHeight,
        this.chromosomeLabel(pair.chromosome, leftChromatid.sexChromosome),
        leftChromatid.loci,
        leftChromatid.origin,
        5,
      );
      this.drawXChromosome(
        context,
        rightX,
        y,
        rightHeight,
        this.chromosomeLabel(pair.chromosome, rightChromatid.sexChromosome),
        rightChromatid.loci,
        rightChromatid.origin,
        5,
      );
    });
    this.drawSpindle(context, 280, 292, 170);
    this.drawSpindle(context, 720, 292, 170);
  }

  private drawFourCells(context: CanvasRenderingContext2D, run: MeiosisRun, final: boolean): void {
    const centers = [
      [260, 175],
      [740, 175],
      [260, 400],
      [740, 400],
    ] as const;
    centers.forEach(([x, y], gameteIndex) => {
      this.drawCell(context, x, y, final ? 145 : 170, final ? 90 : 105, final);
      const gamete = run.gametes[gameteIndex];
      gamete.chromosomes.forEach((chromosome, chromosomeIndex) => {
        const chromatid = run.chromosomePairs[chromosomeIndex].chromatids.find(
          (candidate) => candidate.id === chromosome.sourceChromatidId,
        );
        const pair = run.chromosomePairs[chromosomeIndex];
        const height = this.chromatidHeight(
          pair.length * 0.48,
          pair.chromosome,
          chromosome.sexChromosome,
        );
        this.drawSegmentedRod(
          context,
          x - 58 + chromosomeIndex * 29,
          y - height / 2,
          height,
          this.chromosomeLabel(chromosome.chromosome, chromosome.sexChromosome),
          chromatid?.loci ?? chromosome.loci,
          chromatid?.origin ?? chromosome.loci[0]?.origin ?? 'homolog-b',
          6,
        );
      });
      if (final) {
        context.fillStyle = '#f4efff';
        context.font = '700 14px system-ui';
        context.textAlign = 'center';
        context.fillText(`GAMETE ${gameteIndex + 1}`, x, y + 72);
      }
    });
  }

  private drawSpindle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
  ): void {
    context.strokeStyle = 'rgba(117, 231, 196, .32)';
    context.lineWidth = 1.5;
    for (let index = -2; index <= 2; index += 1) {
      context.beginPath();
      context.moveTo(x - width / 2, y + index * 12);
      context.quadraticCurveTo(x, y + index * 4, x + width / 2, y - index * 12);
      context.stroke();
    }
    context.fillStyle = '#75e7c4';
    context.fillRect(x - width / 2 - 6, y - 18, 5, 36);
    context.fillRect(x + width / 2 + 1, y - 18, 5, 36);
  }

  private drawXChromosome(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    chromosome: string,
    loci: readonly MeiosisLocusAllele[],
    origin: 'homolog-a' | 'homolog-b',
    lineWidth = 8,
  ): void {
    const angle = Math.atan2(14, Math.max(height, 1));
    [-angle, angle].forEach((rotation) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      this.drawChromosomeSegment(
        context,
        0,
        -height / 2,
        height,
        chromosome,
        0,
        1,
        origin,
        lineWidth,
      );
      context.restore();
    });
    loci.forEach((locus, index) => {
      this.drawAlleleMarker(
        context,
        x,
        y - height / 2 + height * locus.position,
        locus,
        chromosome,
        lineWidth,
        index,
      );
    });
  }

  private drawRod(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    chromosome: string,
    loci: readonly MeiosisLocusAllele[],
    origin: 'homolog-a' | 'homolog-b',
    lineWidth = 8,
  ): void {
    this.drawChromosomeSegment(context, x, top, height, chromosome, 0, 1, origin, lineWidth);
    this.drawLocusHighlights(context, x, top, height, chromosome, loci, lineWidth);
  }

  private drawSegmentedRod(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    chromosome: string,
    loci: readonly MeiosisLocusAllele[],
    fallbackOrigin: 'homolog-a' | 'homolog-b',
    lineWidth = 8,
  ): void {
    if (!loci.length) {
      this.drawChromosomeSegment(
        context,
        x,
        top,
        height,
        chromosome,
        0,
        1,
        fallbackOrigin,
        lineWidth,
      );
      return;
    }
    const ordered = [...loci].sort((left, right) => left.position - right.position);
    const boundaries = ordered.map((locus, index) =>
      index === ordered.length - 1 ? 1 : midpoint(locus.position, ordered[index + 1].position),
    );
    let start = 0;
    ordered.forEach((locus, index) => {
      const end = boundaries[index];
      this.drawChromosomeSegment(
        context,
        x,
        top,
        height,
        chromosome,
        start,
        end,
        locus.origin,
        lineWidth,
      );
      start = end;
    });
    this.drawLocusHighlights(context, x, top, height, chromosome, ordered, lineWidth);
  }

  private drawChromosomeSegment(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    chromosome: string,
    start: number,
    end: number,
    origin: 'homolog-a' | 'homolog-b',
    lineWidth = 8,
  ): void {
    const visual = chromosomeVisual(chromosome);
    const segmentStart = Math.max(0, Math.min(1, start));
    const segmentEnd = Math.max(segmentStart, Math.min(1, end));
    const startY = top + height * segmentStart;
    const endY = top + height * segmentEnd;
    this.drawRodSection(
      context,
      x,
      startY,
      endY,
      origin === 'homolog-a' ? '#29c8e8' : '#f06ca9',
      lineWidth + 4,
    );

    visual.bands.forEach((band) => {
      const bandStart = Math.max(segmentStart, band.start);
      const bandEnd = Math.min(segmentEnd, band.end);
      if (bandEnd <= bandStart) return;
      const bandStartY = top + height * bandStart;
      const bandEndY = top + height * bandEnd;
      this.drawRodSection(context, x, bandStartY, bandEndY, band.color, lineWidth);
      if (band.pattern === 'hatch') {
        this.drawHatch(context, x, bandStartY, bandEndY, lineWidth);
      }
    });

    if (visual.centromere >= segmentStart && visual.centromere <= segmentEnd) {
      const centromereY = top + height * visual.centromere;
      context.save();
      context.strokeStyle = '#564b40';
      context.lineWidth = Math.max(1, lineWidth * 0.16);
      context.beginPath();
      context.moveTo(x - lineWidth * 0.62, centromereY);
      context.lineTo(x + lineWidth * 0.62, centromereY);
      context.stroke();
      context.restore();
    }
  }

  private drawLocusHighlights(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    chromosome: string,
    loci: readonly MeiosisLocusAllele[],
    lineWidth: number,
  ): void {
    loci.forEach((locus, index) => {
      const color = this.locusColor(chromosome, locus.position, index);
      const startY = top + height * Math.max(0, locus.position - 0.055);
      const endY = top + height * Math.min(1, locus.position + 0.055);
      this.drawRodSection(context, x, startY, endY, color, lineWidth);
      this.drawAlleleStripe(context, x, startY, endY, lineWidth, locus.dominance === 'dominant');
      this.drawAlleleMarker(
        context,
        x,
        top + height * locus.position,
        locus,
        chromosome,
        lineWidth,
        index,
      );
    });
  }

  private drawRodSection(
    context: CanvasRenderingContext2D,
    x: number,
    startY: number,
    endY: number,
    color: string,
    lineWidth = 8,
  ): void {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(x, startY);
    context.lineTo(x, endY);
    context.stroke();
  }

  private drawHatch(
    context: CanvasRenderingContext2D,
    x: number,
    startY: number,
    endY: number,
    lineWidth: number,
  ): void {
    context.save();
    context.beginPath();
    context.rect(x - lineWidth / 2, startY, lineWidth, Math.max(0.5, endY - startY));
    context.clip();
    context.strokeStyle = '#a46947';
    context.lineWidth = 0.8;
    for (let y = startY - lineWidth; y <= endY + lineWidth; y += 3.5) {
      context.beginPath();
      context.moveTo(x - lineWidth / 2, y + lineWidth / 2);
      context.lineTo(x + lineWidth / 2, y - lineWidth / 2);
      context.stroke();
    }
    context.restore();
  }

  private drawAlleleStripe(
    context: CanvasRenderingContext2D,
    x: number,
    startY: number,
    endY: number,
    lineWidth: number,
    dominant: boolean,
  ): void {
    context.save();
    context.beginPath();
    context.rect(x - lineWidth / 2, startY, lineWidth, Math.max(0.5, endY - startY));
    context.clip();
    context.strokeStyle = 'rgba(255, 255, 255, .72)';
    context.lineWidth = Math.max(0.7, lineWidth * 0.12);
    const direction = dominant ? 1 : -1;
    for (let y = startY - lineWidth; y <= endY + lineWidth; y += 3.2) {
      context.beginPath();
      context.moveTo(x - lineWidth / 2, y);
      context.lineTo(x + lineWidth / 2, y + direction * lineWidth);
      context.stroke();
    }
    context.restore();
  }

  private drawAlleleMarker(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    locus: MeiosisLocusAllele,
    chromosome: string,
    lineWidth = 8,
    fallbackIndex = 0,
  ): void {
    const color = this.locusColor(chromosome, locus.position, fallbackIndex);
    const radius = lineWidth <= 6 ? 3.6 : 4.5;
    const markerX = x + lineWidth / 2 + radius + 2;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(x - lineWidth * 0.62, y);
    context.lineTo(markerX, y);
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.arc(markerX, y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#101126';
    context.font = `800 ${lineWidth <= 6 ? 7 : 9}px ui-monospace, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(locus.allele, markerX, y + 0.25);
    context.restore();
  }

  private chromosomeLabel(chromosome: string, sexChromosome: 'X' | 'Y' | null): string {
    return sexChromosome === 'Y' ? 'Chr Y' : chromosome;
  }

  private chromatidHeight(
    baseHeight: number,
    chromosome: string,
    sexChromosome: 'X' | 'Y' | null,
  ): number {
    const displayChromosome = this.chromosomeLabel(chromosome, sexChromosome);
    if (displayChromosome === chromosome) return baseHeight;
    return (
      (baseHeight * chromosomeVisual(displayChromosome).length) /
      chromosomeVisual(chromosome).length
    );
  }

  private locusColor(chromosome: string, position: number, fallbackIndex: number): string {
    const positions = chromosomeVisual(chromosome).locusPositions;
    const matchedIndex = positions.findIndex((candidate) => Math.abs(candidate - position) < 0.001);
    const index = matchedIndex >= 0 ? matchedIndex : fallbackIndex;
    return DRAGON_LOCUS_COLORS[index % DRAGON_LOCUS_COLORS.length];
  }

  private drawLabel(context: CanvasRenderingContext2D, label: string, x: number, y: number): void {
    context.fillStyle = 'rgba(235,229,255,.74)';
    context.font = '700 12px system-ui';
    context.textAlign = 'center';
    context.fillText(label, x, y);
  }
}

function midpoint(first: number, second: number): number {
  return (first + second) / 2;
}
