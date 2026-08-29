import * as THREE from 'three';
import {
  applyAssemblyDamageAppearance,
  applyAssemblyHitFlash,
  applyAssemblySelectionFocus,
  applyAssemblyTeamTint,
  applyAssemblyTraitFocus,
  prepareAssemblyAppearance,
} from './assembly-appearance';

function preparedMesh(): { root: THREE.Group; material: THREE.MeshStandardMaterial } {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x336699,
    emissive: 0x112233,
    emissiveIntensity: 0.2,
    opacity: 0.8,
    transparent: true,
  });
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  prepareAssemblyAppearance(root);
  return { root, material };
}

describe('assembly appearance', () => {
  it('captures the authored material once and restores it after damage clears', () => {
    const { root, material } = preparedMesh();

    material.color.setHex(0xffffff);
    prepareAssemblyAppearance(root);
    applyAssemblyDamageAppearance(root, null);

    expect(material.color.getHex()).toBe(0x336699);
    expect(material.opacity).toBeCloseTo(0.8);
    expect(material.transparent).toBe(true);
  });

  it('renders heavy damage as scorch and destroyed parts as faded wreckage', () => {
    const { root, material } = preparedMesh();

    applyAssemblyDamageAppearance(root, { healthRatio: 0, destroyed: false });
    expect(material.color.getHex()).toBe(0x7f1d1d);
    expect(material.emissive.getHex()).toBe(0xc2410c);
    expect(material.emissiveIntensity).toBeCloseTo(0.55);

    applyAssemblyDamageAppearance(root, { healthRatio: 0, destroyed: true });
    expect(material.color.getHex()).toBe(0x1f2937);
    expect(material.opacity).toBeCloseTo(0.38);
    expect(material.transparent).toBe(true);
  });

  it('restores the team tint after a hit flash', () => {
    const { root, material } = preparedMesh();

    applyAssemblyTeamTint(root, 0x2468ac, 0.3);
    applyAssemblyHitFlash(root, true);
    expect(material.emissive.getHex()).toBe(0xff6a3d);
    expect(material.emissiveIntensity).toBeCloseTo(0.85);

    applyAssemblyHitFlash(root, false);
    expect(material.emissive.getHex()).toBe(0x2468ac);
    expect(material.emissiveIntensity).toBeCloseTo(0.3);
  });

  it('mutes unfocused traits and restores their authored material', () => {
    const { root, material } = preparedMesh();

    applyAssemblyTraitFocus(root, false);
    expect(material.color.getHex()).not.toBe(0x336699);
    expect(material.opacity).toBeCloseTo(0.44);
    expect(material.transparent).toBe(true);

    applyAssemblyTraitFocus(root, null);
    expect(material.color.getHex()).toBe(0x336699);
    expect(material.opacity).toBeCloseTo(0.8);
    expect(material.transparent).toBe(true);
  });

  it('fades preserved keratin when Designer selects a different anatomy layer', () => {
    const { root, material } = preparedMesh();
    material.userData['preserveAppearance'] = true;

    applyAssemblySelectionFocus(root, false);
    expect(material.opacity).toBeCloseTo(0.8 * 0.38);

    applyAssemblySelectionFocus(root, null);
    expect(material.color.getHex()).toBe(0x336699);
  });
});
