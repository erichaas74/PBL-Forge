import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const VIKING_BREEDING_MANIFEST: InstrumentManifest = {
  id: 'viking-breeding',
  title: 'Working Dragons',
  route: '/dragon-genetics/viking-breeding',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.observe', yields: 'selection', anchorId: 'kennel-panel' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'traits' },
    { id: 'cross.predict', yields: 'record', anchorId: 'pen-panel' },
    { id: 'offspring.ratio', yields: 'measurement', anchorId: 'response-panel' },
    { id: 'selection.rationale', yields: 'record', anchorId: 'plan' },
    { id: 'population.metric', yields: 'measurement', anchorId: 'line-state' },
  ],
  emits: ['breeding.programs', 'breeding.litters'],
};
