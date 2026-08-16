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
  /** Optional scientific change encoded by the split barcode. */
  barcodeVariant?: 'reference' | 'substitution' | 'deletion' | 'insertion';
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

interface RenderLocus extends Omit<ChromosomeLocus, 'barcodeVariant'> {
  x: number;
  active: boolean;
  hasAllele: boolean;
  barcodeVariant: ChromosomeBarcodeVariant;
  barcode: readonly RenderBarcodeStripe[];
}

type ChromosomeBarcodeVariant = NonNullable<ChromosomeLocus['barcodeVariant']> | 'unloaded';

interface RenderBarcodeStripe {
  offset: number;
  topFill: string;
  bottomFill: string;
  opacity: number;
}

interface RenderChromatid {
  id: 'single' | 'first' | 'second';
  transform: string | null;
  primary: boolean;
  shapePath: string;
  centromereX: number;
  left: number;
  width: number;
  bands: readonly RenderBand[];
  loci: readonly RenderLocus[];
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
  /** Show a replicated chromosome as two sister chromatids joined at the centromere. */
  readonly replicated = input(false);
  /** Optional second chromosome model used when two gametes visibly fuse. */
  readonly pairedChromosome = input<ChromosomeSvgModel | null>(null);
  readonly pairRelationship = input<'sister-chromatids' | 'gamete-fusion'>('sister-chromatids');
  /** Reveal loaded loci in read-only scientific diagrams without making them interactive. */
  readonly showAllLoci = input(false);
  readonly locusSelected = output<string>();

  readonly instanceId = `chromosome-svg-${nextChromosomeSvgId++}`;
  readonly clipId = `${this.instanceId}-clip`;
  readonly hatchId = `${this.instanceId}-hatch`;
  readonly stripeAId = `${this.instanceId}-stripe-a`;
  readonly stripeBId = `${this.instanceId}-stripe-b`;
  readonly glowId = `${this.instanceId}-glow`;
  readonly chromatinId = `${this.instanceId}-chromatin`;
  readonly lightingId = `${this.instanceId}-lighting`;
  readonly telomereId = `${this.instanceId}-telomere`;

  private readonly left = 8;
  private readonly availableWidth = 84;

  readonly chromosomeWidth = computed(
    () => clamp01(this.chromosome().length) * this.availableWidth,
  );
  readonly chromosomeRight = computed(() => this.left + this.chromosomeWidth());
  readonly centromereX = computed(() => this.toX(this.chromosome().centromere));
  readonly chromatids = computed<readonly RenderChromatid[]>(() => {
    const primary = this.renderChromatid(this.chromosome(), 'single', true, null);
    if (!this.replicated() && !this.pairedChromosome()) return [primary];
    const jointX = primary.centromereX;
    const center = `${jointX} 16`;
    const secondModel = this.pairedChromosome() ?? this.chromosome();
    const secondX = this.modelX(secondModel, secondModel.centromere);
    const alignSecond = jointX - secondX;
    return [
      this.renderChromatid(this.chromosome(), 'first', true, `rotate(-10 ${center})`),
      this.renderChromatid(
        secondModel,
        'second',
        false,
        `rotate(10 ${center}) translate(${alignSecond} 0)`,
      ),
    ];
  });
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
    const form = this.pairedChromosome()
      ? this.pairRelationship() === 'gamete-fusion'
        ? 'egg and sperm chromosome pair joined in the fertilization model'
        : 'replicated chromosome with two sister chromatids joined at the centromere'
      : this.replicated()
        ? 'replicated chromosome with two sister chromatids joined at the centromere'
        : 'single chromosome';
    return `${model.leftLabel} to ${model.rightLabel} ${form}, ${model.bands.length} bands${active ? `; active locus ${active.label}, allele ${active.symbol ?? 'not loaded'}` : visibleLoci ? `; loci ${visibleLoci}` : ''}.`;
  });

  private toX(position: number): number {
    return this.left + clamp01(position) * this.chromosomeWidth();
  }

  private modelWidth(model: ChromosomeSvgModel): number {
    return clamp01(model.length) * this.availableWidth;
  }

  private modelX(model: ChromosomeSvgModel, position: number): number {
    return this.left + clamp01(position) * this.modelWidth(model);
  }

  private renderChromatid(
    model: ChromosomeSvgModel,
    id: RenderChromatid['id'],
    primary: boolean,
    transform: string | null,
  ): RenderChromatid {
    const width = this.modelWidth(model);
    const right = this.left + width;
    const centromereX = this.modelX(model, model.centromere);
    const notch = Math.min(2.2, width * 0.025);
    const shoulder = Math.min(3.2, width * 0.04);
    const shapePath = [
      `M ${this.left + 3} 9`,
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
      `H ${this.left + 3}`,
      `A 3 3 0 0 1 ${this.left} 20`,
      `V 12`,
      `A 3 3 0 0 1 ${this.left + 3} 9`,
      'Z',
    ].join(' ');
    return {
      id,
      transform,
      primary,
      shapePath,
      centromereX,
      left: this.left,
      width,
      bands: model.bands.map((band) => {
        const start = clamp01(band.start);
        const end = Math.max(start, clamp01(band.end));
        return {
          ...band,
          x: this.modelX(model, start),
          width: (end - start) * width,
        };
      }),
      loci: model.loci.map((locus) => {
        const bandColor =
          model.bands.find(
            (band) => band.start <= locus.position && band.end >= locus.position,
          )?.color ?? '#888888';
        const barcodeVariant = this.barcodeVariant(locus);
        return {
          ...locus,
          x: this.modelX(model, locus.position),
          active: primary && locus.label === this.selectedLocus(),
          hasAllele: Boolean(locus.symbol),
          barcodeVariant,
          barcode: this.generateBarcode(locus.label, bandColor, barcodeVariant),
        };
      }),
    };
  }

  private barcodeVariant(locus: ChromosomeLocus): ChromosomeBarcodeVariant {
    if (!locus.symbol) return 'unloaded';
    if (locus.barcodeVariant) return locus.barcodeVariant;

    // Preserve the prototype's explicit examples while giving the app's neutral
    // `CH#-G#a/b` sample codes and ordinary upper/lower-case allele pairs a
    // stable, visibly different barcode without duplicating allele truth here.
    if (locus.symbol === 'b') return 'deletion';
    if (locus.symbol === 'F') return 'insertion';
    if (/^CH.+a$/i.test(locus.symbol)) return 'reference';
    if (/^CH.+b$/i.test(locus.symbol)) return 'substitution';
    if (locus.symbol.length === 1 && locus.symbol === locus.symbol.toLowerCase()) {
      return 'substitution';
    }
    return 'reference';
  }

  private generateBarcode(
    locusLabel: string,
    bandColor: string,
    variant: ChromosomeBarcodeVariant,
  ): readonly RenderBarcodeStripe[] {
    const stripeCount = 6;
    if (variant === 'unloaded') {
      return Array.from({ length: stripeCount }, (_, index) => ({
        offset: (index - (stripeCount - 1) / 2) * 1.25,
        topFill: `color-mix(in srgb, ${bandColor} 15%, #000000)`,
        bottomFill: `color-mix(in srgb, ${bandColor} 15%, #000000)`,
        opacity: 0.2,
      }));
    }

    const seed = (locusLabel.charCodeAt(locusLabel.length - 1) || 1) * 7;
    const barcode = Array.from({ length: stripeCount }, (_, index) => {
      const pairType = (seed * (index + 3)) % 4;
      const pairs = [
        { topMix: '#ffffff', topPct: 65, bottomMix: '#000000', bottomPct: 55 },
        { topMix: '#000000', topPct: 55, bottomMix: '#ffffff', bottomPct: 65 },
        { topMix: '#ffffff', topPct: 85, bottomMix: '#000000', bottomPct: 85 },
        { topMix: '#000000', topPct: 85, bottomMix: '#ffffff', bottomPct: 85 },
      ] as const;
      const pair = pairs[pairType];
      return {
        offset: 0,
        topFill: `color-mix(in srgb, ${bandColor} ${pair.topPct}%, ${pair.topMix})`,
        bottomFill: `color-mix(in srgb, ${bandColor} ${pair.bottomPct}%, ${pair.bottomMix})`,
        opacity: 1,
      };
    });

    if (variant === 'substitution') {
      const changed = barcode[2];
      barcode[2] = {
        ...changed,
        topFill: changed.bottomFill,
        bottomFill: changed.topFill,
      };
    } else if (variant === 'deletion') {
      barcode.splice(3, 1);
    } else if (variant === 'insertion') {
      barcode.splice(2, 0, { ...barcode[2] });
    }

    return barcode.map((stripe, index) => ({
      ...stripe,
      offset: (index - (barcode.length - 1) / 2) * 1.25,
    }));
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
