import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const PEDIGREE_LAB_MANIFEST: InstrumentManifest = {
  id: 'pedigree-lab',
  title: 'Pedigree Lab',
  route: '/dragon-genetics/pedigree-lab',
  sessionModes: ['investigation'],
  probes: [
    { id: 'pedigree.trace', yields: 'selection', anchorId: 'pedigree-canvas' },
    { id: 'pedigree.carrier', yields: 'record', anchorId: 'deduction-panel' },
    { id: 'pedigree.sequence', yields: 'measurement', anchorId: 'sequencing-bay' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'pedigree-canvas' },
  ],
  emits: ['pedigree.deductions'],
};
