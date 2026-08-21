import { buildMiniJaw } from './mini-dragon-jaw-mesh';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';

describe('mini-dragon jaw', () => {
  it('builds an articulated lower muzzle for learned show cues', () => {
    const jaw = renderMiniPart(buildMiniJaw, 'mini-dragon-jaw')!;

    expect(named(jaw, 'mini-dragon-lower-muzzle').length).toBe(1);
    expect(named(jaw, 'mini-dragon-mouth').length).toBe(1);
    expect(named(jaw, 'mini-dragon-milk-tooth').length).toBe(2);
    expect(named(jaw, 'mini-dragon-mouth-ember').length).toBe(1);
  });
});
