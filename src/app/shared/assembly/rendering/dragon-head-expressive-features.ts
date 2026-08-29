import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildHorn } from './dragon-anatomy';
import { DragonHeadShape, dragonHeadSurfacePoint } from './dragon-head-profile';
import { boxUv, createTaperedBoxGeometry, detail, mesh } from './dragon-geometry';
import { buildMaleCrest } from './dragon-head-male-frill';
import { DragonPalette, hornMaterial, membraneMaterial } from './dragon-materials';
import { HORN_TILE } from './dragon-texture-constants';
import { visualFlag, visualNumber, visualString } from './dragon-visual-parameter-readers';

const DEGREES_TO_RADIANS = Math.PI / 180;

export function addDragonHeadExpressiveFeatures(
  group: THREE.Group,
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const crestScale = visualNumber(part, 'crestScale', 0);
  if (crestScale > 0) {
    const crestGroup = positionedFeatureGroup(part, dims, 'crest', 'dragon-genetic-crest-group');
    crestGroup.rotation.z = visualNumber(part, 'crestTilt', 0) * DEGREES_TO_RADIANS;
    const material = hornMaterial(palette);
    for (const [index, axial] of [-0.3, -0.08, 0.14].entries()) {
      const crown = dragonHeadSurfacePoint(dims, axial, 0, shape);
      const height = dims.y * [0.24, 0.34, 0.22][index] * crestScale;
      const geometry = createTaperedBoxGeometry(height, dims.x * 0.18, dims.z * 0.055, 0.28, 0.52);
      geometry.rotateZ(Math.PI / 2);
      const fin = mesh(boxUv(geometry, HORN_TILE, palette), material);
      fin.name = `dragon-genetic-crest-${index + 1}`;
      fin.position.set(crown.x, crown.y + height * 0.06, 0);
      fin.rotation.z = 0.14;
      crestGroup.add(fin);
    }
    group.add(crestGroup);
  }

  const sex = visualString(part, 'sex', '');
  const sexDisplay = positionedFeatureGroup(part, dims, 'sexDisplay', 'dragon-sex-display');
  sexDisplay.rotation.z = visualNumber(part, 'sexDisplayTilt', 0) * DEGREES_TO_RADIANS;
  if (sex === 'male') {
    buildMaleCrest(sexDisplay, dims, palette, shape);
  } else if (sex === 'female') {
    const material = membraneMaterial(palette);
    const spineMaterial = hornMaterial(palette);
    for (const side of [-1, 1] as const) {
      const frill = mesh(new THREE.ConeGeometry(dims.y * 0.22, dims.z * 0.58, detail(9)), material);
      frill.name = `dragon-female-frill-${side < 0 ? 'left' : 'right'}`;
      frill.position.set(-dims.x * 0.24, dims.y * 0.08, side * dims.z * 0.52);
      frill.rotation.set((side * Math.PI) / 2, 0, side * 0.2);
      sexDisplay.add(frill);

      const spine = buildHorn(dims.z * 0.46, dims.z * 0.035, spineMaterial, palette, -0.08);
      spine.name = `dragon-female-frill-spine-${side < 0 ? 'left' : 'right'}`;
      spine.position.set(-dims.x * 0.24, dims.y * 0.08, side * dims.z * 0.48);
      spine.rotation.set((side * Math.PI) / 2, 0, -0.16);
      sexDisplay.add(spine);
    }
  }
  if (sexDisplay.children.length) group.add(sexDisplay);

  if (visualFlag(part, 'wiseAvatar')) {
    const regalia = positionedFeatureGroup(part, dims, 'wiseRegalia', 'wise-dragon-regalia');
    regalia.scale.setScalar(visualNumber(part, 'wiseRegaliaScale', 1));
    addWiseDragonRegalia(regalia, dims, palette, shape);
    group.add(regalia);
  }
}

function positionedFeatureGroup(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  prefix: 'crest' | 'sexDisplay' | 'wiseRegalia',
  name: string,
): THREE.Group {
  const feature = new THREE.Group();
  feature.name = name;
  const offset = prefix === 'crest'
    ? {
      x: visualNumber(part, 'crestOffsetX', 0),
      y: visualNumber(part, 'crestOffsetY', 0),
      z: visualNumber(part, 'crestOffsetZ', 0),
    }
    : prefix === 'sexDisplay'
      ? {
        x: visualNumber(part, 'sexDisplayOffsetX', 0),
        y: visualNumber(part, 'sexDisplayOffsetY', 0),
        z: visualNumber(part, 'sexDisplayOffsetZ', 0),
      }
      : {
        x: visualNumber(part, 'wiseRegaliaOffsetX', 0),
        y: visualNumber(part, 'wiseRegaliaOffsetY', 0),
        z: visualNumber(part, 'wiseRegaliaOffsetZ', 0),
      };
  feature.position.set(
    offset.x * dims.x,
    offset.y * dims.y,
    offset.z * dims.z,
  );
  return feature;
}

/** Spectacles and a keratin beard identify the elder without introducing non-assembly assets. */
function addWiseDragonRegalia(
  group: THREE.Group,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const gold = avatarMaterial('#d7ad55', 0.72, 0.35);
  const lens = avatarMaterial('#8de1d4', 0.28, 0.08, 0.28);
  const eyeRadius = dims.y * 0.135;
  const sockets = [-1, 1].map((side) => ({
    side,
    point: dragonHeadSurfacePoint(dims, shape.eyeAxial, side * 1.12, shape),
  }));

  for (const { side, point } of sockets) {
    const suffix = side < 0 ? 'left' : 'right';
    const ring = mesh(
      new THREE.TorusGeometry(eyeRadius, dims.y * 0.013, detail(8), detail(22)),
      gold,
    );
    ring.name = `wise-dragon-spectacle-${suffix}`;
    ring.position.set(point.x, point.y, point.z + side * dims.z * 0.035);
    group.add(ring);

    const glass = mesh(new THREE.CircleGeometry(eyeRadius * 0.86, detail(22)), lens);
    glass.name = `wise-dragon-lens-${suffix}`;
    glass.position.copy(ring.position);
    glass.position.z += side * dims.z * 0.006;
    if (side < 0) glass.rotation.y = Math.PI;
    group.add(glass);
  }

  const bridgeLength = Math.abs(sockets[1].point.z - sockets[0].point.z) - eyeRadius * 1.55;
  const bridge = mesh(
    new THREE.CylinderGeometry(dims.y * 0.012, dims.y * 0.012, bridgeLength, detail(8)),
    gold,
  );
  bridge.name = 'wise-dragon-spectacle-bridge';
  bridge.rotation.x = Math.PI / 2;
  bridge.position.set(
    (sockets[0].point.x + sockets[1].point.x) / 2,
    (sockets[0].point.y + sockets[1].point.y) / 2,
    0,
  );
  group.add(bridge);

  const beardMaterial = hornMaterial(palette);
  for (const [index, lateral] of [-0.34, -0.17, 0, 0.17, 0.34].entries()) {
    const length = dims.y * (lateral === 0 ? 0.52 : Math.abs(lateral) < 0.3 ? 0.42 : 0.3);
    const beard = buildHorn(length, dims.y * 0.035, beardMaterial, palette, 0.04);
    beard.name = `wise-dragon-beard-tine-${index + 1}`;
    beard.position.set(dims.x * 0.04, -dims.y * 0.43, lateral * dims.z);
    beard.rotation.set(0, 0, Math.PI);
    group.add(beard);
  }
}

function avatarMaterial(
  color: string,
  roughness: number,
  metalness: number,
  opacity = 1,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: opacity < 1 ? new THREE.Color(color).multiplyScalar(0.18) : undefined,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: THREE.DoubleSide,
  });
  material.userData['preserveAppearance'] = true;
  return material;
}
