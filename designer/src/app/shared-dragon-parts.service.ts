import { Service } from '@angular/core';
import { ImportedPartAssetsStore } from './imported-part-assets.store';
import { connectDesignerFirebase } from './designer-firebase';
import { environment } from '../environments/environment';
import {
  SHARED_DRAGON_PART_SCHEMA_VERSION,
  SHARED_DRAGON_PARTS_COLLECTION,
  SharedDragonPart,
  SharedDragonPartRevision,
  SharedDragonPartSnapshot,
  SharedDragonPartStatus,
  SharedDragonPartUser,
  importedAssetIds,
  parseSharedDragonPart,
  parseSharedDragonPartRevision,
  sharedPartAccess,
  validateSharedDragonPartSnapshot,
} from './shared-dragon-parts.models';

export interface CreateSharedDragonPartInput {
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly snapshot: SharedDragonPartSnapshot;
  readonly changeNote: string;
}

export interface UpdateSharedDragonPartInput {
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export class SharedDragonPartConflictError extends Error {
  constructor() {
    super('This shared part has a newer revision. Reload it before saving again.');
    this.name = 'SharedDragonPartConflictError';
  }
}

@Service()
export class SharedDragonPartsService {
  async signIn(): Promise<SharedDragonPartUser> {
    const { authApi, auth } = await connectDesignerFirebase();
    const user = auth.currentUser
      ?? (environment.useEmulators
        ? (await authApi.signInWithEmailAndPassword(
          auth,
          'teacher@pblforge.local',
          'dragon-demo-teacher',
        )).user
        : (await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider())).user);
    return {
      uid: user.uid,
      displayName: user.displayName?.trim() || user.email?.trim() || 'Designer user',
      email: user.email?.trim() ?? '',
    };
  }

  async signOut(): Promise<void> {
    const { authApi, auth } = await connectDesignerFirebase();
    await authApi.signOut(auth);
  }

  async currentUser(): Promise<SharedDragonPartUser | null> {
    const { auth } = await connectDesignerFirebase();
    const user = auth.currentUser;
    return user ? {
      uid: user.uid,
      displayName: user.displayName?.trim() || user.email?.trim() || 'Designer user',
      email: user.email?.trim() ?? '',
    } : null;
  }

  async listAccessibleParts(): Promise<SharedDragonPart[]> {
    const user = await this.requireUser();
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const collection = firestoreApi.collection(firestore, SHARED_DRAGON_PARTS_COLLECTION);
    const snapshots = await Promise.all([
      firestoreApi.getDocs(firestoreApi.query(collection, firestoreApi.where('ownerUid', '==', user.uid))),
      firestoreApi.getDocs(firestoreApi.query(collection, firestoreApi.where('editorUids', 'array-contains', user.uid))),
      firestoreApi.getDocs(firestoreApi.query(collection, firestoreApi.where('viewerUids', 'array-contains', user.uid))),
      firestoreApi.getDocs(firestoreApi.query(collection, firestoreApi.where('status', '==', 'published'))),
    ]);
    const parts = new Map<string, SharedDragonPart>();
    for (const snapshot of snapshots) {
      for (const document of snapshot.docs) {
        try {
          parts.set(document.id, parseSharedDragonPart(document.id, document.data()));
        } catch {
          // A malformed remote record cannot block the rest of the library.
        }
      }
    }
    return [...parts.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createPart(
    input: CreateSharedDragonPartInput,
    importedAssets: ImportedPartAssetsStore,
  ): Promise<SharedDragonPart> {
    const user = await this.requireUser();
    const snapshot = validateSharedDragonPartSnapshot(input.snapshot);
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const partRef = firestoreApi.doc(firestoreApi.collection(firestore, SHARED_DRAGON_PARTS_COLLECTION));
    const timestamp = firestoreApi.serverTimestamp();
    await firestoreApi.setDoc(partRef, {
      schemaVersion: SHARED_DRAGON_PART_SCHEMA_VERSION,
      ownerUid: user.uid,
      editorUids: [],
      viewerUids: [],
      name: cleanText(input.name, 'Untitled part', 80),
      description: cleanText(input.description, '', 500),
      tags: cleanTags(input.tags),
      sourceDefinitionId: snapshot.sourceDefinitionId,
      profileId: snapshot.profileId,
      status: 'draft',
      currentRevisionId: '',
      publishedRevisionId: '',
      revisionNumber: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: user.uid,
    });
    await this.saveRevision(partRef.id, '', snapshot, input.changeNote || 'Initial shared version', importedAssets);
    return this.getPart(partRef.id);
  }

  async saveRevision(
    partId: string,
    expectedRevisionId: string,
    untrustedSnapshot: SharedDragonPartSnapshot,
    changeNote: string,
    importedAssets: ImportedPartAssetsStore,
  ): Promise<SharedDragonPart> {
    const user = await this.requireUser();
    const snapshot = validateSharedDragonPartSnapshot(untrustedSnapshot);
    const assetIds = importedAssetIds(snapshot);
    await this.uploadMissingAssets(partId, assetIds, importedAssets, user.uid);

    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const partRef = firestoreApi.doc(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}`);
    const revisionRef = firestoreApi.doc(firestoreApi.collection(partRef, 'revisions'));
    const currentDocument = await firestoreApi.getDoc(partRef);
    if (!currentDocument.exists()) throw new Error('The shared part no longer exists.');
    const current = parseSharedDragonPart(currentDocument.id, currentDocument.data());
    if (!['owner', 'editor'].includes(sharedPartAccess(current, user.uid) ?? '')) {
      throw new Error('You do not have permission to edit this shared part.');
    }
    if (current.currentRevisionId !== expectedRevisionId) throw new SharedDragonPartConflictError();
    const revisionNumber = current.revisionNumber + 1;
    const batch = firestoreApi.writeBatch(firestore);
    batch.set(revisionRef, {
      schemaVersion: SHARED_DRAGON_PART_SCHEMA_VERSION,
      partId,
      revisionNumber,
      parentRevisionId: current.currentRevisionId,
      sourceDefinitionId: snapshot.sourceDefinitionId,
      profileId: snapshot.profileId,
      dimensions: snapshot.dimensions,
      snapPoints: snapshot.snapPoints,
      parameters: snapshot.parameters,
      assetIds,
      changeNote: cleanText(changeNote, `Revision ${revisionNumber}`, 300),
      createdBy: user.uid,
      createdAt: firestoreApi.serverTimestamp(),
    });
    batch.update(partRef, {
      currentRevisionId: revisionRef.id,
      revisionNumber,
      updatedAt: firestoreApi.serverTimestamp(),
      updatedBy: user.uid,
    });
    try {
      await batch.commit();
    } catch (error) {
      const latest = await firestoreApi.getDoc(partRef);
      if (latest.exists()
        && parseSharedDragonPart(latest.id, latest.data()).currentRevisionId !== expectedRevisionId) {
        throw new SharedDragonPartConflictError();
      }
      throw error;
    }
    return this.getPart(partId);
  }

  async updateMetadata(partId: string, input: UpdateSharedDragonPartInput): Promise<SharedDragonPart> {
    const user = await this.requireUser();
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    await firestoreApi.updateDoc(firestoreApi.doc(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}`), {
      name: cleanText(input.name, 'Untitled part', 80),
      description: cleanText(input.description, '', 500),
      tags: cleanTags(input.tags),
      updatedAt: firestoreApi.serverTimestamp(),
      updatedBy: user.uid,
    });
    return this.getPart(partId);
  }

  async updateAccess(
    partId: string,
    editorUids: readonly string[],
    viewerUids: readonly string[],
  ): Promise<SharedDragonPart> {
    const user = await this.requireUser();
    const editors = cleanUids(editorUids, user.uid, 24);
    const viewers = cleanUids(viewerUids, user.uid, 48).filter(uid => !editors.includes(uid));
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    await firestoreApi.updateDoc(firestoreApi.doc(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}`), {
      editorUids: editors,
      viewerUids: viewers,
      updatedAt: firestoreApi.serverTimestamp(),
      updatedBy: user.uid,
    });
    return this.getPart(partId);
  }

  async setStatus(partId: string, status: SharedDragonPartStatus): Promise<SharedDragonPart> {
    const user = await this.requireUser();
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const partRef = firestoreApi.doc(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}`);
    const document = await firestoreApi.getDoc(partRef);
    if (!document.exists()) throw new Error('The shared part no longer exists.');
    const part = parseSharedDragonPart(document.id, document.data());
    if (part.ownerUid !== user.uid || !part.currentRevisionId) {
      throw new Error('Only the owner can change publication state.');
    }
    await firestoreApi.updateDoc(partRef, {
      status,
      publishedRevisionId: status === 'published'
        ? part.currentRevisionId
        : part.publishedRevisionId,
      updatedAt: firestoreApi.serverTimestamp(),
      updatedBy: user.uid,
    });
    return this.getPart(partId);
  }

  async listRevisions(partId: string): Promise<SharedDragonPartRevision[]> {
    await this.requireUser();
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const revisions = await firestoreApi.getDocs(firestoreApi.query(
      firestoreApi.collection(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}/revisions`),
      firestoreApi.orderBy('revisionNumber', 'desc'),
      firestoreApi.limit(30),
    ));
    return revisions.docs.map(document =>
      parseSharedDragonPartRevision(partId, document.id, document.data()));
  }

  async loadRevision(
    partId: string,
    revisionId: string,
    importedAssets: ImportedPartAssetsStore,
  ): Promise<SharedDragonPartRevision> {
    await this.requireUser();
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const reference = firestoreApi.doc(
      firestore,
      `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}/revisions/${revisionId}`,
    );
    const document = await firestoreApi.getDoc(reference);
    if (!document.exists()) throw new Error('That shared revision is no longer available.');
    const revision = parseSharedDragonPartRevision(partId, document.id, document.data());
    await this.downloadMissingAssets(partId, revision.assetIds, importedAssets);
    return revision;
  }

  async restoreRevision(
    part: SharedDragonPart,
    revisionId: string,
    importedAssets: ImportedPartAssetsStore,
  ): Promise<SharedDragonPart> {
    const revision = await this.loadRevision(part.id, revisionId, importedAssets);
    return this.saveRevision(
      part.id,
      part.currentRevisionId,
      revision,
      `Restored revision ${revision.revisionNumber}`,
      importedAssets,
    );
  }

  private async getPart(partId: string): Promise<SharedDragonPart> {
    const { firestoreApi, firestore } = await connectDesignerFirebase();
    const document = await firestoreApi.getDoc(
      firestoreApi.doc(firestore, `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}`),
    );
    if (!document.exists()) throw new Error('The shared part no longer exists.');
    return parseSharedDragonPart(document.id, document.data());
  }

  private async requireUser(): Promise<SharedDragonPartUser> {
    return (await this.currentUser()) ?? this.signIn();
  }

  private async uploadMissingAssets(
    partId: string,
    assetIds: readonly string[],
    importedAssets: ImportedPartAssetsStore,
    uid: string,
  ): Promise<void> {
    if (!assetIds.length) return;
    const { firestoreApi, firestore, storageApi, storage } = await connectDesignerFirebase();
    for (const assetId of assetIds) {
      const assetDocument = firestoreApi.doc(
        firestore,
        `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}/assets/${assetId}`,
      );
      if ((await firestoreApi.getDoc(assetDocument)).exists()) continue;
      const summary = importedAssets.assets().find(asset => asset.id === assetId);
      const bytes = await importedAssets.bytesFor(assetId);
      if (!summary || !bytes) {
        throw new Error(`Re-import ${summary?.fileName ?? assetId} before sharing this part.`);
      }
      const storagePath = sharedAssetPath(partId, assetId);
      const storageReference = storageApi.ref(storage, storagePath);
      try {
        await storageApi.getMetadata(storageReference);
      } catch (error) {
        if (!isStorageObjectMissing(error)) throw error;
        await storageApi.uploadBytes(storageReference, new Uint8Array(bytes), {
          contentType: 'model/gltf-binary',
          customMetadata: { partId, assetId },
        });
      }
      await firestoreApi.setDoc(assetDocument, {
        schemaVersion: SHARED_DRAGON_PART_SCHEMA_VERSION,
        partId,
        fileName: summary.fileName,
        storagePath,
        byteLength: summary.inspection.byteLength,
        meshCount: summary.inspection.meshCount,
        triangleCount: summary.inspection.triangleCount,
        materialCount: summary.inspection.materialCount,
        textureCount: summary.inspection.textureCount,
        maxTextureDimension: summary.inspection.maxTextureDimension,
        createdBy: uid,
        createdAt: firestoreApi.serverTimestamp(),
      });
    }
  }

  private async downloadMissingAssets(
    partId: string,
    assetIds: readonly string[],
    importedAssets: ImportedPartAssetsStore,
  ): Promise<void> {
    const missing = [];
    for (const assetId of assetIds) {
      if (!(await importedAssets.ensureRegistered(assetId))) missing.push(assetId);
    }
    if (!missing.length) return;
    const { firestoreApi, firestore, storageApi, storage } = await connectDesignerFirebase();
    for (const assetId of missing) {
      const document = await firestoreApi.getDoc(firestoreApi.doc(
        firestore,
        `${SHARED_DRAGON_PARTS_COLLECTION}/${partId}/assets/${assetId}`,
      ));
      if (!document.exists()) throw new Error(`Shared mesh ${assetId} is missing its metadata.`);
      const data = document.data();
      const fileName = typeof data['fileName'] === 'string' ? data['fileName'] : `${assetId}.glb`;
      const storagePath = typeof data['storagePath'] === 'string'
        ? data['storagePath']
        : sharedAssetPath(partId, assetId);
      const bytes = await storageApi.getBytes(storageApi.ref(storage, storagePath), 5 * 1024 * 1024);
      await importedAssets.installSharedAsset(assetId, fileName, bytes);
    }
  }
}

function cleanText(value: string, fallback: string, maximum: number): string {
  return (value.trim() || fallback).slice(0, maximum);
}

function cleanTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))]
    .slice(0, 12)
    .map(tag => tag.slice(0, 32));
}

function cleanUids(uids: readonly string[], ownerUid: string, maximum: number): string[] {
  return [...new Set(uids.map(uid => uid.trim()).filter(uid => uid && uid !== ownerUid))]
    .slice(0, maximum)
    .map(uid => uid.slice(0, 128));
}

function sharedAssetPath(partId: string, assetId: string): string {
  return `dragon-parts/${partId}/assets/${assetId}.glb`;
}

function isStorageObjectMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === 'storage/object-not-found';
}
