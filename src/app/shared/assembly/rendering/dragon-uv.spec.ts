import * as THREE from 'three';
import { KERATIN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { dragonPartSeed } from './dragon-textures';
import { applyBoxProjectedUv, applyTiledUv } from './dragon-uv';

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
