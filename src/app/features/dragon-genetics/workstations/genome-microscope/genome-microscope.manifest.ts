import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const GENOME_MICROSCOPE_MANIFEST: InstrumentManifest = {
  id: 'genome-microscope',
  title: 'Genome Microscope',
  route: '/dragon-genetics/genome-microscope',
  sessionModes: ['investigation'],
  probes: [
    { id: 'genome.hierarchy', yields: 'selection', anchorId: 'level-rail' },
    { id: 'chromosome.pair', yields: 'comparison', anchorId: 'chromosome-set-stage' },
    { id: 'gene.locus', yields: 'selection', anchorId: 'chromosome-map' },
    { id: 'chromatin.packing', yields: 'selection', anchorId: 'unraveling-stage' },
    { id: 'allele.pair', yields: 'comparison', anchorId: 'homolog-compare' },
    { id: 'allele.compare', yields: 'comparison', anchorId: 'homolog-compare' },
    { id: 'dna.sequence', yields: 'measurement', anchorId: 'sequence-readout' },
    { id: 'dna.transcribe', yields: 'record', anchorId: 'rna-stage' },
    { id: 'rna.translate', yields: 'record', anchorId: 'translation-bench' },
    { id: 'protein.product', yields: 'record', anchorId: 'translation-bench' },
    { id: 'protein.shape', yields: 'comparison', anchorId: 'protein-fold-stage' },
    { id: 'enzyme.substrate', yields: 'comparison', anchorId: 'enzyme-stage' },
    { id: 'gene.to.trait', yields: 'record', anchorId: 'expression-stage' },
  ],
  emits: ['microscope.evidence'],
};
