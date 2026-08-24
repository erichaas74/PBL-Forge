import { inject, Service, signal } from '@angular/core';
import {
  WISE_DRAGON_CONVERSATION_GATEWAY,
  WiseDragonConversationGateway,
} from './wise-dragon.gateway';
import {
  ContinueWiseDragonSessionRequest,
  WiseDragonConversationContext,
  WiseDragonConversationTurn,
  WiseDragonPracticeSummary,
  WiseDragonReply,
  WiseDragonSpecimenAction,
} from './wise-dragon.models';

export type WiseDragonView = 'brief' | 'chamber' | 'specimen' | 'summary';
export type WiseDragonRequestState = 'idle' | 'thinking' | 'error';

/** Route-scoped state. It owns the conversation, never copies canonical project records. */
@Service({ autoProvided: false })
export class WiseDragonSessionStore {
  private readonly gateway: WiseDragonConversationGateway = inject(
    WISE_DRAGON_CONVERSATION_GATEWAY,
  );
  private requestEpoch = 0;

  readonly view = signal<WiseDragonView>('brief');
  readonly requestState = signal<WiseDragonRequestState>('idle');
  readonly turns = signal<readonly WiseDragonConversationTurn[]>([]);
  readonly currentReply = signal<WiseDragonReply | null>(null);
  readonly pendingSpecimenAction = signal<WiseDragonSpecimenAction | null>(null);
  readonly summary = signal<WiseDragonPracticeSummary | null>(null);
  readonly errorMessage = signal('');

  private readonly context = signal<WiseDragonConversationContext | null>(null);
  private readonly sessionId = signal('');

  async begin(context: WiseDragonConversationContext): Promise<WiseDragonReply | null> {
    const epoch = ++this.requestEpoch;
    const sessionId = createSessionId();
    this.context.set(context);
    this.sessionId.set(sessionId);
    this.turns.set([]);
    this.summary.set(null);
    this.errorMessage.set('');
    this.requestState.set('thinking');
    this.view.set('chamber');

    try {
      const reply = await this.gateway.start({ schemaVersion: 1, sessionId, context });
      if (epoch !== this.requestEpoch) return null;
      this.applyReply(reply);
      return reply;
    } catch {
      if (epoch !== this.requestEpoch) return null;
      this.fail('The chamber could not begin this practice defense. Try again.');
      return null;
    }
  }

  async respond(message: string): Promise<WiseDragonReply | null> {
    const context = this.context();
    const sessionId = this.sessionId();
    const cleanMessage = message.trim();
    if (!context || !sessionId || !cleanMessage || this.requestState() === 'thinking') return null;

    const studentTurn: WiseDragonConversationTurn = {
      id: createTurnId('student'),
      role: 'student',
      message: cleanMessage,
    };
    const history = [...this.turns(), studentTurn];
    this.turns.set(history);
    return this.runRequest((gateway, request) => gateway.respond(request), history);
  }

  async end(): Promise<WiseDragonReply | null> {
    const context = this.context();
    const sessionId = this.sessionId();
    if (!context || !sessionId || this.requestState() === 'thinking') return null;
    return this.runRequest((gateway, request) => gateway.finish(request), this.turns());
  }

  openSpecimen(): void {
    if (this.context()) this.view.set('specimen');
  }

  returnToChamber(): void {
    if (this.context()) this.view.set('chamber');
  }

  reset(): void {
    this.requestEpoch += 1;
    this.context.set(null);
    this.sessionId.set('');
    this.turns.set([]);
    this.currentReply.set(null);
    this.pendingSpecimenAction.set(null);
    this.summary.set(null);
    this.errorMessage.set('');
    this.requestState.set('idle');
    this.view.set('brief');
  }

  private async runRequest(
    operation: (
      gateway: WiseDragonConversationGateway,
      request: ContinueWiseDragonSessionRequest,
    ) => Promise<WiseDragonReply>,
    history: readonly WiseDragonConversationTurn[],
  ): Promise<WiseDragonReply | null> {
    const context = this.context();
    const sessionId = this.sessionId();
    if (!context || !sessionId) return null;

    const epoch = ++this.requestEpoch;
    this.errorMessage.set('');
    this.requestState.set('thinking');
    try {
      const reply = await operation(this.gateway, {
        schemaVersion: 1,
        sessionId,
        expectedRevision: history.length,
        context,
        history,
      });
      if (epoch !== this.requestEpoch) return null;
      this.applyReply(reply);
      return reply;
    } catch {
      if (epoch !== this.requestEpoch) return null;
      this.fail(
        'The Wise Dragon could not answer. Your practice response is still on this screen.',
      );
      return null;
    }
  }

  private applyReply(reply: WiseDragonReply): void {
    const wiseTurn: WiseDragonConversationTurn = {
      id: createTurnId('wise-dragon'),
      role: 'wise-dragon',
      message: reply.message,
    };
    this.turns.update((turns) => [...turns, wiseTurn]);
    this.currentReply.set(reply);
    this.pendingSpecimenAction.set(reply.specimenAction ?? null);
    this.requestState.set('idle');
    if (!reply.continueDefense) {
      this.summary.set(reply.summary ?? null);
      this.view.set('summary');
    }
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.requestState.set('error');
  }
}

function createSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `wise-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createTurnId(role: WiseDragonConversationTurn['role']): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
