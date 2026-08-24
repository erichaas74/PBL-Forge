import { buildMiniHead } from './mini-dragon-head-mesh';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';
import {
  applySpecimenFacialExpression,
  collectSpecimenFacialAnimation,
} from './specimen-facial-animation';

describe('mini-dragon head and face', () => {
  it('builds the skull and face without baking movable appendages into it', () => {
    const head = renderMiniPart(buildMiniHead, 'mini-dragon-head')!;

    expect(named(head, 'mini-dragon-cranium').length).toBe(1);
    expect(named(head, 'mini-dragon-snout').length).toBe(1);
    expect(named(head, 'mini-dragon-eye').length).toBe(2);
    expect(named(head, 'mini-dragon-pupil').length).toBe(2);
    expect(named(head, 'mini-dragon-upper-eyelid').length).toBe(2);
    expect(named(head, 'mini-dragon-lower-eyelid').length).toBe(2);
    expect(named(head, 'mini-dragon-ear').length).toBe(0);
    expect(named(head, 'mini-dragon-ear-petal').length).toBe(0);
    expect(named(head, 'mini-dragon-horn-segment').length).toBe(0);
  });

  it('closes both paired eyelids over the eyes', () => {
    const head = renderMiniPart(buildMiniHead, 'mini-dragon-head')!;
    const [upper] = named(head, 'mini-dragon-upper-eyelid');
    const [lower] = named(head, 'mini-dragon-lower-eyelid');
    const openGap = upper.position.y - lower.position.y;

    const animation = collectSpecimenFacialAnimation(head);
    expect(animation.eyelids.length).toBe(4);
    applySpecimenFacialExpression(animation, { blink: 1 });
    expect(upper.position.y - lower.position.y).toBeLessThan(openGap * 0.1);
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
