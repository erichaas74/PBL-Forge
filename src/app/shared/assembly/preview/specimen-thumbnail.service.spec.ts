import { TestBed } from '@angular/core/testing';
import { AssemblyBlueprint } from '../domain/assembly.models';
import { describeSpecimen } from './specimen.models';
import { estimateSpecimenFrame, mergeSpecimenFrames } from './specimen-pose';
import { SpecimenRendererService, isSpecimenRenderingAvailable } from './specimen-renderer.service';
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

interface PixelStats {
  /** Fraction of the tile covered by the specimen. */
  ratio: number;
  /** Centroid of drawn pixels, normalised to 0..1 across the tile. */
  centerX: number;
  centerY: number;
}

function measure(dataUrl: string): Promise<PixelStats> {
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
      let sumX = 0;
      let sumY = 0;
      for (let pixel = 0; pixel < canvas.width * canvas.height; pixel += 1) {
        if (data[pixel * 4 + 3] <= 8) continue;
        opaque += 1;
        sumX += pixel % canvas.width;
        sumY += Math.floor(pixel / canvas.width);
      }

      resolve({
        ratio: opaque / (canvas.width * canvas.height),
        centerX: opaque ? sumX / opaque / canvas.width : 0.5,
        centerY: opaque ? sumY / opaque / canvas.height : 0.5,
      });
    };
    image.onerror = () => reject(new Error('thumbnail did not decode'));
    image.src = dataUrl;
  });
}

async function opaquePixelRatio(dataUrl: string): Promise<number> {
  return (await measure(dataUrl)).ratio;
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

  /**
   * Rendering is deterministic, so two bakes of the same specimen return equal
   * strings whether or not a cache exists. Counting renders is the only way to
   * observe the cache actually doing its job.
   */
  it('renders once and serves repeat requests from the cache', () => {
    const render = spyOn(SpecimenRendererService.prototype, 'toDataUrl').and.callThrough();

    service.bake(specimen('ember'));
    service.bake(specimen('ember'));

    expect(render).toHaveBeenCalledTimes(1);
  });

  /**
   * The renderer nests the posed parts inside a pivot at the framing centre so
   * the turntable spins in place. If those two offsets stop cancelling, a
   * specimen built away from the world origin drifts off its tile — which the
   * usual origin-centred fixtures would never reveal.
   */
  it('centres a specimen that was built far from the world origin', async () => {
    const distant = describeSpecimen('distant', {
      parts: dragonish(1).parts.map(part => ({
        ...part,
        position: { x: part.position.x + 50, y: part.position.y, z: part.position.z - 30 },
      })),
      joints: [],
    });

    const stats = await measure(service.bake(distant, { size: 128 })!);

    expect(stats.ratio).toBeGreaterThan(0.02);
    expect(stats.centerX).toBeGreaterThan(0.3);
    expect(stats.centerX).toBeLessThan(0.7);
    expect(stats.centerY).toBeGreaterThan(0.3);
    expect(stats.centerY).toBeLessThan(0.7);
  });

  it('renders separately for each distinct specimen', () => {
    const render = spyOn(SpecimenRendererService.prototype, 'toDataUrl').and.callThrough();

    service.bake(specimen('ember'));
    service.bake(specimen('tide'));

    expect(render).toHaveBeenCalledTimes(2);
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

  it('re-renders after the cache is cleared', () => {
    const render = spyOn(SpecimenRendererService.prototype, 'toDataUrl').and.callThrough();

    const before = service.bake(specimen('ember'));
    service.clearCache();
    const after = service.bake(specimen('ember'));

    expect(render).toHaveBeenCalledTimes(2);
    // Deterministic rendering: the fresh bake matches the discarded one.
    expect(after).toEqual(before);
  });
});
