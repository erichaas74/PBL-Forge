import { buildMiniHead } from './mini-dragon-head-mesh';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';

describe('mini-dragon head and face', () => {
  it('builds a cranium, a snout, two eyes with pupils, two ears, and two horns', () => {
    const head = renderMiniPart(buildMiniHead, 'mini-dragon-head')!;

    expect(named(head, 'mini-dragon-cranium').length).toBe(1);
    expect(named(head, 'mini-dragon-snout').length).toBe(1);
    expect(named(head, 'mini-dragon-eye').length).toBe(2);
    expect(named(head, 'mini-dragon-pupil').length).toBe(2);
    expect(named(head, 'mini-dragon-ear').length).toBe(2);
    expect(named(head, 'mini-dragon-horn').length).toBe(2);
  });

  it('keeps the eyes on the cranium rather than inside it', () => {
    const dimensions = { x: 0.5, y: 0.58, z: 0.52 };
    const head = renderMiniPart(buildMiniHead, 'mini-dragon-head', { dimensions })!;
    const [eye] = named(head, 'mini-dragon-eye');

    // Normalised against the scaled skull, an eye should sit at ~1 radius out.
    const skullRadius = dimensions.y * 0.5;
    const offset =
      (eye.position.x / (skullRadius * (dimensions.x / dimensions.y) * 0.92)) ** 2 +
      (eye.position.y / skullRadius) ** 2 +
      (eye.position.z / (skullRadius * (dimensions.z / dimensions.y) * 1.02)) ** 2;
    expect(Math.sqrt(offset)).toBeGreaterThan(0.8);
    expect(Math.sqrt(offset)).toBeLessThan(1.1);
  });
});
