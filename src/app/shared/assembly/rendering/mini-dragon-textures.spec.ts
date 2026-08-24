import {
  disposeMiniDragonTextures,
  isSharedMiniDragonTexture,
  miniDragonCoatTextures,
  miniDragonFeatherTextures,
  miniDragonKeratinTextures,
  miniDragonMembraneTextures,
} from './mini-dragon-textures';

describe('mini dragon texture cache', () => {
  afterEach(() => disposeMiniDragonTextures());

  it('owns separate cached maps for every biological surface family', () => {
    const coat = miniDragonCoatTextures();
    const keratin = miniDragonKeratinTextures();
    const membrane = miniDragonMembraneTextures();
    const feather = miniDragonFeatherTextures();

    expect(miniDragonCoatTextures()).toBe(coat);
    expect(coat.map?.name).toBe('mini-dragon-coat-albedo');
    expect(keratin.map?.name).toBe('mini-dragon-keratin-albedo');
    expect(membrane.normalMap?.name).toBe('mini-dragon-membrane-normal');
    expect(feather.alphaMap?.name).toBe('mini-dragon-feather-alpha');
    expect(isSharedMiniDragonTexture(coat.map)).toBe(true);
    expect(isSharedMiniDragonTexture(keratin.map)).toBe(true);
    expect(isSharedMiniDragonTexture(membrane.map)).toBe(true);
    expect(isSharedMiniDragonTexture(feather.map)).toBe(true);
  });

  it('seeds unique pixels while keeping each part variant cached', () => {
    const body = miniDragonCoatTextures('mini-body');
    const head = miniDragonCoatTextures('mini-head');
    const leftHorn = miniDragonKeratinTextures('mini-horn-left');
    const rightHorn = miniDragonKeratinTextures('mini-horn-right');
    const leftWing = miniDragonMembraneTextures('mini-wing-left');
    const rightWing = miniDragonMembraneTextures('mini-wing-right');
    const bodyFeathers = miniDragonFeatherTextures('mini-body-feathers');
    const wingFeathers = miniDragonFeatherTextures('mini-wing-feathers');

    expect(miniDragonCoatTextures('mini-body')).toBe(body);
    for (const [first, second] of [
      [body.map, head.map],
      [leftHorn.map, rightHorn.map],
      [leftWing.map, rightWing.map],
      [bodyFeathers.map, wingFeathers.map],
    ] as const) {
      expect(first?.name).not.toBe(second?.name);
      expect(textureBytes(first)).not.toEqual(textureBytes(second));
    }
  });

  it('makes sleek and bumpy coats genuinely different surface families', () => {
    const sleek = miniDragonCoatTextures('sleek-mini-body');
    const bumpy = miniDragonCoatTextures('bumpy-mini-body');

    expect(sleek.map?.name).toContain('sleek-mini-body');
    expect(bumpy.map?.name).toContain('bumpy-mini-body');
    expect(textureBytes(sleek.map)).not.toEqual(textureBytes(bumpy.map));
    expect(textureBytes(sleek.normalMap)).not.toEqual(textureBytes(bumpy.normalMap));
    expect(textureBytes(sleek.roughnessMap)).not.toEqual(textureBytes(bumpy.roughnessMap));
  });
});

function textureBytes(texture: { image: unknown } | null): number[] {
  const data = (texture?.image as { data?: Uint8Array } | undefined)?.data;
  return Array.from(data?.slice(0, 256) ?? []);
}
