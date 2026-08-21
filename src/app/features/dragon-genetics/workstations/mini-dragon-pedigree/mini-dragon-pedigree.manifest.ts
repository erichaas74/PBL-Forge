import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const MINI_DRAGON_PEDIGREE_MANIFEST: InstrumentManifest = {
  id: 'mini-dragon-pedigree',
  title: 'Mini Dragon Pedigree Lab',
  route: '/dragon-genetics/mini-dragon-pedigree',
  sessionModes: ['investigation'],
  probes: [
    { id: 'pedigree.trace', yields: 'selection', anchorId: 'kennel-pedigree' },
    { id: 'pedigree.carrier', yields: 'selection', anchorId: 'kennel-pedigree' },
  ],
  emits: [],
};
