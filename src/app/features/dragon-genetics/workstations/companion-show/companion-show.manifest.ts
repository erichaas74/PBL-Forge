import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const COMPANION_SHOW_MANIFEST: InstrumentManifest = {
  id: 'companion-show',
  title: 'Mini Dragon Kennel',
  route: '/dragon-genetics/companion-show',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.observe', yields: 'selection', anchorId: 'standard-desk' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'standard-desk' },
    { id: 'multiple.alleles', yields: 'comparison', anchorId: 'coat-locus-panel' },
    { id: 'cross.predict', yields: 'record', anchorId: 'pairing-board' },
    { id: 'offspring.ratio', yields: 'measurement', anchorId: 'litter-tray' },
  ],
  emits: ['companion.litters'],
};
