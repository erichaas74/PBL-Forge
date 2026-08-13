import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';
import {
  MINI_DRAGON_PROFILE_IDS,
  createMiniDragonProceduralObject,
  isMiniDragonProfileId,
  miniBodySurfacePoint,
  sampleMiniBodyRadius,
} from './mini-dragon-procedural-mesh.factory';

function part(
  profileId: string,
  overrides: Partial<AssemblyPart> = {},
  parameters: Record<string, string | number | boolean> = {},
): AssemblyPart {
  return {
    id: `test-${profileId}`,
    shape: 'box',
    mass: 1,
    dimensions: { x: 0.8, y: 0.6, z: 0.5 },
    position: { x: 0, y: 0, z: 0 },
    color: '#c8a24a',
    visualProfile: { profileId, meshType: 'procedural', parameters },
    ...overrides,
  };
}

function named(object: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  object.traverse((child) => {
    if (child.name === name) found.push(child);
  });
  return found;
}

function meshCount(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) count += 1;
  });
  return count;
}

describe('mini dragon procedural mesh factory', () => {
  it('builds an object for every profile it claims', () => {
    for (const profileId of MINI_DRAGON_PROFILE_IDS) {
      expect(createMiniDragonProceduralObject(part(profileId))).withContext(profileId).toBeTruthy();
    }
  });

  it('answers only for its own profile ids', () => {
    expect(createMiniDragonProceduralObject(part('dragon-body'))).toBeNull();
    expect(createMiniDragonProceduralObject(part('primitive-box'))).toBeNull();
    expect(isMiniDragonProfileId('dragon-head-horned')).toBe(false);
  });

  it('leaves the classic dragon factory to answer for classic dragon parts', () => {
    // The two species share a renderer and must not shadow one another.
    for (const profileId of MINI_DRAGON_PROFILE_IDS) {
      expect(createDragonProceduralObject(part(profileId))).withContext(profileId).toBeNull();
    }
    expect(createDragonProceduralObject(part('dragon-body'))).toBeTruthy();
  });

  it('samples the torso profile inside its declared range', () => {
    for (const t of [-0.5, -0.2, 0, 0.25, 0.5]) {
      const radius = sampleMiniBodyRadius(t);
      expect(radius).toBeGreaterThan(0);
      expect(radius).toBeLessThanOrEqual(1);
    }
  });

  it('puts a torso surface point on the surface it samples', () => {
    const dimensions = { x: 0.8, y: 0.6, z: 0.5 };
    const point = miniBodySurfacePoint(dimensions, 0, Math.PI);
    // Angle PI is the spine: straight up, at the sampled radius.
    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo((sampleMiniBodyRadius(0) * dimensions.y) / 2, 6);
    expect(point.z).toBeCloseTo(0, 6);
  });

  describe('body', () => {
    it('names its torso and grows more coat when the coat gene says fluffy', () => {
      const sleek = createMiniDragonProceduralObject(
        part('mini-dragon-body', {}, { miniCoatDepth: 0 }),
      );
      const fluffy = createMiniDragonProceduralObject(
        part('mini-dragon-body', {}, { miniCoatDepth: 1 }),
      );

      expect(named(sleek!, 'mini-dragon-torso').length).toBe(1);
      expect(meshCount(fluffy!)).toBeGreaterThan(meshCount(sleek!));
    });

    it('adds coat patches only when the specimen is two-toned', () => {
      const plain = createMiniDragonProceduralObject(
        part('mini-dragon-body', { color: '#c8a24a' }, { miniPatchColor: '#c8a24a' }),
      );
      const patched = createMiniDragonProceduralObject(
        part('mini-dragon-body', { color: '#c8a24a' }, { miniPatchColor: '#3b2a1c' }),
      );

      expect(named(plain!, 'mini-dragon-coat-patch').length).toBe(0);
      expect(named(patched!, 'mini-dragon-coat-patch').length).toBeGreaterThan(0);
    });
  });

  describe('head', () => {
    it('builds a cranium, a snout, two eyes with pupils, two ears, and two horns', () => {
      const head = createMiniDragonProceduralObject(part('mini-dragon-head'))!;

      expect(named(head, 'mini-dragon-cranium').length).toBe(1);
      expect(named(head, 'mini-dragon-snout').length).toBe(1);
      expect(named(head, 'mini-dragon-eye').length).toBe(2);
      expect(named(head, 'mini-dragon-pupil').length).toBe(2);
      expect(named(head, 'mini-dragon-ear').length).toBe(2);
      expect(named(head, 'mini-dragon-horn').length).toBe(2);
    });

    it('keeps the eyes on the cranium rather than inside it', () => {
      const dimensions = { x: 0.5, y: 0.58, z: 0.52 };
      const head = createMiniDragonProceduralObject(part('mini-dragon-head', { dimensions }))!;
      const [eye] = named(head, 'mini-dragon-eye');

      // Normalised against the scaled skull, an eye should sit at ~1 radius out.
      const skullRadius = dimensions.y * 0.5;
      const offset =
        (eye.position.x / (skullRadius * (dimensions.x / dimensions.y) * 0.92)) ** 2 +
        (eye.position.y / skullRadius) ** 2 +
        (eye.position.z / (skullRadius * (dimensions.z / dimensions.y) * 1.02)) ** 2;
      expect(Math.sqrt(offset)).toBeGreaterThan(0.8);
      expect(Math.sqrt(offset)).toBeLessThan(1.1);
    });

    it('sweeps a curled horn further than a straight one', () => {
      const straight = createMiniDragonProceduralObject(
        part('mini-dragon-head', {}, { miniHornCurl: 0 }),
      )!;
      const curled = createMiniDragonProceduralObject(
        part('mini-dragon-head', {}, { miniHornCurl: 1 }),
      )!;

      const tipHeight = (object: THREE.Object3D): number => {
        const box = new THREE.Box3().setFromObject(named(object, 'mini-dragon-horn')[0]);
        return box.max.y - box.min.y;
      };
      // A coil wraps back on itself, so it stands lower than a straight spike of
      // the same arc length. That is the observable difference students see.
      expect(tipHeight(curled)).toBeLessThan(tipHeight(straight));
    });
  });

  describe('wing', () => {
    it('builds a membrane and struts at full spread', () => {
      const wing = createMiniDragonProceduralObject(
        part('mini-dragon-wing', {}, { miniWingSpread: 1, miniWingSide: 1 }),
      )!;

      expect(named(wing, 'mini-dragon-wing-membrane').length).toBe(1);
      expect(named(wing, 'mini-dragon-wing-bone').length).toBe(1);
      expect(named(wing, 'mini-dragon-wing-strut').length).toBe(2);
      expect(named(wing, 'mini-dragon-wing-nub').length).toBe(0);
    });

    it('collapses to a furred nub for the vestigial genotype', () => {
      const wing = createMiniDragonProceduralObject(
        part('mini-dragon-wing', {}, { miniWingSpread: 0.12, miniWingSide: -1 }),
      )!;

      expect(named(wing, 'mini-dragon-wing-nub').length).toBe(1);
      expect(named(wing, 'mini-dragon-wing-membrane').length).toBe(0);
    });

    it('mirrors on the side the part declares, not on its name', () => {
      const left = createMiniDragonProceduralObject(
        part('mini-dragon-wing', { id: 'anything' }, { miniWingSpread: 1, miniWingSide: -1 }),
      )!;
      const right = createMiniDragonProceduralObject(
        part('mini-dragon-wing', { id: 'anything' }, { miniWingSpread: 1, miniWingSide: 1 }),
      )!;

      expect(named(left, 'mini-dragon-wing-membrane')[0].scale.z).toBe(-1);
      expect(named(right, 'mini-dragon-wing-membrane')[0].scale.z).toBe(1);
    });
  });

  describe('leg and tail', () => {
    it('builds a shank, a paw, and soft toes with no talons', () => {
      const leg = createMiniDragonProceduralObject(
        part('mini-dragon-leg', {}, { miniToeCount: 4 }),
      )!;

      expect(named(leg, 'mini-dragon-shank').length).toBe(1);
      expect(named(leg, 'mini-dragon-paw').length).toBe(1);
      expect(named(leg, 'mini-dragon-toe').length).toBe(4);
    });

    it('grows a fuller plume on a fluffy coat', () => {
      const sleek = createMiniDragonProceduralObject(
        part('mini-dragon-tail-plume', {}, { miniCoatDepth: 0 }),
      )!;
      const fluffy = createMiniDragonProceduralObject(
        part('mini-dragon-tail-plume', {}, { miniCoatDepth: 1 }),
      )!;

      const spread = (object: THREE.Object3D): number => {
        const box = new THREE.Box3().setFromObject(object);
        return box.max.x - box.min.x;
      };
      expect(spread(fluffy)).toBeGreaterThan(spread(sleek));
    });
  });
});
