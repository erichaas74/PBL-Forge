import { Injectable } from '@angular/core';
import { DragonLabSnapshot } from '../../features/dragon-lab/domain/dragon-lab.models';
import { DragonLabRepository } from './dragon-lab.repository';

interface StoredLabRecord {
  savedAt: string;
  snapshot: DragonLabSnapshot;
}

@Injectable()
export class LocalDragonLabRepository implements DragonLabRepository {
  async load(sessionId: string): Promise<DragonLabSnapshot | null> {
    try {
      const raw = globalThis.localStorage?.getItem(this.key(sessionId));
      if (!raw) return null;
      const record = JSON.parse(raw) as Partial<StoredLabRecord>;
      return record.snapshot?.schemaVersion === 1 ? record.snapshot : null;
    } catch {
      return null;
    }
  }

  async save(sessionId: string, snapshot: DragonLabSnapshot): Promise<void> {
    const record: StoredLabRecord = {
      savedAt: new Date().toISOString(),
      snapshot,
    };
    globalThis.localStorage?.setItem(this.key(sessionId), JSON.stringify(record));
  }

  async clear(sessionId: string): Promise<void> {
    globalThis.localStorage?.removeItem(this.key(sessionId));
  }

  private key(sessionId: string): string {
    return `dragon-genetics-lab:v1:${sessionId}`;
  }
}
