import * as THREE from 'three';

function appearancePreservingMaterial(
  parameters: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial(parameters);
  material.userData['preserveAppearance'] = true;
  return material;
}

export function eyeMaterial(color = '#ff9f2e'): THREE.MeshStandardMaterial {
  return appearancePreservingMaterial({
    color: '#3a1d05',
    emissive: color,
    emissiveIntensity: 1.15,
    roughness: 0.25,
    metalness: 0,
  });
}

export function pupilMaterial(): THREE.MeshStandardMaterial {
  return appearancePreservingMaterial({ color: '#120802', roughness: 0.18, metalness: 0 });
}

export function eyeHighlightMaterial(): THREE.MeshStandardMaterial {
  return appearancePreservingMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.7,
    roughness: 0.1,
    metalness: 0,
  });
}

export function glowMaterial(): THREE.MeshStandardMaterial {
  return appearancePreservingMaterial({
    color: '#062b26',
    emissive: new THREE.Color('#3bffd0'),
    emissiveIntensity: 1.9,
    roughness: 0.22,
    metalness: 0,
  });
}
