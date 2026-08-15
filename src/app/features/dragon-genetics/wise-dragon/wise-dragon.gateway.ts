import { InjectionToken } from '@angular/core';
import {
  ContinueWiseDragonSessionRequest,
  StartWiseDragonSessionRequest,
  WiseDragonReply,
} from './wise-dragon.models';

/** Provider-neutral Angular port. The first adapter is deterministic and never leaves the device. */
export interface WiseDragonConversationGateway {
  start(request: StartWiseDragonSessionRequest): Promise<WiseDragonReply>;
  respond(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply>;
  finish(request: ContinueWiseDragonSessionRequest): Promise<WiseDragonReply>;
}

export const WISE_DRAGON_CONVERSATION_GATEWAY = new InjectionToken<WiseDragonConversationGateway>(
  'WISE_DRAGON_CONVERSATION_GATEWAY',
);
