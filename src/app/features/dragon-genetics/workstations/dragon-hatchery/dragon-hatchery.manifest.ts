import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const DRAGON_HATCHERY_MANIFEST: InstrumentManifest = {
  id: 'dragon-hatchery',
  title: 'Dragon Hatchery',
  route: '/dragon-genetics/dragon-hatchery',
  sessionModes: ['investigation', 'guided'],
  probes: [
    { id: 'meiosis.stage', yields: 'selection', anchorId: 'meiosis-stage' },
    { id: 'gamete.ploidy', yields: 'measurement', anchorId: 'gamete-readout' },
    { id: 'gamete.select', yields: 'selection', anchorId: 'gamete-tray' },
    { id: 'cross.predict', yields: 'record', anchorId: 'prediction-lock' },
    { id: 'allele.pair', yields: 'comparison', anchorId: 'allele-slot-a' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'phenotype-readout' },
    { id: 'offspring.ratio', yields: 'measurement', anchorId: 'clutch-record' },
  ],
  emits: ['hatchery.fertilizations', 'hatchery.runs'],
};
