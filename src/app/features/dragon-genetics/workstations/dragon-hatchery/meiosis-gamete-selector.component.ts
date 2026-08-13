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
import {
  DragonParentProfile,
  DragonTraitId,
} from '../../simulation/domain/dragon-lab.models';
import { getTrait } from '../../simulation/domain/dragon-inheritance';
import { generateMeiosisRun, gameteAlleleSummary } from './meiosis-gamete.domain';
import {
  MEIOSIS_GAMETE_DRAG_TYPE,
  MeiosisChromosomePair,
  MeiosisGamete,
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
  readonly inspectedGameteIndex = signal<number | null>(null);
  readonly chosenGameteIndex = signal<number | null>(null);
  readonly reason = signal('');
  readonly run = signal<MeiosisRun | null>(null);
  readonly phase = computed(() => PHASES[this.phaseIndex()]);
  readonly complete = computed(() => this.phaseIndex() === PHASES.length - 1);
  readonly inspectedGamete = computed(() => {
    const index = this.inspectedGameteIndex();
    return index === null ? null : (this.run()?.gametes[index] ?? null);
  });
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
      this.inspectedGameteIndex.set(null);
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

  inspect(index: number): void {
    if (!this.complete()) return;
    this.inspectedGameteIndex.set(index);
  }

  choose(index: number): void {
    if (!this.complete()) return;
    this.chosenGameteIndex.set(index);
    this.inspectedGameteIndex.set(index);
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
    context.setTransform(ratio * width / 1000, 0, 0, ratio * height / 560, 0, 0);
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
      const x = (index * 197) % 980 + 10;
      const y = (index * 83) % 535 + 12;
      context.beginPath();
      context.arc(x, y, 2 + index % 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawPhase(
    context: CanvasRenderingContext2D,
    run: MeiosisRun,
    time: number,
  ): void {
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
      const height = pair.length * 1.35;
      this.drawRod(context, x - 17, 292 - height / 2, height, '#29c8e8', pair.chromatids[0].loci);
      this.drawRod(context, x + 17, 292 - height / 2, height, '#f06ca9', pair.chromatids[3].loci);
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
      const height = pair.length * 1.35;
      this.drawXChromosome(context, centerX - spread, 292, height, '#29c8e8', pair.chromatids[0].loci);
      this.drawXChromosome(context, centerX + spread, 292, height, '#f06ca9', pair.chromatids[3].loci);
      if (paired && pair.crossoverPosition !== null) {
        const crossoverY = 292 - height / 2 + height * pair.crossoverPosition;
        context.fillStyle = '#ffe99a';
        context.beginPath();
        context.arc(centerX, crossoverY, 5, 0, Math.PI * 2);
        context.fill();
      }
      this.drawLabel(context, pair.chromosome.replace('Chr ', ''), centerX, 414);
    });
  }

  private drawCrossingOver(
    context: CanvasRenderingContext2D,
    run: MeiosisRun,
    time: number,
  ): void {
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
        pair.chromatids.forEach((chromatid, chromatidIndex) =>
          this.drawSegmentedRod(context, positions[chromatidIndex], top, height, chromatid.loci),
        );
      } else {
        this.drawSegmentedRod(context, positions[0], top, height, pair.chromatids[0].loci);
        this.drawSegmentedRod(context, positions[3], top, height, pair.chromatids[3].loci);
        const splitY = top + height * crossover;
        this.drawRodSection(context, positions[1], top, splitY, '#29c8e8');
        this.drawRodSection(context, positions[2], top, splitY, '#f06ca9');
        const arc = Math.sin(progress * Math.PI) * 20;
        this.drawRodSection(
          context,
          positions[1] + (positions[2] - positions[1]) * progress,
          splitY + arc,
          top + height + arc,
          '#29c8e8',
        );
        this.drawRodSection(
          context,
          positions[2] + (positions[1] - positions[2]) * progress,
          splitY - arc,
          top + height - arc,
          '#f06ca9',
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
      );
    });
    pair.chromatids[3].loci.slice(split).forEach((locus) => {
      this.drawAlleleMarker(
        context,
        rightX + (leftX - rightX) * progress,
        top + height * locus.position - arc,
        locus,
      );
    });
  }

  private drawRecombinantComparison(
    context: CanvasRenderingContext2D,
    run: MeiosisRun,
  ): void {
    run.chromosomePairs.forEach((pair, index) => {
      const centerX = 245 + index * 128;
      const height = pair.length * 1.24;
      const top = 284 - height / 2;
      pair.chromatids.forEach((chromatid, chromatidIndex) => {
        this.drawSegmentedRod(context, centerX - 27 + chromatidIndex * 18, top, height, chromatid.loci);
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
      this.drawXChromosome(context, leftX, y, height, '#29c8e8', pair.chromatids[1].loci, 5);
      this.drawXChromosome(context, rightX, y, height, '#f06ca9', pair.chromatids[2].loci, 5);
    });
    this.drawSpindle(context, 280, 292, 170);
    this.drawSpindle(context, 720, 292, 170);
  }

  private drawFourCells(
    context: CanvasRenderingContext2D,
    run: MeiosisRun,
    final: boolean,
  ): void {
    const centers = [[260, 175], [740, 175], [260, 400], [740, 400]] as const;
    centers.forEach(([x, y], gameteIndex) => {
      this.drawCell(context, x, y, final ? 145 : 170, final ? 90 : 105, final);
      const gamete = run.gametes[gameteIndex];
      gamete.chromosomes.forEach((chromosome, chromosomeIndex) => {
        const chromatid = run.chromosomePairs[chromosomeIndex].chromatids.find(
          (candidate) => candidate.id === chromosome.sourceChromatidId,
        );
        const height = run.chromosomePairs[chromosomeIndex].length * 0.48;
        this.drawSegmentedRod(
          context,
          x - 58 + chromosomeIndex * 29,
          y - height / 2,
          height,
          chromatid?.loci ?? chromosome.loci,
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
    color: string,
    loci: readonly MeiosisLocusAllele[],
    lineWidth = 8,
  ): void {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(x - 7, y - height / 2);
    context.lineTo(x + 7, y + height / 2);
    context.moveTo(x + 7, y - height / 2);
    context.lineTo(x - 7, y + height / 2);
    context.stroke();
    loci.forEach((locus) => this.drawAlleleMarker(context, x + 14, y - height / 2 + height * locus.position, locus));
    context.restore();
  }

  private drawRod(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    color: string,
    loci: readonly MeiosisLocusAllele[],
  ): void {
    this.drawRodSection(context, x, top, top + height, color);
    loci.forEach((locus) => this.drawAlleleMarker(context, x + 10, top + height * locus.position, locus));
  }

  private drawSegmentedRod(
    context: CanvasRenderingContext2D,
    x: number,
    top: number,
    height: number,
    loci: readonly MeiosisLocusAllele[],
    lineWidth = 8,
  ): void {
    if (!loci.length) {
      this.drawRodSection(context, x, top, top + height, '#f06ca9', lineWidth);
      this.drawLabel(context, 'Y', x, top + height / 2 + 5);
      return;
    }
    const ordered = [...loci].sort((left, right) => left.position - right.position);
    const boundaries = ordered.map((locus, index) =>
      index === ordered.length - 1 ? 1 : midpoint(locus.position, ordered[index + 1].position),
    );
    let start = 0;
    ordered.forEach((locus, index) => {
      const end = boundaries[index];
      this.drawRodSection(
        context,
        x,
        top + height * start,
        top + height * end,
        locus.origin === 'homolog-a' ? '#29c8e8' : '#f06ca9',
        lineWidth,
      );
      this.drawAlleleMarker(context, x + 9, top + height * locus.position, locus);
      start = end;
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

  private drawAlleleMarker(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    locus: MeiosisLocusAllele,
  ): void {
    context.fillStyle = '#fff7cf';
    context.font = '800 10px ui-monospace, monospace';
    context.textAlign = 'left';
    context.fillText(locus.allele, x, y + 3);
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
