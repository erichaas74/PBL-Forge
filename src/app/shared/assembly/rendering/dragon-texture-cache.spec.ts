import * as THREE from 'three';
import { disposeDragonTextures, isSharedDragonTexture } from './dragon-texture-cache';
import { dragonKeratinTextures } from './dragon-keratin-textures';
import { dragonMembraneTextures } from './dragon-membrane-textures';
import { dragonScaleTextures } from './dragon-scale-textures';
import { disposeAssemblyObject } from './assembly-object-disposal';

afterEach(() => {
  disposeDragonTextures();
});

describe('dragon texture cache', () => {
  it('generates each map set once and hands back the same objects', () => {
    const first = dragonScaleTextures();
    const second = dragonScaleTextures();

    expect(second.map).toBe(first.map);
    expect(second.normalMap).toBe(first.normalMap);
    expect(second.roughnessMap).toBe(first.roughnessMap);
  });

  it('marks its textures shared, so mesh disposal leaves them alone', () => {
    const skin = dragonScaleTextures();

    expect(isSharedDragonTexture(skin.map)).toBe(true);
    expect(isSharedDragonTexture(skin.normalMap)).toBe(true);
    expect(isSharedDragonTexture(new THREE.Texture())).toBe(false);
    expect(isSharedDragonTexture(null)).toBe(false);
  });

  it('survives disposal of a mesh that references it', () => {
    const skin = dragonScaleTextures();
    const disposed = vi.fn().mockName('dispose');
    skin.map!.addEventListener('dispose', disposed);

    const doomed = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ map: skin.map }),
    );
    disposeAssemblyObject(doomed);

    expect(disposed).not.toHaveBeenCalled();
  });

  it('tags colour maps as sRGB and data maps as linear', () => {
    const skin = dragonScaleTextures();

    expect(skin.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(skin.normalMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect(skin.roughnessMap!.colorSpace).toBe(THREE.NoColorSpace);
  });

  it('repeats tiled sets and clamps the membrane, which maps once per wing', () => {
    expect(dragonScaleTextures().map!.wrapS).toBe(THREE.RepeatWrapping);
    expect(dragonKeratinTextures().normalMap!.wrapT).toBe(THREE.RepeatWrapping);
    expect(dragonMembraneTextures().alphaMap!.wrapS).toBe(THREE.ClampToEdgeWrapping);
  });

  it('gives the membrane an alpha map and the tiled sets none', () => {
    expect(dragonMembraneTextures().alphaMap).toBeTruthy();
    expect(dragonScaleTextures().alphaMap).toBeNull();
    expect(dragonKeratinTextures().alphaMap).toBeNull();
  });

  it('asks for anisotropic filtering, since scales are read edge-on', () => {
    expect(dragonScaleTextures().map!.anisotropy).toBeGreaterThan(1);
  });
});
