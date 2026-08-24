import { inject, Service } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from './firebase-firestore.provider';
import {
  PUBLISHED_DRAGON_ASSETS_DOCUMENT,
  PublishedDragonAssetsV1,
} from '../../shared/assembly/model-pack/published-dragon-assets.models';
import { parsePublishedDragonAssets } from '../../shared/assembly/model-pack/published-dragon-assets.validation';

/** Reads Garage-published assets. Callers retain their bundled defaults when this returns null. */
@Service()
export class PublishedDragonAssetsRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  async load(): Promise<PublishedDragonAssetsV1 | null> {
    const snapshot = await getDoc(doc(this.firestore, PUBLISHED_DRAGON_ASSETS_DOCUMENT));
    if (!snapshot.exists()) return null;
    return parsePublishedDragonAssets(snapshot.data());
  }
}
