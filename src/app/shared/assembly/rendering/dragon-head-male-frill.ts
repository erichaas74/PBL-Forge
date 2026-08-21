import * as THREE from 'three';
import { DragonHeadShape, dragonHeadSection } from './dragon-head-profile';
import { detail, mesh, revolvedUv } from './dragon-geometry';
import { DragonPalette, hornMaterial, membraneMaterial } from './dragon-materials';
import { HORN_TILE } from './dragon-texture-constants';

const FRILL_SPINE_COUNT = 16;
/** Where the ring sits along the skull: behind the brow, ahead of the occiput. */
const FRILL_ROOT_AXIAL = -0.16;
/** Tip radius as a multiple of the skull section — a collar twice the head. */
const FRILL_SPREAD = 2.35;
/** How far the spines rake back on the way out, as a fraction of head length. */
const FRILL_RAKE = 0.62;
/**
 * How far the spines hook **forward** again by the tip, as a fraction of head
 * length.
 *
 * Only a little larger than the rake, so the two together bend each spine into a
 * curve that leaves the skull sweeping back and recovers only slightly toward the
 * ring — a slight hook, not a cage. At 1.05 the tips swept round past the eyes
 * and the collar closed over the animal's own face.
 */
const FRILL_CURL = 0.68;
/** How much the ring pulls in under the throat, where the jaw is. */
const FRILL_THROAT_TUCK = 0.46;
/**
 * How far out along the spines the membrane reaches.
 *
 * Short of 1, so every spine tip stands clear of the web it carries. A membrane
 * flush to the tips (which is what root-to-tip quads gave) hides the points and
 * the collar reads as a solid disc with a scalloped hem instead of as a ring of
 * spikes with skin slung between them.
 */
const FRILL_WEB_SPAN = 0.76;
/**
 * How far the web's rim falls back toward the head between two spines, as a
 * fraction of the spread.
 *
 * This is the slope between the spikes: skin hung between two spars sags away
 * from the line joining their tips, so the rim scallops and each panel slopes
 * down from the spine on either side of it.
 */
const FRILL_WEB_SCALLOP = 0.2;
/** Web tessellation: steps across each gap, and out along the spines. */
const FRILL_WEB_ACROSS = 4;
const FRILL_WEB_OUT = 3;

/**
 * The male's frill.
 *
 * A **collar that encircles the whole skull**: a ring of horn spines radiating
 * outward from the head's own cross-section, webbed between every neighbouring
 * pair including the wrap, so the animal looks out through the middle of it.
 * At full spread the tips stand more than twice the height of the skull, which
 * is the point — this is a display structure, and one that reads as jewellery
 * rather than as armour has failed at its only job.
 *
 * Three things keep it from becoming the flat disc this replaced once before.
 *
 * Every spine is a **curve with depth**: it rakes back leaving the skull and then
 * hooks forward again, so the tips finish ahead of the ring rather than trailing
 * behind it, and side-on you see a swept shape instead of a line with spikes
 * floating off it.
 *
 * The **membrane stops short of the tips** ({@link FRILL_WEB_SPAN}), so the points
 * project past the skin, and its rim **scallops between them**
 * ({@link FRILL_WEB_SCALLOP}) — each panel slopes away from the spine on either
 * side of it, the way skin slung between two spars actually hangs.
 *
 * And the radius is pulled in under the throat, where a ring at full spread would
 * run straight through the lower jaw — the frill is widest across the crown and
 * cheeks, exactly where a display structure is meant to be seen from.
 */
export function buildMaleCrest(
  group: THREE.Group,
  dims: { x: number; y: number; z: number },
  palette: DragonPalette,
  shape: DragonHeadShape,
): void {
  const section = dragonHeadSection(dims, FRILL_ROOT_AXIAL, shape);
  const spineMaterial = hornMaterial(palette);
  const webMaterial = membraneMaterial(palette);
  const rootX = FRILL_ROOT_AXIAL * dims.x;

  /** Angle around the collar for a spine index — 0 at the crown. */
  const angleOf = (index: number): number => (index / FRILL_SPINE_COUNT) * Math.PI * 2;

  /**
   * A point on the collar surface.
   *
   * @param angle Around the ring, 0 at the crown.
   * @param out 0 at the skull, 1 at a spine tip.
   * @param inset Radial pull-back, for the scalloped web rim between spines.
   */
  const crestPoint = (angle: number, out: number, inset = 0): THREE.Vector3 => {
    const up = Math.cos(angle);
    // Pulled in below the horizontal, where the jaw is. Full spread everywhere
    // else, so the collar still closes into a complete ring.
    const spread = FRILL_SPREAD * (1 - FRILL_THROAT_TUCK * Math.max(0, -up)) - inset;
    const radial = 0.98 + (spread - 0.98) * out;

    return new THREE.Vector3(
      // Back on the way out, forward again by the tip: `out` linear for the rake
      // and squared for the curl, which is what bends the spine instead of
      // simply aiming it somewhere else.
      rootX - dims.x * FRILL_RAKE * out + dims.x * FRILL_CURL * out * out,
      section.centerY + up * section.halfHeight * radial,
      Math.sin(angle) * section.halfWidth * radial,
    );
  };

  for (let index = 0; index < FRILL_SPINE_COUNT; index += 1) {
    const angle = angleOf(index);
    const up = Math.cos(angle);
    // Thickest over the crown and thinnest under the throat, so the ring has a
    // direction to it rather than reading as a machined part.
    const radius = dims.z * (0.05 + 0.022 * up);

    /*
     * Two segments meeting at the bend, like every other bone on this animal: a
     * barely tapered shaft out to the knuckle, then the point. Drawn as straight
     * runs between three samples of the same curve the web is built from, so the
     * spine and the skin it carries cannot drift apart.
     */
    const stations = [0, 0.55, 1].map((out) => crestPoint(angle, out));
    const spine = new THREE.Group();
    spine.name = `dragon-male-crest-spine-${index + 1}`;

    const shaftLength = stations[0].distanceTo(stations[1]);
    const shaft = mesh(
      revolvedUv(
        new THREE.CylinderGeometry(radius * 0.6, radius, shaftLength, detail(6)),
        radius,
        shaftLength,
        HORN_TILE,
        palette,
      ),
      spineMaterial,
    );
    shaft.position.copy(stations[0]).lerp(stations[1], 0.5);
    shaft.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      stations[1].clone().sub(stations[0]).normalize(),
    );
    spine.add(shaft);

    const pointLength = stations[1].distanceTo(stations[2]);
    const point = mesh(
      revolvedUv(
        new THREE.ConeGeometry(radius * 0.6, pointLength, detail(6)),
        radius * 0.6,
        pointLength,
        HORN_TILE,
        palette,
      ),
      spineMaterial,
    );
    point.position.copy(stations[1]).lerp(stations[2], 0.5);
    point.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      stations[2].clone().sub(stations[1]).normalize(),
    );
    spine.add(point);

    group.add(spine);
  }

  /*
   * The web, as a tessellated strip per gap rather than one quad.
   *
   * A single quad can only be flat, and flat is exactly what has to go: the rim
   * has to fall back between the spines and the surface has to follow the spines'
   * curve on the way out. Both are sampled from `crestPoint`, so a change to the
   * rake, the curl or the spread carries the skin with it.
   *
   * The last gap wraps back to the first, which is what closes the collar into a
   * ring. Double-sided via the membrane material, so it reads from either side
   * without a second surface.
   */
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const columns = FRILL_WEB_OUT + 1;

  for (let index = 0; index < FRILL_SPINE_COUNT; index += 1) {
    const from = angleOf(index);
    // Not `angleOf(index + 1)`: the wrap gap has to span forward past 2Ï€ rather
    // than back to zero, or the last panel is stretched right round the collar.
    const step = (Math.PI * 2) / FRILL_SPINE_COUNT;
    const base = positions.length / 3;

    for (let across = 0; across <= FRILL_WEB_ACROSS; across += 1) {
      const u = across / FRILL_WEB_ACROSS;
      // 0 at each spine, 1 midway between them: no inset where the skin is
      // pinned to bone, most where it hangs free.
      const sag = Math.sin(u * Math.PI);
      for (let outStep = 0; outStep <= FRILL_WEB_OUT; outStep += 1) {
        const out = (outStep / FRILL_WEB_OUT) * FRILL_WEB_SPAN;
        // The scallop is a rim effect: it grows with distance out, so the skin
        // still meets the skull flush at the root ring.
        const point = crestPoint(from + step * u, out, FRILL_WEB_SCALLOP * sag * out);
        positions.push(point.x, point.y, point.z);
        uvs.push(u, out);
      }
    }

    for (let across = 0; across < FRILL_WEB_ACROSS; across += 1) {
      for (let outStep = 0; outStep < FRILL_WEB_OUT; outStep += 1) {
        const a = base + across * columns + outStep;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  const web = new THREE.BufferGeometry();
  web.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  web.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  web.setIndex(indices);
  web.computeVertexNormals();

  const webMesh = mesh(web, webMaterial);
  webMesh.name = 'dragon-male-crest-web';
  group.add(webMesh);

  /*
   * Jaw spines, where the hanging dewlap used to be.
   *
   * A dewlap is a pelican's throat pouch and reads as slack; a short row of
   * backswept horns along the jawline reads as armour. Same gene, same place on
   * the skull, opposite impression.
   */
  const JAW_SPINE_COUNT = 3;
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < JAW_SPINE_COUNT; index += 1) {
      const fraction = index / JAW_SPINE_COUNT;
      const length = dims.y * (0.2 - fraction * 0.05);
      const radius = dims.z * 0.03;
      const spine = mesh(
        revolvedUv(
          new THREE.ConeGeometry(radius, length, detail(6)),
          radius,
          length,
          HORN_TILE,
          palette,
        ),
        spineMaterial,
      );
      spine.name = `dragon-male-jaw-spine-${side < 0 ? 'left' : 'right'}-${index + 1}`;
      spine.position.set(-dims.x * (0.06 + fraction * 0.2), -dims.y * 0.3, side * dims.z * 0.3);
      // Back, down, and outward from the jawline.
      spine.rotation.set(side * 0.5, 0, Math.PI * 0.62);
      group.add(spine);
    }
  }
}
