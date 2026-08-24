import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import {
  addMiniJointBall,
  createMiniLoftGeometry,
  createMiniPetalGeometry,
  miniDetail,
  miniMesh,
} from './mini-dragon-geometry';
import { miniCoatMaterial, miniHornMaterial } from './mini-dragon-materials';
import { MiniDragonPalette } from './mini-dragon-palette';
import { miniTailMorphology } from './mini-dragon-morphology';
import { miniVisualNumber } from './mini-dragon-visual-parameter-readers';

// ---------------------------------------------------------------------------
// Tail and plume.
// ---------------------------------------------------------------------------

export function buildMiniTail(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);
  const morphology = miniTailMorphology(part);

  const profile = [
    [-0.5, 0.4 / morphology.taper],
    [-0.26, 0.5 / Math.sqrt(morphology.taper)],
    [0.04, 0.65],
    [0.3, 0.82],
    [0.5, 0.96],
  ] as const;
  const segment = miniMesh(createMiniLoftGeometry(profile.map(([t, radius]) => ({
    x: t * dims.x,
    yRadius: radius * dims.y * 0.5,
    zRadius: radius * dims.z * 0.5,
    yOffset: Math.sin((t + 0.5) * Math.PI) * dims.y * morphology.curve * 0.42,
  })), 18), coat);
  segment.name = 'mini-dragon-tail-segment';
  group.add(segment);
  const jointBallScale = miniVisualNumber(part, 'miniJointBall', 1);
  // +X is the body-facing, broad end; -X is the narrow distal end. Match each
  // socket cover to the surface beneath it so neither a gap nor a bead appears.
  addMiniJointBall(group, dims.y * 0.48 * jointBallScale, coat, {
    x: dims.x * 0.47,
    y: 0,
    z: 0,
  });
  addMiniJointBall(group, dims.y * 0.24 * jointBallScale, coat, {
    x: -dims.x * 0.47,
    y: 0,
    z: 0,
  });

  return group;
}

export function buildMiniTailPlume(part: AssemblyPart, palette: MiniDragonPalette): THREE.Group {
  const group = new THREE.Group();
  const dims = part.dimensions;
  const fan = miniVisualNumber(part, 'miniPlumeFan', 0.8);
  const tailStyle = Math.round(miniVisualNumber(part, 'miniTailStyle', 2));
  const morphology = miniTailMorphology(part);
  const tipScale = morphology.tipScale;
  const coat = miniCoatMaterial(palette.coat, part.id, palette.surfaceStyle);

  const core = miniMesh(
    new THREE.SphereGeometry(dims.y * 0.3 * tipScale, miniDetail(12), miniDetail(9)),
    coat,
  );
  core.name = 'mini-dragon-plume-core';
  group.add(core);
  addMiniJointBall(group, dims.y * 0.28 * miniVisualNumber(part, 'miniJointBall', 1), coat, {
    x: dims.x * 0.12,
    y: 0,
    z: 0,
  });

  if (tailStyle === 0) {
    core.scale.setScalar(0.52);
    const lobeMaterial = miniHornMaterial(palette, palette.dorsal, `${part.id}-star`);
    const club = miniMesh(
      new THREE.SphereGeometry(
        dims.y * 0.38 * tipScale,
        miniDetail(16),
        miniDetail(11),
      ),
      coat,
    );
    club.name = 'mini-dragon-star-club';
    club.scale.set(1.28, 0.82, 0.82);
    club.position.x = -dims.x * 0.26;
    group.add(club);
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      const lobeLength = dims.y * 0.5 * tipScale;
      const lobe = miniMesh(
        createMiniPetalGeometry(
          dims.y * 0.28 * tipScale,
          lobeLength,
          dims.z * 0.07,
          0.9,
        ),
        lobeMaterial,
      );
      lobe.name = 'mini-dragon-star-lobe';
      lobe.position.set(
        -dims.x * 0.29,
        Math.cos(angle) * dims.y * 0.38 * tipScale,
        Math.sin(angle) * dims.z * 0.38 * tipScale,
      );
      lobe.rotation.x = angle + Math.PI / 2;
      lobe.rotation.z = Math.PI / 2;
      group.add(lobe);
    }
    return group;
  }

  if (tailStyle === 1) {
    for (const side of [-1, 1] as const) {
      const fork = miniMesh(
        createMiniPetalGeometry(
          dims.y * 0.42 * tipScale,
          dims.x * 0.72 * tipScale,
          dims.z * 0.055,
          0.82,
        ),
        coat,
      );
      fork.name = 'mini-dragon-tail-fork';
      fork.rotation.z = Math.PI / 2 + side * 0.34;
      fork.rotation.x = side * 0.16;
      fork.position.set(-dims.x * 0.18, side * dims.y * 0.1, 0);
      group.add(fork);
    }
    return group;
  }

  if (tailStyle === 3) {
    // A split-tail dragon grows one complete tapered streamer on each branch;
    // this narrow terminal leaf keeps both long tails readable without turning
    // them back into a single forked paddle at the end.
    const streamer = miniMesh(
      createMiniPetalGeometry(
        dims.y * 0.38 * tipScale,
        dims.x * 0.88 * tipScale,
        dims.z * 0.045,
        0.9,
      ),
      coat,
    );
    streamer.name = 'mini-dragon-split-tail-streamer';
    streamer.rotation.z = Math.PI / 2;
    streamer.position.x = -dims.x * 0.16;
    group.add(streamer);
    return group;
  }

  // One soft pom with a solid heart and six overlapping dimples. The previous
  // ring duplicated its first bubble and read as loose grapes with holes.
  const pomCore = miniMesh(
    new THREE.SphereGeometry(
      dims.y * (0.34 + fan * 0.04) * tipScale,
      miniDetail(16),
      miniDetail(12),
    ),
    coat,
  );
  pomCore.name = 'mini-dragon-pom-core';
  pomCore.position.x = -dims.x * 0.2;
  pomCore.scale.set(1.18, 1, 1);
  group.add(pomCore);

  const pomRadius = dims.y * (0.19 + fan * 0.035) * tipScale;
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bubble = miniMesh(
      new THREE.SphereGeometry(pomRadius, miniDetail(12), miniDetail(9)),
      coat,
    );
    bubble.name = 'mini-dragon-pom-bubble';
    bubble.position.set(
      -dims.x * (0.2 + (index % 2) * 0.035),
      Math.cos(angle) * dims.y * 0.24,
      Math.sin(angle) * dims.z * 0.24,
    );
    group.add(bubble);
  }

  return group;
}
