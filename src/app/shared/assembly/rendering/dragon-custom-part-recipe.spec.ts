import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { createDragonPalette } from './dragon-palette';
import {
  addDragonCustomPartPieces,
  parseDragonCustomPartRecipe,
} from './dragon-custom-part-recipe';
import {
  registerAssemblyAssetTemplate,
  unregisterAssemblyAssetTemplate,
} from './assembly-asset-loader';

const part = (recipe: string): AssemblyPart => ({
  id: 'custom-head',
  shape: 'sphere',
  mass: 1,
  dimensions: { x: 2, y: 1, z: 0.5 },
  position: { x: 0, y: 0, z: 0 },
  color: '#884422',
  visualProfile: {
    profileId: 'dragon-head-horned',
    meshType: 'procedural',
    parameters: { customPartRecipe: recipe },
  },
});

const recipe = JSON.stringify({
  version: 1,
  pieces: [{
    id: 'cheek-spike', label: 'Cheek spike', shape: 'cone', material: 'horn',
    offset: { x: 0.1, y: 0.2, z: 0.3 },
    rotationDegrees: { x: 10, y: 20, z: 30 },
    scale: { x: 0.1, y: 0.4, z: 0.12 },
    mirrored: true, visible: true,
  }],
});

describe('dragon custom part recipe', () => {
  it('rejects malformed recipes and invalid pieces safely', () => {
    expect(parseDragonCustomPartRecipe('not-json').pieces).toEqual([]);
    expect(parseDragonCustomPartRecipe(JSON.stringify({ version: 2, pieces: [] })).pieces).toEqual([]);
  });

  it('migrates version-one primitive recipes to the version-two contract', () => {
    const parsed = parseDragonCustomPartRecipe(recipe);

    expect(parsed.version).toBe(2);
    expect(parsed.pieces[0]).toMatchObject({ kind: 'primitive', shape: 'cone' });
  });

  it('builds mirrored, named pieces in parent-relative dimensions', () => {
    const group = new THREE.Group();
    addDragonCustomPartPieces(group, part(recipe), { x: 2, y: 1, z: 0.5 }, createDragonPalette('#884422', 0.5));

    const left = group.getObjectByName('dragon-custom-piece-cheek-spike-left') as THREE.Mesh;
    const right = group.getObjectByName('dragon-custom-piece-cheek-spike-right') as THREE.Mesh;
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    expect(left.position.z).toBeCloseTo(-0.15);
    expect(right.position.z).toBeCloseTo(0.15);
    expect(right.scale).toEqual(new THREE.Vector3(0.2, 0.4, 0.06));
  });

  it('renders a registered imported asset with its parent-relative transform', () => {
    const template = new THREE.Group();
    template.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.25), new THREE.MeshStandardMaterial()));
    registerAssemblyAssetTemplate('local-test-asset', template);
    const importedRecipe = JSON.stringify({
      version: 2,
      pieces: [{
        id: 'imported-brow', label: 'Imported brow', kind: 'asset',
        assetId: 'local-test-asset', sourceFileName: 'brow.glb', material: 'original',
        offset: { x: 0.2, y: 0.3, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 },
        scale: { x: 0.4, y: 0.5, z: 0.6 }, mirrored: false, visible: true,
      }],
    });
    const group = new THREE.Group();

    addDragonCustomPartPieces(
      group,
      part(importedRecipe),
      { x: 2, y: 1, z: 0.5 },
      createDragonPalette('#884422', 0.5),
    );

    const imported = group.getObjectByName('dragon-custom-piece-imported-brow-single')!;
    expect(imported).toBeTruthy();
    expect(imported.position.toArray()).toEqual([0.4, 0.3, 0]);
    expect(imported.scale.toArray()).toEqual([0.8, 0.5, 0.3]);
    unregisterAssemblyAssetTemplate('local-test-asset');
  });
});
