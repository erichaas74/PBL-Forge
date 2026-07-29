import { InjectionToken } from '@angular/core';
import { DragonLabSnapshot } from '../../features/dragon-lab/domain/dragon-lab.models';

/**
 * Database boundary for student work. A Firebase, Supabase, or REST adapter can
 * replace the local implementation without changing the genetics lab UI/store.
 */
export interface DragonLabRepository {
  load(sessionId: string): Promise<DragonLabSnapshot | null>;
  save(sessionId: string, snapshot: DragonLabSnapshot): Promise<void>;
  clear(sessionId: string): Promise<void>;
}

export const DRAGON_LAB_REPOSITORY = new InjectionToken<DragonLabRepository>(
  'DRAGON_LAB_REPOSITORY',
);

/** Replace this provider with the signed-in student's assignment/session id. */
export const DRAGON_LAB_SESSION_ID = new InjectionToken<string>('DRAGON_LAB_SESSION_ID');
