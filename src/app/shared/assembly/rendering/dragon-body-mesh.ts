import * as THREE from 'three';
import { AssemblyPart, Vector3Data } from '../domain/assembly.models';
import { buildJointBall, jointBallScale, spreadPositions } from './dragon-anatomy';
import {
  DragonBodyArchetype,
  DragonBodyStationParameters,
  dragonBodyArchetype,
  dragonBodyProfile,
  dragonBodySurfacePoint,
  sampleDragonBodyBellyDepth,
  sampleDragonBodyCenterY,
  sampleDragonBodyDepthScale,
  sampleDragonBodyHeightScale,
  sampleDragonBodyRadius,
  sampleDragonBodyStationHeight,
  sampleDragonBodyStationWidth,
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
import { visualNumber, visualString } from './dragon-visual-parameter-readers';

/** Builds the complete classic-dragon torso and all body-owned details. */
export function buildDragonBody(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const length = dims.x;
  const archetype = dragonBodyArchetype(visualString(part, 'bodyArchetype', 'classic'));
  const stations = readBodyStations(part);

  const lathe = new THREE.LatheGeometry(
    dragonBodyProfile(archetype)
      .map(([t, radius]) => new THREE.Vector2(Math.max(radius, 0.02), t * length)),
    detail(20),
  );
  lathe.rotateZ(-Math.PI / 2);
  lathe.scale(1, dims.y / 2, dims.z / 2);
  shapeBodyCrossSection(lathe, dims, archetype, stations);
  revolvedUv(lathe, ((dims.y + dims.z) / 4) * 0.72, length, SCALE_TILE, palette);
  const torso = mesh(lathe, scaleMaterial(palette));
  torso.name = 'dragon-body-torso';
  group.add(torso);

  addBodyArchetypeDetails(group, part, palette, archetype);

  const bellyRadii = bellyShape(dims, archetype, stations);
  const belly = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(12), detail(8)), bellyRadii, SCALE_TILE, palette),
    bellyMaterial(palette),
  );
  belly.name = 'dragon-belly';
  belly.scale.set(bellyRadii.x, bellyRadii.y, bellyRadii.z);
  belly.position.set(
    length * 0.04,
    sampleDragonBodyCenterY(0.04, archetype, stations) * dims.y
      - dims.y * 0.22 * stations.bellyDepth,
    0,
  );
  group.add(belly);

  addTorsoSockets(group, part, palette, archetype, stations);

  const defaults = getActiveDragonStyle().body;
  const style: DragonBodyStyle = {
    spikeCount: visualNumber(part, 'spikeCount', defaults.spikeCount),
    spikeSpread: visualNumber(part, 'spikeSpread', defaults.spikeSpread),
    spikeHeight: visualNumber(part, 'spikeHeight', defaults.spikeHeight),
    spikeRadius: visualNumber(part, 'spikeRadius', defaults.spikeRadius),
    spikeLean: visualNumber(part, 'spikeLean', defaults.spikeLean),
  };
  const spikeCount = visualNumber(part, 'backSpikeCount', style.spikeCount);
  const spikeRows = Math.max(1, Math.round(visualNumber(part, 'backSpikeRows', 1)));
  const spikeScale = visualNumber(part, 'backSpikeScale', 1);
  const spikeSurface = hornMaterial(palette);
  const spikeRadius = length * style.spikeRadius;
  const spikeHeight = length * style.spikeHeight * spikeScale;
  const rowAngles = spikeRows >= 3 ? [-0.38, 0, 0.38] : [0];
  const spikeGroup = new THREE.Group();
  spikeGroup.name = 'dragon-back-spike-rows';
  for (const [rowIndex, rowOffset] of rowAngles.entries()) {
    for (const t of spreadPositions(spikeCount, style.spikeSpread, -0.01)) {
      const angle = Math.PI + rowOffset;
      const seat = dragonBodySurfacePoint(dims, t, angle, archetype, stations);
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
      spike.name = `dragon-back-spike-row-${rowIndex + 1}`;
      spike.position.set(seat.x, seat.y * 0.96, seat.z * 0.96);
      spike.rotation.x = rowOffset;
      spike.rotation.z = style.spikeLean;
      spikeGroup.add(spike);
    }
  }
  spikeGroup.position.set(
    dims.x * visualNumber(part, 'backSpikeOffsetX', 0),
    dims.y * visualNumber(part, 'backSpikeOffsetY', 0),
    dims.z * visualNumber(part, 'backSpikeOffsetZ', 0),
  );
  spikeGroup.rotation.set(
    visualNumber(part, 'backSpikePitch', 0),
    visualNumber(part, 'backSpikeYaw', 0),
    visualNumber(part, 'backSpikeRoll', 0),
  );
  const placementScale = visualNumber(part, 'backSpikePlacementScale', 1);
  spikeGroup.scale.setScalar(placementScale);
  group.add(spikeGroup);

  return group;
}

function addBodyArchetypeDetails(
  group: THREE.Group,
  part: AssemblyPart,
  palette: DragonPalette,
  archetype: DragonBodyArchetype,
): void {
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
  } else if (archetype === 'regal') {
    for (const side of [-1, 1]) {
      bulge(
        `dragon-body-regal-shoulder-${side}`,
        { x: dims.x * 0.15, y: dims.y * 0.2, z: dims.z * 0.18 },
        { x: dims.x * 0.22, y: dims.y * 0.19, z: side * dims.z * 0.33 },
      );
    }
  } else if (archetype === 'bulwark') {
    for (const [station, name, scale] of [
      [0.2, 'shoulder', 1],
      [-0.24, 'haunch', 0.88],
    ] as const) {
      for (const side of [-1, 1]) {
        bulge(
          `dragon-body-bulwark-${name}-${side}`,
          { x: dims.x * 0.2 * scale, y: dims.y * 0.31 * scale, z: dims.z * 0.23 * scale },
          { x: dims.x * station, y: dims.y * 0.03, z: side * dims.z * 0.37 },
        );
      }
    }
  } else if (archetype === 'courser') {
    bulge(
      'dragon-body-courser-keel',
      { x: dims.x * 0.23, y: dims.y * 0.34, z: dims.z * 0.32 },
      { x: dims.x * 0.22, y: -dims.y * 0.23, z: 0 },
    );
  } else if (archetype === 'prowler') {
    for (const side of [-1, 1]) {
      bulge(
        `dragon-body-prowler-mantle-${side}`,
        { x: dims.x * 0.2, y: dims.y * 0.24, z: dims.z * 0.2 },
        { x: dims.x * 0.25, y: -dims.y * 0.03, z: side * dims.z * 0.38 },
      );
    }
  }
}

/** Closes the elliptical neck and tail openings in the torso lathe. */
function addTorsoSockets(
  group: THREE.Group,
  part: AssemblyPart,
  palette: DragonPalette,
  archetype: DragonBodyArchetype,
  stations: DragonBodyStationParameters,
): void {
  const dims = part.dimensions;
  const scale = jointBallScale(part);

  for (const [end, name] of [
    [0.5, 'dragon-body-neck-socket'],
    [-0.5, 'dragon-body-tail-socket'],
  ] as const) {
    const radial = sampleDragonBodyRadius(end, archetype);
    const halfHeight = radial
      * sampleDragonBodyHeightScale(end, archetype)
      * sampleDragonBodyStationHeight(end, stations)
      * (dims.y / 2)
      * scale;
    const halfDepth = radial
      * sampleDragonBodyDepthScale(end, archetype)
      * sampleDragonBodyStationWidth(end, stations)
      * (dims.z / 2)
      * scale;
    const socket = buildJointBall(
      { x: Math.min(halfHeight, halfDepth), y: halfHeight, z: halfDepth },
      palette,
      name,
    );
    socket.position.set(
      end * dims.x,
      sampleDragonBodyCenterY(end, archetype, stations) * dims.y,
      0,
    );
    group.add(socket);
  }
}

function shapeBodyCrossSection(
  geometry: THREE.BufferGeometry,
  dims: Vector3Data,
  archetype: DragonBodyArchetype,
  stations: DragonBodyStationParameters,
): void {
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const axialFraction = positions.getX(index) / Math.max(dims.x, 1e-6);
    const originalY = positions.getY(index);
    const bellyDepth = originalY < 0
      ? sampleDragonBodyBellyDepth(axialFraction, stations)
      : 1;
    positions.setY(
      index,
      originalY
        * sampleDragonBodyHeightScale(axialFraction, archetype)
        * sampleDragonBodyStationHeight(axialFraction, stations)
        * bellyDepth
        + sampleDragonBodyCenterY(axialFraction, archetype, stations) * dims.y,
    );
    positions.setZ(
      index,
      positions.getZ(index)
        * sampleDragonBodyDepthScale(axialFraction, archetype)
        * sampleDragonBodyStationWidth(axialFraction, stations),
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function bellyShape(
  dims: Vector3Data,
  archetype: DragonBodyArchetype,
  stations: DragonBodyStationParameters,
): Vector3Data {
  const base = (() => {
    switch (archetype) {
    case 'bulwark':
      return { x: dims.x * 0.4, y: dims.y * 0.34, z: dims.z * 0.38 };
    case 'courser':
      return { x: dims.x * 0.32, y: dims.y * 0.29, z: dims.z * 0.3 };
    case 'prowler':
      return { x: dims.x * 0.42, y: dims.y * 0.28, z: dims.z * 0.36 };
    case 'serpent':
      return { x: dims.x * 0.43, y: dims.y * 0.2, z: dims.z * 0.27 };
    default:
      return { x: dims.x * 0.38, y: dims.y * 0.3, z: dims.z * 0.34 };
    }
  })();
  return {
    x: base.x,
    y: base.y * stations.bellyDepth,
    z: base.z * sampleDragonBodyStationWidth(0.04, stations),
  };
}

function readBodyStations(part: AssemblyPart): DragonBodyStationParameters {
  return {
    neckWidth: visualNumber(part, 'bodyNeckWidth', 1),
    chestWidth: visualNumber(part, 'bodyChestWidth', 1),
    chestHeight: visualNumber(part, 'bodyChestHeight', 1),
    waistWidth: visualNumber(part, 'bodyWaistWidth', 1),
    bellyDepth: visualNumber(part, 'bodyBellyDepth', 1),
    hipWidth: visualNumber(part, 'bodyHipWidth', 1),
    spineArch: visualNumber(part, 'bodySpineArch', 0),
    tailRootWidth: visualNumber(part, 'bodyTailRootWidth', 1),
  };
}
