import { TestBed } from '@angular/core/testing';
import {
  WISE_DRAGON_CONVERSATION_GATEWAY,
  WiseDragonConversationGateway,
} from './wise-dragon.gateway';
import { WiseDragonConversationContext, WiseDragonReply } from './wise-dragon.models';
import { WiseDragonSessionStore } from './wise-dragon-session.store';

describe('WiseDragonSessionStore', () => {
  let store: WiseDragonSessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WiseDragonSessionStore,
        { provide: WISE_DRAGON_CONVERSATION_GATEWAY, useClass: ImmediateGateway },
      ],
    });
    store = TestBed.inject(WiseDragonSessionStore);
  });

  it('keeps a route-scoped conversation and preserves it while examining the specimen', async () => {
    await store.begin(context());
    expect(store.view()).toBe('chamber');
    expect(store.turns().map((turn) => turn.role)).toEqual(['wise-dragon']);

    store.openSpecimen();
    expect(store.view()).toBe('specimen');
    store.returnToChamber();
    expect(store.turns().length).toBe(1);

    await store.respond('The Ww genotype produced wings that enabled lift during the arena trial.');
    expect(store.turns().map((turn) => turn.role)).toEqual([
      'wise-dragon',
      'student',
      'wise-dragon',
    ]);
  });

  it('moves to a provisional summary without writing a canonical grade', async () => {
    await store.begin(context());
    await store.end();

    expect(store.view()).toBe('summary');
    expect(store.summary()?.reviewStatus).toBe('provisional');
    expect(store.summary()).not.toEqual(jasmine.objectContaining({ grade: jasmine.anything() }));
  });
});

class ImmediateGateway implements WiseDragonConversationGateway {
  start(): Promise<WiseDragonReply> {
    return Promise.resolve(reply(true));
  }

  respond(): Promise<WiseDragonReply> {
    return Promise.resolve(reply(true));
  }

  finish(): Promise<WiseDragonReply> {
    return Promise.resolve({
      ...reply(false),
      summary: {
        schemaVersion: 1,
        title: 'Practice summary',
        overview: 'Not a grade.',
        reviewStatus: 'provisional',
        criteria: [],
      },
    });
  }
}

function reply(continueDefense: boolean): WiseDragonReply {
  return {
    schemaVersion: 1,
    message: 'Explain the evidence.',
    emotion: 'inquisitive',
    animation: 'inquisitive',
    specimenAction: { type: 'focus-trait', traitId: 'wings' },
    continueDefense,
  };
}

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
          arenaEffect: 'Lift is available.',
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
      claim: 'Inherited wings affected the arena trial result.',
      evidenceTraitIds: ['wings'],
      reasoning: 'The W allele caused wings, which enabled lift in the trial.',
    },
    masterySkillIds: ['GEN-1', 'GEN-3'],
  };
}
