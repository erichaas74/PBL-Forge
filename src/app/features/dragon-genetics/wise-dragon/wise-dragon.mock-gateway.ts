import { Injectable } from '@angular/core';
import { WiseDragonConversationGateway } from './wise-dragon.gateway';
import {
  ContinueWiseDragonSessionRequest,
  StartWiseDragonSessionRequest,
  WiseDragonPracticeSummary,
  WiseDragonReply,
} from './wise-dragon.models';

const RESPONSE_DELAY_MS = 260;
export const WISE_DRAGON_NOT_CONNECTED_MESSAGE =
  'Wise Dragon Sage is not hooked up to converse yet.';

/**
 * Layout-only adapter. It never calls a model, evaluates a response, or persists feedback.
 * A future provider-backed adapter can replace it without changing the page or session store.
 */
@Injectable()
export class MockWiseDragonConversationGateway implements WiseDragonConversationGateway {
  async start(request: StartWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    return placeholderReply(request.context.brief.evidenceTraitIds[0] ?? 'wings');
  }

  async respond(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    return placeholderReply(request.context.brief.evidenceTraitIds[0] ?? 'wings');
  }

  async finish(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply> {
    await delay();
    return {
      ...placeholderReply(request.context.brief.evidenceTraitIds[0] ?? 'wings'),
      specimenAction: { type: 'reset-view' },
      continueDefense: false,
      summary: placeholderSummary(request),
    };
  }
}

function placeholderReply(
  traitId: StartWiseDragonSessionRequest['context']['champion']['traits'][number]['traitId'],
): WiseDragonReply {
  return {
    schemaVersion: 1,
    message: WISE_DRAGON_NOT_CONNECTED_MESSAGE,
    emotion: 'neutral',
    animation: 'speaking',
    specimenAction: { type: 'focus-trait', traitId },
    continueDefense: true,
  };
}

function placeholderSummary(request: ContinueWiseDragonSessionRequest): WiseDragonPracticeSummary {
  const criterionLabels: readonly [
    'claim' | 'trait-evidence' | 'genotype-phenotype' | 'arena-consequence',
    string,
  ][] = [
    ['claim', 'States a testable genetics claim'],
    ['trait-evidence', 'Uses evidence from the selected dragon'],
    ['genotype-phenotype', 'Connects genotype to phenotype'],
    ['arena-consequence', 'Separates inherited traits from arena performance'],
  ];
  return {
    schemaVersion: 1,
    title: `${request.context.champion.name} practice-defense preview`,
    overview: WISE_DRAGON_NOT_CONNECTED_MESSAGE,
    reviewStatus: 'provisional',
    criteria: criterionLabels.map(([criterionId, label]) => ({
      criterionId,
      label,
      status: 'not-connected',
      evidenceSummary: WISE_DRAGON_NOT_CONNECTED_MESSAGE,
      supportingTurnIds: [],
    })),
  };
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RESPONSE_DELAY_MS));
}
