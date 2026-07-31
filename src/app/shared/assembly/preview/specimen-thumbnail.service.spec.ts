import { TestBed } from '@angular/core/testing';
import { AssemblyBlueprint } from '../domain/assembly.models';
import { describeSpecimen } from './specimen.models';
import { estimateSpecimenFrame, mergeSpecimenFrames } from './specimen-pose';
import { isSpecimenRenderingAvailable } from './specimen-renderer.service';
import { SpecimenThumbnailService } from './specimen-thumbnail.service';

/**
 * The one place WebGL is actually exercised. Everything else in this folder is
 * pure logic on purpose; this proves the rendering path produces real pixels
 * rather than a blank canvas, which is the failure mode a data-URL length check
 * would miss.
 */

function dragonish(size: number): AssemblyBlueprint {
  return {
    parts: [
      {
        id: 'body',
        roles: ['core'],
        shape: 'box',
        mass: 4,
        dimensions: { x: size * 2, y: size, z: size },
        position: { x: 0, y: 1, z: 0 },
        color: '#b4462a',
        visualProfile: { profileId: 'dragon-body', meshType: 'procedural' },
      },
      {
        id: 'wing',
        roles: ['wing'],
        shape: 'box',
        mass: 1,
        dimensions: { x: size * 0.4, y: size * 0.1, z: size * 1.6 },
        position: { x: 0, y: 1.4, z: 0 },
        color: '#b4462a',
        visualProfile: { profileId: 'dragon-wing', meshType: 'procedural' },
      },
    ],
    joints: [],
  };
}

function specimen(id: string, size = 1) {
  return describeSpecimen(id, dragonish(size), {
    label: id,
    traits: [{ id: 'wing-span', label: 'Wing span', valueLabel: `${size}x`, roles: ['wing'] }],
  });
}

/** Fraction of pixels that are neither transparent nor uniform background. */
function opaquePixelRatio(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('no 2d context'));
        return;
      }
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let opaque = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] > 8) opaque += 1;
      }
      resolve(opaque / (canvas.width * canvas.height));
    };
    image.onerror = () => reject(new Error('thumbnail did not decode'));
    image.src = dataUrl;
  });
}

describe('SpecimenThumbnailService', () => {
  let service: SpecimenThumbnailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpecimenThumbnailService);
  });

  afterEach(() => service.ngOnDestroy());

  if (!isSpecimenRenderingAvailable()) {
    it('is skipped without WebGL', () => {
      expect(service.bake(specimen('a'))).toBeNull();
    });
    return;
  }

  it('bakes a PNG data URL', () => {
    const dataUrl = service.bake(specimen('ember'));

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('draws an actual specimen, not an empty canvas', async () => {
    const dataUrl = service.bake(specimen('ember'), { size: 128 });
    expect(dataUrl).toBeTruthy();

    const ratio = await opaquePixelRatio(dataUrl!);
    // A transparent stage with a framed specimen: comfortably more than a
    // rounding error, comfortably less than a filled rectangle.
    expect(ratio).toBeGreaterThan(0.02);
    expect(ratio).toBeLessThan(0.95);
  });

  it('reuses one cached image for repeated bakes of the same specimen', () => {
    const first = service.bake(specimen('ember'));
    const second = service.bake(specimen('ember'));

    expect(second).toBe(first);
  });

  it('re-bakes when the focused trait changes', () => {
    const plain = service.bake(specimen('ember'));
    const focused = service.bake(specimen('ember'), { focusedTraitId: 'wing-span' });

    expect(focused).not.toBe(plain);
  });

  it('bakes a clutch under one shared frame', async () => {
    const clutch = [specimen('small', 0.7), specimen('large', 1.4)];
    const frame = mergeSpecimenFrames(
      clutch.map(entry => estimateSpecimenFrame(entry.blueprint)),
    );

    const baked = service.bakeAll(clutch, { frame, size: 128 });
    expect(baked.size).toBe(2);

    // Shared framing is the point: under it the larger specimen must cover more
    // of its tile. Framed individually both would fill the same area and the
    // size difference a student is meant to observe would vanish.
    const smallRatio = await opaquePixelRatio(baked.get('small')!);
    const largeRatio = await opaquePixelRatio(baked.get('large')!);
    expect(largeRatio).toBeGreaterThan(smallRatio);
  });

  it('clears its cache on request', () => {
    const first = service.bake(specimen('ember'));
    service.clearCache();

    expect(service.bake(specimen('ember'))).not.toBe(first);
  });
});
