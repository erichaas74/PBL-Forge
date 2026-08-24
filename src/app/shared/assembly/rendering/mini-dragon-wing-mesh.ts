import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniWingFeathers } from './mini-dragon-feathers';
import { addMiniJointBall, miniDetail, miniMesh } from './mini-dragon-geometry';
import { miniCoatMaterial, miniWingMembraneMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniWingMorphology } from './mini-dragon-morphology';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

// ---------------------------------------------------------------------------
// Wing: small, rounded, and often barely there.
// ---------------------------------------------------------------------------

export function buildMiniWing(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const spread = miniVisualNumber(part, 'miniWingSpread', 1);
  const morphology = miniWingMorphology(part);
  // Which flank this wing grows from, as data rather than as a substring of the
  // part id: a renamed part must not silently mirror the animal.
  const side = miniVisualNumber(part, 'miniWingSide', 1) < 0 ? -1 : 1;
  const coat = miniCoatMaterial(palette.coat, `${part.id}-bone`, palette.surfaceStyle);
  addMiniJointBall(group, dims.y * 0.18 * miniVisualNumber(part, 'miniJointBall', 1), coat, {
    x: 0,
    y: 0,
    z: 0,
  });

  /*
   * A vestigial wing is not a small wing. Below this threshold the membrane and
   * struts are gone entirely and what remains is a rounded bump — which is what
   * the recessive genotype actually produces, and what stops a student reading
   * "wingless" as "wings I cannot see at this zoom".
   */
  if (spread < 0.22) {
    const nub = miniMesh(
      new THREE.SphereGeometry(dims.y * 0.3, miniDetail(12), miniDetail(9)),
      coat,
    );
    nub.name = 'mini-dragon-wing-nub';
    nub.scale.set(1.1, 0.8, 0.7);
    group.add(nub);
    return group;
  }

  const span = dims.z * spread;
  const chord = dims.x * morphology.chord;
  const sweep = morphology.sweep;
  const scallop = morphology.scallop;

  const shape = new THREE.Shape();
  shape.moveTo(chord * 0.34, 0);
  shape.bezierCurveTo(
    chord * (0.5 - sweep * 0.12),
    span * 0.28,
    chord * (0.34 - sweep * 0.42),
    span * 0.76,
    chord * (0.04 - sweep),
    span,
  );
  shape.quadraticCurveTo(-chord * 0.2, span * (0.98 - scallop * 0.08), -chord * 0.34, span * 0.83);
  shape.quadraticCurveTo(
    -chord * (0.38 + scallop * 0.28),
    span * 0.72,
    -chord * (0.42 - scallop * 0.08),
    span * 0.61,
  );
  shape.quadraticCurveTo(
    -chord * (0.48 + scallop * 0.22),
    span * 0.48,
    -chord * (0.43 - scallop * 0.06),
    span * 0.34,
  );
  shape.quadraticCurveTo(-chord * 0.42, span * 0.1, chord * 0.34, 0);
  const membrane = new THREE.ShapeGeometry(shape, miniDetail(18));
  const positions = membrane.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const spanUnit = THREE.MathUtils.clamp(positions.getY(index) / Math.max(span, 1e-6), 0, 1);
    const chordUnit = Math.min(1, Math.abs(positions.getX(index)) / Math.max(chord * 0.5, 1e-6));
    positions.setZ(
      index,
      Math.sin(spanUnit * Math.PI) * (1 - chordUnit * 0.42) * dims.y * morphology.camber,
    );
  }
  positions.needsUpdate = true;
  membrane.computeVertexNormals();
  // The shape is authored in XY; stand it up so its span (+Y) runs along +Z.
  membrane.rotateX(Math.PI / 2);
  const skin = miniMesh(membrane, miniWingMembraneMaterial(palette, part.id));
  skin.name = 'mini-dragon-wing-membrane';
  skin.scale.z = side;
  group.add(skin);

  // Curved leading edge follows the planform instead of crossing it as a pole.
  const leadingPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(chord * 0.32, 0, 0),
    new THREE.Vector3(chord * (0.36 - sweep * 0.12), dims.y * morphology.camber * 0.7, side * span * 0.36),
    new THREE.Vector3(chord * (0.24 - sweep * 0.42), dims.y * morphology.camber * 0.5, side * span * 0.72),
    new THREE.Vector3(chord * (0.04 - sweep), 0, side * span),
  ]);
  const bone = miniMesh(
    new THREE.TubeGeometry(
      leadingPath,
      miniDetail(18),
      dims.y * 0.06,
      miniDetail(9),
      false,
    ),
    coat,
  );
  bone.name = 'mini-dragon-wing-bone';
  group.add(bone);

  // Three soft finger struts make broad and scalloped forms readable from below.
  for (const at of [0.32, 0.58, 0.8] as const) {
    const from = leadingPath.getPoint(at);
    const to = new THREE.Vector3(
      -chord * (0.34 + scallop * at * 0.14),
      -dims.y * morphology.camber * 0.2,
      side * span * at,
    );
    const axis = new THREE.Vector3().subVectors(to, from);
    const strut = miniMesh(
      new THREE.CylinderGeometry(
        dims.y * 0.024,
        dims.y * 0.038,
        axis.length(),
        miniDetail(7),
      ),
      coat,
    );
    strut.name = 'mini-dragon-wing-strut';
    strut.position.copy(from).addScaledVector(axis, 0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    group.add(strut);
  }

  addMiniWingFeathers(group, part, palette, side, span, chord);

  // Lift the outer edge. A wing built flat in the XZ plane is a card seen
  // edge-on from every angle the specimen camera uses.
  group.rotation.x = -side * 0.5;
  group.rotation.y = side * 0.2;
  return group;
}
