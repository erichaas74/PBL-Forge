import { cloneAssemblyBlueprint } from '../../../../shared/assembly/domain/assembly-clone';
import { SpecimenTraitReadout } from '../../../../shared/assembly/preview/specimen.models';
import { createDragonBenchBuild } from '../../simulation/domain/dragon-specimen.profile';
import { DragonLabGenome, DragonParentProfile } from '../../simulation/domain/dragon-lab.models';
import {
  DRAGON_PARENTS,
  getTrait,
  phenotypeLabel,
  showsDominantPhenotype,
} from '../../simulation/domain/dragon-inheritance';
import {
  LearnedBehaviorId,
  TraitEvidenceDragon,
  TraitEvidenceObservationDefinition,
  TraitEvidenceObservationId,
  TraitEvidenceRecord,
  TraitEvidenceTrial,
} from './trait-evidence.models';

export const TRAIT_EVIDENCE_OBSERVATIONS: readonly TraitEvidenceObservationDefinition[] = [
  {
    id: 'wings',
    label: 'Wings',
    kind: 'appearance',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:wings',
  },
  {
    id: 'horns',
    label: 'Horns',
    kind: 'appearance',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:horns',
  },
  {
    id: 'scales',
    label: 'Scale pattern',
    kind: 'appearance',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:scales',
  },
  {
    id: 'fire',
    label: 'Fire-producing ability',
    kind: 'ability',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:fire',
  },
  {
    id: 'bell-bow',
    label: 'Bow after bell',
    kind: 'behavior',
    expectedClassification: 'learned',
    focusTraitId: null,
    cueLabel: 'Ring bell',
  },
  {
    id: 'target-touch',
    label: 'Touch colored target',
    kind: 'behavior',
    expectedClassification: 'learned',
    focusTraitId: null,
    cueLabel: 'Show target',
  },
  {
    id: 'wait-release',
    label: 'Wait for release signal',
    kind: 'behavior',
    expectedClassification: 'learned',
    focusTraitId: null,
    cueLabel: 'Give wait cue',
  },
  {
    id: 'soot-mark',
    label: 'Dark snout marking',
    kind: 'environment',
    expectedClassification: 'environmental',
    focusTraitId: 'trait:soot-mark',
  },
];

const LITTER_PARENT_IDS = ['ember', 'tide'] as const;

export const TRAIT_EVIDENCE_DRAGONS: readonly TraitEvidenceDragon[] = [
  observationDragon(
    'aster',
    'Aster',
    '#b95339',
    '#f0a35b',
    { wings: ['W', 'w'], fire: ['F', 'f'], scales: ['S', 's'], horns: ['h', 'h'] },
    ['bell-bow'],
    false,
  ),
  observationDragon(
    'brine',
    'Brine',
    '#39799a',
    '#76cbd0',
    { wings: ['w', 'w'], fire: ['f', 'f'], scales: ['s', 's'], horns: ['H', 'h'] },
    ['target-touch'],
    true,
  ),
  observationDragon(
    'cinder',
    'Cinder',
    '#627748',
    '#bfd070',
    { wings: ['W', 'w'], fire: ['F', 'F'], scales: ['s', 's'], horns: ['H', 'h'] },
    ['wait-release'],
    false,
  ),
];

export function availableObservations(
  dragon: TraitEvidenceDragon,
): readonly TraitEvidenceObservationDefinition[] {
  return TRAIT_EVIDENCE_OBSERVATIONS.filter(
    (observation) => observation.id !== 'soot-mark' || dragon.hasSootMark,
  );
}

export function observationDefinition(
  id: TraitEvidenceObservationId,
): TraitEvidenceObservationDefinition {
  return TRAIT_EVIDENCE_OBSERVATIONS.find((observation) => observation.id === id)!;
}

export function isLearnedBehavior(id: TraitEvidenceObservationId): id is LearnedBehaviorId {
  return id === 'bell-bow' || id === 'target-touch' || id === 'wait-release';
}

export function observationResult(
  dragon: TraitEvidenceDragon,
  observationId: TraitEvidenceObservationId,
): string {
  if (isLearnedBehavior(observationId)) return 'Cue response not tested yet.';
  if (observationId === 'soot-mark') return 'A dark mark covers the snout scales.';
  if (observationId === 'fire') {
    return showsDominantPhenotype(dragon.profile.genome.fire, 'fire')
      ? 'Produces fire during a safe ability check.'
      : 'Produces no fire during a safe ability check.';
  }
  return phenotypeLabel(dragon.profile, observationId);
}

export function liveEvidence(
  dragon: TraitEvidenceDragon,
  observationId: TraitEvidenceObservationId,
): TraitEvidenceRecord {
  return {
    id: `live:${dragon.id}:${observationId}`,
    observationId,
    kind: 'live-observation',
    label: 'Live observation',
    detail: observationResult(dragon, observationId),
  };
}

export function recordsForObservation(
  dragon: TraitEvidenceDragon,
  observationId: TraitEvidenceObservationId,
): readonly TraitEvidenceRecord[] {
  if (isLearnedBehavior(observationId)) {
    const trained = dragon.trainedBehaviorIds.includes(observationId);
    return [
      record(
        dragon,
        observationId,
        'training-record',
        'Training log',
        trained
          ? `${dragon.name}'s response first appeared after repeated cue practice.`
          : `${dragon.name} has no training sessions recorded for this cue.`,
      ),
      record(
        dragon,
        observationId,
        'family-record',
        'Litter comparison',
        'The three littermates have different training histories and do not respond to the same cues.',
      ),
    ];
  }

  if (observationId === 'soot-mark') {
    return [
      record(
        dragon,
        observationId,
        'hatch-record',
        'Hatch record',
        'The snout scales had no dark marking at hatching.',
      ),
      record(
        dragon,
        observationId,
        'environment-record',
        'Habitat log',
        'The marking appeared after repeated feeding trips through the ash caves.',
      ),
    ];
  }

  const trait = getTrait(observationId);
  const ember = DRAGON_PARENTS.find((parent) => parent.id === LITTER_PARENT_IDS[0])!;
  const tide = DRAGON_PARENTS.find((parent) => parent.id === LITTER_PARENT_IDS[1])!;
  const hatchDetail =
    observationId === 'fire'
      ? `The first safe ability exam recorded: ${observationResult(dragon, observationId)}`
      : `${trait.name} was recorded at hatching as ${phenotypeLabel(dragon.profile, observationId)}.`;
  return [
    record(dragon, observationId, 'hatch-record', 'Hatch record', hatchDetail),
    record(
      dragon,
      observationId,
      'family-record',
      'Family comparison',
      `Ember: ${phenotypeLabel(ember, observationId)}. Tide: ${phenotypeLabel(tide, observationId)}. Their litter contains both family patterns.`,
    ),
  ];
}

export function trialEvidence(trial: TraitEvidenceTrial): TraitEvidenceRecord {
  return {
    id: `trial:${trial.id}`,
    observationId: trial.behaviorId,
    kind: 'cue-trial',
    label: 'Cue trial',
    detail: trial.result,
  };
}

function observationDragon(
  id: string,
  name: string,
  color: string,
  accentColor: string,
  genome: DragonLabGenome,
  trainedBehaviorIds: readonly LearnedBehaviorId[],
  hasSootMark: boolean,
): TraitEvidenceDragon {
  const profile: DragonParentProfile = {
    id,
    name,
    title: 'Ember × Tide litter',
    color,
    accentColor,
    genome,
  };
  const build = createDragonBenchBuild(id, genome, {
    label: name,
    generation: 1,
    identity: { color, accentColor },
  });
  if (build.source.kind !== 'descriptor') throw new Error('Observation dragon did not resolve.');
  const blueprint = cloneAssemblyBlueprint(build.source.descriptor.blueprint);
  if (hasSootMark) {
    blueprint.parts = blueprint.parts.map((part) =>
      part.roles?.includes('jaw') ? { ...part, color: '#3d4142' } : part,
    );
  }
  const traits: SpecimenTraitReadout[] = [
    readout('wings', 'Wings', ['wing']),
    readout('horns', 'Horns', ['head']),
    readout('scales', 'Scale pattern', []),
    readout('fire', 'Fire-producing ability', ['jaw']),
    ...(hasSootMark ? [readout('soot-mark', 'Dark snout marking', ['jaw'])] : []),
  ];
  return {
    id,
    name,
    profile,
    source: {
      kind: 'descriptor',
      descriptor: { ...build.source.descriptor, blueprint, traits },
    },
    trainedBehaviorIds,
    hasSootMark,
  };
}

function readout(
  id: string,
  label: string,
  roles: SpecimenTraitReadout['roles'],
): SpecimenTraitReadout {
  return { id: `trait:${id}`, label, valueLabel: 'Observed', roles };
}

function record(
  dragon: TraitEvidenceDragon,
  observationId: TraitEvidenceObservationId,
  kind: TraitEvidenceRecord['kind'],
  label: string,
  detail: string,
): TraitEvidenceRecord {
  return {
    id: `record:${dragon.id}:${observationId}:${kind}`,
    observationId,
    kind,
    label,
    detail,
  };
}
