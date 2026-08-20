import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AminoAcidVisual,
  aminoAcidVisual as aminoAcidVisualFor,
} from './amino-acid-chemistry.models';
import { RnaTranslationStep, rnaSequence, translateRna } from './dna-process.models';

type TranslationPhase = 'ready' | 'docking' | 'bonding' | 'translocating' | 'released';

interface FoldPosition {
  x: number;
  y: number;
}

interface FoldedAminoAcid extends RnaTranslationStep, AminoAcidVisual, FoldPosition {
  index: number;
}

const RNA_ANTICODON: Readonly<Record<string, string>> = {
  A: 'U',
  U: 'A',
  C: 'G',
  G: 'C',
};

const FOLDED_POSITIONS: readonly FoldPosition[] = [
  { x: 10, y: 70 },
  { x: 23, y: 43 },
  { x: 37, y: 69 },
  { x: 51, y: 34 },
  { x: 65, y: 58 },
  { x: 79, y: 33 },
  { x: 89, y: 61 },
  { x: 73, y: 82 },
];

@Component({
  selector: 'app-rna-translation-animation',
  templateUrl: './rna-translation-animation.component.html',
  styleUrl: './rna-translation-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RnaTranslationAnimationComponent implements OnDestroy {
  readonly sequence = input('AUGCCGUACCGAGCUACCGGAUCA');
  readonly autoplay = input(false);
  readonly translationCompleted = output<void>();

  readonly mrna = computed(() => rnaSequence(this.sequence()));
  readonly translation = computed(() => translateRna(this.mrna()));
  readonly steps = computed(() => this.translation().steps);
  readonly progress = signal(0);
  readonly playing = signal(false);
  readonly phase = signal<TranslationPhase>('ready');
  readonly speed = signal<1 | 2>(1);
  readonly phaseDuration = computed(() => `${this.phaseDurationMs / this.speed()}ms`);
  readonly complete = computed(() => this.progress() >= this.steps().length);
  readonly activeIndex = computed(() =>
    this.steps().length ? Math.min(this.progress(), this.steps().length - 1) : -1,
  );
  readonly trackOffset = computed(() => `${Math.max(0, this.activeIndex()) * -7.2}rem`);
  readonly activeStep = computed<RnaTranslationStep | null>(
    () => this.steps()[this.activeIndex()] ?? null,
  );
  readonly previousStep = computed<RnaTranslationStep | null>(() => {
    const index = this.progress() - 1;
    return index >= 0 ? (this.steps()[index] ?? null) : null;
  });
  readonly activeAminoAcidAttached = computed(
    () => this.phase() === 'bonding' || this.phase() === 'translocating',
  );
  readonly protein = computed(() =>
    this.steps()
      .slice(0, this.progress() + (this.activeAminoAcidAttached() ? 1 : 0))
      .filter((step) => !step.stop),
  );
  readonly foldAmount = computed(() => {
    const total = Math.max(1, this.steps().filter((step) => !step.stop).length);
    return Math.max(0, Math.min(1, (this.protein().length - 2) / Math.max(1, total - 2)));
  });
  readonly foldedProtein = computed<readonly FoldedAminoAcid[]>(() => {
    const amount = this.foldAmount();
    return this.protein().map((step, index) => {
      const straight = {
        x: 8 + (index * 84) / Math.max(1, this.steps().length - 1),
        y: 64,
      };
      const folded = FOLDED_POSITIONS[index] ?? straight;
      return {
        ...step,
        ...this.aminoAcidVisual(step.shortName),
        index,
        x: straight.x + (folded.x - straight.x) * amount,
        y: straight.y + (folded.y - straight.y) * amount,
      };
    });
  });
  readonly backbonePath = computed(() => proteinBackbonePath(this.foldedProtein()));
  readonly hydrophobicInteraction = computed(() => {
    const residues = this.foldedProtein();
    const first = residues.find((residue) => residue.group === 'hydrophobic');
    const last = [...residues].reverse().find((residue) => residue.group === 'hydrophobic');
    return first && last && first.index !== last.index && this.foldAmount() > 0.45
      ? { x1: first.x, y1: first.y, x2: last.x, y2: last.y }
      : null;
  });
  readonly foldLabel = computed(() => {
    if (!this.protein().length) return 'Peptide has not started';
    if (this.protein().length < 3) return 'Primary chain extending';
    if (!this.complete()) return 'Side chains are bending the chain';
    return 'Compact peptide fold formed';
  });
  readonly phaseLabel = computed(() => {
    if (this.complete() || this.phase() === 'released') return 'Translation complete';
    if (!this.playing() && this.phase() === 'ready') return 'System paused';

    const active = this.activeStep();
    if (active?.stop) {
      if (this.phase() === 'docking') return 'Release factor arriving';
      if (this.phase() === 'bonding') return 'Protein being released';
    }

    switch (this.phase()) {
      case 'docking':
        return 'Matching tRNA arriving';
      case 'bonding':
        return 'Attaching amino acid';
      case 'translocating':
        return 'Ribosome shifting 3 bases';
      default:
        return this.playing() ? 'Translation starting' : 'System paused';
    }
  });
  readonly status = computed(() => {
    const active = this.activeStep();
    if (!active) return 'No complete codons available';
    if (this.complete()) return 'Translation complete';
    if (active.stop) return `${active.codon} recruits a release factor`;
    return `${active.codon} codes for ${active.aminoAcid}`;
  });

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly phaseDurationMs = 560;

  constructor() {
    effect(() => {
      this.sequence();
      this.stop();
      this.progress.set(0);
      this.phase.set('ready');
      if (this.autoplay()) this.play();
    });
  }

  togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    this.play();
  }

  play(): void {
    this.stop();
    if (!this.steps().length) return;
    if (this.complete()) {
      this.progress.set(0);
      this.phase.set('ready');
    }
    this.playing.set(true);
    if (this.phase() === 'ready') this.advancePhase();
    this.startTimer();
  }

  cycleSpeed(): void {
    this.speed.update((speed) => (speed === 1 ? 2 : 1));
    if (!this.playing()) return;
    if (this.timer) clearInterval(this.timer);
    this.startTimer();
  }

  setProgress(value: string | number): void {
    this.stop();
    const previous = this.progress();
    const next = Math.max(0, Math.min(this.steps().length, Number(value)));
    this.progress.set(next);
    this.phase.set(next >= this.steps().length ? 'released' : 'ready');
    if (previous < this.steps().length && next >= this.steps().length) {
      this.translationCompleted.emit();
    }
  }

  chooseCodon(index: number): void {
    this.setProgress(index);
  }

  anticodon(codon: string): string {
    return [...codon].map((base) => RNA_ANTICODON[base] ?? '').join('');
  }

  aminoAcidShape(shortName: string): string {
    return this.aminoAcidVisual(shortName).shape;
  }

  aminoAcidVisual(shortName: string): AminoAcidVisual {
    return aminoAcidVisualFor(shortName);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing.set(false);
  }

  private startTimer(): void {
    this.timer = setInterval(() => this.advancePhase(), this.phaseDurationMs / this.speed());
  }

  private advancePhase(): void {
    switch (this.phase()) {
      case 'ready':
        this.phase.set('docking');
        break;
      case 'docking':
        this.phase.set('bonding');
        break;
      case 'bonding':
        this.phase.set('translocating');
        break;
      case 'translocating': {
        const next = Math.min(this.steps().length, this.progress() + 1);
        this.progress.set(next);
        if (next >= this.steps().length) {
          this.phase.set('released');
          this.stop();
          this.translationCompleted.emit();
        } else {
          this.phase.set('docking');
        }
        break;
      }
      case 'released':
        this.stop();
        break;
    }
  }
}

function proteinBackbonePath(points: readonly FoldPosition[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const control1 = {
      x: current.x + (next.x - before.x) / 6,
      y: current.y + (next.y - before.y) / 6,
    };
    const control2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };
    path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
  }
  return path;
}
