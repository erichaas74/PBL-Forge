import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { miniDragonHashUnit } from './mini-dragon-random';
import { miniVisualString } from './mini-dragon-visual-parameter-readers';

/** Every independently rendered colour owned by the domesticated mini dragon. */
export interface MiniDragonPalette {
  coat: THREE.Color;
  coatDeep: THREE.Color;
  /** Second coat colour. Equal to `coat` unless the specimen is two-toned. */
  patch: THREE.Color;
  /** Non-inherited, high-chroma display colour unique to the individual. */
  accent: THREE.Color;
  belly: THREE.Color;
  dorsal: THREE.Color;
  horn: THREE.Color;
  paw: THREE.Color;
  tooth: THREE.Color;
  mouth: THREE.Color;
  membrane: THREE.Color;
  membraneVein: THREE.Color;
  eye: THREE.Color;
  pupil: THREE.Color;
  eyeHighlight: THREE.Color;
  featherLight: THREE.Color;
  ember: THREE.Color;
  socketCavity: THREE.Color;
  socketRim: THREE.Color;
  patternStyle: string;
  surfaceStyle: string;
  /** Stable 0..1 from the part id, so repeated limbs are not exact copies. */
  seed: number;
}

/** Derives feature colours from one phenotype pigment without borrowing the classic palette. */
export function createMiniDragonPalette(part: AssemblyPart): MiniDragonPalette {
  const coat = new THREE.Color(part.color);
  const patch = new THREE.Color(miniVisualString(part, 'miniPatchColor', part.color));
  const accent = new THREE.Color(miniVisualString(part, 'miniAccentColor', '#00d9ff'));
  const coatDeep = coat.clone().multiplyScalar(0.62);
  const bone = new THREE.Color('#efe2c4');
  const white = new THREE.Color('#fffdf4');
  const belly = coat.clone().lerp(accent, 0.28).lerp(white, 0.38);
  const dorsal = accent.clone().lerp(coat, 0.18);
  const membrane = accent.clone().lerp(coat, 0.24).lerp(white, 0.12);
  return {
    coat,
    coatDeep,
    patch,
    accent,
    belly,
    dorsal,
    horn: bone.clone().lerp(accent, 0.24),
    paw: accent.clone().lerp(new THREE.Color('#ffd0dc'), 0.58),
    tooth: new THREE.Color('#f7edd8'),
    mouth: new THREE.Color('#351820'),
    membrane,
    membraneVein: accent.clone().multiplyScalar(0.48),
    eye: new THREE.Color(miniVisualString(part, 'miniEmberColor', '#ffb45e')),
    pupil: new THREE.Color('#150c06'),
    eyeHighlight: new THREE.Color('#ffffff'),
    featherLight: accent.clone().lerp(white, 0.6),
    ember: new THREE.Color(miniVisualString(part, 'miniEmberColor', '#ffb45e')),
    socketCavity: coatDeep.clone().multiplyScalar(0.55),
    socketRim: coat.clone().multiplyScalar(0.86),
    patternStyle: miniVisualString(part, 'miniPatternStyle', 'saddle'),
    surfaceStyle: miniVisualString(part, 'miniSurfaceStyle', 'sleek'),
    seed: miniDragonHashUnit(part.id),
  };
}
