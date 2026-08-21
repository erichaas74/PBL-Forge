import { InstrumentManifest } from '../shared/instrument-manifest.models';

export const BLOOD_COMPATIBILITY_MANIFEST: InstrumentManifest = {
  id: 'blood-type-lab',
  title: 'Blood Compatibility Lab',
  route: '/dragon-genetics/blood-type-lab',
  sessionModes: ['investigation'],
  probes: [
    { id: 'multiple.alleles', yields: 'comparison', anchorId: 'allele-catalog' },
    { id: 'antiserum.test', yields: 'measurement', anchorId: 'antiserum-bench' },
    { id: 'donor.compatibility', yields: 'record', anchorId: 'transfusion-board' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'blood-readout' },
  ],
  emits: ['blood.transfusions', 'blood.tests'],
};
