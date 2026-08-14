import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface ChromosomeBand {
  start: number;
  end: number;
  color: string;
  pattern?: 'hatch' | 'stripe-a' | 'stripe-b';
  patternPlacement?: 'full' | 'center';
}

export interface ChromosomeLocus {
  position: number;
  label: string;
  symbol?: string;
  color: string;
}

export interface ChromosomeSvgModel {
  /** Fraction of the available SVG width occupied by the chromosome, 0..1. */
  length: number;
  leftLabel: string;
  rightLabel: string;
  centromere: number;
  bands: readonly ChromosomeBand[];
  loci: readonly ChromosomeLocus[];
}

interface RenderBand extends ChromosomeBand {
  x: number;
  width: number;
}

interface RenderLocus extends ChromosomeLocus {
  x: number;
  active: boolean;
}

let nextChromosomeSvgId = 0;

@Component({
  selector: 'app-chromosome-svg',
  templateUrl: './chromosome-svg.component.html',
  styleUrl: './chromosome-svg.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChromosomeSvgComponent {
  readonly chromosome = input.required<ChromosomeSvgModel>();
  readonly selectedLocus = input<string | null>(null);
  readonly placeholder = input(false);
  readonly interactive = input(false);
  readonly compact = input(false);
  /** Reveal loaded loci in read-only scientific diagrams without making them interactive. */
  readonly showAllLoci = input(false);
  readonly locusSelected = output<string>();

  readonly instanceId = `chromosome-svg-${nextChromosomeSvgId++}`;
  readonly clipId = `${this.instanceId}-clip`;
  readonly hatchId = `${this.instanceId}-hatch`;
  readonly stripeAId = `${this.instanceId}-stripe-a`;
  readonly stripeBId = `${this.instanceId}-stripe-b`;
  readonly glowId = `${this.instanceId}-glow`;

  private readonly left = 8;
  private readonly availableWidth = 84;

  readonly chromosomeWidth = computed(
    () => clamp01(this.chromosome().length) * this.availableWidth,
  );
  readonly chromosomeRight = computed(() => this.left + this.chromosomeWidth());
  readonly centromereX = computed(() => this.toX(this.chromosome().centromere));
  readonly shapePath = computed(() => {
    const left = this.left;
    const right = this.chromosomeRight();
    const centromereX = this.centromereX();
    const notch = Math.min(2.2, this.chromosomeWidth() * 0.025);
    const shoulder = Math.min(3.2, this.chromosomeWidth() * 0.04);
    return [
      `M ${left + 3} 9`,
      `H ${centromereX - shoulder}`,
      `C ${centromereX - notch} 9 ${centromereX - notch} 14 ${centromereX} 15`,
      `C ${centromereX + notch} 14 ${centromereX + notch} 9 ${centromereX + shoulder} 9`,
      `H ${right - 3}`,
      `A 3 3 0 0 1 ${right} 12`,
      `V 20`,
      `A 3 3 0 0 1 ${right - 3} 23`,
      `H ${centromereX + shoulder}`,
      `C ${centromereX + notch} 23 ${centromereX + notch} 18 ${centromereX} 17`,
      `C ${centromereX - notch} 18 ${centromereX - notch} 23 ${centromereX - shoulder} 23`,
      `H ${left + 3}`,
      `A 3 3 0 0 1 ${left} 20`,
      `V 12`,
      `A 3 3 0 0 1 ${left + 3} 9`,
      'Z',
    ].join(' ');
  });
  readonly bands = computed<readonly RenderBand[]>(() =>
    this.chromosome().bands.map((band) => {
      const start = clamp01(band.start);
      const end = Math.max(start, clamp01(band.end));
      return { ...band, x: this.toX(start), width: (end - start) * this.chromosomeWidth() };
    }),
  );
  readonly loci = computed<readonly RenderLocus[]>(() =>
    this.chromosome().loci.map((locus) => ({
      ...locus,
      x: this.toX(locus.position),
      active: locus.label === this.selectedLocus(),
    })),
  );
  readonly summary = computed(() => {
    const model = this.chromosome();
    if (this.placeholder()) {
      return `${model.leftLabel} to ${model.rightLabel} chromosome placeholder; no allele sample loaded.`;
    }
    const active = model.loci.find((locus) => locus.label === this.selectedLocus());
    const visibleLoci = this.showAllLoci()
      ? model.loci
          .map((locus) => `${locus.label}, allele ${locus.symbol ?? 'not loaded'}`)
          .join('; ')
      : '';
    return `${model.leftLabel} to ${model.rightLabel} chromosome, ${model.bands.length} bands${active ? `; active locus ${active.label}, allele ${active.symbol ?? 'not loaded'}` : visibleLoci ? `; loci ${visibleLoci}` : ''}.`;
  });

  private toX(position: number): number {
    return this.left + clamp01(position) * this.chromosomeWidth();
  }

  selectLocus(label: string): void {
    if (this.interactive() && !this.placeholder()) this.locusSelected.emit(label);
  }

  patternFill(pattern: ChromosomeBand['pattern']): string | null {
    if (pattern === 'hatch') return `url(#${this.hatchId})`;
    if (pattern === 'stripe-a') return `url(#${this.stripeAId})`;
    if (pattern === 'stripe-b') return `url(#${this.stripeBId})`;
    return null;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
