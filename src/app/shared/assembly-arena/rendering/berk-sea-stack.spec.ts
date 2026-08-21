import * as THREE from 'three';
import { SEA_STACK_CLIFF_HEIGHT, createSeaStackIsland, seaStackFooting, } from './berk-sea-stack';

/**
 * The island is scenery, so most of it can only be judged by looking at it. Two
 * things about it are claims rather than taste, and both are easy to break by
 * nudging a constant: that the arena genuinely hangs off the rock on one side
 * and genuinely rests on it on the other, and that the sea is far enough below
 * the sand for the drop to read.
 */
describe('berk sea stack', () => {
    const pitRadius = 10.5;
    const deckRadius = pitRadius + 2.1;

    function isOverWater(x: number, z: number): boolean {
        const footing = seaStackFooting(pitRadius);
        return new THREE.Vector2(x, z).distanceTo(footing.center) > footing.radius;
    }

    it('hangs the seaward side of the stand off the rock', () => {
        expect(isOverWater(deckRadius, 0), 'the front of the gallery should be over open water').toBe(true);
        expect(isOverWater(pitRadius, 0), 'the front of the sand should be over open water too').toBe(true);
    });

    it('leaves the back of the ring and both gatehouses on solid ground', () => {
        expect(isOverWater(-deckRadius, 0), 'the back of the gallery is the part that rests on rock').toBe(false);
        // The gatehouses stand on the cross axis at the edge of the pit, and a
        // gatehouse hanging in mid-air is the first thing that would give the
        // island away.
        for (const side of [-1, 1]) {
            expect(isOverWater(0, side * (pitRadius + 0.44)), `gatehouse at z=${side * (pitRadius + 0.44)}`).toBe(false);
        }
    });

    it('builds an island that reaches from the stand down past the waterline', () => {
        const island = createSeaStackIsland({
            pitRadius,
            deckRadius,
            deckHeight: 3.74,
            quality: 'high',
        });

        const bounds = new THREE.Box3().setFromObject(island.group);
        expect(bounds.min.y, 'the column should carry on below the sea, not stop at it').toBeLessThan(-SEA_STACK_CLIFF_HEIGHT);
        // Nothing built under the arena may rise through the sand the dragons are
        // standing on. Measured over the arena's own footprint only — the horizon
        // spires are supposed to stand well above the cliff top, from far away.
        expect(highestUnderTheArena(island.group, deckRadius + 4), 'something under the stand is poking up into the ring').toBeLessThan(4);

        // Cheap proof the swell is wired up rather than only declared: advancing
        // time has to change something on the surf.
        const surf = firstTransparentMesh(island.group);
        expect(surf, 'expected a foam collar').toBeDefined();
        island.update(0.4);
        const early = (surf!.material as THREE.MeshBasicMaterial).opacity;
        island.update(2.1);
        expect((surf!.material as THREE.MeshBasicMaterial).opacity).not.toBeCloseTo(early, 3);
    });
});

/** Highest point of anything standing within `range` of the middle of the pit. */
function highestUnderTheArena(root: THREE.Object3D, range: number): number {
    const box = new THREE.Box3();
    let highest = -Infinity;

    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh))
            return;
        box.setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        if (Math.hypot(center.x, center.z) > range)
            return;
        highest = Math.max(highest, box.max.y);
    });

    return highest;
}

function firstTransparentMesh(root: THREE.Object3D): THREE.Mesh | undefined {
    let found: THREE.Mesh | undefined;
    root.traverse((object) => {
        if (found || !(object instanceof THREE.Mesh))
            return;
        const material = object.material;
        if (!Array.isArray(material) && material.transparent)
            found = object;
    });
    return found;
}
