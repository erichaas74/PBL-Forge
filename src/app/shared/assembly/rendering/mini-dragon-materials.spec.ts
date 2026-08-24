import { part } from './mini-dragon-mesh.spec-helpers';
import {
  miniCoatMaterial,
  miniIrisMaterial,
  miniToothMaterial,
  miniWingMembraneMaterial,
} from './mini-dragon-materials';
import { createMiniDragonPalette } from './mini-dragon-palette';
import { disposeMiniDragonTextures } from './mini-dragon-textures';

describe('mini dragon materials', () => {
  afterEach(() => disposeMiniDragonTextures());

  it('routes coat, keratin, membrane, and eye surfaces independently', () => {
    const palette = createMiniDragonPalette(
      part('mini-dragon-body', {}, { miniEmberColor: '#ff6538' }),
    );
    const coat = miniCoatMaterial(palette.coat);
    const tooth = miniToothMaterial(palette);
    const membrane = miniWingMembraneMaterial(palette);
    const iris = miniIrisMaterial(palette);

    expect(coat.map?.name).toBe('mini-dragon-coat-albedo');
    expect(coat.normalMap?.name).toBe('mini-dragon-coat-normal');
    expect(tooth.map?.name).toBe('mini-dragon-keratin-albedo');
    expect(membrane.map?.name).toBe('mini-dragon-membrane-albedo');
    expect(membrane.alphaMap?.name).toBe('mini-dragon-membrane-alpha');
    expect(iris.color.equals(palette.eye)).toBe(true);
    expect(iris.emissive.equals(palette.ember)).toBe(true);

    for (const material of [coat, tooth, membrane, iris]) material.dispose();
  });

  it('assigns different texture maps to different anatomy parts', () => {
    const palette = createMiniDragonPalette(part('mini-dragon-body'));
    const body = miniCoatMaterial(palette.coat, 'mini-body');
    const head = miniCoatMaterial(palette.coat, 'mini-head');
    const leftWing = miniWingMembraneMaterial(palette, 'mini-wing-left');
    const rightWing = miniWingMembraneMaterial(palette, 'mini-wing-right');

    expect(body.map).not.toBe(head.map);
    expect(body.map?.name).not.toBe(head.map?.name);
    expect(leftWing.map).not.toBe(rightWing.map);
    expect(leftWing.map?.name).not.toBe(rightWing.map?.name);

    for (const material of [body, head, leftWing, rightWing]) material.dispose();
  });
});
