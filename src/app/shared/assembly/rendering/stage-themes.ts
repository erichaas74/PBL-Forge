/**
 * Shared "stage" setup for every three.js view in the app: filmic tone mapping,
 * image-based lighting, a three-point light rig, and an optional post-processing
 * chain (AO + bloom + SMAA) gated by render quality.
 */
export interface StageTheme {
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  hemisphereSky: string;
  hemisphereGround: string;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  /**
   * Weight of the image-based lighting, and a number to be stingy with.
   *
   * The probe is three's `RoomEnvironment` — a white studio with area lights in
   * it, bright enough at intensity 1 to light a scene on its own. Every theme
   * here also runs a full three-point rig, so anything near 1 means the rig is
   * a rounding error and the neutral studio *is* the lighting: measured on the
   * arena at 1.05, the probe outweighed key, fill, rim and hemisphere combined
   * by roughly four to one, and the overcast Berk palette came out as pastel
   * under a white light. Kept low so the probe does what it is actually needed
   * for — opening the shadow side and giving roughness something to reflect —
   * while the rig carries the look.
   */
  environmentIntensity: number;
}

/**
 * Berk: an overcast north-Atlantic afternoon. The arena theme.
 *
 * The point of the palette is what it *withholds*: the sky is a desaturated
 * grey-blue, the bounce is wet earth, and the rim is nearly gone, so the only
 * saturated thing in frame is fire — braziers and dragon breath. A high
 * environment intensity keeps the shadow side open the way a cloud deck does,
 * which is what makes this read as daylight rather than as a dark scene.
 *
 * This replaced a dusk-and-neon arena theme outright. There is no longer a
 * second battle look to fall back to: every scenario the arena renders, dragon
 * or otherwise, is lit as the same overcast day, because two competing looks
 * in one renderer is how an app ends up with no identity at all.
 */
export const BERK_STAGE_THEME: StageTheme = {
  skyTop: '#8fa5b8',
  skyBottom: '#c9d4dc',
  fogColor: '#b8c6d0',
  hemisphereSky: '#b9cbdc',
  hemisphereGround: '#6b5b45',
  keyColor: '#fff1dc',
  keyIntensity: 1.9,
  fillColor: '#a8bccd',
  fillIntensity: 0.8,
  rimColor: '#dbe7f0',
  rimIntensity: 0.5,
  environmentIntensity: 0.3,
};

/**
 * Bright workshop: the forge with its doors open. Neutral and readable, for
 * the garage and previews.
 *
 * Warmer and less blue than it was, so a part carried from the workshop to the
 * arena does not appear to change colour on the way.
 */
export const STUDIO_STAGE_THEME: StageTheme = {
  skyTop: '#e4ddcd',
  skyBottom: '#f8f4ea',
  fogColor: '#ece4d5',
  hemisphereSky: '#e0dccf',
  hemisphereGround: '#8a7a60',
  keyColor: '#fff3de',
  keyIntensity: 2.1,
  fillColor: '#cdd4d8',
  fillIntensity: 0.65,
  rimColor: '#f2ece0',
  rimIntensity: 1,
  environmentIntensity: 0.3,
};

/**
 * Specimen bench: brighter and flatter than the studio, with a cool rim so a
 * small silhouette still separates from the panel behind it. Tuned for
 * inspection at 300px and thumbnails at 120px, where arena contrast reads as
 * mud and a warm key hides pigment differences.
 *
 * **Deliberately left near-neutral by the Berk retheme.** This stage exists so
 * a student can compare the pigment genes of two dragons side by side, and any
 * strong colour cast here is a cast applied to the exact thing being measured.
 * The bench is an instrument, not a set.
 *
 * That neutrality is a statement about *hue*, not about brightness, and the two
 * were being conflated. This was the brightest theme in the file on every
 * channel — key 2.35, rim 1.45, fill 0.85, environment 0.4 — against a pure
 * white background. The result was an instrument that desaturated the exact
 * quantity it exists to measure: a `#98552f` bronze dragon rendered as pale
 * cream, and two pigment genotypes a student was asked to compare arrived
 * closer together on screen than they are in the genome. Intensities are now
 * roughly two-thirds of that, hues untouched.
 */
export const SPECIMEN_STAGE_THEME: StageTheme = {
  skyTop: '#dce6e8',
  skyBottom: '#f1f4f2',
  fogColor: '#e7edef',
  hemisphereSky: '#edf1ef',
  hemisphereGround: '#9ca9a6',
  keyColor: '#fffaf1',
  keyIntensity: 1.16,
  fillColor: '#cbd5d7',
  fillIntensity: 0.36,
  rimColor: '#d7e8ef',
  rimIntensity: 0.78,
  environmentIntensity: 0.22,
};
