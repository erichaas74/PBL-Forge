import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  CHROMOSOME_PAIR_DESCRIPTIONS,
  ChromosomePairRelationship,
  ChromosomeSvgComponent,
  ChromosomeSvgModel,
} from './chromosome-svg.component';
import {
  CELL_ANNOTATIONS,
  CELL_BODY,
  CELL_ER_RIBBONS,
  CELL_NUCLEAR_PORES,
  CELL_NUCLEOLUS,
  CELL_NUCLEUS,
  CELL_ORGANELLES,
  CELL_POLES,
  CELL_RIBOSOMES,
  CELL_SPINDLE_POLES,
  CellAnnotation,
  CellChromosomeSlot,
  CellEllipse,
  CellOrganelle,
  CellPoint,
  cellFocusRect,
  cellMembranePath,
  cellNucleusPath,
  cellViewBox,
  chromosomeSlots,
  golgiLamellae,
  metaphasePlateSlots,
  mitochondrionCristae,
  nuclearPores,
  polarSlots,
} from './cell-model.geometry';

/**
 * Where the cell is in its division cycle. Drives layout, envelope, and spindle.
 *
 * `metaphase-i` is the meiosis I plate, where homologous pairs straddle the
 * equator two abreast; `metaphase` is the single file of mitosis and meiosis II.
 */
export type CellModelStage =
  | 'interphase'
  | 'prophase'
  | 'metaphase-i'
  | 'metaphase'
  | 'anaphase'
  | 'telophase';

/** `simple` drops the cytoplasm detail for cards and inventory-sized cells. */
export type CellModelDetail = 'full' | 'simple';

export type CellModelFocus = 'cell' | 'nucleus';

/** Presentation data only. Scientific geometry and loci stay in ChromosomeSvgModel. */
export interface CellModelChromosome {
  id: string;
  label: string;
  shortLabel?: string;
  model: ChromosomeSvgModel;
  /** Optional second model for a visibly combined chromosome pair. */
  pairedModel?: ChromosomeSvgModel;
  pairRelationship?: ChromosomePairRelationship;
  recombinant?: boolean;
  /** Draws the shared chromosome geometry as a neutral loading outline. */
  placeholder?: boolean;
}

export interface CellModelLocusSelection {
  chromosomeId: string;
  locus: string;
}

interface PlacedChromosome {
  item: CellModelChromosome;
  selected: boolean;
  left: string;
  top: string;
  width: string;
  height: string;
  centre: { x: number; y: number };
}

interface SpindleFibre {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RenderedAnnotation extends CellAnnotation {
  leader: string;
}

/** Single chromosome drawings use the compact 100x20 viewBox; joined ones 100x32. */
const SINGLE_RATIO = 0.2;
const JOINED_RATIO = 0.32;

const STAGES_WITH_SPINDLE: readonly CellModelStage[] = [
  'prophase',
  'metaphase-i',
  'metaphase',
  'anaphase',
  'telophase',
];

let nextCellModelId = 0;

@Component({
  selector: 'app-cell-model',
  imports: [ChromosomeSvgComponent],
  templateUrl: './cell-model.component.html',
  styleUrl: './cell-model.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellModelComponent {
  readonly chromosomes = input<readonly CellModelChromosome[]>([]);
  readonly stage = input<CellModelStage>('interphase');
  readonly detail = input<CellModelDetail>('full');
  readonly focus = input<CellModelFocus>('cell');
  /** Names the drawn structures with leader lines, for a teaching diagram. */
  readonly annotated = input(false);
  readonly showChromosomeLabels = input(true);
  readonly showLoci = input(true);
  readonly selectable = input(true);
  readonly locusSelectable = input(false);
  readonly selectedChromosome = input<string | null>(null);
  readonly selectedLocus = input<string | null>(null);
  /** Draws each chromosome as two sister chromatids joined at the centromere. */
  readonly replicated = input(false);
  /** Renders a button over the nucleus with this label; null hides it. */
  readonly nucleusAction = input<string | null>(null);
  readonly ariaLabel = input('Dragon cell model');

  readonly chromosomeSelected = output<string>();
  readonly locusSelected = output<CellModelLocusSelection>();
  readonly nucleusSelected = output<void>();

  /** Gradient ids must be unique: a hatchery screen renders several cells at once. */
  readonly instanceId = `cell-model-${nextCellModelId++}`;
  readonly cytosolId = `${this.instanceId}-cytosol`;
  readonly nucleoplasmId = `${this.instanceId}-nucleoplasm`;

  readonly organelles: readonly CellOrganelle[] = CELL_ORGANELLES;
  readonly erRibbons = CELL_ER_RIBBONS;
  readonly ribosomes = CELL_RIBOSOMES;
  readonly nucleolus = CELL_NUCLEOLUS;
  readonly cristae = mitochondrionCristae();
  readonly lamellae = golgiLamellae();

  readonly view = computed(() => cellViewBox(this.annotations().length > 0));
  readonly viewBox = computed(() => {
    const view = this.view();
    return `${view.x} ${view.y} ${view.width} ${view.height}`;
  });
  readonly aspectRatio = computed(() => `${this.view().width} / ${this.view().height}`);

  /**
   * Zooming is a CSS transform on the whole drawing rather than a narrower
   * viewBox, so moving between `cell` and `nucleus` is a transition the browser
   * animates instead of a cut. The frame follows the chromosomes, which is what
   * keeps them in shot once they leave the nucleus for the poles.
   */
  readonly camera = computed(() => {
    const view = this.view();
    if (this.focus() === 'cell') return { scale: 1, x: 0, y: 0 };

    const rect = cellFocusRect(this.slots(), this.nuclei());
    const scale = Math.min(view.width / rect.width, view.height / rect.height);
    const centreX = (rect.x + rect.width / 2 - view.x) / view.width;
    const centreY = (rect.y + rect.height / 2 - view.y) / view.height;
    return {
      scale: round3(scale),
      x: round3((0.5 - centreX) * 100),
      y: round3((0.5 - centreY) * 100),
    };
  });
  readonly cameraTransform = computed(() => {
    const camera = this.camera();
    return `scale(${camera.scale}) translate(${camera.x}%, ${camera.y}%)`;
  });

  readonly cleavage = computed(() => {
    switch (this.stage()) {
      case 'anaphase':
        return 0.22;
      case 'telophase':
        return 0.82;
      default:
        return 0;
    }
  });
  readonly membranePath = computed(() => cellMembranePath(this.cleavage()));
  readonly membraneInnerPath = computed(() => cellMembranePath(this.cleavage(), 0.965));

  /** The nuclei to draw: one at rest, none mid-division, two as division finishes. */
  readonly nuclei = computed<readonly CellEllipse[]>(() => {
    switch (this.stage()) {
      case 'interphase':
      case 'prophase':
        return [CELL_NUCLEUS];
      case 'telophase':
        return [CELL_POLES.a, CELL_POLES.b];
      default:
        return [];
    }
  });
  readonly nucleusOutlines = computed(() =>
    this.nuclei().map((region) => ({
      region,
      outer: cellNucleusPath(region),
      inner: cellNucleusPath(region, 0.94),
      pores: region === CELL_NUCLEUS ? CELL_NUCLEAR_PORES : nuclearPores(region, 12),
    })),
  );
  readonly nucleusVisible = computed(() => this.nuclei().length > 0);
  readonly nucleolusVisible = computed(() => this.stage() === 'interphase');

  readonly spindleVisible = computed(() => STAGES_WITH_SPINDLE.includes(this.stage()));
  readonly spindlePoles = CELL_SPINDLE_POLES;
  /** The plate the chromosomes queue on, drawn between the two spindle poles. */
  readonly equator = computed(() =>
    this.stage() === 'metaphase' || this.stage() === 'metaphase-i'
      ? { x: CELL_BODY.cx, top: CELL_BODY.cy - CELL_BODY.ry * 0.92, bottom: CELL_BODY.cy + CELL_BODY.ry * 0.92 }
      : null,
  );

  /** A joined pair is taller than a single chromosome, so the whole set uses one ratio. */
  readonly slotRatio = computed(() =>
    this.replicated() || this.chromosomes().some((item) => item.pairedModel)
      ? JOINED_RATIO
      : SINGLE_RATIO,
  );

  readonly slots = computed<readonly CellChromosomeSlot[]>(() => {
    const count = this.chromosomes().length;
    const ratio = this.slotRatio();
    switch (this.stage()) {
      case 'metaphase-i':
        return metaphasePlateSlots(count, ratio, 2);
      case 'metaphase':
        return metaphasePlateSlots(count, ratio, 1);
      case 'anaphase':
      case 'telophase':
        return polarSlots(count, ratio);
      default:
        return chromosomeSlots(count, CELL_NUCLEUS, ratio, { maxWidth: CELL_NUCLEUS.rx * 0.94 });
    }
  });

  readonly placed = computed<readonly PlacedChromosome[]>(() => {
    const slots = this.slots();
    const selected = this.selectedChromosome();
    return this.chromosomes().flatMap((item, index) => {
      const slot = slots[index];
      if (!slot) return [];
      return [
        {
          item,
          selected: item.id === selected,
          left: this.percentX(slot.x - slot.width / 2),
          top: this.percentY(slot.y - slot.height / 2),
          width: this.percentWidth(slot.width),
          height: this.percentHeight(slot.height),
          centre: { x: slot.x, y: slot.y },
        },
      ];
    });
  });

  readonly spindleFibres = computed<readonly SpindleFibre[]>(() => {
    if (!this.spindleVisible()) return [];
    const stage = this.stage();
    return this.placed().flatMap((chromosome, index) => {
      // Before the split every chromosome is held by both poles; after it, only
      // by the pole it is travelling towards.
      const poles: readonly CellPoint[] =
        stage === 'anaphase' || stage === 'telophase'
          ? [chromosome.centre.x < CELL_BODY.cx ? this.spindlePoles.a : this.spindlePoles.b]
          : [this.spindlePoles.a, this.spindlePoles.b];
      return poles.map((pole, poleIndex) => ({
        id: `${index}:${poleIndex}`,
        x1: pole.x,
        y1: pole.y,
        x2: chromosome.centre.x,
        y2: chromosome.centre.y,
      }));
    });
  });

  readonly annotations = computed<readonly RenderedAnnotation[]>(() =>
    this.annotated() && this.detail() === 'full' && this.focus() === 'cell'
      ? CELL_ANNOTATIONS.map((annotation) => ({
          ...annotation,
          leader: `M ${annotation.from.x} ${annotation.from.y} L ${annotation.target.x} ${annotation.target.y}`,
        }))
      : [],
  );

  readonly nucleusButtonStyle = computed(() => ({
    left: this.percentX(CELL_NUCLEUS.cx - CELL_NUCLEUS.rx),
    top: this.percentY(CELL_NUCLEUS.cy - CELL_NUCLEUS.ry),
    width: this.percentWidth(CELL_NUCLEUS.rx * 2),
    height: this.percentHeight(CELL_NUCLEUS.ry * 2),
  }));

  readonly summary = computed(() => {
    const count = this.chromosomes().length;
    const structures = this.detail() === 'full' ? ', mitochondria, Golgi apparatus, and rough endoplasmic reticulum' : '';
    const location = this.nucleusVisible()
      ? `${count} chromosome${count === 1 ? '' : 's'} inside the nucleus`
      : `${count} chromosome${count === 1 ? '' : 's'} in the dividing cell`;
    return `${this.ariaLabel()}: ${this.stage()} cell showing the cell membrane${structures}, with ${location}.`;
  });

  isSelected(item: CellModelChromosome): boolean {
    return item.id === this.selectedChromosome();
  }

  displayShortLabel(item: CellModelChromosome): string {
    return item.shortLabel ?? item.label.replace(/^Chr\s*/i, '');
  }

  chromosomeAriaLabel(item: CellModelChromosome): string {
    const state = this.isSelected(item) ? ', selected' : '';
    const recombinant = item.recombinant ? ', recombinant' : '';
    const form = item.pairedModel
      ? CHROMOSOME_PAIR_DESCRIPTIONS[item.pairRelationship ?? 'sister-chromatids']
      : this.replicated()
        ? CHROMOSOME_PAIR_DESCRIPTIONS['sister-chromatids']
        : 'single chromosome';
    return `${item.label}, ${form}${recombinant}${state}`;
  }

  selectChromosome(chromosomeId: string): void {
    if (this.selectable()) this.chromosomeSelected.emit(chromosomeId);
  }

  selectLocus(chromosomeId: string, locus: string): void {
    if (!this.selectable() || !this.locusSelectable()) return;
    this.locusSelected.emit({ chromosomeId, locus });
  }

  focusNucleus(): void {
    this.nucleusSelected.emit();
  }

  private percentX(value: number): string {
    const view = this.view();
    return `${round3(((value - view.x) / view.width) * 100)}%`;
  }

  private percentY(value: number): string {
    const view = this.view();
    return `${round3(((value - view.y) / view.height) * 100)}%`;
  }

  private percentWidth(value: number): string {
    return `${round3((value / this.view().width) * 100)}%`;
  }

  private percentHeight(value: number): string {
    return `${round3((value / this.view().height) * 100)}%`;
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
