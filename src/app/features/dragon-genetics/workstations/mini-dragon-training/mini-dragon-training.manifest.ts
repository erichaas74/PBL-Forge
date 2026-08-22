import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const MINI_DRAGON_TRAINING_MANIFEST: InstrumentManifest = {
  id: 'mini-dragon-training',
  title: 'Mini Dragon Training Ground',
  route: '/dragon-genetics/mini-dragon-training',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.inherited-vs-acquired', yields: 'record', anchorId: 'training-log' },
    // The training log read against the hatch record is this room's whole argument.
    { id: 'trait.evidence-source', yields: 'selection', anchorId: 'training-log' },
  ],
  emits: [],
};
