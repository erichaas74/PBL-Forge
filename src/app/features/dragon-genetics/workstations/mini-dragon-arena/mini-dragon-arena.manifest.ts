import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const MINI_DRAGON_ARENA_MANIFEST: InstrumentManifest = {
  id: 'mini-dragon-arena',
  title: 'Mini Dragon Show Arena',
  route: '/dragon-genetics/mini-dragon-arena',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.observe', yields: 'selection', anchorId: 'show-ring' },
    { id: 'selection.rationale', yields: 'record', anchorId: 'breed-registry' },
  ],
  emits: ['companion.registry-entries'],
};
