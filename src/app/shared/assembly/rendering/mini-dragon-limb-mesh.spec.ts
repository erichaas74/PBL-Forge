import * as THREE from 'three';
import { buildMiniLeg, buildMiniThigh } from './mini-dragon-limb-mesh';
import { named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';

describe('mini dragon limb mesh', () => {
  it('puts the hip ball at the top of a separate thigh piece', () => {
    const thigh = renderMiniPart(buildMiniThigh, 'mini-dragon-thigh')!;
    const hip = named(thigh, 'mini-dragon-joint-ball')[0] as THREE.Mesh;
    const radius = (hip.geometry as THREE.SphereGeometry).parameters.radius;

    expect(named(thigh, 'mini-dragon-thigh').length).toBe(1);
    expect(hip.position.y).toBeGreaterThan(0);
    expect(hip.position.y).toBeLessThan(0.6 * 0.45);
    expect(radius).toBeGreaterThan(0.8 * 0.85);
  });

  it('builds a shank, a paw, and soft toes with no talons', () => {
    const leg = renderMiniPart(buildMiniLeg, 'mini-dragon-leg', {}, { miniToeCount: 4 })!;

    expect(named(leg, 'mini-dragon-shank').length).toBe(1);
    expect(named(leg, 'mini-dragon-paw').length).toBe(1);
    expect(named(leg, 'mini-dragon-toe').length).toBe(4);
  });
});
