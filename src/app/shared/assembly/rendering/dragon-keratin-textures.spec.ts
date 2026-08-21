import * as THREE from 'three';
import { disposeDragonTextures } from './dragon-texture-cache';
import { dragonHornTextures, dragonKeratinTextures } from './dragon-keratin-textures';

afterEach(() => {
  disposeDragonTextures();
});

describe('dragon keratin textures', () => {
  it('keeps horn growth rings distinct from fine claw striations', () => {
    expect(dragonHornTextures().normalMap).not.toBe(dragonKeratinTextures().normalMap);
    expect(dragonHornTextures().roughnessMap).not.toBe(dragonKeratinTextures().roughnessMap);
  });

  it('adds restrained warm variation to horn albedo', () => {
    const pixels = readPixels(dragonHornTextures().map!);
    let warm = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > pixels[index + 2]) warm += 1;
    }

    expect(warm / (pixels.length / 4)).toBeGreaterThan(0.8);
  });
});

function readPixels(texture: THREE.Texture): Uint8ClampedArray {
  const canvas = texture.image as HTMLCanvasElement;
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}
