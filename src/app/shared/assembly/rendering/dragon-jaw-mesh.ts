import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildHorn } from './dragon-anatomy';
import { boxUv, createTaperedJawGeometry, detail, mesh, revolvedUv } from './dragon-geometry';
import {
  DragonPalette,
  hornMaterial,
  nostrilMaterial,
  scaleMaterial,
  toothMaterial,
} from './dragon-materials';
import { DragonJawStyle, getActiveDragonStyle } from './dragon-style';
import { KERATIN_TILE, SCALE_TILE } from './dragon-texture-constants';
import { visualNumber } from './dragon-visual-parameter-readers';

/** Default length of jaw the tooth row covers, as a fraction of jaw length. */
const DEFAULT_TOOTH_ROW_SPAN = 0.6;
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * How far the jaw box narrows by its front face. Shared with the placement
 * maths below, not just handed to the geometry: anything sitting on the snout
 * has to follow the same taper or it floats.
 */
const JAW_FRONT_SCALE_Y = 0.55;
const JAW_FRONT_SCALE_Z = 0.5;

/**
 * Nostril placement, as fractions of jaw length and depth. Shared, not
 * duplicated: the fangs sit directly beneath the nostrils, so the two have to
 * move together.
 */
const NOSTRIL_ALONG = 0.38;
const NOSTRIL_LATERAL = 0.25;

/** Fangs run this much longer than the teeth in the same jaw. */
const FANG_LENGTH_RATIO = 1.5;

/**
 * Tooth positions along the jaw, front-most first, as fractions of jaw length.
 *
 * The row is anchored at its *front* rather than its centre, so `toothStart`
 * means the same thing at every count: a lone fang sits exactly where the
 * slider says, and adding teeth extends the row backwards instead of shifting
 * the one already placed.
 */
function toothRow(count: number, start: number, span: number): number[] {
  const total = Math.max(0, Math.round(count));
  if (total <= 1) return total === 1 ? [start] : [];
  const step = span / (total - 1);
  return Array.from({ length: total }, (_, index) => start - index * step);
}

export function buildDragonJaw(
  part: AssemblyPart,
  palette: DragonPalette,
  variant: 'upper' | 'lower',
): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const pointDown = variant === 'upper';

  group.add(mesh(
    boxUv(
      createTaperedJawGeometry(
        dims.x,
        dims.y,
        dims.z,
        JAW_FRONT_SCALE_Y,
        JAW_FRONT_SCALE_Z,
      ),
      SCALE_TILE,
      palette,
    ),
    scaleMaterial(palette),
  ));

  /**
   * Height of the tapered top face at a station along the jaw. The box narrows
   * only ahead of its middle, and `createTaperedBoxGeometry` blends over the
   * front half, so this mirrors that ramp exactly.
   */
  function topSurfaceY(along: number): number {
    const blend = Math.min(1, Math.max(0, along * 2));
    return dims.y * 0.5 * (1 - blend * (1 - JAW_FRONT_SCALE_Y));
  }

  const nostrilScale = visualNumber(part, 'nostrilScale', 1);
  const nostrilRadius = Math.max(dims.y * 0.15, dims.z * 0.045) * nostrilScale;
  const nostrilAlong = NOSTRIL_ALONG + visualNumber(part, 'nostrilOffsetX', 0);
  const nostrilY = topSurfaceY(nostrilAlong) + visualNumber(part, 'nostrilOffsetY', 0) * dims.y;
  const nostrilLateralZ = dims.z * (
    NOSTRIL_LATERAL + visualNumber(part, 'nostrilOffsetZ', 0)
  ) - nostrilRadius;

  if (variant === 'upper') {
    // Nostrils stay smooth: scale relief on a 2cm sphere just reads as noise.
    const nostrilSurface = nostrilMaterial(palette);
    for (const side of [-1, 1]) {
      const nostril = mesh(new THREE.SphereGeometry(nostrilRadius, detail(10), detail(7)), nostrilSurface);
      nostril.name = `dragon-nostril-${side < 0 ? 'left' : 'right'}`;
      nostril.scale.set(1.25, 0.45, 1);
      // Half a nostril's thickness in from the old line, and sunk to the
      // *tapered* top rather than the height of the flat rear section — the
      // snout has already dropped by this far forward, so the old fixed height
      // left them hanging above the surface.
      nostril.position.set(dims.x * nostrilAlong, nostrilY, side * nostrilLateralZ);
      group.add(nostril);
    }
  }

  const defaults = getActiveDragonStyle().jaw;
  const style: DragonJawStyle = {
    toothCount: visualNumber(part, 'toothCount', defaults.toothCount),
    toothHeight: visualNumber(part, 'toothHeight', defaults.toothHeight),
    toothRadius: visualNumber(part, 'toothRadius', defaults.toothRadius),
    toothStart: visualNumber(part, 'toothStart', defaults.toothStart),
    noseHornLength: visualNumber(part, 'noseHornLength', defaults.noseHornLength),
  };

  /*
   * The nose horn: on the bridge of the upper jaw, immediately behind the
   * nostrils, on the midline.
   *
   * It belongs to the jaw rather than the skull because the jaw *is* the snout a
   * viewer sees — it mounts over the skull's muzzle, so a horn placed on the head
   * would sit on the seam between the two or be swallowed by the part in front
   * of it.
   *
   * Behind the nostrils by a fixed offset from `NOSTRIL_ALONG` and not by a
   * separate number, for the same reason the fangs read that constant: if the
   * nostrils move, the horn behind them has to move with them or it ends up
   * between them.
   */
  const noseHornLength = dims.y * style.noseHornLength;
  if (variant === 'upper' && noseHornLength > 0) {
    const along = NOSTRIL_ALONG - 0.14 + visualNumber(part, 'noseHornOffsetX', 0);
    const noseHorn = buildHorn(
      noseHornLength,
      Math.max(dims.y, dims.z) * 0.11,
      hornMaterial(palette),
      palette,
      // Barely any bend. At this size a curl is not read as a curl, only as a
      // kink halfway up.
      -0.1,
    );
    noseHorn.name = 'dragon-nose-horn';
    // Sunk a little into the bridge so the base disc finishes inside the jaw
    // rather than standing on the surface.
    noseHorn.position.set(
      dims.x * along,
      topSurfaceY(along) - noseHornLength * 0.06
        + visualNumber(part, 'noseHornOffsetY', 0) * dims.y,
      visualNumber(part, 'noseHornOffsetZ', 0) * dims.z,
    );
    // Upright with a slight forward lean. The snout is already sloping away
    // ahead of it, and laying the horn over as far as the pair on the skull would
    // point it along the nose instead of up off it.
    noseHorn.rotation.set(
      visualNumber(part, 'noseHornSway', 0) * DEGREES_TO_RADIANS,
      0,
      -0.22 + visualNumber(part, 'noseHornRake', 0) * DEGREES_TO_RADIANS,
    );
    group.add(noseHorn);
  }

  const fangScale = visualNumber(part, 'fangScale', 1);
  const enamel = toothMaterial(palette);
  const toothHeight = dims.y * style.toothHeight;
  const toothRadius = dims.z * style.toothRadius;
  // The upper row sits behind the two display fangs and should read as the
  // smaller cutting teeth, not as another bank of fangs. The lower row retains
  // the authored size so the bite still has a visible lower edge.
  const rowToothLengthScale = variant === 'upper' ? 0.65 : 1;
  const rowToothThicknessScale = variant === 'upper' ? 0.75 : 1;
  const rowToothHeight = toothHeight * rowToothLengthScale;
  const rowToothRadius = toothRadius * rowToothThicknessScale;
  const toothRowSpan = visualNumber(part, 'toothRowSpan', DEFAULT_TOOTH_ROW_SPAN);
  const toothOffset = {
    x: visualNumber(part, 'toothOffsetX', 0) * dims.x,
    y: visualNumber(part, 'toothOffsetY', 0) * dims.y,
    z: visualNumber(part, 'toothOffsetZ', 0) * dims.z,
  };
  const toothSplay = visualNumber(part, 'toothSplay', 0) * DEGREES_TO_RADIANS;
  const toothRake = visualNumber(part, 'toothRake', 0) * DEGREES_TO_RADIANS;
  /**
   * Every tooth is rooted on the jaw's mid-height and grows out from there —
   * fixed, not tunable. Hanging them off the bottom face made a long tooth read
   * as stuck on rather than set into the jaw, and the root drifted whenever the
   * jaw was rescaled. A cone is centred on its own position, so the mesh sits
   * half its length past the midline.
   */
  function rootedAtMidline(height: number): number {
    return (pointDown ? -1 : 1) * height * 0.5;
  }

  for (const [index, along] of toothRow(style.toothCount, style.toothStart, toothRowSpan).entries()) {
    for (const side of [-1, 1]) {
      const tooth = mesh(
        revolvedUv(
          new THREE.ConeGeometry(rowToothRadius, rowToothHeight, detail(5)),
          rowToothRadius,
          rowToothHeight,
          KERATIN_TILE,
          palette,
        ),
        enamel,
      );
      tooth.name = `dragon-tooth-${side < 0 ? 'left' : 'right'}-${index + 1}`;
      tooth.position.set(
        along * dims.x + toothOffset.x,
        rootedAtMidline(rowToothHeight) + toothOffset.y,
        side * (dims.z * 0.32 * (1 - Math.max(0, along) * 0.4) + toothOffset.z),
      );
      tooth.rotation.set(
        (pointDown ? Math.PI : 0) + side * toothSplay,
        0,
        toothRake,
      );
      group.add(tooth);
    }
  }

  if (variant === 'upper') {
    // Fangs hang under the nostrils. They are pulled further in than the tooth
    // row so they stay inside the snout, which is tapered to 0.5 depth at the
    // tip: a fang on the tooth line would break the surface here.
    const fangHeight = toothHeight * FANG_LENGTH_RATIO * fangScale;
    const fangOffset = {
      x: visualNumber(part, 'fangOffsetX', 0) * dims.x,
      y: visualNumber(part, 'fangOffsetY', 0) * dims.y,
      z: visualNumber(part, 'fangOffsetZ', 0) * dims.z,
    };
    const fangSplay = visualNumber(part, 'fangSplay', 0) * DEGREES_TO_RADIANS;
    const fangRake = visualNumber(part, 'fangRake', 0) * DEGREES_TO_RADIANS;
    for (const side of [-1, 1]) {
      const fang = mesh(
        revolvedUv(
          new THREE.ConeGeometry(toothRadius, fangHeight, detail(5)),
          toothRadius,
          fangHeight,
          KERATIN_TILE,
          palette,
        ),
        enamel,
      );
      fang.name = `dragon-fang-${side < 0 ? 'left' : 'right'}`;
      const fangLateralZ = dims.z * NOSTRIL_LATERAL
        - Math.max(dims.y * 0.15, dims.z * 0.045);
      fang.position.set(
        dims.x * NOSTRIL_ALONG + fangOffset.x,
        rootedAtMidline(fangHeight) + fangOffset.y,
        side * (fangLateralZ + fangOffset.z),
      );
      fang.rotation.set(Math.PI + side * fangSplay, 0, fangRake);
      group.add(fang);
    }
  }

  return group;
}
