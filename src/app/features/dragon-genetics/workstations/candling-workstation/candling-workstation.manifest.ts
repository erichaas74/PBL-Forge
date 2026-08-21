import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const CANDLING_WORKSTATION_MANIFEST: InstrumentManifest = {
  id: 'candling-workstation',
  title: 'Candling Workstation',
  route: '/dragon-genetics/candling-workstation',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.observe', yields: 'selection', anchorId: 'candling-lamp' },
    { id: 'trait.evidence-source', yields: 'comparison', anchorId: 'evidence-bench' },
    { id: 'allele.pair', yields: 'comparison', anchorId: 'dna-sample-slot' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'hatch-stage' },
  ],
  emits: ['candling.hatches', 'candling.samples'],
};
