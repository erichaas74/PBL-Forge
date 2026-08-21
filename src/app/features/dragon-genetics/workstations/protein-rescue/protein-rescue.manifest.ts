import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const PROTEIN_RESCUE_MANIFEST: InstrumentManifest = {
  id: 'protein-rescue',
  title: 'Protein and Diet Rescue',
  route: '/dragon-genetics/protein-rescue',
  sessionModes: ['investigation'],
  probes: [
    { id: 'dna.transcribe', yields: 'record', anchorId: 'transcription-bay' },
    { id: 'rna.translate', yields: 'record', anchorId: 'translation-bay' },
    { id: 'protein.product', yields: 'record', anchorId: 'protein-readout' },
    { id: 'protein.shape', yields: 'comparison', anchorId: 'fold-inspector' },
    { id: 'enzyme.substrate', yields: 'comparison', anchorId: 'digestion-model' },
    { id: 'gene.to.trait', yields: 'record', anchorId: 'clinical-record' },
  ],
  emits: ['protein.rescue-records'],
};
