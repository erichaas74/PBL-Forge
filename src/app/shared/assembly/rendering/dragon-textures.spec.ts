import * as THREE from 'three';
import { KERATIN_TILE, SCALE_TILE, applyBoxProjectedUv, applyTiledUv, disposeDragonTextures, dragonKeratinTextures, dragonMembraneTextures, dragonPartSeed, dragonScaleTextures, isSharedDragonTexture, } from './dragon-textures';
import { disposeAssemblyObject } from './three-assembly-mesh.factory';

/** Every u coordinate in a geometry's UV set. */
function uRange(geometry: THREE.BufferGeometry, filter?: (index: number) => boolean): [
    number,
    number
] {
    const uv = geometry.getAttribute('uv');
    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < uv.count; index += 1) {
        if (filter && !filter(index))
            continue;
        min = Math.min(min, uv.getX(index));
        max = Math.max(max, uv.getX(index));
    }
    return [min, max];
}

/** Picks vertices whose normal points down the given axis. */
function facing(geometry: THREE.BufferGeometry, axis: 'x' | 'y'): (index: number) => boolean {
    const normal = geometry.getAttribute('normal');
    return index => (axis === 'x' ? normal.getX(index) : normal.getY(index)) > 0.9;
}

afterEach(() => {
    disposeDragonTextures();
});

describe('dragon texture cache', () => {
    /**
     * The whole design rests on this: an arena can hold a dozen dragons of a
     * hundred parts each, and they all point at one set of maps. Generating per
     * part would be both a stall and a leak.
     */
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

    /**
     * `disposeAssemblyObject` used to free `material.map` unconditionally. With
     * shared maps that would strip the skin off every other dragon the moment one
     * part was removed.
     */
    it('survives disposal of a mesh that references it', () => {
        const skin = dragonScaleTextures();
        const disposed = vi.fn().mockName('dispose');
        skin.map!.addEventListener('dispose', disposed);

        const doomed = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: skin.map }));
        disposeAssemblyObject(doomed);

        expect(disposed).not.toHaveBeenCalled();
    });

    /**
     * Colour data must be decoded from sRGB; normal and roughness are raw numbers
     * and would be silently gamma-shifted if they went through the same path.
     */
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

    /**
     * The structural assertions above would all pass on a blank map. This is the
     * one that fails if a height field goes degenerate: a flat normal map is
     * uniform (128, 128, 255), and relief is the whole point.
     */
    it('produces a normal map with real relief, not a flat sheet', () => {
        const pixels = readPixels(dragonScaleTextures().normalMap!);
        let tilted = 0;
        for (let index = 0; index < pixels.length; index += 4) {
            if (Math.abs(pixels[index] - 128) > 12 || Math.abs(pixels[index + 1] - 128) > 12)
                tilted += 1;
        }

        expect(tilted / (pixels.length / 4)).toBeGreaterThan(0.15);
    });

    /**
     * The membrane's alpha map is what turns a flat 78%-opaque sheet into skin:
     * near-opaque along the arm, thinning to almost nothing at the trailing edge.
     * `u` is the chord fraction, so that gradient must run left to right.
     */
    it('thins the membrane toward its trailing edge', () => {
        const alpha = dragonMembraneTextures().alphaMap!;
        const pixels = readPixels(alpha);
        const size = (alpha.image as HTMLCanvasElement).width;

        const columnMean = (x: number): number => {
            let total = 0;
            for (let y = 0; y < size; y += 1)
                total += pixels[(y * size + x) * 4];
            return total / size;
        };

        expect(columnMean(0)).toBeGreaterThan(columnMean(size - 1) * 1.3);
    });
});

/** RGBA bytes behind a canvas-backed texture. */
function readPixels(texture: THREE.Texture): Uint8ClampedArray {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

describe('dragon part seed', () => {
    it('is stable for an id and differs between ids', () => {
        expect(dragonPartSeed('left-wing')).toBe(dragonPartSeed('left-wing'));
        expect(dragonPartSeed('left-wing')).not.toBe(dragonPartSeed('right-wing'));
    });

    it('stays inside the unit range, so it can be used directly as a UV offset', () => {
        for (const id of ['body', 'dragon-leg', 'tail-club', '', 'x']) {
            expect(dragonPartSeed(id)).toBeGreaterThanOrEqual(0);
            expect(dragonPartSeed(id)).toBeLessThan(1);
        }
    });
});

describe('tiled UV assignment', () => {
    /**
     * A genome that doubles a part should double the number of scales on it, not
     * the size of each scale. That is the difference between a bigger dragon and
     * a dragon rendered closer to the camera.
     */
    it('holds detail at a constant world size as the part grows', () => {
        const small = new THREE.PlaneGeometry(1, 1);
        const large = new THREE.PlaneGeometry(1, 1);

        // Whole multiples of the tile, so the seam rounding below is not in play.
        applyTiledUv(small, SCALE_TILE * 4, 1, SCALE_TILE);
        applyTiledUv(large, SCALE_TILE * 16, 1, SCALE_TILE);

        expect(uRange(small)[1]).toBeCloseTo(4, 5);
        expect(uRange(large)[1]).toBeCloseTo(16, 5);
    });

    /**
     * Revolved geometry wraps u from 1 straight back to 0. A fractional repeat
     * puts half a scale against a whole one down that join.
     */
    it('rounds the repeat to a whole number so the wrap seam matches', () => {
        const geometry = new THREE.PlaneGeometry(1, 1);
        applyTiledUv(geometry, 0.777, 0.31, SCALE_TILE);

        const [min, max] = uRange(geometry);
        expect(max - min).toBe(Math.round(0.777 / SCALE_TILE));
    });

    it('never collapses a small part below a single tile', () => {
        const geometry = new THREE.PlaneGeometry(1, 1);
        applyTiledUv(geometry, 0.001, 0.001, SCALE_TILE);

        expect(uRange(geometry)[1] - uRange(geometry)[0]).toBe(1);
    });

    /** Step 5: the same builder run twice must not land on the same texel. */
    it('offsets by the seed so repeated parts do not show the same scale', () => {
        const left = new THREE.PlaneGeometry(1, 1);
        const right = new THREE.PlaneGeometry(1, 1);

        applyTiledUv(left, 1, 1, SCALE_TILE, dragonPartSeed('front-left-leg'));
        applyTiledUv(right, 1, 1, SCALE_TILE, dragonPartSeed('front-right-leg'));

        expect(uRange(left)[0]).not.toBeCloseTo(uRange(right)[0], 3);
    });

    it('leaves geometry without a UV set alone rather than throwing', () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));

        expect(() => applyTiledUv(geometry, 1, 1, SCALE_TILE)).not.toThrow();
    });
});

describe('box projected UV assignment', () => {
    /**
     * `BoxGeometry` normalises each face to 0..1 over that face's own extent, so
     * on a long muzzle the side faces would stretch their scales lengthwise while
     * the tip squashed them. Projecting from position gives every face the same
     * density, whatever its size.
     */
    it('matches detail density across faces of different sizes', () => {
        const geometry = new THREE.BoxGeometry(2, 1, 1);
        applyBoxProjectedUv(geometry, KERATIN_TILE);

        const [acrossMin, acrossMax] = uRange(geometry, facing(geometry, 'x'));
        const [alongMin, alongMax] = uRange(geometry, facing(geometry, 'y'));

        // The +x face spans the 1-unit depth; the +y face spans the 2-unit length.
        expect(acrossMax - acrossMin).toBeCloseTo(1 / KERATIN_TILE, 5);
        expect(alongMax - alongMin).toBeCloseTo(2 / KERATIN_TILE, 5);
    });

    it('writes a UV set even when the geometry never had one', () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry.deleteAttribute('uv');
        applyBoxProjectedUv(geometry, SCALE_TILE);

        expect(geometry.getAttribute('uv')).toBeTruthy();
        expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
    });

    it('needs normals to pick a projection axis, and declines without them', () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));

        expect(() => applyBoxProjectedUv(geometry, SCALE_TILE)).not.toThrow();
        expect(geometry.getAttribute('uv')).toBeUndefined();
    });
});
