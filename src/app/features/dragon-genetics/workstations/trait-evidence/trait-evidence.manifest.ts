import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const TRAIT_EVIDENCE_MANIFEST: InstrumentManifest = {
  id: 'trait-evidence',
  title: 'Trait Evidence Analyzer',
  route: '/dragon-genetics/trait-evidence',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trait.observe', yields: 'selection', anchorId: 'specimen-board' },
    { id: 'trait.evidence-source', yields: 'comparison', anchorId: 'evidence-rack' },
    { id: 'trait.inherited-vs-acquired', yields: 'record', anchorId: 'claim-builder' },
  ],
  emits: ['trait.claims'],
};
