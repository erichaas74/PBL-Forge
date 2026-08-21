import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const PUNNETT_COMPOSER_MANIFEST: InstrumentManifest = {
  id: 'punnett-composer',
  title: 'Punnett Composer',
  route: '/dragon-genetics/punnett-composer',
  sessionModes: ['investigation'],
  probes: [
    { id: 'gamete.select', yields: 'selection', anchorId: 'gamete-tray' },
    { id: 'cross.predict', yields: 'record', anchorId: 'punnett-grid' },
    { id: 'offspring.ratio', yields: 'measurement', anchorId: 'ratio-readout' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'cell-inspector' },
  ],
  emits: ['punnett.records'],
};
