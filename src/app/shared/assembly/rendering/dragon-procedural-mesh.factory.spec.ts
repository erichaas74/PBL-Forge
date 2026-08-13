import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { createDragonProceduralObject } from './dragon-procedural-mesh.factory';

function wingPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    id: 'left-wing',
    label: 'Left Wing',
    roles: ['wing'],
    shape: 'box',
    mass: 0.55,
    dimensions: { x: 0.26, y: 0.08, z: 1.35 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId: 'dragon-wing', meshType: 'procedural' },
    snapPoints: [{
      id: 'dragon-wing-root',
      label: 'root',
      localPosition: { x: 0, y: 0, z: 0.6 },
    }],
    ...overrides,
  };
}

/** The membrane is the densest mesh in the wing group. */
function membraneOf(object: THREE.Object3D): THREE.Mesh {
  let densest: THREE.Mesh | null = null;
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const count = child.geometry.getAttribute('position')?.count ?? 0;
    const best = densest?.geometry.getAttribute('position')?.count ?? -1;
    if (count > best) densest = child;
  });
  if (!densest) throw new Error('no mesh in wing');
  return densest;
}

function verticalRelief(mesh: THREE.Mesh): number {
  const position = mesh.geometry.getAttribute('position');
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  return max - min;
}

function bodyPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
  return {
    id: 'body',
    label: 'Body',
    roles: ['core'],
    shape: 'box',
    mass: 4,
    dimensions: { x: 1.6, y: 0.72, z: 0.68 },
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId: 'dragon-body', meshType: 'procedural' },
    ...overrides,
  };
}

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

function limbPart(profileId: 'dragon-leg' | 'dragon-claw', dimensions: AssemblyPart['dimensions']): AssemblyPart {
  return {
    id: profileId,
    label: profileId,
    roles: ['leg'],
    shape: 'cylinder',
    mass: 0.2,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#a855f7',
    visualProfile: { profileId, meshType: 'procedural' },
  };
}

/** First mesh in the group carrying a standard material. */
function skinOf(object: THREE.Object3D): THREE.MeshStandardMaterial {
  let found: THREE.MeshStandardMaterial | null = null;
  object.traverse(child => {
    if (found || !(child instanceof THREE.Mesh)) return;
    if (child.material instanceof THREE.MeshStandardMaterial) found = child.material;
  });
  if (!found) throw new Error('no standard material');
  return found;
}

describe('dragon part materials', () => {
  /**
   * `roughness` and `roughnessMap` multiply in the shader. Leaving the old 0.58
   * scalar in place alongside a map would scale every roughness value down by
   * that factor and read as uniform gloss — the exact plastic look the maps are
   * there to remove.
   */
  it('hands roughness to the map instead of multiplying it by a leftover scalar', () => {
    const skin = skinOf(createDragonProceduralObject(bodyPart())!);

    expect(skin.roughnessMap).toBeTruthy();
    expect(skin.roughness).toBe(1);
  });

  it('keeps the genetics pigment on the material, not baked into the maps', () => {
    const skin = skinOf(createDragonProceduralObject(bodyPart({ color: '#22c55e' }))!);

    expect(skin.color.getHexString()).toBe(new THREE.Color('#22c55e').getHexString());
    expect(skin.normalMap).toBeTruthy();
  });

  it('varies relief depth per part, so repeated parts do not read as copies', () => {
    const left = skinOf(createDragonProceduralObject(limbPart('dragon-leg', { x: 0.22, y: 0.7, z: 0.22 }))!);
    const right = skinOf(createDragonProceduralObject({
      ...limbPart('dragon-leg', { x: 0.22, y: 0.7, z: 0.22 }),
      id: 'rear-right-leg',
    })!);

    expect(left.normalScale.x).not.toBeCloseTo(right.normalScale.x, 4);
  });
});

function headPart(
  profileId: 'dragon-head-horned' | 'dragon-head-snout' | 'dragon-head-armored',
  shape: 'sphere' | 'box',
  dimensions: AssemblyPart['dimensions'],
): AssemblyPart {
  return {
    id: profileId,
    label: profileId,
    roles: ['head'],
    shape,
    mass: 0.8,
    dimensions,
    position: { x: 0, y: 0, z: 0 },
    color: '#f97316',
    visualProfile: { profileId, meshType: 'procedural' },
  };
}

/** The skull is the densest mesh in a head group. */
function skullOf(object: THREE.Object3D): THREE.Mesh {
  let densest: THREE.Mesh | null = null;
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const count = child.geometry.getAttribute('position')?.count ?? 0;
    if (count > (densest?.geometry.getAttribute('position')?.count ?? -1)) densest = child;
  });
  if (!densest) throw new Error('no mesh in head');
  return densest;
}

/**
 * Signed volume of a closed mesh. Positive means the triangles wind
 * counter-clockwise seen from outside — the convention three needs for
 * `computeVertexNormals` to point outward.
 */
function signedVolume(mesh: THREE.Mesh): number {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex()!;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;

  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i));
    b.fromBufferAttribute(position, index.getX(i + 1));
    c.fromBufferAttribute(position, index.getX(i + 2));
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return total;
}

describe('dragon head mesh', () => {
  /**
   * The skull used to be a `SphereGeometry` with `scale.set(1.18, 0.92, 0.9)`,
   * built from `dims.x` alone — the other two axes were discarded, so no gene
   * could move it. Lofting the profile is what gives a trait somewhere to land.
   */
  it('lofts a skull that responds to all three dimensions', () => {
    const round = skullOf(createDragonProceduralObject(
      headPart('dragon-head-snout', 'box', { x: 0.5, y: 0.4, z: 0.4 }),
    )!);
    const long = skullOf(createDragonProceduralObject(
      headPart('dragon-head-snout', 'box', { x: 1.1, y: 0.4, z: 0.4 }),
    )!);

    const roundBox = new THREE.Box3().setFromObject(round);
    const longBox = new THREE.Box3().setFromObject(long);

    expect(longBox.max.x - longBox.min.x).toBeGreaterThan((roundBox.max.x - roundBox.min.x) * 1.8);
    // A stretched skull is not just a scaled one: the muzzle thins as it runs out.
    expect(longBox.max.y - longBox.min.y).toBeLessThanOrEqual(roundBox.max.y - roundBox.min.y + 1e-6);
  });

  /**
   * Winding was derived, not observed. Inside-out triangles are invisible under
   * backface culling, which is the kind of bug that only shows up in the app.
   */
  it('winds its triangles outward', () => {
    for (const part of [
      headPart('dragon-head-horned', 'sphere', { x: 0.42, y: 0.42, z: 0.42 }),
      headPart('dragon-head-snout', 'box', { x: 0.68, y: 0.38, z: 0.34 }),
      headPart('dragon-head-armored', 'box', { x: 0.54, y: 0.48, z: 0.44 }),
    ]) {
      expect(signedVolume(skullOf(createDragonProceduralObject(part)!))).toBeGreaterThan(0);
    }
  });

  /**
   * A sphere part's `dimensions.x` is a radius, not a width. Read as a width the
   * horned head lofts at half size and every horn and eye lands inside the bone.
   */
  it('sizes a sphere head from its radius, not its diameter', () => {
    const head = createDragonProceduralObject(
      headPart('dragon-head-horned', 'sphere', { x: 0.42, y: 0.42, z: 0.42 }),
    )!;
    const bounds = new THREE.Box3().setFromObject(skullOf(head));

    expect(bounds.max.x).toBeCloseTo(0.42, 2);
    expect(bounds.min.x).toBeCloseTo(-0.42, 2);
  });

  it('keeps the skull inside the physics volume', () => {
    const dims = { x: 0.54, y: 0.48, z: 0.44 };
    const bounds = new THREE.Box3().setFromObject(
      skullOf(createDragonProceduralObject(headPart('dragon-head-armored', 'box', dims))!),
    );

    expect(bounds.max.y).toBeLessThanOrEqual(dims.y / 2 + 1e-4);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-dims.y / 2 - 1e-4);
    expect(bounds.max.z).toBeLessThanOrEqual(dims.z / 2 + 1e-4);
  });

  it('gives the skull UVs so the scale texture lands on it', () => {
    const skull = skullOf(createDragonProceduralObject(
      headPart('dragon-head-snout', 'box', { x: 0.68, y: 0.38, z: 0.34 }),
    )!);
    const uv = skull.geometry.getAttribute('uv');

    expect(uv).toBeTruthy();
    expect(uv.count).toBe(skull.geometry.getAttribute('position').count);
  });

  it('builds a distinct skull per head variant', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const heights = (['dragon-head-horned', 'dragon-head-snout', 'dragon-head-armored'] as const).map(
      profileId => {
        const skull = skullOf(createDragonProceduralObject(headPart(profileId, 'box', dims))!);
        const bounds = new THREE.Box3().setFromObject(skull);
        return (bounds.max.y - bounds.min.y).toFixed(4);
      },
    );

    expect(new Set(heights).size).toBe(3);
  });
});

describe('dragon body mesh', () => {
  it('adds a simple belly mesh that scales with the body', () => {
    const body = createDragonProceduralObject(bodyPart())!;
    const belly = body.getObjectByName('dragon-belly') as THREE.Mesh | undefined;

    expect(belly).toBeTruthy();
    expect(belly?.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(belly?.scale.x).toBeCloseTo(bodyPart().dimensions.x * 0.38);
  });
});

describe('dragon upper jaw mesh', () => {
  it('builds both nostrils directly into the upper jaw', () => {
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;

    expect(upperJaw.getObjectByName('dragon-nostril-left')).toBeTruthy();
    expect(upperJaw.getObjectByName('dragon-nostril-right')).toBeTruthy();
  });

  it('sinks the nostrils onto the tapered top face, not the height of the flat rear', () => {
    const dims = jawPart('dragon-upper-jaw').dimensions;
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
    const nostril = upperJaw.getObjectByName('dragon-nostril-left')!;
    // The box narrows to 0.55 height by its front face, blended over the front
    // half: at 0.38 along, the top has already dropped this far.
    const topThere = dims.y * 0.5 * (1 - 2 * 0.38 * (1 - 0.55));

    expect(nostril.position.y).toBeCloseTo(topThere);
    expect(nostril.position.y).toBeLessThan(dims.y * 0.5);
  });

  it('draws the nostrils in by half their own thickness', () => {
    const dims = jawPart('dragon-upper-jaw').dimensions;
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
    const nostril = upperJaw.getObjectByName('dragon-nostril-right') as THREE.Mesh;
    const radius = (nostril.geometry as THREE.SphereGeometry).parameters.radius;

    // Thickness is the sphere's full z extent, so half of it is one radius.
    expect(nostril.position.z).toBeCloseTo(dims.z * 0.25 - radius);
  });

  it('does not put nostrils on the lower jaw', () => {
    const lowerJaw = createDragonProceduralObject(jawPart('dragon-lower-jaw'))!;

    expect(lowerJaw.getObjectByName('dragon-nostril-left')).toBeFalsy();
    expect(lowerJaw.getObjectByName('dragon-nostril-right')).toBeFalsy();
  });
});

describe('dragon jaw tooth row', () => {
  /**
   * Row teeth are the unnamed cones on a jaw: the fangs are cones too, but they
   * carry names and are placed off the row.
   */
  function rowTeeth(jaw: THREE.Object3D): THREE.Mesh[] {
    const teeth = jaw.children.filter(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && !child.name,
    );
    expect(teeth.length).toBeGreaterThan(0);
    return teeth;
  }

  function frontToothX(jaw: THREE.Object3D): number {
    return Math.max(...rowTeeth(jaw).map(tooth => tooth.position.x));
  }

  function jawPartWithToothStart(
    profileId: 'dragon-upper-jaw' | 'dragon-lower-jaw',
    toothStart: number,
  ): AssemblyPart {
    const part = jawPart(profileId);
    return { ...part, visualProfile: { profileId, meshType: 'procedural', parameters: { toothStart } } };
  }

  it('anchors the row at its front, so a lone fang lands on toothStart itself', () => {
    const dims = jawPart('dragon-upper-jaw').dimensions;
    const jaw = createDragonProceduralObject({
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

      const forward = createDragonProceduralObject(jawPartWithToothStart(profileId, 0.45))!;
      const back = createDragonProceduralObject(jawPartWithToothStart(profileId, 0.05))!;

      expect(frontToothX(forward)).toBeCloseTo(0.45 * dims.x);
      expect(frontToothX(back)).toBeCloseTo(0.05 * dims.x);
    });

    it(`roots every ${profileId} tooth on the jaw's mid-height`, () => {
      const jaw = createDragonProceduralObject(jawPart(profileId))!;
      const pointDown = profileId === 'dragon-upper-jaw';

      for (const tooth of rowTeeth(jaw)) {
        const height = (tooth.geometry as THREE.ConeGeometry).parameters.height;
        // A cone is centred on its position, so a root on the midline puts the
        // mesh half its length past it.
        expect(tooth.position.y).toBeCloseTo((pointDown ? -1 : 1) * height * 0.5);
      }
    });
  }
});

describe('dragon upper jaw fangs', () => {
  function fangs(jaw: THREE.Object3D): THREE.Mesh[] {
    return ['dragon-fang-left', 'dragon-fang-right']
      .map(name => jaw.getObjectByName(name) as THREE.Mesh | undefined)
      .filter((fang): fang is THREE.Mesh => !!fang);
  }

  function toothHeightOf(jaw: THREE.Object3D): number {
    const tooth = jaw.children.find(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && !child.name,
    )!;
    return (tooth.geometry as THREE.ConeGeometry).parameters.height;
  }

  it('runs the fangs one and a half times the length of the teeth', () => {
    const jaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
    const teeth = toothHeightOf(jaw);

    expect(fangs(jaw).length).toBe(2);
    for (const fang of fangs(jaw)) {
      expect((fang.geometry as THREE.ConeGeometry).parameters.height).toBeCloseTo(teeth * 1.5);
    }
  });

  it('hangs each fang under a nostril, rooted on the midline', () => {
    const jaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;

    for (const fang of fangs(jaw)) {
      const nostril = jaw.getObjectByName(fang.name.replace('fang', 'nostril'))!;
      const height = (fang.geometry as THREE.ConeGeometry).parameters.height;

      expect(fang.position.x).toBeCloseTo(nostril.position.x);
      expect(fang.position.z).toBeCloseTo(nostril.position.z);
      expect(fang.position.y).toBeCloseTo(-height * 0.5);
    }
  });

  it('insets the fangs from the tooth line so they stay inside the tapered snout', () => {
    const jaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
    const dims = jawPart('dragon-upper-jaw').dimensions;
    // Snout depth tapers to half by the tip; the surface at the fangs' station.
    const halfDepthThere = dims.z * 0.5 * (1 - 2 * 0.38 * 0.5);

    for (const fang of fangs(jaw)) {
      expect(Math.abs(fang.position.z)).toBeLessThan(halfDepthThere);
    }
  });

  it('leaves the lower jaw fangless', () => {
    const lowerJaw = createDragonProceduralObject(jawPart('dragon-lower-jaw'))!;

    expect(fangs(lowerJaw).length).toBe(0);
  });
});

describe('dragon tail weapons', () => {
  function tailPart(profileId: 'dragon-tail-club' | 'dragon-tail-stinger'): AssemblyPart {
    return {
      id: profileId,
      label: profileId,
      roles: ['weapon'],
      shape: profileId === 'dragon-tail-club' ? 'cylinder' : 'sphere',
      mass: 0.9,
      dimensions:
        profileId === 'dragon-tail-club'
          ? { x: 0.2, y: 1.05, z: 0.28 }
          : { x: 0.2, y: 0.2, z: 0.2 },
      position: { x: 0, y: 0, z: 0 },
      color: '#92400e',
      visualProfile: { profileId, meshType: 'procedural' },
    };
  }

  /**
   * Both of these grew from their own middle, which buried half of every spike
   * in the knob it rings and pushed the stinger's blunt end back out through the
   * top of the knuckle. They are anchored by their roots now.
   */
  it('stands the club spikes clear of the knob instead of burying them in it', () => {
    const dims = tailPart('dragon-tail-club').dimensions;
    const club = createDragonProceduralObject(tailPart('dragon-tail-club'))!;
    const knobRadius = dims.z * 0.8;
    const knobCentre = new THREE.Vector3(0, -dims.y * 0.42, 0);
    const spikes = club.children.filter(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry,
    );

    expect(spikes.length).toBeGreaterThan(0);
    for (const spike of spikes) {
      const length = (spike.geometry as THREE.ConeGeometry).parameters.height;
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(spike.quaternion);
      const root = spike.position.clone().addScaledVector(axis, -length / 2);
      const tip = spike.position.clone().addScaledVector(axis, length / 2);

      // Root inside the knob, and most of the spike showing outside it.
      expect(root.distanceTo(knobCentre)).toBeLessThan(knobRadius);
      expect(tip.distanceTo(knobCentre) - knobRadius).toBeGreaterThan(length * 0.4);
    }
  });

  it('keeps the stinger blade out of the top of its knuckle', () => {
    const stinger = createDragonProceduralObject(tailPart('dragon-tail-stinger'))!;
    const radius = tailPart('dragon-tail-stinger').dimensions.x;
    const knuckleTop = radius * 0.18 + radius * 0.72;
    const knuckleBottom = radius * 0.18 - radius * 0.72;
    // The knuckle is the only sphere; whatever else is there is the blade.
    const blade = stinger.children.find(
      child => !(child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry),
    )!;

    stinger.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(blade);

    expect(box.max.y).toBeLessThanOrEqual(knuckleTop);
    expect(box.min.y).toBeLessThan(knuckleBottom);
  });
});

describe('dragon limb meshes', () => {
  /**
   * These used to render at half scale with a compensating lift, which put the
   * visible thigh nowhere near the hip, knee, and ankle sockets the joints are
   * built from. Every socket on a limb sits on the face of its own physics
   * volume, so the mesh has to fill that volume for the chain to read as
   * connected.
   */
  it('fills the physics volume so limb sockets land on the mesh', () => {
    const leg = createDragonProceduralObject(limbPart('dragon-leg', { x: 0.22, y: 0.72, z: 0.22 }))!;
    const foot = createDragonProceduralObject({
      ...limbPart('dragon-leg', { x: 0.34, y: 0.14, z: 0.28 }),
      visualProfile: { profileId: 'dragon-foot', meshType: 'procedural' },
    })!;
    const claw = createDragonProceduralObject(limbPart('dragon-claw', { x: 0.08, y: 0.2, z: 0.08 }))!;

    for (const limb of [leg, foot, claw]) {
      expect(limb.scale.toArray()).toEqual([1, 1, 1]);
      expect(limb.position.toArray()).toEqual([0, 0, 0]);
    }

    const legBounds = new THREE.Box3().setFromObject(leg);

    expect(legBounds.min.y).toBeCloseTo(-0.72 / 2, 2);
    expect(legBounds.max.y).toBeCloseTo(0.72 / 2, 2);
  });
});

describe('dragon wing membrane', () => {
  /**
   * The original membrane was a `ShapeGeometry`, which only emits vertices along
   * the outline — there was no interior to displace, so it rendered as a
   * perfectly flat sheet whatever the bones did. Front-on it was a single line.
   * This pins the fix: the surface must have real vertical relief.
   */
  it('is a curved surface, not a flat sheet', () => {
    const object = createDragonProceduralObject(wingPart());
    expect(object).toBeTruthy();

    const membrane = membraneOf(object!);
    const dims = wingPart().dimensions;

    // Camber is a fraction of chord (dims.x * 2.6), so relief scales with the
    // part rather than being a fixed number of world units.
    expect(verticalRelief(membrane)).toBeGreaterThan(dims.x * 0.15);
  });

  it('has interior vertices to curve, not just an outline', () => {
    const membrane = membraneOf(createDragonProceduralObject(wingPart())!);

    expect(membrane.geometry.getAttribute('position').count).toBeGreaterThan(100);
    expect(membrane.geometry.getIndex()).toBeTruthy();
  });

  it('carries usable normals, so lighting reads the curvature', () => {
    const membrane = membraneOf(createDragonProceduralObject(wingPart())!);
    const normals = membrane.geometry.getAttribute('normal');

    expect(normals).toBeTruthy();
    // A flat sheet would give every vertex the same normal; a curved one varies.
    const first = new THREE.Vector3().fromBufferAttribute(normals, 0);
    let varies = false;
    for (let index = 1; index < normals.count; index += 1) {
      const other = new THREE.Vector3().fromBufferAttribute(normals, index);
      if (first.distanceTo(other) > 0.05) { varies = true; break; }
    }
    expect(varies).toBe(true);
  });

  it('scales its relief with the genome, not a fixed size', () => {
    const small = membraneOf(createDragonProceduralObject(wingPart())!);
    const large = membraneOf(createDragonProceduralObject(wingPart({
      dimensions: { x: 0.52, y: 0.08, z: 1.35 },
    }))!);

    expect(verticalRelief(large)).toBeGreaterThan(verticalRelief(small) * 1.5);
  });

  /**
   * The membrane maps its texture once rather than tiling it, so the veins run
   * with the anatomy. `u` has to be the chord fraction for the alpha map's thin
   * edge to land on the trailing edge, and `v` the span fraction for the veins
   * to radiate from the root.
   */
  it('carries chord/span UVs for the vein and thickness maps', () => {
    const membrane = membraneOf(createDragonProceduralObject(wingPart())!);
    const uv = membrane.geometry.getAttribute('uv');

    expect(uv).toBeTruthy();
    expect(uv.count).toBe(membrane.geometry.getAttribute('position').count);

    let maxU = -Infinity;
    let maxV = -Infinity;
    for (let index = 0; index < uv.count; index += 1) {
      maxU = Math.max(maxU, uv.getX(index));
      maxV = Math.max(maxV, uv.getY(index));
    }
    expect(maxU).toBeCloseTo(1, 5);
    expect(maxV).toBeCloseTo(1, 5);
  });

  it('mirrors the right wing rather than building a second mesh', () => {
    const right = createDragonProceduralObject(wingPart({
      id: 'right-wing',
      label: 'Right Wing',
      snapPoints: [{
        id: 'dragon-wing-root',
        label: 'root',
        localPosition: { x: 0, y: 0, z: -0.6 },
      }],
    }));

    expect(right!.scale.z).toBe(-1);
  });
});
