import { createPartFromDefinition } from '../assembly-garage/data/assembly-part-definitions';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';
import { exactPartPreviewFrame } from './part-preview-frame';

describe('Parts Lab exact mesh framing', () => {
  it('centres an offset whisker-only mesh on its visible bounds', () => {
    const definition = MINI_DRAGON_PART_DEFINITIONS.find(item => item.id === 'mini-lab-whiskers')!;
    const frame = exactPartPreviewFrame(
      createPartFromDefinition(definition, { x: 0, y: 0, z: 0 }, definition.id),
    );

    expect(frame.center.x).toBeGreaterThan(0.35);
    expect(frame.center.x + frame.halfExtents.x).toBeGreaterThan(0.55);
    expect(frame.center.z).toBeCloseTo(0, 5);
  });

  it('fits small inherited plates instead of framing their full parent body', () => {
    const definition = MINI_DRAGON_PART_DEFINITIONS.find(item => item.id === 'mini-lab-shoulder-plates')!;
    const frame = exactPartPreviewFrame(
      createPartFromDefinition(definition, { x: 0, y: 0, z: 0 }, definition.id),
    );

    expect(frame.halfHeight).toBeLessThan(definition.dimensions.y / 3);
    expect(frame.radius).toBeLessThan(Math.hypot(definition.dimensions.x, definition.dimensions.z) / 2);
  });
});
