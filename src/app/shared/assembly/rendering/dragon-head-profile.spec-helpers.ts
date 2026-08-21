import { Vector3Data } from '../domain/assembly.models';
import { dragonHeadStations } from './dragon-head-sections';
import { DEFAULT_HEAD_SHAPE, DragonHeadShape } from './dragon-head-shape';

export const HORNED: Vector3Data = { x: 0.84, y: 0.84, z: 0.84 };
export const SNOUT: Vector3Data = { x: 0.68, y: 0.38, z: 0.34 };

/** Widest and tallest the silhouette gets, as fractions of the half extents. */
export function headEnvelope(shape: DragonHeadShape = DEFAULT_HEAD_SHAPE): {
  height: number;
  width: number;
} {
  let height = 0;
  let width = 0;
  for (const station of dragonHeadStations(shape)) {
    height = Math.max(height, Math.abs(station.drop) + station.height);
    width = Math.max(width, station.width);
  }
  return { height, width };
}
