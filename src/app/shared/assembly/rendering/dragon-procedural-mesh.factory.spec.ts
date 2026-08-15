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
/** A named child, or a failure naming what was missing rather than a null deref. */
function childNamed(object: THREE.Object3D, name: string): THREE.Object3D {
  const child = object.getObjectByName(name);
  if (!child) throw new Error(`no child named ${name}`);
  return child;
}

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
  profileId: 'dragon-head-horned',
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
      headPart('dragon-head-horned', 'box', { x: 0.5, y: 0.4, z: 0.4 }),
    )!);
    const long = skullOf(createDragonProceduralObject(
      headPart('dragon-head-horned', 'box', { x: 1.1, y: 0.4, z: 0.4 }),
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
      headPart('dragon-head-horned', 'box', { x: 0.68, y: 0.38, z: 0.34 }),
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
      skullOf(createDragonProceduralObject(headPart('dragon-head-horned', 'box', dims))!),
    );

    expect(bounds.max.y).toBeLessThanOrEqual(dims.y / 2 + 1e-4);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-dims.y / 2 - 1e-4);
    expect(bounds.max.z).toBeLessThanOrEqual(dims.z / 2 + 1e-4);
  });

  it('gives the skull UVs so the scale texture lands on it', () => {
    const skull = skullOf(createDragonProceduralObject(
      headPart('dragon-head-horned', 'box', { x: 0.68, y: 0.38, z: 0.34 }),
    )!);
    const uv = skull.geometry.getAttribute('uv');

    expect(uv).toBeTruthy();
    expect(uv.count).toBe(skull.geometry.getAttribute('position').count);
  });

  /**
   * The horns point *forward*, along the snout. They used to rake back over the
   * neck, and the difference is not a matter of degree: a horn whose tip finishes
   * behind its own root reads as swept, whatever its angle.
   */
  it('drives the horns forward off the skull rather than back over the neck', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const head = createDragonProceduralObject(headPart('dragon-head-horned', 'box', dims))!;

    for (const side of ['left', 'right']) {
      const horn = head.getObjectByName(`dragon-horn-${side}`)!;
      expect(horn).withContext(side).toBeTruthy();
      const tip = new THREE.Box3().setFromObject(horn).max.x;

      // The whole horn finishes ahead of the root it grows from.
      expect(tip).withContext(side).toBeGreaterThan(horn.position.x);
      // And ahead of the brow, not merely leaning off vertical.
      expect(tip).withContext(side).toBeGreaterThan(dims.x * 0.1);
    }
  });

  it('roots the horns above the ear, forward of the back of the skull', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const head = createDragonProceduralObject(headPart('dragon-head-horned', 'box', dims))!;
    const horn = head.getObjectByName('dragon-horn-left')!;

    // Behind the eye but well clear of the occiput: the old mount at -0.22 grew
    // them off the back of the braincase.
    expect(horn.position.x).toBeGreaterThan(-dims.x * 0.18);
    expect(horn.position.x).toBeLessThan(0);
    // High on the skull rather than out on the cheek.
    expect(horn.position.y).toBeGreaterThan(0);
  });

  /**
   * The hornless phenotype used to be a second profile, `dragon-head-snout`.
   * With one skull left it rides the horn lengths instead, so zero has to mean
   * no mesh at all — a zero-height cone still leaves its base disc on the bone.
   */
  it('grows nothing where a hornless skull would carry horns', () => {
    const dims = { x: 0.6, y: 0.45, z: 0.42 };
    const horned = createDragonProceduralObject(headPart('dragon-head-horned', 'box', dims))!;
    const hornless = createDragonProceduralObject({
      ...headPart('dragon-head-horned', 'box', dims),
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { hornLength: 0, browLength: 0 },
      },
    })!;

    const meshes = (head: THREE.Object3D) => {
      let count = 0;
      head.traverse(child => { if (child instanceof THREE.Mesh) count += 1; });
      return count;
    };

    // A main horn and a brow spike on each side stop being built. Counted as a
    // difference rather than an exact number: a horn is a group of segments.
    expect(meshes(hornless)).toBeLessThan(meshes(horned));
    // And nothing is left standing above the bone where they were.
    expect(new THREE.Box3().setFromObject(hornless).max.y)
      .toBeLessThan(new THREE.Box3().setFromObject(horned).max.y);
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

  /**
   * The nose horn rides the jaw, not the skull: the jaw is the snout a viewer
   * sees, so a horn on the head's own muzzle would sit on the seam between them.
   */
  it('stands the nose horn on the bridge behind the nostrils', () => {
    const dims = jawPart('dragon-upper-jaw').dimensions;
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
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
    const upperJaw = createDragonProceduralObject(jawPart('dragon-upper-jaw'))!;
    const horn = upperJaw.getObjectByName('dragon-nose-horn')!;

    expect(new THREE.Box3().setFromObject(horn).max.x).toBeGreaterThan(horn.position.x);
  });

  it('drops the nose horn for a hornless jaw', () => {
    const base = jawPart('dragon-upper-jaw');
    const hornless = createDragonProceduralObject({
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
    const lowerJaw = createDragonProceduralObject(jawPart('dragon-lower-jaw'))!;

    expect(lowerJaw.getObjectByName('dragon-nose-horn')).toBeFalsy();
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

    // The limb's own skin, not the group: the joint balls are *supposed* to
    // overrun the collider, since a ball that stops at the rim cannot reach
    // into the part it is closing the gap against.
    const legBounds = new THREE.Box3().setFromObject(childNamed(leg, 'dragon-leg-skin'));

    expect(legBounds.min.y).toBeCloseTo(-0.72 / 2, 2);
    expect(legBounds.max.y).toBeCloseTo(0.72 / 2, 2);
  });
});

/**
 * The male frill: a collar that encircles the whole skull.
 *
 * The failure it is drawn against is a flat disc behind the head, which has no
 * thickness from any angle and vanishes to a line side-on. So the two things
 * worth pinning are that the ring closes, and that it is a cone rather than a
 * plate.
 */
describe('dragon male frill', () => {
  function maleHead(): AssemblyPart {
    const base = headPart('dragon-head-horned', 'sphere', { x: 0.42, y: 0.32, z: 0.3 });
    return {
      ...base,
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { sex: 'male' },
      },
    };
  }

  function spines(head: THREE.Object3D): THREE.Object3D[] {
    const found: THREE.Object3D[] = [];
    head.traverse(child => {
      if (child.name.startsWith('dragon-male-crest-spine-')) found.push(child);
    });
    return found;
  }

  it('rings the skull rather than fanning across the back of it', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const ring = spines(head);

    expect(ring.length).toBeGreaterThanOrEqual(12);

    // A fan spans one side to the other; a ring has spines above *and* below
    // the skull's axis, and on both flanks.
    const centres = ring.map(spine => new THREE.Box3().setFromObject(spine).getCenter(new THREE.Vector3()));
    expect(centres.some(point => point.y > 0.1)).toBe(true);
    expect(centres.some(point => point.y < -0.1)).toBe(true);
    expect(centres.some(point => point.z > 0.1)).toBe(true);
    expect(centres.some(point => point.z < -0.1)).toBe(true);
  });

  it('stands well clear of the head it encircles', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const dims = { x: 0.84, y: 0.64, z: 0.6 };
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));

    // Taller and wider than the skull's own extent, which is what "way bigger"
    // has to mean for a display structure.
    expect(web.max.y - web.min.y).toBeGreaterThan(dims.y * 1.4);
    expect(web.max.z - web.min.z).toBeGreaterThan(dims.z * 1.4);
  });

  it('is a cone, not a plate — it has depth along the head', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const headLength = 0.84;
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));

    /*
     * The rake: the skin leaves the ring going backwards, so side-on the frill is
     * a V rather than a line. A flat disc measures zero here.
     *
     * The bar is a tenth of the head rather than the old flat 0.2. That number was
     * calibrated against a straight backward rake; the spines now curve forward
     * again over their outer half, which hands some of that depth back by design —
     * the web's fore-aft extent is the *sag* of the curve, not its full reach.
     */
    expect(web.max.x - web.min.x).toBeGreaterThan(headLength * 0.1);
  });

  it('stands every spine tip out past the membrane it carries', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));
    const ring = new THREE.Box3();
    for (const spine of spines(head)) ring.union(new THREE.Box3().setFromObject(spine));

    // The points have to clear the skin on every axis the collar spreads over,
    // or they are buried in it and the frill reads as a disc with a hem.
    expect(ring.max.y).toBeGreaterThan(web.max.y);
    expect(ring.min.y).toBeLessThan(web.min.y);
    expect(ring.max.z).toBeGreaterThan(web.max.z);
    expect(ring.min.z).toBeLessThan(web.min.z);
  });

  it('curves the spines forward, so the tips finish ahead of the ring', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const dims = { x: 0.84 };
    const ring = new THREE.Box3();
    for (const spine of spines(head)) ring.union(new THREE.Box3().setFromObject(spine));

    // Forward of the root ring at -0.16 of the head length. The spines used to
    // rake straight back, so this measured well behind it.
    expect(ring.max.x).toBeGreaterThan(-0.16 * dims.x);
    // And the rake is still in there: the curve leaves the skull going backwards.
    expect(ring.min.x).toBeLessThan(-0.16 * dims.x);
  });

  it('slopes the membrane back between the spines rather than hanging it flat', () => {
    const head = createDragonProceduralObject(maleHead())!;
    const web = childNamed(head, 'dragon-male-crest-web') as THREE.Mesh;
    const position = web.geometry.getAttribute('position');

    /*
     * The scallop, measured rather than eyeballed: on a flat panel every rim
     * vertex sits at the same distance from the collar's axis, so the spread of
     * those distances is zero. Sagging the skin between the spines spreads them.
     */
    const axis = new THREE.Vector3();
    const radii: number[] = [];
    for (let index = 0; index < position.count; index += 1) {
      axis.set(0, position.getY(index), position.getZ(index));
      radii.push(axis.length());
    }
    const spread = Math.max(...radii) - Math.min(...radii);

    expect(spread).toBeGreaterThan(0.05);
  });

  it('grows nothing of the kind on a female', () => {
    const head = createDragonProceduralObject({
      ...headPart('dragon-head-horned', 'sphere', { x: 0.42, y: 0.32, z: 0.3 }),
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { sex: 'female' },
      },
    })!;

    expect(head.getObjectByName('dragon-male-crest-web')).toBeFalsy();
    expect(head.getObjectByName('dragon-female-frill-left')).toBeTruthy();
  });
});

/**
 * The grasping forelimb — the `ll` body plan's arm and hand.
 *
 * What separates the hand from a foot is proportion: a talon on a foot is a
 * stub against a broad pad, and a finger here is longer than the palm it grows
 * from. That is the whole silhouette, so it is what these pin.
 */
describe('dragon grasping forelimb', () => {
  function handPart(overrides: Partial<AssemblyPart> = {}): AssemblyPart {
    return {
      id: 'grasp-hand',
      label: 'Grasping Hand',
      roles: ['leg'],
      shape: 'box',
      mass: 0.07,
      dimensions: { x: 0.2, y: 0.11, z: 0.17 },
      position: { x: 0, y: 0, z: 0 },
      color: '#a855f7',
      visualProfile: { profileId: 'dragon-grasp-hand', meshType: 'procedural' },
      ...overrides,
    };
  }

  it('builds an arm segment with a joint ball at each end', () => {
    const arm = createDragonProceduralObject(
      limbPart('dragon-leg', { x: 0.14, y: 0.33, z: 0.14 }),
    );
    const grasp = createDragonProceduralObject({
      ...limbPart('dragon-leg', { x: 0.14, y: 0.33, z: 0.14 }),
      visualProfile: { profileId: 'dragon-grasp-arm', meshType: 'procedural' },
    })!;

    expect(arm).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-skin')).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-socket-ball')).toBeTruthy();
    expect(childNamed(grasp, 'dragon-grasp-arm-heel-ball')).toBeTruthy();
  });

  it('is slimmer than the walking leg it replaces', () => {
    const dims = { x: 0.2, y: 0.5, z: 0.2 };
    const leg = new THREE.Box3().setFromObject(
      childNamed(createDragonProceduralObject(limbPart('dragon-leg', dims))!, 'dragon-leg-skin'),
    );
    const arm = new THREE.Box3().setFromObject(
      childNamed(
        createDragonProceduralObject({
          ...limbPart('dragon-leg', dims),
          visualProfile: { profileId: 'dragon-grasp-arm', meshType: 'procedural' },
        })!,
        'dragon-grasp-arm-skin',
      ),
    );

    expect(arm.max.x - arm.min.x).toBeLessThan(leg.max.x - leg.min.x);
    // Same length, though: it is a limb segment, not a stub.
    expect(arm.max.y - arm.min.y).toBeCloseTo(leg.max.y - leg.min.y, 4);
  });

  it('gives the hand three fingers on a palm', () => {
    const hand = createDragonProceduralObject(handPart())!;

    expect(childNamed(hand, 'dragon-grasp-palm')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-finger-1')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-finger-3')).toBeTruthy();
    expect(hand.getObjectByName('dragon-grasp-finger-4')).toBeFalsy();
  });

  /**
   * A finger is skin with keratin on the end, not a keratin spike. The claw is
   * a separate child so it can carry the claw material — lose it and the whole
   * digit renders as scale, which is the failure that made the old hand read as
   * three toes stuck on a brick.
   */
  it('tips each finger with a claw of its own', () => {
    const hand = createDragonProceduralObject(handPart())!;

    expect(childNamed(hand, 'dragon-grasp-claw-1')).toBeTruthy();
    expect(childNamed(hand, 'dragon-grasp-claw-3')).toBeTruthy();

    /*
     * Past the knuckle: the claw is the last thing on the finger, so it has to
     * reach further forward than the joint it grows from.
     *
     * The explicit `updateMatrixWorld` is load-bearing. Both of these sit two
     * groups deep — the finger, then the knuckle that bends inside it — and
     * `Box3.setFromObject` refreshes an object's descendants but not its
     * ancestors, so without this both boxes come back measured in a frame with
     * the finger's own rotation missing and the comparison is meaningless.
     */
    hand.updateMatrixWorld(true);
    const knuckle = new THREE.Box3().setFromObject(
      childNamed(hand, 'dragon-grasp-finger-2-knuckle'),
    );
    const claw = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-claw-2'));

    expect(claw.max.x).toBeGreaterThan(knuckle.max.x);
  });

  it('makes each finger longer than the palm, which is what reads as a hand', () => {
    const hand = createDragonProceduralObject(handPart())!;
    const palm = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-palm'));
    const finger = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-2'));

    expect(finger.max.x - finger.min.x).toBeGreaterThan(palm.max.x - palm.min.x);
  });

  it('grows the fingers with the claw gene, the same one the feet read', () => {
    const plain = createDragonProceduralObject(handPart())!;
    const clawed = createDragonProceduralObject(
      handPart({
        visualProfile: {
          profileId: 'dragon-grasp-hand',
          meshType: 'procedural',
          parameters: { clawScale: 1.6 },
        },
      }),
    )!;

    const reach = (object: THREE.Object3D): number =>
      new THREE.Box3().setFromObject(childNamed(object, 'dragon-grasp-finger-2')).max.x;

    expect(reach(clawed)).toBeGreaterThan(reach(plain));
  });

  it('fans the outer fingers off the centre one', () => {
    const hand = createDragonProceduralObject(handPart())!;
    const centre = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-2'));
    const outer = new THREE.Box3().setFromObject(childNamed(hand, 'dragon-grasp-finger-3'));

    expect(Math.abs(outer.getCenter(new THREE.Vector3()).z))
      .toBeGreaterThan(Math.abs(centre.getCenter(new THREE.Vector3()).z));
  });
});

/**
 * Joint balls.
 *
 * A limb is an open tube meeting another open tube at an angle: bend the joint
 * and the rims part, showing the hollow inside both. These pin the fix — the
 * ball exists, it is sized off the part rather than in world units, and it sits
 * on the *pivot* rather than the rim, which is the whole reason it stays put
 * when the joint turns.
 */
describe('dragon joint balls', () => {
  function ballBounds(object: THREE.Object3D, name: string): THREE.Box3 {
    return new THREE.Box3().setFromObject(childNamed(object, name));
  }

  it('caps a leg at the hip socket and at the heel', () => {
    const dims = { x: 0.22, y: 0.72, z: 0.22 };
    const leg = createDragonProceduralObject(limbPart('dragon-leg', dims))!;

    const socket = ballBounds(leg, 'dragon-leg-socket-ball');
    const heel = ballBounds(leg, 'dragon-leg-heel-ball');

    // Centres: the upper joint sits at 0.4 of the segment, the lower at its end.
    expect(socket.getCenter(new THREE.Vector3()).y).toBeCloseTo(0.4 * dims.y, 4);
    expect(heel.getCenter(new THREE.Vector3()).y).toBeCloseTo(-0.5 * dims.y, 4);

    // Wider than the limb at that station, so the seam is always covered.
    expect(socket.max.x - socket.min.x).toBeGreaterThan(dims.x);
    expect(heel.max.x - heel.min.x).toBeGreaterThan(dims.x);
  });

  it('scales the balls with the part, not in world units', () => {
    const small = createDragonProceduralObject(
      limbPart('dragon-leg', { x: 0.22, y: 0.72, z: 0.22 }),
    )!;
    const large = createDragonProceduralObject(
      limbPart('dragon-leg', { x: 0.44, y: 1.44, z: 0.44 }),
    )!;

    const smallBall = ballBounds(small, 'dragon-leg-socket-ball');
    const largeBall = ballBounds(large, 'dragon-leg-socket-ball');

    expect(largeBall.max.x - largeBall.min.x).toBeCloseTo(
      (smallBall.max.x - smallBall.min.x) * 2,
      4,
    );
  });

  it('takes a per-part override for the ball width', () => {
    const dims = { x: 0.22, y: 0.72, z: 0.22 };
    const standard = ballBounds(
      createDragonProceduralObject(limbPart('dragon-leg', dims))!,
      'dragon-leg-socket-ball',
    );
    const wide = ballBounds(
      createDragonProceduralObject({
        ...limbPart('dragon-leg', dims),
        visualProfile: {
          profileId: 'dragon-leg',
          meshType: 'procedural',
          parameters: { jointBall: 2.12 },
        },
      })!,
      'dragon-leg-socket-ball',
    );

    expect(wide.max.x - wide.min.x).toBeGreaterThan((standard.max.x - standard.min.x) * 1.8);
  });

  it('puts a vertebra at both ends of every tail link', () => {
    const dims = { x: 0.12, y: 0.58, z: 0.12 };
    const link = createDragonProceduralObject({
      ...limbPart('dragon-leg', dims),
      roles: ['tail'],
      visualProfile: { profileId: 'dragon-tail', meshType: 'procedural' },
    })!;

    // Tail links hinge at their own ends, so both balls sit at ±0.5.
    expect(ballBounds(link, 'dragon-tail-root-ball').getCenter(new THREE.Vector3()).y)
      .toBeCloseTo(0.5 * dims.y, 4);
    expect(ballBounds(link, 'dragon-tail-tip-ball').getCenter(new THREE.Vector3()).y)
      .toBeCloseTo(-0.5 * dims.y, 4);
  });

  /**
   * The torso is a lathe that stops while it still has width, so both ends are
   * open pipes — 0.28 of the section at the tail, 0.42 at the neck. Nothing on
   * the animal is wide enough to cover them from the outside, which is why the
   * body has to close its own.
   */
  it('caps the torso openings the neck and tail hang off', () => {
    const dims = bodyPart().dimensions;
    const body = createDragonProceduralObject(bodyPart())!;

    const neck = ballBounds(body, 'dragon-body-neck-socket');
    const tail = ballBounds(body, 'dragon-body-tail-socket');

    expect(neck.getCenter(new THREE.Vector3()).x).toBeCloseTo(0.5 * dims.x, 4);
    expect(tail.getCenter(new THREE.Vector3()).x).toBeCloseTo(-0.5 * dims.x, 4);

    // Each cap is wider than the hole it closes, on both axes of the ellipse.
    expect(neck.max.y - neck.min.y).toBeGreaterThan(0.42 * dims.y);
    expect(neck.max.z - neck.min.z).toBeGreaterThan(0.42 * dims.z);
    expect(tail.max.y - tail.min.y).toBeGreaterThan(0.28 * dims.y);
    expect(tail.max.z - tail.min.z).toBeGreaterThan(0.28 * dims.z);
  });

  /**
   * A sphere big enough to close the wide axis of an elliptical opening stands
   * proud of the narrow one, which on the shipped body is half again as deep as
   * it is tall — a ball on the end rather than a shoulder.
   */
  it('matches the torso caps to the section rather than rounding them off', () => {
    const body = createDragonProceduralObject(bodyPart())!;
    const neck = ballBounds(body, 'dragon-body-neck-socket');

    expect(neck.max.z - neck.min.z).not.toBeCloseTo(neck.max.y - neck.min.y, 2);
  });

  it('closes the throat where the skull hinges on the torso', () => {
    const head = createDragonProceduralObject(
      headPart('dragon-head-horned', 'sphere', { x: 0.42, y: 0.32, z: 0.3 }),
    )!;

    const neck = ballBounds(head, 'dragon-neck-ball');
    const center = neck.getCenter(new THREE.Vector3());

    // Behind the skull's midpoint, on the pivot the head swings about.
    expect(center.x).toBeLessThan(0);
    expect(center.z).toBeCloseTo(0, 4);
    expect(neck.max.y - neck.min.y).toBeGreaterThan(0);
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

  /**
   * Scales the whole part, not the chord alone. On the flat-panelled wing the
   * remaining relief is mostly the span-wise rake out to the tip, so a wing
   * given a deeper chord and the same span barely changes height — which is
   * correct for this shape, and was not what this test used to assume.
   */
  it('scales its relief with the genome, not a fixed size', () => {
    const small = membraneOf(createDragonProceduralObject(wingPart())!);
    const large = membraneOf(createDragonProceduralObject(wingPart({
      dimensions: { x: 0.52, y: 0.16, z: 2.7 },
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
