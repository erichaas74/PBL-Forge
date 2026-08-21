import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { spreadPositions } from './dragon-anatomy';
import { detail, mesh, revolvedUv, sphereUv } from './dragon-geometry';
import { DragonPalette, clawMaterial, scaleMaterial } from './dragon-materials';
import { DragonFootStyle, getActiveDragonStyle } from './dragon-style';
import { KERATIN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { visualNumber } from './dragon-visual-parameter-readers';

export function buildDragonFoot(part: AssemblyPart, palette: DragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;

  const padRadii = { x: dims.x * 0.44, y: dims.y * 0.48, z: dims.z * 0.43 };
  const pad = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(14), detail(9)), padRadii, SCALE_TILE, palette),
    scaleMaterial(palette),
  );
  pad.name = 'dragon-foot-pad';
  pad.scale.set(padRadii.x, padRadii.y, padRadii.z);
  pad.position.x = -dims.x * 0.04;
  group.add(pad);

  const heelRadii = { x: dims.x * 0.22, y: dims.y * 0.4, z: dims.z * 0.34 };
  const heel = mesh(
    sphereUv(new THREE.SphereGeometry(1, detail(12), detail(8)), heelRadii, SCALE_TILE, palette),
    scaleMaterial(palette, 0.72),
  );
  heel.name = 'dragon-foot-heel';
  heel.scale.set(heelRadii.x, heelRadii.y, heelRadii.z);
  heel.position.x = -dims.x * 0.34;
  group.add(heel);

  const defaults = getActiveDragonStyle().foot;
  const style: DragonFootStyle = {
    talonCount: visualNumber(part, 'talonCount', defaults.talonCount),
    talonLength: visualNumber(part, 'talonLength', defaults.talonLength),
    talonRadius: visualNumber(part, 'talonRadius', defaults.talonRadius),
  };
  const clawScale = visualNumber(part, 'clawScale', 1);
  const talonRadius = dims.y * style.talonRadius * 0.72;
  const talonLength = dims.x * style.talonLength * clawScale;
  const toeLength = dims.x * 0.22;
  let talonIndex = 0;
  for (const side of spreadPositions(style.talonCount, 2)) {
    const toe = mesh(
      revolvedUv(
        new THREE.CapsuleGeometry(talonRadius * 0.82, toeLength, detail(4), detail(8)),
        talonRadius,
        toeLength,
        SCALE_TILE,
        palette,
      ),
      scaleMaterial(palette, 0.75),
    );
    toe.name = `dragon-foot-toe-${++talonIndex}`;
    toe.position.set(dims.x * 0.24, -dims.y * 0.08, side * dims.z * 0.28);
    toe.rotation.z = -Math.PI / 2;
    group.add(toe);

    const talon = buildDragonTalon(talonRadius, talonLength, palette);
    talon.name = `dragon-foot-talon-${talonIndex}`;
    talon.position.set(dims.x * 0.39, -dims.y * 0.1, side * dims.z * 0.28);
    talon.rotation.z = -Math.PI / 2 - 0.12;
    group.add(talon);
  }

  return group;
}

/** Curved two-segment talon along the local Y axis (matches the cylinder physics shape). */
/**
 * How far a talon's blunt end sits behind its own origin, as a fraction of its
 * length: the base cylinder is centred at -0.22 and is 0.55 long, so it reaches
 * 0.495 back. Anything mounting a talon by its root needs this.
 */
export const DRAGON_TALON_BLUNT_END = 0.495;

export function buildDragonTalon(
  radius: number,
  length: number,
  palette: DragonPalette,
  curlDirection: -1 | 1 = 1,
): THREE.Group {
  const group = new THREE.Group();
  const keratin = clawMaterial(palette);

  const base = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.85, length * 0.55, detail(8)),
      radius * 0.68,
      length * 0.55,
      KERATIN_TILE,
      palette,
    ),
    keratin,
  );
  base.position.y = -length * 0.22;
  group.add(base);

  const tipPivot = new THREE.Group();
  tipPivot.position.y = length * 0.05;
  tipPivot.rotation.z = 0.5 * curlDirection;
  const tip = mesh(
    revolvedUv(
      new THREE.CylinderGeometry(radius * 0.02, radius * 0.5, length * 0.5, detail(8)),
      radius * 0.26,
      length * 0.5,
      KERATIN_TILE,
      palette,
    ),
    keratin,
  );
  tip.position.y = length * 0.22;
  tipPivot.add(tip);
  group.add(tipPivot);

  return group;
}
