import * as THREE from 'three';
import { disposeDragonTextures } from './dragon-texture-cache';
import { dragonMembraneTextures } from './dragon-membrane-textures';

afterEach(() => {
  disposeDragonTextures();
});

describe('dragon membrane textures', () => {
  it('thins the membrane toward its trailing edge', () => {
    const alpha = dragonMembraneTextures().alphaMap!;
    const pixels = readPixels(alpha);
    const size = (alpha.image as HTMLCanvasElement).width;

    const columnMean = (x: number): number => {
      let total = 0;
      for (let y = 0; y < size; y += 1) total += pixels[(y * size + x) * 4];
      return total / size;
    };

    expect(columnMean(0)).toBeGreaterThan(columnMean(size - 1) * 1.3);
  });

  it('uses tissue relief as well as the main vein network', () => {
    const pixels = readPixels(dragonMembraneTextures().normalMap!);
    const unique = new Set<number>();
    for (let index = 0; index < pixels.length; index += 64) {
      unique.add(pixels[index] * 256 + pixels[index + 1]);
    }

    expect(unique.size).toBeGreaterThan(100);
  });
});

function readPixels(texture: THREE.Texture): Uint8ClampedArray {
  const canvas = texture.image as HTMLCanvasElement;
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}
