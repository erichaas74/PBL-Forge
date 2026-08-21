import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildGlowNode, buildHorn } from './dragon-anatomy';
import { DragonHeadShape, dragonHeadSurfacePoint } from './dragon-head-profile';
import { boxUv, createTaperedBoxGeometry, detail, mesh } from './dragon-geometry';
import { buildMaleCrest } from './dragon-head-male-frill';
import { DragonPalette, hornMaterial, membraneMaterial } from './dragon-materials';
import { HORN_TILE } from './dragon-texture-constants';
import { visualFlag, visualNumber, visualString } from './dragon-visual-parameter-readers';

export function addDragonHeadExpressiveFeatures(
  group: THREE.Group,
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const crestScale = visualNumber(part, 'crestScale', 0);
  if (crestScale > 0) {
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
      group.add(fin);
    }
  }

  if (visualFlag(part, 'glowMarkings')) {
    // The jaw hinge and the cheek: the two places a light on the skull is
    // visible from the front, the side, and from above.
    for (const side of [-1, 1] as const) {
      for (const [index, axial] of [-0.34, -0.05].entries()) {
        const mount = dragonHeadSurfacePoint(dims, axial, side * 0.78, shape);
        const lantern = buildGlowNode(dims.y * (index === 0 ? 0.13 : 0.1));
        lantern.name = `dragon-glow-head-${index + 1}-${side < 0 ? 'left' : 'right'}`;
        lantern.position.set(mount.x, mount.y, mount.z);
        group.add(lantern);
      }
    }
  }

  const sex = visualString(part, 'sex', '');
  if (sex === 'male') {
    buildMaleCrest(group, dims, palette, shape);
  } else if (sex === 'female') {
    const material = membraneMaterial(palette);
    const spineMaterial = hornMaterial(palette);
    for (const side of [-1, 1] as const) {
      const frill = mesh(new THREE.ConeGeometry(dims.y * 0.22, dims.z * 0.58, detail(9)), material);
      frill.name = `dragon-female-frill-${side < 0 ? 'left' : 'right'}`;
      frill.position.set(-dims.x * 0.24, dims.y * 0.08, side * dims.z * 0.52);
      frill.rotation.set((side * Math.PI) / 2, 0, side * 0.2);
      group.add(frill);

      const spine = buildHorn(dims.z * 0.46, dims.z * 0.035, spineMaterial, palette, -0.08);
      spine.name = `dragon-female-frill-spine-${side < 0 ? 'left' : 'right'}`;
      spine.position.set(-dims.x * 0.24, dims.y * 0.08, side * dims.z * 0.48);
      spine.rotation.set((side * Math.PI) / 2, 0, -0.16);
      group.add(spine);
    }
  }
}
