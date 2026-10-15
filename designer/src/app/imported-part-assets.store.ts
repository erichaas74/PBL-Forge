import { Service, signal } from '@angular/core';
import {
  ImportedAssemblyAssetInspection,
  importAssemblyGlb,
} from '@pbl/assembly/rendering/assembly-imported-asset';
import {
  hasRegisteredAssemblyAsset,
  registerAssemblyAssetTemplate,
} from '@pbl/assembly/rendering/assembly-asset-loader';

export interface DesignerImportedPartAsset {
  readonly id: string;
  readonly label: string;
  readonly fileName: string;
  readonly createdAt: string;
  readonly persisted: boolean;
  readonly inspection: ImportedAssemblyAssetInspection;
}

interface StoredImportedPartAsset {
  readonly id: string;
  readonly bytes: ArrayBuffer;
}

const DATABASE_NAME = 'dragon-designer-imported-parts';
const DATABASE_VERSION = 1;
const ASSET_STORE = 'assets';
const METADATA_STORE = 'metadata';

@Service()
export class ImportedPartAssetsStore {
  private readonly summaries = signal<readonly DesignerImportedPartAsset[]>([]);
  private readonly registrations = new Map<string, Promise<boolean>>();

  readonly assets = this.summaries.asReadonly();
  readonly revision = signal(0);

  constructor() {
    void this.loadSummaries();
  }

  async importFile(file: File): Promise<DesignerImportedPartAsset> {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      throw new Error('Choose a binary glTF 2.0 file with a .glb extension.');
    }
    const bytes = await file.arrayBuffer();
    const imported = await importAssemblyGlb(bytes, file.name);
    const id = `local-${(await contentHash(bytes)).slice(0, 24)}`;
    const createdAt = new Date().toISOString();
    const summary: DesignerImportedPartAsset = {
      id,
      label: labelFromFileName(file.name),
      fileName: file.name.slice(0, 96),
      createdAt,
      persisted: supportsIndexedDb(),
      inspection: imported.inspection,
    };
    registerAssemblyAssetTemplate(id, imported.template);
    if (summary.persisted) {
      await Promise.all([
        putRecord(ASSET_STORE, { id, bytes } satisfies StoredImportedPartAsset),
        putRecord(METADATA_STORE, summary),
      ]);
    }
    this.upsertSummary(summary);
    this.revision.update(value => value + 1);
    return summary;
  }

  /** Returns the original GLB bytes for cloud publication without re-encoding the mesh. */
  async bytesFor(assetId: string): Promise<ArrayBuffer | null> {
    if (!supportsIndexedDb()) return null;
    return (await getRecord<StoredImportedPartAsset>(ASSET_STORE, assetId))?.bytes ?? null;
  }

  /** Validates and installs a downloaded shared GLB into the same local cache as a file import. */
  async installSharedAsset(
    assetId: string,
    fileName: string,
    bytes: ArrayBuffer,
    createdAt = new Date().toISOString(),
  ): Promise<DesignerImportedPartAsset> {
    const expectedId = `local-${(await contentHash(bytes)).slice(0, 24)}`;
    if (assetId !== expectedId) {
      throw new Error(`${fileName} does not match its shared asset identifier.`);
    }
    const imported = await importAssemblyGlb(bytes, fileName);
    const summary: DesignerImportedPartAsset = {
      id: assetId,
      label: labelFromFileName(fileName),
      fileName: fileName.slice(0, 96),
      createdAt,
      persisted: supportsIndexedDb(),
      inspection: imported.inspection,
    };
    registerAssemblyAssetTemplate(assetId, imported.template);
    if (summary.persisted) {
      await Promise.all([
        putRecord(ASSET_STORE, { id: assetId, bytes } satisfies StoredImportedPartAsset),
        putRecord(METADATA_STORE, summary),
      ]);
    }
    this.upsertSummary(summary);
    this.revision.update(value => value + 1);
    return summary;
  }

  async ensureRegistered(assetId: string): Promise<boolean> {
    if (hasRegisteredAssemblyAsset(assetId)) return true;
    const existing = this.registrations.get(assetId);
    if (existing) return existing;
    const pending = this.restore(assetId).finally(() => this.registrations.delete(assetId));
    this.registrations.set(assetId, pending);
    return pending;
  }

  private async restore(assetId: string): Promise<boolean> {
    if (!supportsIndexedDb()) return false;
    const record = await getRecord<StoredImportedPartAsset>(ASSET_STORE, assetId);
    const summary = await getRecord<DesignerImportedPartAsset>(METADATA_STORE, assetId);
    if (!record || !summary) return false;
    try {
      const imported = await importAssemblyGlb(record.bytes, summary.fileName);
      registerAssemblyAssetTemplate(assetId, imported.template);
      this.upsertSummary({ ...summary, persisted: true, inspection: imported.inspection });
      this.revision.update(value => value + 1);
      return true;
    } catch {
      return false;
    }
  }

  private async loadSummaries(): Promise<void> {
    if (!supportsIndexedDb()) return;
    try {
      const summaries = await getAllRecords<DesignerImportedPartAsset>(METADATA_STORE);
      this.summaries.set(summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      // A blocked or unavailable IndexedDB leaves import usable for this session.
    }
  }

  private upsertSummary(summary: DesignerImportedPartAsset): void {
    this.summaries.update(current => [
      summary,
      ...current.filter(candidate => candidate.id !== summary.id),
    ]);
  }
}

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function contentHash(bytes: ArrayBuffer): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const byte of new Uint8Array(bytes)) hash = Math.imul(hash ^ byte, 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function labelFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.glb$/i, '');
  const words = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (words || 'Imported part').slice(0, 48);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another Designer tab.'));
  });
}

async function putRecord(storeName: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(storeName, 'readwrite').objectStore(storeName).put(value));
  } finally {
    database.close();
  }
}

async function getRecord<T>(storeName: string, id: string): Promise<T | null> {
  const database = await openDatabase();
  try {
    return await requestResult<T | undefined>(
      database.transaction(storeName, 'readonly').objectStore(storeName).get(id),
    ) ?? null;
  } finally {
    database.close();
  }
}

async function getAllRecords<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  try {
    return await requestResult<T[]>(
      database.transaction(storeName, 'readonly').objectStore(storeName).getAll(),
    );
  } finally {
    database.close();
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}
