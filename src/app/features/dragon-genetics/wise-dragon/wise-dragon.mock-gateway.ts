import { Service } from '@angular/core';
import { DragonTraitId } from '../simulation/domain/dragon-lab.models';
import { answerGeneticsConcept } from './wise-dragon-answers';
import { WiseDragonConversationGateway } from './wise-dragon.gateway';
import {
  ContinueWiseDragonSessionRequest,
  StartWiseDragonSessionRequest,
  WiseDragonConversationTurn,
  WiseDragonEvidenceStatus,
  WiseDragonPracticeSummary,
  WiseDragonReply,
  WiseDragonSummaryCriterion,
  WiseDragonTraitContext,
} from './wise-dragon.models';

const RESPONSE_DELAY_MS = 260;

/**
 * Deterministic, on-device coaching adapter. It asks for missing links in the evidence chain and
 * explains common genetics vocabulary, but it never grades or sends student text off the device.
 */
@Service({ autoProvided: false })
export class MockWiseDragonConversationGateway implements WiseDragonConversationGateway {
  async start(request: StartWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    const traits = selectedTraits(request.context);
    const names = joinNames(traits.map((trait) => trait.traitName));
    return coachingReply(
      `You chose ${names || 'an inherited trait'} as evidence. Begin with one precise link: how does its genotype connect to the visible phenotype in ${request.context.champion.name}?`,
      'inquisitive',
      focusTrait(request.context),
    );
  }

  async respond(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    const latest = [...request.history].reverse().find((turn) => turn.role === 'student')?.message;
    const question = latest?.trim() ?? '';
    const conceptAnswer = question.includes('?') ? answerGeneticsConcept(question) : null;
    if (conceptAnswer) {
      return coachingReply(
        `${conceptAnswer} Now apply that idea to one observation in your champion’s trial.`,
        'pleased',
        focusTrait(request.context),
      );
    }

    const evidence = analyzeDefense(request);
    if (!evidence.genotype) {
      return coachingReply(
        'Name the genotype from your selected trait record. Which two allele symbols are actually recorded?',
        'inquisitive',
        focusTrait(request.context),
      );
    }
    if (!evidence.phenotype) {
      return coachingReply(
        'You identified genetic evidence. What visible phenotype did that allele pair produce in this dragon?',
        'inquisitive',
        focusTrait(request.context),
      );
    }
    if (!evidence.arenaConsequence) {
      return coachingReply(
        'The genotype-to-phenotype link is taking shape. Cite one event, score, time, or health result from this particular arena trial.',
        'skeptical',
        focusTrait(request.context),
      );
    }
    if (!evidence.limitation) {
      return coachingReply(
        'That is a connected evidence chain. Strengthen it by naming a limit: what battle choice, chance event, or other trait means the inherited feature cannot explain the whole outcome by itself?',
        'pleased',
        focusTrait(request.context),
      );
    }

    return coachingReply(
      'Your defense now connects genotype, phenotype, trial evidence, and a limitation. Add another observation if it changes the claim, or end the defense to review the evidence chain.',
      'pleased',
      focusTrait(request.context),
    );
  }

  async finish(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    const summary = buildSummary(request);
    return {
      schemaVersion: 1,
      message: summary.overview,
      emotion: 'pleased',
      animation: 'pleased',
      specimenAction: { type: 'reset-view' },
      continueDefense: false,
      summary,
    };
  }
}

interface DefenseEvidence {
  genotype: boolean;
  phenotype: boolean;
  arenaConsequence: boolean;
  limitation: boolean;
  traitEvidence: boolean;
}

function analyzeDefense(request: ContinueWiseDragonSessionRequest): DefenseEvidence {
  const traits = selectedTraits(request.context);
  const text = [
    request.context.brief.claim,
    request.context.brief.reasoning,
    ...request.history.filter((turn) => turn.role === 'student').map((turn) => turn.message),
  ]
    .join(' ')
    .toLowerCase();

  return {
    genotype:
      text.includes('genotype') ||
      traits.some((trait) => text.includes(trait.genotype.toLowerCase())),
    phenotype:
      text.includes('phenotype') ||
      traits.some((trait) => text.includes(trait.phenotype.toLowerCase())),
    arenaConsequence:
      /\b(arena|trial|score|health|second|seconds|win|won|loss|lost|lift|attack|defense|damage|performance)\b/.test(
        text,
      ),
    limitation:
      /\b(choice|choices|chance|strategy|other trait|other traits|cannot|can't|does not prove|doesn't prove|not the only)\b/.test(
        text,
      ),
    traitEvidence:
      traits.length > 0 &&
      traits.some(
        (trait) =>
          text.includes(trait.traitName.toLowerCase()) ||
          text.includes(trait.genotype.toLowerCase()) ||
          text.includes(trait.phenotype.toLowerCase()),
      ),
  };
}

function buildSummary(request: ContinueWiseDragonSessionRequest): WiseDragonPracticeSummary {
  const evidence = analyzeDefense(request);
  const studentTurns = request.history.filter((turn) => turn.role === 'student');
  const criteria: readonly WiseDragonSummaryCriterion[] = [
    criterion(
      'claim',
      'States a testable genetics claim',
      request.context.brief.claim.trim().length >= 20 ? 'supported' : 'needs-more-evidence',
      request.context.brief.claim.trim().length >= 20
        ? 'The opening brief states a claim that can be checked against the champion and trial.'
        : 'Revise the opening claim so it names an inherited trait and a testable arena consequence.',
      [],
    ),
    criterion(
      'trait-evidence',
      'Uses evidence from the selected dragon',
      evidence.traitEvidence ? 'supported' : 'needs-more-evidence',
      evidence.traitEvidence
        ? 'The defense names evidence from at least one selected trait record.'
        : 'Name a selected trait, genotype, or phenotype from this champion’s record.',
      supportingTurnIds(studentTurns, (message) => mentionsSelectedTrait(request, message)),
    ),
    criterion(
      'genotype-phenotype',
      'Connects genotype to phenotype',
      evidence.genotype && evidence.phenotype
        ? 'supported'
        : evidence.genotype || evidence.phenotype
          ? 'developing'
          : 'needs-more-evidence',
      evidence.genotype && evidence.phenotype
        ? 'The defense includes both the allele combination and its observable phenotype.'
        : 'State both the recorded genotype and the phenotype it produced.',
      supportingTurnIds(
        studentTurns,
        (message) => mentionsGenotype(request, message) || mentionsPhenotype(request, message),
      ),
    ),
    criterion(
      'arena-consequence',
      'Separates inherited traits from arena performance',
      evidence.arenaConsequence && evidence.limitation
        ? 'supported'
        : evidence.arenaConsequence
          ? 'developing'
          : 'needs-more-evidence',
      evidence.arenaConsequence && evidence.limitation
        ? 'The defense uses a trial observation and acknowledges that performance has other causes.'
        : 'Use one trial observation, then name a choice, chance event, or other trait that limits the claim.',
      supportingTurnIds(studentTurns, (message) =>
        /\b(arena|trial|score|health|win|won|loss|choice|chance|strategy)\b/i.test(message),
      ),
    ),
  ];
  const supportedCount = criteria.filter((item) => item.status === 'supported').length;

  return {
    schemaVersion: 1,
    title: `${request.context.champion.name} practice-defense summary`,
    overview: `${supportedCount} of ${criteria.length} evidence links are supported in this practice record. Revise any developing link and test the claim again when useful.`,
    reviewStatus: 'provisional',
    criteria,
  };
}

function criterion(
  criterionId: WiseDragonSummaryCriterion['criterionId'],
  label: string,
  status: WiseDragonEvidenceStatus,
  evidenceSummary: string,
  supportingTurnIdsValue: readonly string[],
): WiseDragonSummaryCriterion {
  return {
    criterionId,
    label,
    status,
    evidenceSummary,
    supportingTurnIds: supportingTurnIdsValue,
  };
}

function supportingTurnIds(
  turns: readonly WiseDragonConversationTurn[],
  predicate: (message: string) => boolean,
): readonly string[] {
  return turns.filter((turn) => predicate(turn.message)).map((turn) => turn.id);
}

function selectedTraits(
  context: StartWiseDragonSessionRequest['context'],
): readonly WiseDragonTraitContext[] {
  const selected = new Set(context.brief.evidenceTraitIds);
  return context.champion.traits.filter((trait) => selected.has(trait.traitId));
}

function focusTrait(context: StartWiseDragonSessionRequest['context']): DragonTraitId {
  return selectedTraits(context)[0]?.traitId ?? context.champion.traits[0]?.traitId ?? 'wings';
}

function mentionsSelectedTrait(
  request: ContinueWiseDragonSessionRequest,
  message: string,
): boolean {
  const text = message.toLowerCase();
  return selectedTraits(request.context).some(
    (trait) =>
      text.includes(trait.traitName.toLowerCase()) ||
      text.includes(trait.genotype.toLowerCase()) ||
      text.includes(trait.phenotype.toLowerCase()),
  );
}

function mentionsGenotype(request: ContinueWiseDragonSessionRequest, message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('genotype') ||
    selectedTraits(request.context).some((trait) => text.includes(trait.genotype.toLowerCase()))
  );
}

function mentionsPhenotype(request: ContinueWiseDragonSessionRequest, message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('phenotype') ||
    selectedTraits(request.context).some((trait) => text.includes(trait.phenotype.toLowerCase()))
  );
}

function coachingReply(
  message: string,
  emotion: WiseDragonReply['emotion'],
  traitId: DragonTraitId,
): WiseDragonReply {
  return {
    schemaVersion: 1,
    message,
    emotion,
    animation: emotion === 'neutral' ? 'speaking' : emotion,
    specimenAction: { type: 'focus-trait', traitId },
    continueDefense: true,
  };
}

function joinNames(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RESPONSE_DELAY_MS));
}
