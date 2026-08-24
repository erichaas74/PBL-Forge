import { Service } from '@angular/core';
import { CreationTestScenarioDefinition } from '@pbl/creation-library/models/test-scenario.models';
import { DragonModelPackV1 } from '@pbl/assembly/model-pack/dragon-model-pack.models';
import {
  DRAGON_ASSET_VERSIONS_COLLECTION,
  PREVIEW_DRAGON_ASSETS_DOCUMENT,
  PUBLISHED_DRAGON_ASSETS_DOCUMENT,
  PublishedDragonAssetsV1,
} from '@pbl/assembly/model-pack/published-dragon-assets.models';
import { parsePublishedDragonAssets } from '@pbl/assembly/model-pack/published-dragon-assets.validation';
import { environment } from '../environments/environment';

@Service()
export class DragonAssetsPublisherService {
  async publishPreview(
    modelPack: DragonModelPackV1,
    arenaScenario: CreationTestScenarioDefinition,
    releaseNotes: string,
  ): Promise<string> {
    const { authApi, firestoreApi, auth, firestore } = await this.connect();
    const user = auth.currentUser
      ?? (await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider())).user;
    const versionId = `${safeVersion(modelPack.packVersion)}-${Date.now().toString(36)}`;
    const validated = parsePublishedDragonAssets({
      schemaVersion: 1,
      versionId,
      modelPack,
      arenaScenario,
      publishedBy: user.uid,
      publishedAt: null,
      releaseNotes,
    });
    const payload = { ...validated, publishedAt: firestoreApi.serverTimestamp() };
    const batch = firestoreApi.writeBatch(firestore);
    batch.set(firestoreApi.doc(firestore, `${DRAGON_ASSET_VERSIONS_COLLECTION}/${versionId}`), payload);
    batch.set(firestoreApi.doc(firestore, PREVIEW_DRAGON_ASSETS_DOCUMENT), payload);
    await batch.commit();
    return versionId;
  }

  async promotePreview(): Promise<string> {
    const { authApi, firestoreApi, auth, firestore } = await this.connect();
    const user = auth.currentUser
      ?? (await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider())).user;
    const preview = await firestoreApi.getDoc(firestoreApi.doc(firestore, PREVIEW_DRAGON_ASSETS_DOCUMENT));
    if (!preview.exists()) throw new Error('Publish a preview before promoting it.');
    const payload = parsePublishedDragonAssets(preview.data());
    await firestoreApi.setDoc(firestoreApi.doc(firestore, PUBLISHED_DRAGON_ASSETS_DOCUMENT), {
      ...payload,
      publishedBy: user.uid,
      publishedAt: firestoreApi.serverTimestamp(),
    });
    return payload.versionId;
  }

  async rollbackToPrevious(): Promise<string> {
    const { authApi, firestoreApi, auth, firestore } = await this.connect();
    const user = auth.currentUser
      ?? (await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider())).user;
    const currentSnapshot = await firestoreApi.getDoc(firestoreApi.doc(firestore, PUBLISHED_DRAGON_ASSETS_DOCUMENT));
    const currentVersion = currentSnapshot.exists()
      ? parsePublishedDragonAssets(currentSnapshot.data()).versionId
      : null;
    const versions = await firestoreApi.getDocs(firestoreApi.query(
      firestoreApi.collection(firestore, DRAGON_ASSET_VERSIONS_COLLECTION),
      firestoreApi.orderBy('publishedAt', 'desc'),
      firestoreApi.limit(10),
    ));
    const previous = versions.docs
      .map(snapshot => parsePublishedDragonAssets(snapshot.data()))
      .find(version => version.versionId !== currentVersion);
    if (!previous) throw new Error('No previous published Dragon asset version is available.');
    await firestoreApi.setDoc(firestoreApi.doc(firestore, PUBLISHED_DRAGON_ASSETS_DOCUMENT), {
      ...previous,
      publishedBy: user.uid,
      publishedAt: firestoreApi.serverTimestamp(),
    });
    return previous.versionId;
  }

  async recentVersions(): Promise<PublishedDragonAssetsV1[]> {
    const { firestoreApi, firestore } = await this.connect();
    const versions = await firestoreApi.getDocs(firestoreApi.query(
      firestoreApi.collection(firestore, DRAGON_ASSET_VERSIONS_COLLECTION),
      firestoreApi.orderBy('publishedAt', 'desc'),
      firestoreApi.limit(8),
    ));
    return versions.docs.map(snapshot => parsePublishedDragonAssets(snapshot.data()));
  }

  private async connect() {
    const [{ getApp, getApps, initializeApp }, authApi, firestoreApi] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = getApps().some(candidate => candidate.name === 'dragon-designer')
      ? getApp('dragon-designer')
      : initializeApp(environment.firebase, 'dragon-designer');
    const auth = authApi.getAuth(app);
    const firestore = firestoreApi.getFirestore(app);
    return { authApi, firestoreApi, auth, firestore };
  }
}

function safeVersion(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 50) || 'version';
}
