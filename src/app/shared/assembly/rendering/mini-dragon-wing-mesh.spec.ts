import * as THREE from 'three';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';
import { buildMiniWing } from './mini-dragon-wing-mesh';

describe('wing', () => {
  it('builds a membrane and struts at full spread', () => {
    const wing = renderMiniPart(
      buildMiniWing,
      'mini-dragon-wing',
      {},
      { miniWingSpread: 1, miniWingSide: 1 },
    )!;

    expect(named(wing, 'mini-dragon-wing-membrane').length).toBe(1);
    expect(named(wing, 'mini-dragon-wing-bone').length).toBe(1);
    expect(named(wing, 'mini-dragon-wing-strut').length).toBe(2);
    expect(named(wing, 'mini-dragon-wing-nub').length).toBe(0);
  });

  it('collapses to a furred nub for the vestigial genotype', () => {
    const wing = renderMiniPart(
      buildMiniWing,
      'mini-dragon-wing',
      {},
      { miniWingSpread: 0.12, miniWingSide: -1 },
    )!;

    expect(named(wing, 'mini-dragon-wing-nub').length).toBe(1);
    expect(named(wing, 'mini-dragon-wing-membrane').length).toBe(0);
  });

  it('mirrors on the side the part declares, not on its name', () => {
    const left = renderMiniPart(
      buildMiniWing,
      'mini-dragon-wing',
      { id: 'anything' },
      { miniWingSpread: 1, miniWingSide: -1 },
    )!;
    const right = renderMiniPart(
      buildMiniWing,
      'mini-dragon-wing',
      { id: 'anything' },
      { miniWingSpread: 1, miniWingSide: 1 },
    )!;

    expect(named(left, 'mini-dragon-wing-membrane')[0].scale.z).toBe(-1);
    expect(named(right, 'mini-dragon-wing-membrane')[0].scale.z).toBe(1);
  });

  it('adds one instanced feather layer to a feathered functional wing', () => {
    const wing = renderMiniPart(
      buildMiniWing,
      'mini-dragon-wing',
      {},
      { miniWingSpread: 1, miniWingSide: 1, miniFeatherCoverage: 1 },
    )!;
    const layer = named(wing, 'mini-dragon-wing-feathers')[0] as THREE.InstancedMesh;

    expect(layer).toBeInstanceOf(THREE.InstancedMesh);
    expect(layer.count).toBe(30);
    expect(layer.instanceColor).toBeTruthy();
  });
});
