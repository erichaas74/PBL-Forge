import {
  CellModelChromosome,
  CellModelFocus,
  CellModelStage,
} from '../shared/cell-model.component';
import { MeiosisChromosomePair, MeiosisRun } from './meiosis-gamete.models';
import { meiosisChromatidSvgModel, meiosisGameteChromosomeSvgModel } from './meiosis-gamete.viewport';

/** One drawn cell in the meiosis animation. */
export interface MeiosisCellView {
  id: string;
  label: string;
  chromosomes: readonly CellModelChromosome[];
  stage: CellModelStage;
}

export interface MeiosisStageView {
  /** One parent cell up to telophase I, then the two haploid daughter cells. */
  cells: readonly MeiosisCellView[];
  /**
   * `cell` for the whole-cell phases at either end of the run, `nucleus` for the
   * divisions in between, which is what drives the camera in and back out.
   */
  focus: CellModelFocus;
}

/** Phase indices, matching the phase list the selector shows above the stage. */
export const MEIOSIS_PHASE_COUNT = 10;
const PARENT_CELL = 0;
const S_PHASE = 1;
const PROPHASE_I = 2;
const METAPHASE_I = 3;
const ANAPHASE_I = 4;
const TELOPHASE_I = 5;
const PROPHASE_II = 6;
const METAPHASE_II = 7;
const ANAPHASE_II = 8;

/**
 * Builds the cells drawn for one meiosis phase.
 *
 * Chromosome identity is taken from the run's own records, so what the animation
 * shows separating is exactly what ends up in the four gametes: daughter cell 1
 * holds gametes 1 and 2, daughter cell 2 holds gametes 3 and 4, and a replicated
 * chromosome is drawn as the two chromatids that become one gamete each.
 */
export function meiosisStageView(run: MeiosisRun | null, phaseIndex: number): MeiosisStageView {
  if (!run) return { cells: [], focus: 'cell' };

  switch (phaseIndex) {
    case PARENT_CELL:
      return { focus: 'cell', cells: [parentCell(unreplicatedHomologues(run), 'interphase')] };
    case S_PHASE:
      return { focus: 'cell', cells: [parentCell(replicatedHomologues(run), 'interphase')] };
    case PROPHASE_I:
      return { focus: 'nucleus', cells: [parentCell(bivalents(run), 'prophase')] };
    case METAPHASE_I:
      return { focus: 'nucleus', cells: [parentCell(pairedAtEquator(run), 'metaphase-i')] };
    case ANAPHASE_I:
      return { focus: 'nucleus', cells: [parentCell(separatingHomologues(run), 'anaphase')] };
    case TELOPHASE_I:
      return { focus: 'nucleus', cells: [parentCell(separatingHomologues(run), 'telophase')] };
    case PROPHASE_II:
      return { focus: 'nucleus', cells: daughterCells(run, 'prophase') };
    case METAPHASE_II:
      return { focus: 'nucleus', cells: daughterCells(run, 'metaphase') };
    case ANAPHASE_II:
      return { focus: 'nucleus', cells: separatingSisters(run) };
    default:
      // Telophase II: the four finished gametes, drawn by the gamete cards.
      return { focus: 'cell', cells: [] };
  }
}

/** The four gametes, in the order the run produced them. */
export function meiosisGameteCellChromosomes(
  run: MeiosisRun,
  gameteIndex: number,
): readonly CellModelChromosome[] {
  return run.gametes[gameteIndex].chromosomes.map((chromosome) => ({
    id: chromosome.chromosome,
    label: displayLabel(chromosome.chromosome, chromosome.sexChromosome),
    shortLabel: shortLabel(chromosome.chromosome, chromosome.sexChromosome),
    model: meiosisGameteChromosomeSvgModel(chromosome),
    recombinant: chromosome.recombinant,
  }));
}

function parentCell(
  chromosomes: readonly CellModelChromosome[],
  stage: CellModelStage,
): MeiosisCellView {
  return { id: 'parent', label: 'Parent cell', chromosomes, stage };
}

/** Before replication: one chromosome from each homologue of every pair. */
function unreplicatedHomologues(run: MeiosisRun): readonly CellModelChromosome[] {
  return run.chromosomePairs.flatMap((pair) => [
    chromatidItem(pair, 0, 'a'),
    chromatidItem(pair, 3, 'b'),
  ]);
}

/**
 * After S phase: the same ten chromosomes, each now two sister chromatids that
 * are still identical copies. Nothing has been exchanged yet — crossing over is
 * prophase I — so both sisters are drawn from the unrecombined chromatid.
 */
function replicatedHomologues(run: MeiosisRun): readonly CellModelChromosome[] {
  return run.chromosomePairs.flatMap((pair) => [
    joinedItem(pair, 0, 0, 'a', 'sister-chromatids'),
    joinedItem(pair, 3, 3, 'b', 'sister-chromatids'),
  ]);
}

/** Prophase I: homologues held together, showing the exchanged sections. */
function bivalents(run: MeiosisRun): readonly CellModelChromosome[] {
  return run.chromosomePairs.map((pair) =>
    joinedItem(pair, 1, 2, 'pair', 'homologous-pair'),
  );
}

/** Metaphase I: each pair straddles the equator, one homologue on either side. */
function pairedAtEquator(run: MeiosisRun): readonly CellModelChromosome[] {
  return run.chromosomePairs.flatMap((pair) => [
    joinedItem(pair, 0, 1, 'a', 'sister-chromatids'),
    joinedItem(pair, 3, 2, 'b', 'sister-chromatids'),
  ]);
}

/**
 * Anaphase and telophase I: five replicated chromosomes travel to each pole. The
 * first half of the list goes to the first pole, so it holds exactly what
 * daughter cell 1 keeps.
 */
function separatingHomologues(run: MeiosisRun): readonly CellModelChromosome[] {
  return [...daughterChromosomes(run, 0), ...daughterChromosomes(run, 1)];
}

function daughterCells(run: MeiosisRun, stage: CellModelStage): readonly MeiosisCellView[] {
  return [0, 1].map((daughter) => ({
    id: `daughter-${daughter + 1}`,
    label: `Cell ${daughter + 1}`,
    chromosomes: daughterChromosomes(run, daughter),
    stage,
  }));
}

/** Anaphase II: the sisters come apart, one to each pole of both daughter cells. */
function separatingSisters(run: MeiosisRun): readonly MeiosisCellView[] {
  return [0, 1].map((daughter) => ({
    id: `daughter-${daughter + 1}`,
    label: `Cell ${daughter + 1}`,
    chromosomes: [
      ...meiosisGameteCellChromosomes(run, daughter * 2),
      ...meiosisGameteCellChromosomes(run, daughter * 2 + 1),
    ].map((item, index) => ({ ...item, id: `${item.id}:${index}` })),
    stage: 'anaphase' as const,
  }));
}

/** One daughter cell's replicated chromosomes: the two gametes it will become. */
function daughterChromosomes(run: MeiosisRun, daughter: number): readonly CellModelChromosome[] {
  const first = run.gametes[daughter * 2];
  const second = run.gametes[daughter * 2 + 1];
  return first.chromosomes.map((chromosome, index) => {
    const sister = second.chromosomes[index];
    return {
      id: `daughter-${daughter + 1}:${chromosome.chromosome}`,
      label: displayLabel(chromosome.chromosome, chromosome.sexChromosome),
      shortLabel: shortLabel(chromosome.chromosome, chromosome.sexChromosome),
      model: meiosisGameteChromosomeSvgModel(chromosome),
      pairedModel: sister ? meiosisGameteChromosomeSvgModel(sister) : undefined,
      pairRelationship: 'sister-chromatids' as const,
      recombinant: chromosome.recombinant || Boolean(sister?.recombinant),
    };
  });
}

function chromatidItem(
  pair: MeiosisChromosomePair,
  index: number,
  suffix: string,
): CellModelChromosome {
  const chromatid = pair.chromatids[index];
  return {
    id: `${pair.chromosome}:${suffix}`,
    label: displayLabel(pair.chromosome, chromatid.sexChromosome),
    shortLabel: shortLabel(pair.chromosome, chromatid.sexChromosome),
    model: meiosisChromatidSvgModel(chromatid),
    recombinant: chromatid.recombinant,
  };
}

function joinedItem(
  pair: MeiosisChromosomePair,
  index: number,
  pairedIndex: number,
  suffix: string,
  relationship: 'sister-chromatids' | 'homologous-pair',
): CellModelChromosome {
  const chromatid = pair.chromatids[index];
  const partner = pair.chromatids[pairedIndex];
  return {
    ...chromatidItem(pair, index, suffix),
    pairedModel: meiosisChromatidSvgModel(partner),
    pairRelationship: relationship,
    recombinant: chromatid.recombinant || partner.recombinant,
  };
}

function displayLabel(chromosome: string, sexChromosome: 'X' | 'Y' | null): string {
  return sexChromosome === 'Y' ? 'Chr Y' : chromosome;
}

function shortLabel(chromosome: string, sexChromosome: 'X' | 'Y' | null): string {
  return displayLabel(chromosome, sexChromosome).replace(/^Chr\s*/i, '');
}
