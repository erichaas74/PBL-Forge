import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildHorn } from './dragon-anatomy';
import {
  DragonHeadShape,
  dragonHeadEyeSocket,
  dragonHeadHornMount,
  dragonHeadSurfacePoint,
} from './dragon-head-profile';
import { detail, mesh } from './dragon-geometry';
import {
  DragonPalette,
  eyeHighlightMaterial,
  eyeMaterial,
  hornMaterial,
  pupilMaterial,
} from './dragon-materials';
import { DragonHeadStyle } from './dragon-style';
import { visualString } from './dragon-visual-parameter-readers';

export function addDragonHeadHornsAndEyes(
  group: THREE.Group,
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
  style: DragonHeadStyle,
): void {
  // Horn sizes stay keyed to the head's height, so a longer snout lengthens the
  // skull without also growing the horns.
  const scaleRef = dims.y / 2;
  const horn = hornMaterial(palette);
  for (const side of [-1, 1] as const) {
    // A length of zero means hornless, and is drawn as nothing at all: a
    // zero-height cone still leaves its base disc sitting on the skull.
    if (style.hornLength > 0) {
      const mount = dragonHeadHornMount(dims, side, shape);
      const mainHorn = buildHorn(
        scaleRef * style.hornLength,
        scaleRef * style.hornRadius,
        horn,
        palette,
      );
      mainHorn.name = `dragon-horn-${side < 0 ? 'left' : 'right'}`;
      mainHorn.position.set(mount.x, mount.y, mount.z);
      /*
       * Stood up off the temporal shelf and driven forward along the snout.
       *
       * The z angle is the whole change here. It used to be +0.55, which rakes a
       * horn back over the neck; -0.95 lays it forward instead, about 55Â° off
       * vertical, so the pair points out past the brow at whatever the animal is
       * looking at. Combined with the slight forward curl inside `buildHorn`,
       * the tip finishes ahead of the base rather than behind it.
       *
       * The x angle fans the pair apart. Raised from 0.34: now that the horns are
       * long and thin, a tight pair reads as one horn from the side and as a
       * fork from the front, and the extra splay is what separates them into two
       * — while staying well short of the sideways sweep of cattle horns.
       */
      mainHorn.rotation.set(side * 0.62, 0, -0.95);
      group.add(mainHorn);
    }

    if (style.browLength > 0) {
      const browMount = dragonHeadSurfacePoint(dims, -0.02, side * 0.5, shape);
      const browSpike = buildHorn(scaleRef * style.browLength, scaleRef * 0.08, horn, palette);
      browSpike.position.set(browMount.x, browMount.y, browMount.z);
      // Forward too, and further over than the main pair: these sit ahead of the
      // horns, so a shared angle would bury them in the horn bases behind them.
      browSpike.rotation.set(side * 0.3, 0, -1.15);
      group.add(browSpike);
    }

    group.add(buildEye(part, dims, side, shape));
  }
}

/**
 * Eye set into the skull's orbital pinch.
 *
 * The position used to be a hand-tuned multiple of the head radius, which only
 * held for a sphere: on any head the profile actually shapes, it put the eye
 * inside the bone or floating off the cheek.
 */
function buildEye(
  part: AssemblyPart,
  dims: { x: number; y: number; z: number },
  side: -1 | 1,
  shape: DragonHeadShape,
): THREE.Object3D {
  const suffix = side < 0 ? 'left' : 'right';
  const group = new THREE.Group();
  group.name = `dragon-eye-${suffix}`;

  // Was `dims.y * 0.055`, which at viewport size is a couple of pixels and
  // reads as a dot rather than an eye. An eye is where a viewer looks first for
  // signs of life, so it is worth more of the skull than that.
  const radius = dims.y * 0.085;
  const socket = dragonHeadEyeSocket(dims, side, shape);
  const centre = new THREE.Vector3(socket.x, socket.y, socket.z);

  // Outward is lateral. The socket is sunk into the skull by
  // `dragonHeadEyeSocket`, and its position is not a radius from any centre the
  // head profile exposes, so a normalised socket vector is not the surface
  // normal here the way it is on the mini dragon's spherical cranium.
  const outward = new THREE.Vector3(0, 0, side);

  const eyeball = mesh(
    new THREE.SphereGeometry(radius, detail(14), detail(12)),
    eyeMaterial(visualString(part, 'eyeColor', '#ff9f2e')),
  );
  eyeball.name = `dragon-eyeball-${suffix}`;
  eyeball.position.copy(centre);
  group.add(eyeball);

  /*
   * Vertical slit, not a round pupil — this is the one place the classic dragon
   * deliberately parts company with the mini dragon, whose round pupil is half
   * of what makes it read as a furred companion rather than a reptile.
   *
   * Built by squashing a sphere on the axial and lateral axes and leaving it
   * tall, then pushing it just proud of the eyeball so it is not z-fighting the
   * surface it sits on.
   */
  const pupil = mesh(
    new THREE.SphereGeometry(radius * 0.62, detail(10), detail(8)),
    pupilMaterial(),
  );
  pupil.name = `dragon-pupil-${suffix}`;
  pupil.scale.set(0.42, 1, 0.42);
  pupil.position.copy(centre).addScaledVector(outward, radius * 0.52);
  group.add(pupil);

  const spark = mesh(
    new THREE.SphereGeometry(radius * 0.22, detail(8), detail(6)),
    eyeHighlightMaterial(),
  );
  spark.name = `dragon-eye-highlight-${suffix}`;
  spark.position
    .copy(centre)
    .addScaledVector(outward, radius * 0.74)
    // Up and forward, where a key light above and in front of the animal would
    // actually put it.
    .add(new THREE.Vector3(radius * 0.34, radius * 0.4, 0));
  group.add(spark);

  return group;
}
