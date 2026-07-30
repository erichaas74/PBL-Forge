import { DRAGON_VISUAL_CONTRACT_VERSION, DragonVisualScene } from './dragon-visual.models';
import { DragonTeachingSequence } from './teaching-sequence.models';
import { DragonVisualPackManifest } from './visual-pack.models';

export function validateDragonVisualScene(scene: DragonVisualScene): string[] {
  const errors: string[] = [];
  if (scene.contractVersion !== DRAGON_VISUAL_CONTRACT_VERSION) {
    errors.push(`Unsupported scene contract version: ${scene.contractVersion}.`);
  }
  if (!scene.sceneId.trim()) errors.push('Scene ID is required.');
  if (!scene.stationId.trim()) errors.push('Station ID is required.');
  if (!scene.seed.trim()) errors.push('A deterministic scene seed is required.');
  if (scene.kind !== scene.instrument.kind) {
    errors.push('Scene kind must match the active instrument kind.');
  }
  if (hasDuplicateIds(scene.samples.map(sample => sample.id))) {
    errors.push('Analysis sample IDs must be unique.');
  }
  const sampleIds = new Set(scene.samples.map(sample => sample.id));
  for (const referencedSampleId of instrumentSampleIds(scene)) {
    if (!sampleIds.has(referencedSampleId)) {
      errors.push(`Instrument references missing analysis sample ${referencedSampleId}.`);
    }
  }
  return errors;
}

export function validateDragonTeachingSequence(sequence: DragonTeachingSequence): string[] {
  const errors: string[] = [];
  if (sequence.contractVersion !== DRAGON_VISUAL_CONTRACT_VERSION) {
    errors.push(`Unsupported sequence contract version: ${sequence.contractVersion}.`);
  }
  if (!sequence.sequenceId.trim()) errors.push('Sequence ID is required.');
  if (!sequence.conceptId.trim()) errors.push('Concept ID is required.');
  if (sequence.durationMs < 0) errors.push('Sequence duration cannot be negative.');
  if (sequence.supportedSurfaces.length === 0) {
    errors.push('A sequence must support at least one visual surface.');
  }
  if (hasDuplicateIds(sequence.cues.map(cue => cue.id))) {
    errors.push('Animation cue IDs must be unique.');
  }
  for (const cue of sequence.cues) {
    if (cue.atMs < 0 || cue.durationMs < 0) {
      errors.push(`Cue ${cue.id} has a negative time value.`);
    }
    if (cue.atMs + cue.durationMs > sequence.durationMs) {
      errors.push(`Cue ${cue.id} extends beyond the sequence duration.`);
    }
    if (cue.action === 'pause-for-prediction' && !cue.checkpointId) {
      errors.push(`Prediction cue ${cue.id} requires a checkpoint ID.`);
    }
  }
  return errors;
}

export function validateDragonVisualPack(pack: DragonVisualPackManifest): string[] {
  const errors: string[] = [];
  if (pack.manifestVersion !== 1) errors.push('Unsupported visual pack manifest version.');
  if (!pack.packId.trim()) errors.push('Visual pack ID is required.');
  if (!pack.packVersion.trim()) errors.push('Visual pack version is required.');
  if (!pack.compatibleContractVersions.includes(DRAGON_VISUAL_CONTRACT_VERSION)) {
    errors.push(`Visual pack does not support contract version ${DRAGON_VISUAL_CONTRACT_VERSION}.`);
  }
  if (hasDuplicateIds(pack.assets.map(asset => asset.id))) {
    errors.push('Visual asset IDs must be unique.');
  }
  if (hasDuplicateIds(pack.motions.map(motion => motion.id))) {
    errors.push('Visual motion IDs must be unique.');
  }
  if (hasDuplicateIds(pack.teachingSequences.map(sequence => sequence.sequenceId))) {
    errors.push('Teaching sequence IDs must be unique.');
  }

  const motionIds = new Set(pack.motions.map(motion => motion.id));
  for (const sequence of pack.teachingSequences) {
    errors.push(...validateDragonTeachingSequence(sequence));
    for (const cue of sequence.cues) {
      if (cue.motionId && !motionIds.has(cue.motionId)) {
        errors.push(`Cue ${cue.id} references missing motion ${cue.motionId}.`);
      }
    }
  }
  for (const asset of pack.assets) {
    if (!isSafeAssetSource(asset.source)) {
      errors.push(`Asset ${asset.id} has an unsafe source.`);
    }
  }
  return errors;
}

function hasDuplicateIds(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

function instrumentSampleIds(scene: DragonVisualScene): readonly string[] {
  const instrument = scene.instrument;
  switch (instrument.kind) {
    case 'trait-inspector':
    case 'genome-microscope':
    case 'genotype-scanner':
    case 'allele-switchboard':
      return [instrument.sampleId];
    case 'punnett-composer':
    case 'incubator-sampler':
      return instrument.kind === 'incubator-sampler'
        ? [...instrument.parentSampleIds, ...instrument.eggSampleIds]
        : instrument.parentSampleIds;
    case 'reproduction-comparison':
      return [
        ...instrument.sourceSampleIds,
        ...instrument.sexualOffspringSampleIds,
        ...instrument.asexualOffspringSampleIds,
      ];
    case 'sibling-tracer':
      return [...instrument.parentSampleIds, ...instrument.siblingSampleIds];
    case 'diversity-manager':
      return instrument.populationSampleIds;
    case 'evidence-replay':
      return [];
  }
}

function isSafeAssetSource(source: string): boolean {
  const normalizedSource = source.trim().toLowerCase();
  return !!normalizedSource
    && !normalizedSource.startsWith('javascript:')
    && !normalizedSource.startsWith('data:text/html');
}
