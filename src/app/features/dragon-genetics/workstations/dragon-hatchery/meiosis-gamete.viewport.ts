import { CellChromosomeViewportItem } from '../shared/cell-chromosome-viewport.component';
import { ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { geneAlleleMarking, geneDnaRecord } from '../shared/dragon-gene-dna.catalog';
import {
  MeiosisChromatid,
  MeiosisGameteChromosome,
  MeiosisLocusAllele,
} from './meiosis-gamete.models';

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
  return meiosisChromosomeSvgModel(label, chromosome.loci);
}

/** Uses the same catalog, bands, and allele markings for every animated meiosis chromatid. */
export function meiosisChromatidSvgModel(chromatid: MeiosisChromatid): ChromosomeSvgModel {
  const label = chromatid.sexChromosome === 'Y' ? 'Chr Y' : chromatid.chromosome;
  return meiosisChromosomeSvgModel(label, chromatid.loci);
}

function meiosisChromosomeSvgModel(
  label: string,
  loci: readonly MeiosisLocusAllele[],
): ChromosomeSvgModel {
  const visual = chromosomeVisual(label);
  const arm = label.replace('Chr ', '');

  return {
    length: visual.length,
    leftLabel: `${arm}p`,
    rightLabel: `${arm}q`,
    centromere: visual.centromere,
    bands: visual.bands,
    loci: loci.map((locus) => ({
      position: locus.position,
      label: locus.geneSymbol,
      symbol: locus.allele,
      color: geneDnaRecord(locus.traitId).locusColor,
      marking: geneAlleleMarking(locus.traitId, locus.dominance === 'dominant' ? 0 : 1),
    })),
  };
}
