import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import { buildGlowNode, buildJointBall, jointBallScale, spreadPositions } from './dragon-anatomy';
import {
  DRAGON_BODY_PROFILE,
  dragonBodySurfacePoint,
  sampleDragonBodyRadius,
} from './dragon-body-profile';
import { detail, mesh, revolvedUv, sphereUv } from './dragon-geometry';
import {
  DragonPalette,
  bellyMaterial,
  hornMaterial,
  scaleMaterial,
} from './dragon-materials';
import { DragonBodyStyle, getActiveDragonStyle } from './dragon-style';
import { HORN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { visualFlag, visualNumber, visualString } from './dragon-visual-parameter-readers';

/** Builds the complete classic-dragon torso and all body-owned details. */
export function buildDragonBody(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const length = dims.x;

  const lathe = new THREE.LatheGeometry(
    DRAGON_BODY_PROFILE.map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * length)),
    detail(20),
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  revolvedUv(lathe, ((dims.y + dims.z) / 4) * 0.72, length, SCALE_TILE, palette);
  group.add(mesh(lathe, scaleMaterial(palette)));

  addBodyArchetypeDetails(group, part, palette);

  const bellyRadii = { x: length * 0.38, y: dims.y * 0.3, z: dims.z * 0.34 };
  const belly = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(12), detail(8)), bellyRadii, SCALE_TILE, palette),
    bellyMaterial(palette),
  );
  belly.name = 'dragon-belly';
  belly.scale.set(bellyRadii.x, bellyRadii.y, bellyRadii.z);
  belly.position.set(length * 0.04, -dims.y * 0.22, 0);
  group.add(belly);

  addTorsoSockets(group, part, palette);

  const defaults = getActiveDragonStyle().body;
  const style: DragonBodyStyle = {
    spikeCount: visualNumber(part, 'spikeCount', defaults.spikeCount),
    spikeSpread: visualNumber(part, 'spikeSpread', defaults.spikeSpread),
    spikeHeight: visualNumber(part, 'spikeHeight', defaults.spikeHeight),
    spikeRadius: visualNumber(part, 'spikeRadius', defaults.spikeRadius),
    spikeLean: visualNumber(part, 'spikeLean', defaults.spikeLean),
  };
  const spikeCount = visualNumber(part, 'backSpikeCount', style.spikeCount);
  const spikeScale = visualNumber(part, 'backSpikeScale', 1);
  const spikeSurface = hornMaterial(palette);
  const spikeRadius = length * style.spikeRadius;
  const spikeHeight = length * style.spikeHeight * spikeScale;
  for (const t of spreadPositions(spikeCount, style.spikeSpread, -0.01)) {
    const spike = mesh(
      revolvedUv(
        new THREE.ConeGeometry(spikeRadius, spikeHeight, detail(6)),
        spikeRadius,
        spikeHeight,
        HORN_TILE,
        palette,
      ),
      spikeSurface,
    );
    spike.position.set(t * length, sampleDragonBodyRadius(t) * (dims.y / 2) * 0.96, 0);
    spike.rotation.z = style.spikeLean;
    group.add(spike);
  }

  if (visualFlag(part, 'glowMarkings')) addFlankLanterns(group, dims, length);

  return group;
}

function addBodyArchetypeDetails(
  group: THREE.Group,
  part: AssemblyPart,
  palette: DragonPalette,
): void {
  const archetype = visualString(part, 'bodyArchetype', 'classic');
  const dims = part.dimensions;
  const skin = scaleMaterial(palette, 0.72);

  const bulge = (name: string, radii: Vector3Data, position: Vector3Data): void => {
    const geometry = sphereUv(
      new THREE.SphereGeometry(1, detail(12), detail(8)),
      radii,
      SCALE_TILE,
      palette,
    );
    const feature = mesh(geometry, skin);
    feature.name = name;
    feature.scale.set(radii.x, radii.y, radii.z);
    feature.position.set(position.x, position.y, position.z);
    group.add(feature);
  };

  if (archetype === 'wyvern') {
    bulge(
      'dragon-body-wyvern-keel',
      { x: dims.x * 0.2, y: dims.y * 0.34, z: dims.z * 0.28 },
      { x: dims.x * 0.14, y: -dims.y * 0.28, z: 0 },
    );
  } else if (archetype === 'drake') {
    bulge(
      'dragon-body-drake-mantle',
      { x: dims.x * 0.27, y: dims.y * 0.42, z: dims.z * 0.58 },
      { x: dims.x * 0.08, y: -dims.y * 0.08, z: 0 },
    );
  } else if (archetype === 'four-wing') {
    for (const axial of [-0.08, 0.2]) {
      for (const side of [-1, 1]) {
        bulge(
          `dragon-body-four-wing-scapula-${axial}-${side}`,
          { x: dims.x * 0.13, y: dims.y * 0.18, z: dims.z * 0.2 },
          { x: dims.x * axial, y: dims.y * 0.25, z: side * dims.z * 0.34 },
        );
      }
    }
  }
}

/** Closes the elliptical neck and tail openings in the torso lathe. */
function addTorsoSockets(group: THREE.Group, part: AssemblyPart, palette: DragonPalette): void {
  const dims = part.dimensions;
  const scale = jointBallScale(part);

  for (const [end, name] of [
    [0.5, 'dragon-body-neck-socket'],
    [-0.5, 'dragon-body-tail-socket'],
  ] as const) {
    const radial = sampleDragonBodyRadius(end);
    const halfHeight = radial * (dims.y / 2) * scale;
    const halfDepth = radial * (dims.z / 2) * scale;
    const socket = buildJointBall(
      { x: Math.min(halfHeight, halfDepth), y: halfHeight, z: halfDepth },
      palette,
      name,
    );
    socket.position.x = end * dims.x;
    group.add(socket);
  }
}

/** Adds the bioluminescent row seated on both visible flanks. */
function addFlankLanterns(
  group: THREE.Group,
  dims: { x: number; y: number; z: number },
  length: number,
): void {
  const upFromFlank = Math.PI / 2 + 0.34;
  for (const side of [-1, 1] as const) {
    for (const [index, t] of spreadPositions(6, 0.72, -0.02).entries()) {
      const seat = dragonBodySurfacePoint(
        { x: length, y: dims.y, z: dims.z },
        t,
        upFromFlank * side,
      );
      const node = buildGlowNode(dims.y * 0.085 * (1.15 - index * 0.07));
      node.name = `dragon-glow-flank-${index + 1}-${side < 0 ? 'left' : 'right'}`;
      node.position.set(seat.x, seat.y * 1.04, seat.z * 1.04);
      node.rotation.y = Math.PI / 2;
      group.add(node);
    }
  }
}
