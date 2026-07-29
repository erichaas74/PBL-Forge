import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  setDoc,
} from '@angular/fire/firestore';
import { FirestorePaths } from '../../services/firestore-paths';
import {
  CreationAssemblyAsset,
  CreationAttackMoveAsset,
  CreationAssetKind,
  CreationLibraryRepository,
  CreationLibrarySnapshot,
  CreationTestScenarioAsset,
} from '../models/creation-library.models';

@Injectable({ providedIn: 'root' })
export class FirestoreCreationLibraryRepository implements CreationLibraryRepository {
  private readonly firestore = inject(Firestore);
  private schoolId: string | null = null;

  setSchoolId(schoolId: string | null): void {
    this.schoolId = schoolId;
  }

  async load(): Promise<CreationLibrarySnapshot> {
    const schoolId = this.requireSchoolId();
    const [assemblySnapshot, moveSnapshot, scenarioSnapshot] = await Promise.all([
      getDocs(collection(this.firestore, FirestorePaths.creationAssemblies(schoolId))),
      getDocs(collection(this.firestore, FirestorePaths.creationAttackMoves(schoolId))),
      getDocs(collection(this.firestore, FirestorePaths.creationTestScenarios(schoolId))),
    ]);

    return {
      assemblies: assemblySnapshot.docs
        .map(item => item.data())
        .filter(isCreationAssemblyAsset),
      attackMoves: moveSnapshot.docs
        .map(item => item.data())
        .filter(isCreationAttackMoveAsset),
      testScenarios: scenarioSnapshot.docs
        .map(item => item.data())
        .filter(isCreationTestScenarioAsset),
    };
  }

  async saveAssembly(asset: CreationAssemblyAsset): Promise<void> {
    const schoolId = this.requireSchoolId();
    await setDoc(
      doc(this.firestore, FirestorePaths.creationAssembly(schoolId, asset.id)),
      asset,
    );
  }

  async saveAttackMove(asset: CreationAttackMoveAsset): Promise<void> {
    const schoolId = this.requireSchoolId();
    await setDoc(
      doc(this.firestore, FirestorePaths.creationAttackMove(schoolId, asset.id)),
      asset,
    );
  }

  async saveTestScenario(asset: CreationTestScenarioAsset): Promise<void> {
    const schoolId = this.requireSchoolId();
    await setDoc(
      doc(this.firestore, FirestorePaths.creationTestScenario(schoolId, asset.id)),
      asset,
    );
  }

  async deleteAsset(kind: CreationAssetKind, assetId: string): Promise<void> {
    const schoolId = this.requireSchoolId();
    const path = getAssetPath(schoolId, kind, assetId);

    await deleteDoc(doc(this.firestore, path));
  }

  private requireSchoolId(): string {
    if (!this.schoolId) {
      throw new Error('Creation library Firestore repository needs a schoolId before use.');
    }

    return this.schoolId;
  }
}

function isCreationAssemblyAsset(value: unknown): value is CreationAssemblyAsset {
  return isRecord(value) && value['kind'] === 'assembly' && typeof value['id'] === 'string';
}

function isCreationAttackMoveAsset(value: unknown): value is CreationAttackMoveAsset {
  return isRecord(value) && value['kind'] === 'attack-move' && typeof value['id'] === 'string';
}

function isCreationTestScenarioAsset(value: unknown): value is CreationTestScenarioAsset {
  return isRecord(value) && value['kind'] === 'test-scenario' && typeof value['id'] === 'string';
}

function getAssetPath(schoolId: string, kind: CreationAssetKind, assetId: string): string {
  if (kind === 'assembly') {
    return FirestorePaths.creationAssembly(schoolId, assetId);
  }

  if (kind === 'attack-move') {
    return FirestorePaths.creationAttackMove(schoolId, assetId);
  }

  return FirestorePaths.creationTestScenario(schoolId, assetId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
