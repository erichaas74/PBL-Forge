import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const DNA_PROCESS_LAB_MANIFEST: InstrumentManifest = {
  id: 'dna-process-lab',
  title: 'DNA Replication, Mutation, and Repair Lab',
  route: '/dragon-genetics/dna-process-lab',
  sessionModes: ['investigation'],
  probes: [
    { id: 'dna.sequence', yields: 'measurement', anchorId: 'sequence-track' },
    { id: 'dna.replicate', yields: 'record', anchorId: 'replication-stage' },
    { id: 'dna.transcribe', yields: 'record', anchorId: 'transcription-stage' },
    { id: 'rna.translate', yields: 'record', anchorId: 'translation-stage' },
    { id: 'dna.mutate', yields: 'record', anchorId: 'mutation-bench' },
    { id: 'dna.repair', yields: 'record', anchorId: 'repair-bench' },
    { id: 'protein.product', yields: 'record', anchorId: 'product-readout' },
    { id: 'allele.compare', yields: 'comparison', anchorId: 'comparison-track' },
  ],
  emits: ['dna.repairs', 'dna.analyses'],
};
