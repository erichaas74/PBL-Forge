import { DRAGON_LEARNED_BEHAVIOR_MOTIONS } from '../trait-evidence/dragon-learned-behaviors';
import {
  TRAIT_EVIDENCE_DRAGONS,
  observationResult,
} from '../trait-evidence/trait-evidence.content';
import { MINI_TRAINING_MOTIONS } from '../companion-show/mini-dragon.training-motions';
import {
  miniFounder,
  miniPhenotypeLabel,
} from '../companion-show/mini-dragon.genetics';
import { miniDragonSpecimenSource } from '../companion-show/mini-dragon.specimen';
import { DragonPathContextId } from '../../lesson-plan/dragon-lesson-plan.models';
import { MysteryPairInvestigation } from './mystery-pair.models';

export function mysteryPairInvestigation(pathId: DragonPathContextId): MysteryPairInvestigation {
  return pathId === 'mini-show' ? miniShowPair() : arenaPair();
}

function arenaPair(): MysteryPairInvestigation {
  const first = TRAIT_EVIDENCE_DRAGONS[0];
  const second = TRAIT_EVIDENCE_DRAGONS[1];
  return {
    pathId: 'arena',
    title: 'Arena mystery pair',
    purpose: 'Decide which differences might be inherited by a future contender and which came from experience.',
    specimens: [
      { id: first.id, name: first.name, recordLabel: first.card.catalogNumber, source: first.source },
      { id: second.id, name: second.name, recordLabel: second.card.catalogNumber, source: second.source },
    ],
    comparisons: [
      comparison('horns', 'Horns and brow guard', 'appearance', observationResult(first, 'horns'), observationResult(second, 'horns'), 'Live 3D inspection and hatch records'),
      comparison('wings', 'Wing structure', 'appearance', observationResult(first, 'wings'), observationResult(second, 'wings'), 'Live 3D inspection and family records'),
      comparison('fire', 'Fire-producing ability', 'ability', observationResult(first, 'fire'), observationResult(second, 'fire'), 'Safe ability test and hatch records'),
      {
        ...comparison('guard-command', 'Guard command', 'behavior', 'Performs the guard response after the cue.', 'Notices the cue but does not perform the response.', 'Repeated cue trials and training logs'),
        respondingSpecimenId: first.id,
        motion: DRAGON_LEARNED_BEHAVIOR_MOTIONS['guard-command'],
      },
    ],
  };
}

function miniShowPair(): MysteryPairInvestigation {
  const first = miniFounder('mini-biscuit')!;
  const second = miniFounder('mini-pepper')!;
  return {
    pathId: 'mini-show',
    title: 'Show mystery pair',
    purpose: 'Decide which differences might appear in future mini dragons and which would require training.',
    specimens: [
      { id: first.id, name: first.name, recordLabel: 'RMDS-FOUND-01', source: miniDragonSpecimenSource(first.genome, first.id, { label: first.name }) },
      { id: second.id, name: second.name, recordLabel: 'RMDS-FOUND-02', source: miniDragonSpecimenSource(second.genome, second.id, { label: second.name }) },
    ],
    comparisons: [
      comparison('horns', 'Horn shape', 'appearance', miniPhenotypeLabel('horns', first.genome), miniPhenotypeLabel('horns', second.genome), 'Live 3D inspection and founder records'),
      comparison('wings', 'Wing size', 'appearance', miniPhenotypeLabel('wings', first.genome), miniPhenotypeLabel('wings', second.genome), 'Live 3D inspection and founder records'),
      comparison('pattern', 'Coat pattern', 'appearance', miniPhenotypeLabel('pattern', first.genome), miniPhenotypeLabel('pattern', second.genome), 'Live 3D inspection and family records'),
      {
        ...comparison('show-pose', 'Settle for judging', 'behavior', 'Settles and holds the practiced show pose.', 'Looks toward the handler but does not settle.', 'Repeated cue trials and training logs'),
        respondingSpecimenId: first.id,
        motion: MINI_TRAINING_MOTIONS.settle,
      },
    ],
  };
}

function comparison(
  id: string,
  label: string,
  kind: MysteryPairInvestigation['comparisons'][number]['kind'],
  firstResult: string,
  secondResult: string,
  evidenceHint: string,
): MysteryPairInvestigation['comparisons'][number] {
  return { id, label, kind, firstResult, secondResult, evidenceHint };
}
