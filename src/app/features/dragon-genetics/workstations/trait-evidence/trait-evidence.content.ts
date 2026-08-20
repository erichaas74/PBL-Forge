import { cloneAssemblyBlueprint } from '../../../../shared/assembly/domain/assembly-clone';
import { assaySpecimen } from '../../../../shared/assembly/preview/specimen-assay';
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
  TraitEvidenceDragonCardStat,
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
    label: 'Horns and brow guard',
    kind: 'ability',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:horns',
    actionLabel: 'Demonstrate horn charge',
    ability: 'horn-charge',
  },
  {
    id: 'scales',
    label: 'Scale pattern',
    kind: 'appearance',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:scales',
  },
  {
    id: 'tail',
    label: 'Tail structure',
    kind: 'ability',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:tail',
    actionLabel: 'Demonstrate tail sweep',
    ability: 'tail-sweep',
  },
  {
    id: 'fire',
    label: 'Fire-producing ability',
    kind: 'ability',
    expectedClassification: 'inherited',
    focusTraitId: 'trait:fire',
    actionLabel: 'Run safe fire check',
    ability: 'fire-breath',
  },
  {
    id: 'fire-reflex',
    label: 'Fire-defense reflex',
    kind: 'reflex',
    expectedClassification: 'innate',
    focusTraitId: 'trait:fire-reflex',
    actionLabel: 'Trigger safe flame flash',
  },
  {
    id: 'guard-command',
    label: 'Guard on command',
    kind: 'command',
    expectedClassification: 'learned',
    focusTraitId: null,
    actionLabel: 'Call “Guard”',
  },
  {
    id: 'tail-strike-command',
    label: 'Tail strike on command',
    kind: 'command',
    expectedClassification: 'learned',
    focusTraitId: 'trait:tail',
    actionLabel: 'Call “Tail strike”',
  },
  {
    id: 'target-touch',
    label: 'Touch target on command',
    kind: 'command',
    expectedClassification: 'learned',
    focusTraitId: null,
    actionLabel: 'Show training target',
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
    ['guard-command'],
    184,
    'DG-TE-001',
  ),
  observationDragon(
    'brine',
    'Brine',
    '#39799a',
    '#76cbd0',
    { wings: ['w', 'w'], fire: ['f', 'f'], scales: ['s', 's'], horns: ['H', 'h'] },
    ['tail-strike-command'],
    226,
    'DG-TE-002',
  ),
  observationDragon(
    'cinder',
    'Cinder',
    '#627748',
    '#bfd070',
    { wings: ['W', 'w'], fire: ['F', 'F'], scales: ['s', 's'], horns: ['H', 'h'] },
    ['target-touch'],
    198,
    'DG-TE-003',
  ),
];

export function availableObservations(
  _dragon: TraitEvidenceDragon,
): readonly TraitEvidenceObservationDefinition[] {
  return TRAIT_EVIDENCE_OBSERVATIONS;
}

export function observationDefinition(
  id: TraitEvidenceObservationId,
): TraitEvidenceObservationDefinition {
  return TRAIT_EVIDENCE_OBSERVATIONS.find((observation) => observation.id === id)!;
}

export function isLearnedBehavior(id: TraitEvidenceObservationId): id is LearnedBehaviorId {
  return id === 'guard-command' || id === 'tail-strike-command' || id === 'target-touch';
}

export function isTrialObservation(
  id: TraitEvidenceObservationId,
): id is LearnedBehaviorId | 'fire-reflex' {
  return id === 'fire-reflex' || isLearnedBehavior(id);
}

export function observationResult(
  dragon: TraitEvidenceDragon,
  observationId: TraitEvidenceObservationId,
): string {
  if (isLearnedBehavior(observationId)) return 'Command response not tested yet.';
  if (observationId === 'fire-reflex') return 'Protective reflex not tested yet.';
  if (observationId === 'tail') return 'A segmented tail can sweep across a wide arc.';
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
          ? `${dragon.name}'s response first appeared after repeated command practice.`
          : `${dragon.name} has no training sessions recorded for this command.`,
      ),
      record(
        dragon,
        observationId,
        'family-record',
        'Litter comparison',
        'The littermates have different training histories and do not respond to the same commands.',
      ),
    ];
  }

  if (observationId === 'fire-reflex') {
    return [
      record(
        dragon,
        observationId,
        'hatch-record',
        'Hatch record',
        'The eyelid-and-nostril closure appeared before any command training.',
      ),
      record(
        dragon,
        observationId,
        'family-record',
        'Litter comparison',
        'Every littermate closes its eyes and nostrils during the safe flame-flash check.',
      ),
    ];
  }

  if (observationId === 'tail') {
    return [
      record(
        dragon,
        observationId,
        'hatch-record',
        'Hatch record',
        'The same segmented tail structure was recorded immediately after hatching.',
      ),
      record(
        dragon,
        observationId,
        'family-record',
        'Family comparison',
        'Tail structure follows the body patterns recorded across the Ember × Tide family.',
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
    observationId: trial.observationId,
    kind: trial.kind === 'reflex' ? 'reflex-trial' : 'cue-trial',
    label: trial.kind === 'reflex' ? 'Reflex trial' : 'Command trial',
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
  reflexLatencyMs: number,
  catalogNumber: string,
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
  const traits: SpecimenTraitReadout[] = [
    readout('wings', 'Wings', ['wing']),
    readout('horns', 'Horns', ['head']),
    readout('scales', 'Scale pattern', []),
    readout('tail', 'Tail structure', ['tail']),
    readout('fire', 'Fire-producing ability', ['jaw']),
    readout('fire-reflex', 'Fire-defense reflex', ['head', 'jaw']),
  ];
  const assay = assaySpecimen(blueprint, build.combatProfile, {
    fireBreathing: build.fireBreathing,
    horned: build.horned,
  });
  const stats = assay.fitness.components.map(
    (component) =>
      ({
        id: component.id,
        label: component.label,
        value: Math.round(component.score * 100),
      }) as TraitEvidenceDragonCardStat,
  );
  const battleRole = build.horned
    ? 'Horn Vanguard'
    : build.fireBreathing
      ? 'Ember Striker'
      : 'Tail Skirmisher';

  return {
    id,
    name,
    profile,
    source: {
      kind: 'descriptor',
      descriptor: { ...build.source.descriptor, blueprint, traits },
    },
    combatProfile: build.combatProfile,
    fireBreathing: build.fireBreathing,
    horned: build.horned,
    trainedBehaviorIds,
    reflexLatencyMs,
    card: {
      catalogNumber,
      seriesLabel: 'Academy Field Deck',
      arenaRating: assay.fitness.overall,
      battleRole,
      stats,
      traits: [
        phenotypeLabel(profile, 'horns'),
        phenotypeLabel(profile, 'wings'),
        phenotypeLabel(profile, 'scales'),
        build.fireBreathing ? 'Fire-producing' : 'No fire produced',
        blueprint.parts.some((part) => part.roles?.includes('tail'))
          ? 'Segmented battle tail'
          : 'No battle tail',
      ],
    },
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
