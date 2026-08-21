import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const INCUBATOR_SAMPLER_MANIFEST: InstrumentManifest = {
  id: 'incubator-sampler',
  title: 'Incubator Sampler',
  route: '/dragon-genetics/incubator-sampler',
  sessionModes: ['investigation'],
  probes: [
    { id: 'offspring.sample', yields: 'measurement', anchorId: 'batch-bay' },
    { id: 'offspring.ratio', yields: 'measurement', anchorId: 'bucket-row' },
    { id: 'trait.observe', yields: 'selection', anchorId: 'bucket-row' },
  ],
  emits: ['sampler.batches'],
};
