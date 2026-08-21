import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const ISLAND_EXPEDITION_MANIFEST: InstrumentManifest = {
  id: 'island-expedition',
  title: 'Island Expedition',
  route: '/dragon-genetics/island-expedition',
  sessionModes: ['investigation'],
  probes: [
    { id: 'population.scan', yields: 'measurement', anchorId: 'field-panel' },
    { id: 'population.metric', yields: 'measurement', anchorId: 'dossier-panel' },
    { id: 'selection.rationale', yields: 'record', anchorId: 'prediction-panel' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'dragon-detail' },
    { id: 'allele.pair', yields: 'comparison', anchorId: 'dragon-detail' },
    { id: 'trait.observe', yields: 'selection', anchorId: 'dragon-list' },
  ],
  emits: ['expedition.attempts', 'expedition.surveys'],
};
