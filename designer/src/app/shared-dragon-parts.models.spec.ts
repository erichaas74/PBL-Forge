import { describe, expect, it } from 'vitest';
import {
  SharedDragonPart,
  importedAssetIds,
  sharedPartAccess,
  validateSharedDragonPartSnapshot,
} from './shared-dragon-parts.models';

describe('shared Dragon parts', () => {
  it('finds imported meshes referenced by a custom recipe once', () => {
    const assetPiece = {
      id: 'crest',
      label: 'Crest',
      kind: 'asset',
      assetId: 'local-0123456789abcdef01234567',
      sourceFileName: 'crest.glb',
      material: 'original',
      offset: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      mirrored: false,
      visible: true,
    };
    const parameters = {
      customPartRecipe: JSON.stringify({ version: 2, pieces: [assetPiece, { ...assetPiece, id: 'crest-2' }] }),
    };
    expect(importedAssetIds({
      sourceDefinitionId: 'dragon-head-horned',
      profileId: 'dragon-head-horned',
      dimensions: { x: 1, y: 1, z: 1 },
      snapPoints: {},
      parameters,
    })).toEqual(['local-0123456789abcdef01234567']);
  });

  it('rejects malformed recipes and non-finite parameters before upload', () => {
    expect(() => validateSharedDragonPartSnapshot({
      sourceDefinitionId: 'dragon-head-horned',
      profileId: 'dragon-head-horned',
      dimensions: { x: 1, y: 1, z: 1 },
      snapPoints: {},
      parameters: { customPartRecipe: '{bad json' },
    })).toThrow(/invalid custom-piece recipe/i);

    expect(() => validateSharedDragonPartSnapshot({
      sourceDefinitionId: 'dragon-head-horned',
      profileId: 'dragon-head-horned',
      dimensions: { x: 1, y: 1, z: 1 },
      snapPoints: {},
      parameters: { headWidth: Number.NaN },
    })).toThrow(/headWidth is invalid/i);
  });

  it('resolves owner, editor, viewer, and published access in priority order', () => {
    const part = {
      schemaVersion: 1,
      id: 'part',
      ownerUid: 'owner',
      editorUids: ['editor'],
      viewerUids: ['viewer'],
      name: 'Head',
      description: '',
      tags: [],
      sourceDefinitionId: 'dragon-head-horned',
      profileId: 'dragon-head-horned',
      status: 'published',
      currentRevisionId: 'r1',
      publishedRevisionId: 'r1',
      revisionNumber: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: 'owner',
    } satisfies SharedDragonPart;
    expect(sharedPartAccess(part, 'owner')).toBe('owner');
    expect(sharedPartAccess(part, 'editor')).toBe('editor');
    expect(sharedPartAccess(part, 'viewer')).toBe('viewer');
    expect(sharedPartAccess(part, 'reader')).toBe('published');
  });
});
