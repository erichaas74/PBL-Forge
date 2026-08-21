import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const ISLAND_DIVERSITY_MANIFEST: InstrumentManifest = {
  id: 'island-diversity',
  title: 'Island Diversity Manager',
  route: '/dragon-genetics/island-diversity',
  sessionModes: ['investigation'],
  probes: [
    { id: 'population.scan', yields: 'measurement', anchorId: 'field-scan' },
    { id: 'population.metric', yields: 'measurement', anchorId: 'metrics-panel' },
    { id: 'population.intervene', yields: 'record', anchorId: 'relocation-bay' },
    { id: 'selection.rationale', yields: 'record', anchorId: 'conservation-ledger' },
  ],
  emits: ['island.ledger-entries'],
};
