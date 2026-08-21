import * as THREE from 'three';
import { createBerkGrandstand, grandstandFootprint } from './berk-grandstand';
import { seaStackFooting } from './berk-sea-stack';

/**
 * The stand is scenery, so how it *looks* is a matter for the screenshots. Two
 * things about where it sits are not: it has to be clear of the gallery it
 * stands behind, and it has to be on the rock rather than off the seaward side
 * of the island. Both are one constant away from being silently wrong.
 */
describe('berk grandstand', () => {
    const pitRadius = 10.5;
    /** Outer edge of the gallery ring, from `addKillRingGallery`. */
    const galleryRadius = pitRadius + 2.1;

    it('stands clear of the gallery it sits behind', () => {
        const footprint = grandstandFootprint(pitRadius);
        expect(footprint.frontRadius).toBeGreaterThan(galleryRadius);
        expect(footprint.backRadius).toBeGreaterThan(footprint.frontRadius);
    });

    it('keeps its back corners on the rock', () => {
        const footprint = grandstandFootprint(pitRadius);
        const footing = seaStackFooting(pitRadius);

        for (const side of [-1, 1]) {
            const corner = new THREE.Vector2(Math.cos(Math.PI - side * footprint.halfSpan) * footprint.backRadius, Math.sin(Math.PI - side * footprint.halfSpan) * footprint.backRadius);
            expect(corner.distanceTo(footing.center), `back corner at ${corner.x.toFixed(1)},${corner.y.toFixed(1)}`).toBeLessThanOrEqual(footing.radius);
        }

        // And it is still a stand rather than a bench: an arc this far below the
        // authored maximum would mean the island had shrunk under it.
        expect(footprint.halfSpan).toBeGreaterThan(0.6);
    });

    it('builds on one side of the ring, above the ground', () => {
        const stand = createBerkGrandstand({ pitRadius, quality: 'high' });
        const bounds = new THREE.Box3().setFromObject(stand);

        // Centred on -x, so nothing may cross to the seaward half. A stand that
        // wrapped the pit would be standing over the drop.
        expect(bounds.max.x, 'the stand should stay on the landward side').toBeLessThan(0);
        // Feet on the rock, not sunk into it or floating over it.
        expect(bounds.min.y).toBeGreaterThan(-0.2);
        expect(bounds.min.y).toBeLessThan(0.2);
        // Tall enough to show over the palisade from inside the pit.
        expect(bounds.max.y).toBeGreaterThan(8);
    });
});
