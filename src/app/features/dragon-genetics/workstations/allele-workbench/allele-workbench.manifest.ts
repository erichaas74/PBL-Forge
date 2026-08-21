import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const ALLELE_WORKBENCH_MANIFEST: InstrumentManifest = {
  id: 'allele-workbench',
  title: 'Allele Workbench',
  route: '/dragon-genetics/allele-workbench',
  sessionModes: ['investigation'],
  probes: [
    { id: 'gene.locus', yields: 'selection', anchorId: 'gene-rail' },
    { id: 'allele.pair', yields: 'comparison', anchorId: 'reference-slots' },
    { id: 'allele.compare', yields: 'comparison', anchorId: 'comparison-bay' },
    { id: 'genotype.to.phenotype', yields: 'record', anchorId: 'expression-viewport' },
    { id: 'gene.to.trait', yields: 'record', anchorId: 'genetics-chart' },
    { id: 'dna.sequence', yields: 'measurement', anchorId: 'dna-readout' },
  ],
  emits: ['notebook.experiments', 'notebook.discoveries'],
};
