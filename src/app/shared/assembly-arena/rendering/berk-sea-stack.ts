import * as THREE from 'three';
import { RenderQuality } from '../../assembly/rendering/render-quality';

/**
 * The island the dragon ring is built on.
 *
 * The pit used to stand on a square of turf with a ring of scenery around it,
 * which read as a set: flat ground to the horizon, nothing underneath, and no
 * reason for the arena to be *here* rather than anywhere else. Berk's training
 * ring is on top of a sea stack — a column of rock standing out of the North
 * Atlantic — and half of it is a timber stand cantilevered over a drop, which
 * is the single most recognisable thing about the place.
 *
 * So this builds the ground: a craggy rock column offset under the *back* of
 * the ring, the timber substructure that carries the front out over nothing,
 * the sea a long way down with surf breaking on the base, and a horizon of
 * spires and arches. Everything here is scenery — the physics floor is a
 * separate invisible box, and nothing in this file is collided with.
 */

const ROCK = {
  /**
   * How far the rock sits behind the middle of the ring, as a fraction of the
   * pit radius.
   *
   * This is the whole shape of the idea: the rock has to be off-centre or the
   * arena is standing on a comfortable plateau and the drop is somewhere else.
   * Tuned against the gallery's outer radius so roughly the front third of the
   * structure hangs over the sea, while the gatehouses on the cross axis still
   * land on solid ground.
   */
  offset: 0.6,
  radius: 1.32,
  /**
   * Depth of the sand-and-soil cap over the rock, inside the ring.
   *
   * Deeper than it looks like it needs to be, so that however far the summit's
   * broken ground drops the cap is still buried in it and no gap opens between
   * the two on the landward side.
   */
  capDepth: 1.1,
  /** Distance from the sand down to the sea. */
  cliffHeight: 24,
  /** How much of the column carries on below the waterline. */
  draft: 9,
  colour: 0x6f6a61,
  capColour: 0x7d7466,
  wetColour: 0x4a4a46,
} as const;

const SEA = {
  radius: 210,
  colour: 0x1d4c6b,
  foamColour: 0xdfe9ee,
  /** Wave trains, as [amplitude, wavelength, speed, direction radians]. */
  swell: [
    [0.62, 34, 0.55, 0.4],
    [0.34, 19, 0.85, 1.9],
    [0.16, 9.5, 1.3, -0.8],
  ] as const,
} as const;

const TIMBER = {
  beam: 0x4e3f2c,
  strut: 0x5c4a33,
} as const;

export interface SeaStackIslandOptions {
  /** Radius of the sand the dragons fight on. */
  pitRadius: number;
  /** Outer radius of the timber gallery ringing the pit. */
  deckRadius: number;
  /** Height of that gallery above the sand. */
  deckHeight: number;
  quality: RenderQuality;
}

export interface SeaStackIsland {
  group: THREE.Group;
  /** Advances the swell and the surf. Called once per rendered frame. */
  update(seconds: number): void;
}

/** Distance from the sand down to the sea. */
export const SEA_STACK_CLIFF_HEIGHT = ROCK.cliffHeight;

/**
 * The rock's footprint under the ring, in the arena's own frame.
 *
 * Exported because it is the claim the whole island rests on — which parts of
 * the arena have ground under them and which are hanging — and that claim is
 * worth being able to assert rather than only to look at.
 */
export function seaStackFooting(pitRadius: number): { center: THREE.Vector2; radius: number } {
  return {
    center: new THREE.Vector2(-pitRadius * ROCK.offset, 0),
    radius: pitRadius * ROCK.radius,
  };
}

export function createSeaStackIsland(options: SeaStackIslandOptions): SeaStackIsland {
  const group = new THREE.Group();
  const footing = seaStackFooting(options.pitRadius);
  const rockRadius = footing.radius;
  const rockCenter = footing.center;
  const waterY = -ROCK.cliffHeight;
  const waveTime = { value: 0 };

  addSandCap(group, options.pitRadius);
  addRockColumn(group, rockCenter, rockRadius);
  addCantileveredStand(group, options, rockCenter, rockRadius);
  addSea(group, waterY, waveTime, options.quality);
  const surf = addSurf(group, rockCenter, rockRadius, waterY);
  addHorizon(group, waterY, options.quality);

  return {
    group,
    update: (seconds) => {
      // The swell runs entirely off this one uniform, on the GPU.
      waveTime.value = seconds;
      surf.update(seconds);
    },
  };
}

/**
 * The sand the fight happens on, as a slab rather than a plane.
 *
 * A disc with no thickness would show its own edge as a hairline where the
 * arena meets the drop, which is the one edge in the scene the eye goes to.
 */
function addSandCap(group: THREE.Group, pitRadius: number): void {
  const radius = pitRadius + 0.6;
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.98, ROCK.capDepth, 56),
    new THREE.MeshStandardMaterial({ color: ROCK.capColour, roughness: 1, metalness: 0 }),
  );
  slab.position.y = -ROCK.capDepth / 2;
  slab.receiveShadow = true;
  group.add(slab);
}

/**
 * The stack itself: a tapered column of rock, craggy rather than smooth.
 *
 * Displaced with layered sines rather than sampled noise, weighted so the
 * variation runs far more strongly around the column than up it — sea stacks
 * weather into vertical columnar faces, and a displacement with equal vertical
 * freedom reads as a lump of clay instead. Deterministic, so the island is the
 * same island every time a match is rebuilt.
 */
function addRockColumn(group: THREE.Group, center: THREE.Vector2, radius: number): void {
  const height = ROCK.cliffHeight + ROCK.draft;
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.72, height, 30, 12);
  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  const top = height / 2;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const distance = Math.hypot(x, z);
    if (distance < 1e-4) continue;

    const angle = Math.atan2(z, x);
    const scale = 1 + crag(angle, y) * 0.085;
    position.setX(index, x * scale);
    position.setZ(index, z * scale);
    // The summit is broken ground, not a table — but only ever downward, so no
    // outcrop can push up through the sand the dragons are standing on.
    if (Math.abs(y - top) < 1e-4) {
      position.setY(index, y - 0.05 - Math.abs(crag(angle, 0)) * 0.45);
    }
  }

  geometry.computeVertexNormals();
  const rock = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: ROCK.colour,
      roughness: 0.97,
      metalness: 0.02,
      flatShading: true,
    }),
  );
  // Top face inside the sand cap, so the cap reads as soil lying on rock.
  rock.position.set(center.x, -0.5 - height / 2, center.y);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  // A darker band at the waterline: everything below the swell is permanently
  // wet, and without it the column looks stuck into the sea rather than
  // standing in it.
  const wetHeight = 3.2;
  const wet = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.75, radius * 0.73, wetHeight, 30, 1, true),
    new THREE.MeshStandardMaterial({
      color: ROCK.wetColour,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  wet.position.set(center.x, -ROCK.cliffHeight + wetHeight * 0.3, center.y);
  group.add(wet);
}

/** Layered sines standing in for rock noise. Same input, same crag, always. */
function crag(angle: number, height: number): number {
  return Math.sin(angle * 3.1 + height * 0.09) * 0.5
    + Math.sin(angle * 7.3 - height * 0.05) * 0.3
    + Math.sin(angle * 13.7 + height * 0.03) * 0.2;
}

/**
 * The timber that carries the front of the arena over the drop.
 *
 * Without this the overhang is the whole point of the island and also the least
 * believable thing in it — a disc of sand floating off a cliff. A rim beam
 * under the sand, radial joists behind it, and raking struts angled back into
 * the rock face give the cantilever something to be made of, and they are only
 * built on the seaward side because that is the only side anyone can see under.
 */
function addCantileveredStand(
  group: THREE.Group,
  options: SeaStackIslandOptions,
  rockCenter: THREE.Vector2,
  rockRadius: number,
): void {
  const beam = new THREE.MeshStandardMaterial({
    color: TIMBER.beam,
    roughness: 0.95,
    metalness: 0,
  });
  const strutMaterial = new THREE.MeshStandardMaterial({
    color: TIMBER.strut,
    roughness: 0.95,
    metalness: 0,
  });
  const sandRadius = options.pitRadius + 0.6;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(sandRadius, 0.22, 6, 56), beam);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -ROCK.capDepth - 0.12;
  rim.castShadow = true;
  group.add(rim);

  const joistGeometry = new THREE.BoxGeometry(sandRadius, 0.3, 0.26);

  for (let index = 0; index < 22; index += 1) {
    const angle = (index / 22) * Math.PI * 2;
    const outer = new THREE.Vector2(Math.cos(angle) * sandRadius, Math.sin(angle) * sandRadius);
    // Only where the sand is actually over the sea. Anything landward of the
    // cliff edge is buried in rock and would never be seen.
    if (!isOverTheSea(outer, rockCenter, rockRadius)) continue;

    const joist = new THREE.Mesh(joistGeometry, beam);
    joist.position.set(
      Math.cos(angle) * sandRadius / 2,
      -ROCK.capDepth - 0.16,
      Math.sin(angle) * sandRadius / 2,
    );
    joist.rotation.y = -angle;
    joist.castShadow = true;
    group.add(joist);

    group.add(...rakeBackToRock(
      new THREE.Vector3(outer.x, -ROCK.capDepth - 0.3, outer.y),
      rockCenter,
      rockRadius,
      strutMaterial,
      beam,
      index % 3 === 0,
    ));
  }

  /*
   * The gallery is the part that actually hangs: it stands two metres further
   * out than the sand and a couple above it, so on the seaward side it is a
   * walkway with nothing under it at all. Its struts rake much further back
   * because they start from higher up, which is what makes the stand read as
   * scaffolding clinging to a cliff rather than as a ring on a plinth.
   */
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + Math.PI / 18;
    const outer = new THREE.Vector2(
      Math.cos(angle) * options.deckRadius,
      Math.sin(angle) * options.deckRadius,
    );
    if (!isOverTheSea(outer, rockCenter, rockRadius)) continue;

    group.add(...rakeBackToRock(
      new THREE.Vector3(outer.x, options.deckHeight - 0.3, outer.y),
      rockCenter,
      rockRadius,
      strutMaterial,
      beam,
      index % 2 === 0,
    ));
  }
}

/** Whether a point on the arena's rim has rock under it or open water. */
function isOverTheSea(point: THREE.Vector2, rockCenter: THREE.Vector2, rockRadius: number): boolean {
  return point.distanceTo(rockCenter) >= rockRadius * 0.94;
}

/**
 * One raking strut from a point on the overhang back down into the cliff face,
 * optionally with a cross-tie halfway along it.
 *
 * How far it has to travel depends on how far out over the edge its head is, so
 * the fan of struts under the widest part of the overhang is visibly longer and
 * shallower than the ones near the cliff — which is the detail that says the
 * stand was built to fit this rock.
 */
function rakeBackToRock(
  head: THREE.Vector3,
  rockCenter: THREE.Vector2,
  rockRadius: number,
  strutMaterial: THREE.Material,
  beamMaterial: THREE.Material,
  withBrace: boolean,
): THREE.Object3D[] {
  const outer = new THREE.Vector2(head.x, head.z);
  const overhang = outer.distanceTo(rockCenter) - rockRadius * 0.9;
  const inward = new THREE.Vector2(rockCenter.x - outer.x, rockCenter.y - outer.y).normalize();
  const reach = overhang + 1.4;
  const foot = new THREE.Vector3(
    outer.x + inward.x * reach,
    head.y - (2.4 + overhang * 1.1),
    outer.y + inward.y * reach,
  );

  const parts: THREE.Object3D[] = [createStrut(head, foot, 0.2, strutMaterial)];

  if (withBrace) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.26), beamMaterial);
    brace.position.copy(head.clone().lerp(foot, 0.55));
    brace.rotation.y = -Math.atan2(outer.y, outer.x);
    parts.push(brace);
  }

  return parts;
}

/** One timber running between two points, thickness given as a radius. */
function createStrut(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const span = to.clone().sub(from);
  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.15, span.length(), 6),
    material,
  );
  strut.position.copy(from).add(span.clone().multiplyScalar(0.5));
  // The cylinder is authored up the +y axis; turn that axis onto the span.
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize());
  strut.castShadow = true;
  return strut;
}

/**
 * The sea.
 *
 * Displaced on the GPU rather than on the CPU: a grid fine enough to carry a
 * swell is several thousand vertices, and re-writing and re-normalling those
 * every frame is real cost on a Chromebook, for water nobody is looking
 * directly at. Three sine trains at different headings and speeds beat against
 * each other so the surface never settles into a visible repeat, and the normal
 * is taken analytically from the same expression, which is what makes the
 * troughs catch the sky.
 */
function addSea(
  group: THREE.Group,
  waterY: number,
  time: { value: number },
  quality: RenderQuality,
): void {
  const material = new THREE.MeshStandardMaterial({
    color: SEA.colour,
    roughness: 0.24,
    metalness: 0.12,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         ${SEA.swell.map(([amplitude, wavelength, speed, heading], index) => `
           const float A${index} = ${amplitude.toFixed(3)};
           const vec2  K${index} = vec2(${Math.cos(heading).toFixed(4)}, ${Math.sin(heading).toFixed(4)})
             * ${(6.28318 / wavelength).toFixed(5)};
           const float W${index} = ${speed.toFixed(3)};
         `).join('')}
         float swellHeight(vec2 p) {
           return ${SEA.swell.map((_, index) =>
             `A${index} * sin(dot(K${index}, p) + uTime * W${index})`).join(' + ')};
         }
         vec2 swellSlope(vec2 p) {
           return ${SEA.swell.map((_, index) =>
             `A${index} * cos(dot(K${index}, p) + uTime * W${index}) * K${index}`).join(' + ')};
         }`,
      )
      // The plane is authored flat and laid down by a -90° turn about x, so its
      // local +z is world up and its local xy is the sea surface.
      .replace(
        '#include <beginnormal_vertex>',
        `vec2 slope = swellSlope(position.xy);
         vec3 objectNormal = normalize(vec3(-slope.x, -slope.y, 1.0));`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position.x, position.y, position.z + swellHeight(position.xy));`,
      );
  };

  // A grid, not a disc. A `CircleGeometry` is a fan with no interior vertices
  // at all, so a displaced one comes out as a flat sheet with a wavy rim —
  // there is nothing in the middle of it to lift.
  const segments = quality === 'low' ? 96 : 176;
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SEA.radius * 2, SEA.radius * 2, segments, segments),
    material,
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = waterY;
  group.add(sea);
}

/**
 * Surf breaking on the base of the stack.
 *
 * Two collars of foam around the waterline running on their own slow cycles:
 * one swells and fades in place, the other climbs the rock and washes back.
 * Between them the sea reads as *hitting* the island rather than as a surface
 * the island happens to pass through, which is the difference between weather
 * and a diagram.
 */
function addSurf(
  group: THREE.Group,
  center: THREE.Vector2,
  rockRadius: number,
  waterY: number,
): { update(seconds: number): void } {
  const texture = createFoamTexture();
  const collars: THREE.Mesh[] = [];
  const baseRadius = rockRadius * 0.78;

  for (let index = 0; index < 2; index += 1) {
    const collar = new THREE.Mesh(
      new THREE.RingGeometry(baseRadius, baseRadius * 1.7, 48),
      new THREE.MeshBasicMaterial({
        color: SEA.foamColour,
        map: texture ?? undefined,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    collar.rotation.x = -Math.PI / 2;
    collar.position.set(center.x, waterY + 0.25 + index * 0.12, center.y);
    collar.renderOrder = 1;
    collars.push(collar);
    group.add(collar);
  }

  return {
    update: (seconds) => {
      for (let index = 0; index < collars.length; index += 1) {
        // Offset phases, and periods that do not divide into each other, so the
        // two breaks never land together and read as one pulsing ring.
        const phase = (seconds / (index === 0 ? 3.4 : 5.1) + index * 0.37) % 1;
        const collar = collars[index];
        const spread = 1 + phase * 0.22;
        collar.scale.set(spread, spread, 1);
        const material = collar.material as THREE.MeshBasicMaterial;
        material.opacity = 0.62 * Math.sin(phase * Math.PI) ** 0.7;
      }
    },
  };
}

/** Soft-edged band, so a foam collar fades out instead of ending on a circle. */
function createFoamTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(
    size / 2, size / 2, size * 0.3,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Spires and sea arches standing out of the water around the island.
 *
 * Deliberately crude — flat-shaded cones and a span of four boxes — because the
 * fog has eaten everything but the silhouette by the time they reach the
 * camera. Their whole job is to say the island is one of many, and that the
 * water goes on past them.
 */
function addHorizon(group: THREE.Group, waterY: number, quality: RenderQuality): void {
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x646a68,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const spireCount = quality === 'low' ? 9 : 17;
  const spires = new THREE.InstancedMesh(
    // Unit height, scaled per instance; six sides so the silhouette is angular.
    new THREE.CylinderGeometry(0.16, 1, 1, 6, 1),
    rockMaterial,
    spireCount,
  );

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let index = 0; index < spireCount; index += 1) {
    // The same seeded wobble the palisade uses: the horizon must not reshuffle
    // itself every time a match is rebuilt.
    const wobble = Math.sin(index * 12.9898) * 0.5 + Math.sin(index * 4.1414) * 0.5;
    const angle = (index / spireCount) * Math.PI * 2 + wobble * 0.3;
    const distance = 52 + Math.abs(wobble) * 74;
    // Tall enough to clear the cliff top from most angles, so the island does
    // not look like the only thing standing in an empty sea.
    const height = 14 + Math.abs(wobble) * 26;
    const width = 3 + Math.abs(wobble) * 4;

    position.set(
      Math.cos(angle) * distance,
      // Sunk a little, so each one is standing in the water rather than resting
      // on it.
      waterY - 1.5 + height / 2,
      Math.sin(angle) * distance,
    );
    euler.set(wobble * 0.05, angle, wobble * 0.04);
    quaternion.setFromEuler(euler);
    scale.set(width, height, width);
    spires.setMatrixAt(index, matrix.compose(position, quaternion, scale));
  }

  spires.instanceMatrix.needsUpdate = true;
  group.add(spires);

  for (const [angle, distance, span] of [[0.9, 66, 13], [3.6, 84, 17], [5.2, 58, 11]] as const) {
    group.add(createSeaArch(rockMaterial, angle, distance, span, waterY));
  }
}

/**
 * One sea arch: two legs and a span that steps up over the gap.
 *
 * The span is four boxes on a shallow arc rather than a curve, because at this
 * distance the fog keeps everything but the hole in the middle, and the hole is
 * the entire reason to draw an arch instead of another spire.
 */
function createSeaArch(
  material: THREE.Material,
  angle: number,
  distance: number,
  span: number,
  waterY: number,
): THREE.Group {
  const arch = new THREE.Group();
  const legHeight = span * 0.95;
  const legWidth = span * 0.26;

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legWidth * 0.7, legWidth, legHeight, 6),
      material,
    );
    leg.position.set(side * span / 2, legHeight / 2, 0);
    arch.add(leg);
  }

  const steps = 4;
  for (let index = 0; index < steps; index += 1) {
    const t = (index + 0.5) / steps;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(span / steps + 0.4, legWidth * 0.9, legWidth * 1.5),
      material,
    );
    block.position.set(
      (t - 0.5) * span,
      legHeight + Math.sin(t * Math.PI) * span * 0.2,
      0,
    );
    block.rotation.z = Math.cos(t * Math.PI) * 0.34;
    arch.add(block);
  }

  arch.position.set(Math.cos(angle) * distance, waterY - 1.2, Math.sin(angle) * distance);
  arch.rotation.y = -angle + Math.PI / 2;
  return arch;
}
