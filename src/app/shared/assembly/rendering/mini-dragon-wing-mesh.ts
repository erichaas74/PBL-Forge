import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { addMiniWingFeathers } from './mini-dragon-feathers';
import {
  MiniDragonPalette,
  addJointBall,
  coatMaterial,
  mesh,
  visualNumber,
  wingSkinMaterial,
} from './mini-dragon-rendering';

// ---------------------------------------------------------------------------
// Wing: small, rounded, and often barely there.
// ---------------------------------------------------------------------------

export function buildMiniWing(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const spread = visualNumber(part, 'miniWingSpread', 1);
  // Which flank this wing grows from, as data rather than as a substring of the
  // part id: a renamed part must not silently mirror the animal.
  const side = visualNumber(part, 'miniWingSide', 1) < 0 ? -1 : 1;
  const coat = coatMaterial(palette.coat);
  addJointBall(group, dims.y * 0.18 * visualNumber(part, 'miniJointBall', 1), coat, {
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
    const nub = mesh(new THREE.SphereGeometry(dims.y * 0.3, 10, 8), coat);
    nub.name = 'mini-dragon-wing-nub';
    nub.scale.set(1.1, 0.8, 0.7);
    group.add(nub);
    return group;
  }

  const span = dims.z * spread;
  const chord = dims.x;

  const shape = new THREE.Shape();
  shape.moveTo(chord * 0.34, 0);
  shape.quadraticCurveTo(chord * 0.46, span * 0.58, chord * 0.06, span);
  shape.quadraticCurveTo(-chord * 0.34, span * 0.96, -chord * 0.5, span * 0.42);
  shape.quadraticCurveTo(-chord * 0.52, span * 0.1, chord * 0.34, 0);
  const membrane = new THREE.ShapeGeometry(shape, 14);
  // The shape is authored in XY; stand it up so its span (+Y) runs along +Z.
  membrane.rotateX(Math.PI / 2);
  const skin = mesh(membrane, wingSkinMaterial(palette));
  skin.name = 'mini-dragon-wing-membrane';
  skin.scale.z = side;
  group.add(skin);

  // Leading-edge bone, tapering to the tip.
  const bone = mesh(new THREE.CylinderGeometry(dims.y * 0.055, dims.y * 0.1, span, 8), coat);
  bone.name = 'mini-dragon-wing-bone';
  bone.position.set(chord * 0.2, 0, (side * span) / 2);
  bone.rotation.x = (side * Math.PI) / 2;
  group.add(bone);

  // Two short finger struts, not the classic dragon's four: this wing is a
  // rounded paddle, not a hand.
  for (const at of [0.42, 0.74] as const) {
    const strut = mesh(
      new THREE.CylinderGeometry(dims.y * 0.028, dims.y * 0.042, chord * 0.52, 6),
      coat,
    );
    strut.name = 'mini-dragon-wing-strut';
    strut.position.set(-chord * 0.1, 0, side * span * at);
    strut.rotation.z = Math.PI / 2;
    strut.rotation.y = side * -0.5;
    group.add(strut);
  }

  addMiniWingFeathers(group, part, palette, side, span, chord);

  // Lift the outer edge. A wing built flat in the XZ plane is a card seen
  // edge-on from every angle the specimen camera uses.
  group.rotation.x = -side * 0.5;
  group.rotation.y = side * 0.2;
  return group;
}
