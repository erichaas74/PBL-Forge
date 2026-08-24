import * as THREE from 'three';
import { meshCount, named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';
import { buildMiniTailPlume } from './mini-dragon-tail-mesh';

describe('mini dragon tail mesh', () => {
  it('grows a fuller rounded pom when its profile requests one', () => {
    const shallow = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 2, miniPlumeFan: 0 },
    )!;
    const full = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 2, miniPlumeFan: 1 },
    )!;

    const spread = (object: THREE.Object3D): number => {
      const box = new THREE.Box3().setFromObject(object);
      return box.max.x - box.min.x;
    };
    expect(spread(full)).toBeGreaterThan(spread(shallow));
    expect(named(full, 'mini-dragon-pom-core').length).toBe(1);
    expect(named(full, 'mini-dragon-pom-bubble').length).toBe(6);
  });

  it('builds four unmistakably different inherited tail tips', () => {
    const star = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 0 },
    )!;
    const fork = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 1 },
    )!;
    const pom = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 2 },
    )!;
    const splitStreamer = renderMiniPart(
      buildMiniTailPlume,
      'mini-dragon-tail-plume',
      {},
      { miniTailStyle: 3 },
    )!;

    expect(named(star, 'mini-dragon-star-club').length).toBe(1);
    expect(named(star, 'mini-dragon-star-lobe').length).toBe(5);
    expect(named(fork, 'mini-dragon-tail-fork').length).toBe(2);
    expect(named(splitStreamer, 'mini-dragon-split-tail-streamer').length).toBe(1);
    expect(named(pom, 'mini-dragon-star-club').length).toBe(0);
    expect(meshCount(pom)).toBeGreaterThan(5);
  });
});
