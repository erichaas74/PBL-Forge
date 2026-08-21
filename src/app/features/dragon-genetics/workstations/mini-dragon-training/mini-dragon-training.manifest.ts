import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const MINI_DRAGON_TRAINING_MANIFEST: InstrumentManifest = {
  id: 'mini-dragon-training',
  title: 'Mini Dragon Training Ground',
  route: '/dragon-genetics/mini-dragon-training',
  sessionModes: ['investigation'],
  probes: [{ id: 'trait.inherited-vs-acquired', yields: 'record', anchorId: 'training-log' }],
  emits: [],
};
