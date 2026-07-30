import {
  DRAGON_VISUAL_CONTRACT_VERSION,
  AlleleSwitchboardInstrument,
  DragonGenomeLevelId,
  DragonVisualScene,
  GenomeMicroscopeInstrument,
  GenotypeScannerInstrument,
  TraitInspectorInstrument,
} from './dragon-visual.models';
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
  if (scene.instrument.kind === 'trait-inspector') {
    errors.push(...validateTraitInspector(scene.instrument));
  }
  if (scene.instrument.kind === 'genome-microscope') {
    errors.push(...validateGenomeMicroscope(scene, scene.instrument));
  }
  if (scene.instrument.kind === 'genotype-scanner') {
    errors.push(...validateGenotypeScanner(scene, scene.instrument));
  }
  if (scene.instrument.kind === 'allele-switchboard') {
    errors.push(...validateAlleleSwitchboard(scene, scene.instrument));
  }
  return errors;
}

function validateAlleleSwitchboard(
  scene: DragonVisualScene,
  instrument: AlleleSwitchboardInstrument,
): string[] {
  const errors: string[] = [];
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (sample && !sample.genes.some(gene =>
    gene.geneId === instrument.focusGeneId || gene.traitId === instrument.focusGeneId)) {
    errors.push(`Allele switchboard focus gene ${instrument.focusGeneId} is missing from the sample.`);
  }
  const allowed = new Set([instrument.dominantAllele, instrument.recessiveAllele]);
  for (const symbol of [
    ...instrument.startingAlleles,
    ...instrument.requestedAlleles,
    ...instrument.workingAlleles,
  ]) {
    if (!allowed.has(symbol)) errors.push(`Allele switchboard contains unknown allele ${symbol}.`);
  }
  if (instrument.dominantAllele === instrument.recessiveAllele) {
    errors.push('Dominant and recessive allele symbols must be different.');
  }
  const evidenceIds = (instrument.evidenceMarks ?? []).map(mark => mark.id);
  const markIds = new Set(evidenceIds);
  if (hasDuplicateIds(evidenceIds)) errors.push('Allele switchboard evidence mark IDs must be unique.');
  if (instrument.evidenceMarkId && !markIds.has(instrument.evidenceMarkId)) {
    errors.push(`Pinned allele evidence ${instrument.evidenceMarkId} is not in the scene.`);
  }
  return errors;
}

function validateGenotypeScanner(
  scene: DragonVisualScene,
  instrument: GenotypeScannerInstrument,
): string[] {
  const errors: string[] = [];
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (sample && !sample.genes.some(gene =>
    gene.geneId === instrument.focusGeneId || gene.traitId === instrument.focusGeneId)) {
    errors.push(`Genotype scanner focus gene ${instrument.focusGeneId} is missing from the sample.`);
  }
  if (instrument.comparisonSampleId
    && !scene.samples.some(candidate => candidate.id === instrument.comparisonSampleId)) {
    errors.push(`Comparison sample ${instrument.comparisonSampleId} is not in the scene.`);
  }

  const options = instrument.options ?? [];
  if (hasDuplicateIds(options.map(option => option.id))) {
    errors.push('Scanner option IDs must be unique.');
  }
  const optionIds = new Set(options.map(option => option.id));
  for (const selectedId of instrument.selectedOptionIds ?? []) {
    if (!optionIds.has(selectedId)) {
      errors.push(`Scanner selection references missing option ${selectedId}.`);
    }
  }
  for (const status of instrument.optionStatuses ?? []) {
    if (!optionIds.has(status.optionId)) {
      errors.push(`Scanner status references missing option ${status.optionId}.`);
    }
  }
  for (const option of options) {
    if (option.kind === 'genotype' && !option.alleles) {
      errors.push(`Genotype option ${option.id} requires an allele pair.`);
    }
    if (option.kind === 'phenotype' && !option.labelId) {
      errors.push(`Phenotype option ${option.id} requires a label ID.`);
    }
  }

  const markIds = new Set((instrument.evidenceMarks ?? []).map(mark => mark.id));
  if (hasDuplicateIds((instrument.evidenceMarks ?? []).map(mark => mark.id))) {
    errors.push('Evidence mark IDs must be unique.');
  }
  if (instrument.evidenceMarkId && !markIds.has(instrument.evidenceMarkId)) {
    errors.push(`Pinned evidence mark ${instrument.evidenceMarkId} is not in the scene.`);
  }
  return errors;
}

const GENOME_LEVELS: readonly DragonGenomeLevelId[] = [
  'cell',
  'chromosome',
  'dna',
  'gene',
  'allele',
];

function validateGenomeMicroscope(
  scene: DragonVisualScene,
  instrument: GenomeMicroscopeInstrument,
): string[] {
  const errors: string[] = [];
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (instrument.focusGeneId && sample && !sample.genes.some(gene =>
    gene.geneId === instrument.focusGeneId || gene.traitId === instrument.focusGeneId)) {
    errors.push(`Genome microscope focus gene ${instrument.focusGeneId} is missing from the sample.`);
  }
  const placements = instrument.labelPlacements ?? [];
  if (hasDuplicateIds(placements.map(placement => placement.labelId))) {
    errors.push('Genome microscope label IDs must be unique.');
  }
  if (hasDuplicateIds(placements.map(placement => placement.levelId))) {
    errors.push('Genome microscope level slots may contain only one label.');
  }
  for (const placement of placements) {
    if (!GENOME_LEVELS.includes(placement.labelId)
      || !GENOME_LEVELS.includes(placement.levelId)) {
      errors.push('Genome microscope placement references an unknown hierarchy level.');
    }
  }
  if (instrument.evidenceLevelId
    && !GENOME_LEVELS.includes(instrument.evidenceLevelId)) {
    errors.push('Genome microscope evidence references an unknown hierarchy level.');
  }
  return errors;
}

function validateTraitInspector(instrument: TraitInspectorInstrument): string[] {
  const errors: string[] = [];
  const observationIds = instrument.observations.map(observation => observation.id);
  if (hasDuplicateIds(observationIds)) errors.push('Observation IDs must be unique.');

  const clueIds = new Set((instrument.clues ?? []).map(clue => clue.id));
  if (hasDuplicateIds((instrument.clues ?? []).map(clue => clue.id))) {
    errors.push('Evidence clue IDs must be unique.');
  }
  for (const observation of instrument.observations) {
    for (const clueId of observation.clueIds ?? []) {
      if (!clueIds.has(clueId)) {
        errors.push(`Observation ${observation.id} references missing clue ${clueId}.`);
      }
    }
  }

  const knownObservationIds = new Set(observationIds);
  for (const placement of instrument.placements ?? []) {
    if (!knownObservationIds.has(placement.observationId)) {
      errors.push(`Placement references missing observation ${placement.observationId}.`);
    }
    if (placement.pinnedClueId && !clueIds.has(placement.pinnedClueId)) {
      errors.push(`Placement ${placement.observationId} pins missing clue ${placement.pinnedClueId}.`);
    }
  }
  if (instrument.activeObservationId && !knownObservationIds.has(instrument.activeObservationId)) {
    errors.push(`Active observation ${instrument.activeObservationId} is not in the scene.`);
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
