import * as THREE from 'three';
import { disposeDragonTextures } from './dragon-texture-cache';
import { dragonScaleTextures } from './dragon-scale-textures';

afterEach(() => {
  disposeDragonTextures();
});

describe('dragon scale textures', () => {
  it('produces a normal map with real relief, not a flat sheet', () => {
    const pixels = readPixels(dragonScaleTextures().normalMap!);
    let tilted = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (Math.abs(pixels[index] - 128) > 12 || Math.abs(pixels[index + 1] - 128) > 12) {
        tilted += 1;
      }
    }

    expect(tilted / (pixels.length / 4)).toBeGreaterThan(0.15);
  });

  it('carries subtle chromatic variation instead of flat greyscale', () => {
    const pixels = readPixels(dragonScaleTextures().map!);
    let chromatic = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const spread =
        Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) -
        Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
      if (spread >= 2) chromatic += 1;
    }

    expect(chromatic / (pixels.length / 4)).toBeGreaterThan(0.35);
  });

  it('varies scale brightness enough to break up repeated tiling', () => {
    const pixels = readPixels(dragonScaleTextures().map!);
    let darkest = 255;
    let lightest = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const value = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      darkest = Math.min(darkest, value);
      lightest = Math.max(lightest, value);
    }

    expect(lightest - darkest).toBeGreaterThan(35);
  });
});

function readPixels(texture: THREE.Texture): Uint8ClampedArray {
  const canvas = texture.image as HTMLCanvasElement;
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}
