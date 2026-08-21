import { Vector3Data } from '../domain/assembly.models';
import { dragonHeadSection, dragonHeadSurfacePoint } from './dragon-head-sections';
import {
  DEFAULT_HEAD_SHAPE,
  DragonHeadShape,
  dragonHeadExtent,
  headShapeForProfile,
} from './dragon-head-shape';

/**
 * Where the upper jaw mounts: the **top** of the muzzle at the meeting station.
 *
 * Read from the muzzle profile rather than the bounding box, which is what the
 * head definitions used to do: a flat `{ x: 0.34, y: -0.08, z: 0 }` put the
 * hinge in mid-air once the muzzle drooped, and left the jaw floating clear of
 * the skull it hangs from on any head that was not a sphere.
 *
 * This is the *top* edge and not a point inside the muzzle because the jaw
 * mates to it corner to corner: the jaw's own root sits on its top-back face,
 * so seating that root here puts the top of the jaw exactly level with the top
 * of the snout it meets, on any skull and at any size the genome produces.
 * Pairing two edges is the same trick the lower jaw already uses against the
 * upper one, and it is why neither pair needs a hand-tuned offset that would go
 * stale the moment a head was rescaled.
 */
export function dragonHeadJawMount(
  dimensions: Vector3Data,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  const axial = 0.34;
  const section = dragonHeadSection(dimensions, axial, shape);

  return {
    x: axial * dimensions.x,
    y: section.centerY + section.halfHeight,
    z: 0,
  };
}

/**
 * Jaw hinge for a head, resolved from its variant and its own `dimensions`.
 *
 * The entry point the part definitions use, so a socket never has to restate
 * which skull shape a head wears.
 */
export function dragonHeadJawMountFor(
  profileId: string,
  dimensions: Vector3Data,
  partShape: 'box' | 'sphere' | 'cylinder' | string = 'box',
): Vector3Data {
  const extent = dragonHeadExtent(dimensions, partShape);
  return dragonHeadJawMount(extent, headShapeForProfile(profileId, extent));
}

/**
 * Eye centre, sunk into the orbital pinch so the brow reads as overhanging it.
 *
 * @param side -1 for the left socket (-Z), 1 for the right.
 */
export function dragonHeadEyeSocket(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  const surface = dragonHeadSurfacePoint(dimensions, shape.eyeAxial, side * 1.15, shape);

  // Set into the skull rather than sitting on it: a sphere tangent to the
  // surface reads as a bead glued to the head.
  return { x: surface.x, y: surface.y, z: surface.z * 0.88 };
}

/**
 * Base of a main horn: high on the temporal shelf, just above where a reptile's
 * ear opening sits — behind the eye and forward of the braincase.
 *
 * This used to sit at -0.22, back on the rear of the skull, which put the horns
 * behind the ear and had them growing off the occiput. A horn rooted that far
 * back can only sweep away from the animal; rooted above the ear it has the
 * length of the skull in front of it to point along, which is what the forward
 * rake in the mesh builder needs.
 *
 * The 0.5 rad off the crown matters as much as the station. Further out and the
 * horn grows from the cheek and rakes sideways; this keeps the pair on the roof
 * of the skull, close enough to read as a matched set aimed the same way.
 *
 * @param side -1 for the left horn (-Z), 1 for the right.
 */
export function dragonHeadHornMount(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  return dragonHeadSurfacePoint(dimensions, -0.11, side * 0.5, shape);
}

/**
 * Nostril, on the upper muzzle just short of the nose tip.
 *
 * @param side -1 for the left nostril (-Z), 1 for the right.
 */
export function dragonHeadNostril(
  dimensions: Vector3Data,
  side: -1 | 1,
  shape: DragonHeadShape = DEFAULT_HEAD_SHAPE,
): Vector3Data {
  return dragonHeadSurfacePoint(dimensions, 0.42, side * 0.75, shape);
}
