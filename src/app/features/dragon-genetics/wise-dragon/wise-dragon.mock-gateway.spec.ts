import { fakeAsync, tick } from '@angular/core/testing';
import { MockWiseDragonConversationGateway } from './wise-dragon.mock-gateway';
import { WISE_DRAGON_NOT_CONNECTED_MESSAGE } from './wise-dragon.mock-gateway';
import {
  ContinueWiseDragonSessionRequest,
  WiseDragonConversationContext,
  WiseDragonReply,
} from './wise-dragon.models';

describe('MockWiseDragonConversationGateway', () => {
  const gateway = new MockWiseDragonConversationGateway();

  it('returns the not-connected message when the layout session starts', fakeAsync(() => {
    let reply: WiseDragonReply | undefined;
    gateway
      .start({ schemaVersion: 1, sessionId: 'session-1', context: context() })
      .then((value) => {
        reply = value;
      });
    tick(260);

    expect(reply?.specimenAction).toEqual({ type: 'focus-trait', traitId: 'wings' });
    expect(reply?.message).toBe(WISE_DRAGON_NOT_CONNECTED_MESSAGE);
    expect(reply?.continueDefense).toBeTrue();
  }));

  it('returns the same placeholder for every student response', fakeAsync(() => {
    let reply: WiseDragonReply | undefined;
    gateway.respond(request(['Wings helped.'])).then((value) => {
      reply = value;
    });
    tick(260);

    expect(reply?.emotion).toBe('neutral');
    expect(reply?.message).toBe(WISE_DRAGON_NOT_CONNECTED_MESSAGE);
    expect(reply?.continueDefense).toBeTrue();
  }));

  it('shows a non-evaluative placeholder summary when the preview is ended', fakeAsync(() => {
    let reply: WiseDragonReply | undefined;
    gateway
      .finish(
        request([
          'The Ww genotype gave my dragon wings in this trial.',
          'A dominant W allele produces the winged phenotype in our model.',
          'In the arena the wings enabled lift, although battle choices also affected the win.',
        ]),
      )
      .then((value) => {
        reply = value;
      });
    tick(260);

    expect(reply?.continueDefense).toBeFalse();
    expect(reply?.summary?.reviewStatus).toBe('provisional');
    expect(reply?.summary?.overview).toBe(WISE_DRAGON_NOT_CONNECTED_MESSAGE);
    expect(
      reply?.summary?.criteria.every((criterion) => criterion.status === 'not-connected'),
    ).toBeTrue();
  }));
});

function context(): WiseDragonConversationContext {
  return {
    schemaVersion: 1,
    projectId: 'dragon-genetics-lab',
    activityId: 'dragon-arena',
    mode: 'practice-defense',
    champion: {
      id: 'champion-1',
      name: 'Hatchling 1',
      generation: 1,
      traits: [
        {
          traitId: 'wings',
          traitName: 'Wings',
          genotype: 'Ww',
          phenotype: 'Winged',
          arenaEffect: 'Lift and wing buffet available.',
        },
      ],
    },
    trial: {
      trialId: 'trial-1',
      won: true,
      elapsedSeconds: 40,
      remainingHealthPercent: 70,
      score: 82,
    },
    brief: {
      schemaVersion: 1,
      claim: 'Inherited wings affected the result of the arena trial.',
      evidenceTraitIds: ['wings'],
      reasoning: 'The dominant W allele produced wings that enabled lift in the arena.',
    },
    masterySkillIds: ['GEN-1', 'GEN-3'],
  };
}

function request(messages: readonly string[]): ContinueWiseDragonSessionRequest {
  return {
    schemaVersion: 1,
    sessionId: 'session-1',
    expectedRevision: messages.length,
    context: context(),
    history: messages.map((message, index) => ({
      id: `student-${index}`,
      role: 'student',
      message,
    })),
  };
}
