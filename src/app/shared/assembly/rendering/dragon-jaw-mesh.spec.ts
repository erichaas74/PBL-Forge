import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildDragonJaw } from './dragon-jaw-mesh';
import { dragonPaletteForPart } from './dragon-materials';

function jawPart(profileId: 'dragon-upper-jaw' | 'dragon-lower-jaw'): AssemblyPart {
    return {
        id: profileId,
        label: profileId === 'dragon-upper-jaw' ? 'Upper Jaw' : 'Lower Jaw',
        roles: ['weapon'],
        shape: 'box',
        mass: 0.28,
        dimensions: { x: 0.52, y: 0.2, z: 0.3 },
        position: { x: 0, y: 0, z: 0 },
        color: '#fbbf24',
        visualProfile: { profileId, meshType: 'procedural' },
    };
}
function buildJaw(part: AssemblyPart): THREE.Group {
  const profileId = part.visualProfile?.profileId;
  const variant = profileId === 'dragon-lower-jaw' ? 'lower' : 'upper';
  return buildDragonJaw(part, dragonPaletteForPart(part), variant);
}

describe('dragon upper jaw mesh', () => {
    it('uses an elliptical tapered snout instead of a hard-edged box', () => {
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const snout = upperJaw.children[0] as THREE.Mesh;

        expect(snout.geometry.userData['kind']).toBe('dragon-jaw');
    });

    it('builds both nostrils directly into the upper jaw', () => {
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;

        expect(upperJaw.getObjectByName('dragon-nostril-left')).toBeTruthy();
        expect(upperJaw.getObjectByName('dragon-nostril-right')).toBeTruthy();
    });

    it('sinks the nostrils onto the tapered top face, not the height of the flat rear', () => {
        const dims = jawPart('dragon-upper-jaw').dimensions;
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const nostril = upperJaw.getObjectByName('dragon-nostril-left')!;
        // The box narrows to 0.55 height by its front face, blended over the front
        // half: at 0.38 along, the top has already dropped this far.
        const topThere = dims.y * 0.5 * (1 - 2 * 0.38 * (1 - 0.55));

        expect(nostril.position.y).toBeCloseTo(topThere);
        expect(nostril.position.y).toBeLessThan(dims.y * 0.5);
    });

    it('draws the nostrils in by half their own thickness', () => {
        const dims = jawPart('dragon-upper-jaw').dimensions;
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const nostril = upperJaw.getObjectByName('dragon-nostril-right') as THREE.Mesh;
        const radius = (nostril.geometry as THREE.SphereGeometry).parameters.radius;

        // Thickness is the sphere's full z extent, so half of it is one radius.
        expect(nostril.position.z).toBeCloseTo(dims.z * 0.25 - radius);
    });

    it('does not put nostrils on the lower jaw', () => {
        const lowerJaw = buildJaw(jawPart('dragon-lower-jaw'))!;

        expect(lowerJaw.getObjectByName('dragon-nostril-left')).toBeFalsy();
        expect(lowerJaw.getObjectByName('dragon-nostril-right')).toBeFalsy();
    });

    /**
     * The nose horn rides the jaw, not the skull: the jaw is the snout a viewer
     * sees, so a horn on the head's own muzzle would sit on the seam between them.
     */
    it('stands the nose horn on the bridge behind the nostrils', () => {
        const dims = jawPart('dragon-upper-jaw').dimensions;
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const horn = upperJaw.getObjectByName('dragon-nose-horn')!;
        const nostril = upperJaw.getObjectByName('dragon-nostril-left')!;

        expect(horn).toBeTruthy();
        // On the midline, and behind the nostrils rather than between them.
        expect(horn.position.z).toBeCloseTo(0, 6);
        expect(horn.position.x).toBeLessThan(nostril.position.x);
        // Still out on the snout, not back at the jaw hinge.
        expect(horn.position.x).toBeGreaterThan(0);
        // Standing up off the jaw: taller than it is wide, and clear of the top face.
        const bounds = new THREE.Box3().setFromObject(horn);
        expect(bounds.max.y).toBeGreaterThan(dims.y * 0.5);
        expect(bounds.max.y - bounds.min.y).toBeGreaterThan(bounds.max.z - bounds.min.z);
    });

    it('leans the nose horn forward rather than back toward the eyes', () => {
        const upperJaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const horn = upperJaw.getObjectByName('dragon-nose-horn')!;

        expect(new THREE.Box3().setFromObject(horn).max.x).toBeGreaterThan(horn.position.x);
    });

    it('drops the nose horn for a hornless jaw', () => {
        const base = jawPart('dragon-upper-jaw');
        const hornless = buildJaw({
            ...base,
            visualProfile: {
                profileId: 'dragon-upper-jaw',
                meshType: 'procedural',
                parameters: { noseHornLength: 0 },
            },
        })!;

        expect(hornless.getObjectByName('dragon-nose-horn')).toBeFalsy();
    });

    it('does not put a nose horn on the lower jaw', () => {
        const lowerJaw = buildJaw(jawPart('dragon-lower-jaw'))!;

        expect(lowerJaw.getObjectByName('dragon-nose-horn')).toBeFalsy();
    });
});

describe('dragon jaw tooth row', () => {
    /**
     * Row teeth are the unnamed cones on a jaw: the fangs are cones too, but they
     * carry names and are placed off the row.
     */
    function rowTeeth(jaw: THREE.Object3D): THREE.Mesh[] {
        const teeth = jaw.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && !child.name);
        expect(teeth.length).toBeGreaterThan(0);
        return teeth;
    }

    function frontToothX(jaw: THREE.Object3D): number {
        return Math.max(...rowTeeth(jaw).map(tooth => tooth.position.x));
    }

    function jawPartWithToothStart(profileId: 'dragon-upper-jaw' | 'dragon-lower-jaw', toothStart: number): AssemblyPart {
        const part = jawPart(profileId);
        return { ...part, visualProfile: { profileId, meshType: 'procedural', parameters: { toothStart } } };
    }

    it('anchors the row at its front, so a lone fang lands on toothStart itself', () => {
        const dims = jawPart('dragon-upper-jaw').dimensions;
        const jaw = buildJaw({
            ...jawPart('dragon-upper-jaw'),
            visualProfile: {
                profileId: 'dragon-upper-jaw',
                meshType: 'procedural',
                parameters: { toothCount: 1, toothStart: 0.3 },
            },
        })!;

        expect(frontToothX(jaw)).toBeCloseTo(0.3 * dims.x);
    });

    for (const profileId of ['dragon-upper-jaw', 'dragon-lower-jaw'] as const) {
        it(`starts the ${profileId} row at toothStart, as a fraction of jaw length`, () => {
            const dims = jawPart(profileId).dimensions;

            const forward = buildJaw(jawPartWithToothStart(profileId, 0.45))!;
            const back = buildJaw(jawPartWithToothStart(profileId, 0.05))!;

            expect(frontToothX(forward)).toBeCloseTo(0.45 * dims.x);
            expect(frontToothX(back)).toBeCloseTo(0.05 * dims.x);
        });

        it(`roots every ${profileId} tooth on the jaw's mid-height`, () => {
            const jaw = buildJaw(jawPart(profileId))!;
            const pointDown = profileId === 'dragon-upper-jaw';

            for (const tooth of rowTeeth(jaw)) {
                const height = (tooth.geometry as THREE.ConeGeometry).parameters.height;
                // A cone is centred on its position, so a root on the midline puts the
                // mesh half its length past it.
                expect(tooth.position.y).toBeCloseTo((pointDown ? -1 : 1) * height * 0.5);
            }
        });
    }

    it('reduces the upper rear teeth to 65% length and 75% thickness', () => {
        const upper = rowTeeth(buildJaw(jawPart('dragon-upper-jaw'))!)[0]
            .geometry as THREE.ConeGeometry;
        const lower = rowTeeth(buildJaw(jawPart('dragon-lower-jaw'))!)[0]
            .geometry as THREE.ConeGeometry;

        expect(upper.parameters.height).toBeCloseTo(lower.parameters.height * 0.65);
        expect(upper.parameters.radius).toBeCloseTo(lower.parameters.radius * 0.75);
    });
});

describe('dragon upper jaw fangs', () => {
    function fangs(jaw: THREE.Object3D): THREE.Mesh[] {
        return ['dragon-fang-left', 'dragon-fang-right']
            .map(name => jaw.getObjectByName(name) as THREE.Mesh | undefined)
            .filter((fang): fang is THREE.Mesh => !!fang);
    }

    function toothHeightOf(jaw: THREE.Object3D): number {
        const tooth = jaw.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && !child.name)!;
        return (tooth.geometry as THREE.ConeGeometry).parameters.height;
    }

    it('keeps the front fangs full-sized beside the reduced rear teeth', () => {
        const jaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const teeth = toothHeightOf(jaw);

        expect(fangs(jaw).length).toBe(2);
        for (const fang of fangs(jaw)) {
            expect((fang.geometry as THREE.ConeGeometry).parameters.height).toBeCloseTo(teeth * (1.5 / 0.65));
        }
    });

    it('scales the two fangs without turning every tooth into a fang', () => {
        const regular = buildJaw(jawPart('dragon-upper-jaw'))!;
        const longFanged = buildJaw({
            ...jawPart('dragon-upper-jaw'),
            visualProfile: {
                profileId: 'dragon-upper-jaw',
                meshType: 'procedural',
                parameters: { fangScale: 1.5 },
            },
        })!;

        expect(toothHeightOf(longFanged)).toBeCloseTo(toothHeightOf(regular), 5);
        expect((fangs(longFanged)[0].geometry as THREE.ConeGeometry).parameters.height)
            .toBeGreaterThan((fangs(regular)[0].geometry as THREE.ConeGeometry).parameters.height * 1.4);
    });

    it('hangs each fang under a nostril, rooted on the midline', () => {
        const jaw = buildJaw(jawPart('dragon-upper-jaw'))!;

        for (const fang of fangs(jaw)) {
            const nostril = jaw.getObjectByName(fang.name.replace('fang', 'nostril'))!;
            const height = (fang.geometry as THREE.ConeGeometry).parameters.height;

            expect(fang.position.x).toBeCloseTo(nostril.position.x);
            expect(fang.position.z).toBeCloseTo(nostril.position.z);
            expect(fang.position.y).toBeCloseTo(-height * 0.5);
        }
    });

    it('insets the fangs from the tooth line so they stay inside the tapered snout', () => {
        const jaw = buildJaw(jawPart('dragon-upper-jaw'))!;
        const dims = jawPart('dragon-upper-jaw').dimensions;
        // Snout depth tapers to half by the tip; the surface at the fangs' station.
        const halfDepthThere = dims.z * 0.5 * (1 - 2 * 0.38 * 0.5);

        for (const fang of fangs(jaw)) {
            expect(Math.abs(fang.position.z)).toBeLessThan(halfDepthThere);
        }
    });

    it('leaves the lower jaw fangless', () => {
        const lowerJaw = buildJaw(jawPart('dragon-lower-jaw'))!;

        expect(fangs(lowerJaw).length).toBe(0);
    });
});

