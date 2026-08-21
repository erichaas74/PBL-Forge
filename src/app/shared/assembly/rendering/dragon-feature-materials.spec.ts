import {
  eyeHighlightMaterial,
  eyeMaterial,
  glowMaterial,
  pupilMaterial,
} from './dragon-feature-materials';

describe('dragon feature materials', () => {
  it('protects luminous details from team and damage recoloring', () => {
    for (const material of [
      eyeMaterial(),
      pupilMaterial(),
      eyeHighlightMaterial(),
      glowMaterial(),
    ]) {
      expect(material.userData['preserveAppearance']).toBe(true);
    }
  });
});
