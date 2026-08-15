import { CellChromosomeViewportItem } from '../shared/cell-chromosome-viewport.component';
import { ChromosomeBand, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import { chromosomeVisual, DRAGON_LOCUS_COLORS } from '../shared/dragon-chromosome.catalog';
import { MeiosisGameteChromosome } from './meiosis-gamete.models';

/** Adapts Hatchery domain records to the shared, presentation-only viewport contract. */
export function meiosisGameteViewportItems(
  chromosomes: readonly MeiosisGameteChromosome[],
): readonly CellChromosomeViewportItem[] {
  return chromosomes.map((chromosome) => ({
    id: chromosome.chromosome,
    label: chromosome.sexChromosome === 'Y' ? 'Chr Y' : chromosome.chromosome,
    model: meiosisGameteChromosomeSvgModel(chromosome),
    recombinant: chromosome.recombinant,
  }));
}

export function meiosisGameteChromosomeSvgModel(
  chromosome: MeiosisGameteChromosome,
): ChromosomeSvgModel {
  const label = chromosome.sexChromosome === 'Y' ? 'Chr Y' : chromosome.chromosome;
  const visual = chromosomeVisual(label);
  const arm = label.replace('Chr ', '');
  const highlightBands: ChromosomeBand[] = chromosome.loci.map((locus, index) => ({
    start: Math.max(0, locus.position - 0.055),
    end: Math.min(1, locus.position + 0.055),
    color: locusColor(label, locus.position, index),
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
      color: locusColor(label, locus.position, index),
    })),
  };
}

function locusColor(chromosome: string, position: number, fallbackIndex: number): string {
  const positions = chromosomeVisual(chromosome).locusPositions;
  const matchedIndex = positions.findIndex((candidate) => Math.abs(candidate - position) < 0.001);
  const index = matchedIndex >= 0 ? matchedIndex : fallbackIndex;
  return DRAGON_LOCUS_COLORS[index % DRAGON_LOCUS_COLORS.length];
}
