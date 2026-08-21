import * as THREE from 'three';
import { buildMiniHead } from './mini-dragon-head-mesh';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';

describe('mini-dragon head ornaments', () => {
  it('renders crown bumps and side frills as separate codominant crest geometry', () => {
    const head = renderMiniPart(
      buildMiniHead,
      'mini-dragon-head',
      {},
      { miniCrestCrown: 1, miniCrestFrill: 1 },
    )!;

    expect(named(head, 'mini-dragon-crown-bump').length).toBe(4);
    expect(named(head, 'mini-dragon-side-frill').length).toBe(6);
  });

  it('sweeps a curled horn further than a straight one', () => {
    const straight = renderMiniPart(buildMiniHead, 'mini-dragon-head', {}, { miniHornCurl: 0 })!;
    const curled = renderMiniPart(buildMiniHead, 'mini-dragon-head', {}, { miniHornCurl: 1 })!;

    const tipHeight = (object: THREE.Object3D): number => {
      const box = new THREE.Box3().setFromObject(named(object, 'mini-dragon-horn')[0]);
      return box.max.y - box.min.y;
    };
    // A coil wraps back on itself, so it stands lower than a straight spike of
    // the same arc length. That is the observable difference students see.
    expect(tipHeight(curled)).toBeLessThan(tipHeight(straight));
  });
});
