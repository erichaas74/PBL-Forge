import { buildMiniEarPart, buildMiniHornPart } from './mini-dragon-head-appendages';
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

  it('renders a horn as an independent segmented part rooted at a joint ball', () => {
    const horn = renderMiniPart(
      buildMiniHornPart,
      'mini-dragon-horn',
      { dimensions: { x: 0.35, y: 0.065, z: 0.06 } },
      { miniHornCurl: 1, miniHornLength: 1, miniHornSide: -1 },
    )!;

    expect(named(horn, 'mini-dragon-horn-segment').length).toBe(12);
    expect(named(horn, 'mini-dragon-horn-tip').length).toBe(1);
    expect(named(horn, 'mini-dragon-joint-ball').length).toBe(1);
  });

  it('renders each movable ear as its own petal, inner surface, and tuft', () => {
    const ear = renderMiniPart(
      buildMiniEarPart,
      'mini-dragon-ear',
      { dimensions: { x: 0.12, y: 0.2, z: 0.035 } },
      { miniEarScale: 1, miniEarFold: 0.35, miniEarTuft: 0.8, miniEarSide: 1 },
    )!;

    expect(named(ear, 'mini-dragon-ear-petal').length).toBe(1);
    expect(named(ear, 'mini-dragon-inner-ear').length).toBe(1);
    expect(named(ear, 'mini-dragon-ear-tuft').length).toBe(1);
    expect(named(ear, 'mini-dragon-joint-ball').length).toBe(1);
  });
});
