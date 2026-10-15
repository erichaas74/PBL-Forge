import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AssemblyPart } from '../domain/assembly.models';

export function createVehicleProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  switch (part.visualProfile?.profileId) {
    case 'car-wheel': return buildVehicleWheel(part);
    case 'car-chassis': return buildVehicleChassis(part);
    case 'car-cabin': return buildVehicleCabin(part);
    case 'car-shock': return buildVehicleShock(part);
    default: return null;
  }
}

export function createRobotProceduralObject(part: AssemblyPart): THREE.Object3D | null {
  switch (part.visualProfile?.profileId) {
    case 'robot-torso': return buildRobotTorso(part);
    case 'robot-head': return buildRobotHead(part);
    case 'robot-limb': return buildRobotArm(part);
    case 'robot-leg': return buildRobotLeg(part);
    default: return null;
  }
}

function buildVehicleWheel(part: AssemblyPart): THREE.Group {
  const group = namedGroup('vehicle-wheel');
  const radius = part.dimensions.x * numberParameter(part, 'wheelRadiusScale', 1, 0.45, 2);
  const width = part.dimensions.y * numberParameter(part, 'wheelWidthScale', 1, 0.35, 2.4);
  const rimScale = numberParameter(part, 'rimScale', 0.58, 0.25, 0.9);
  const treadDepth = numberParameter(part, 'treadDepth', 0.055, 0, 0.2);
  const treadCount = Math.round(numberParameter(part, 'treadCount', 18, 0, 32));
  const spokeCount = Math.round(numberParameter(part, 'spokeCount', 6, 0, 16));
  const tireType = stringParameter(part, 'tireType', 'street');
  const rimColor = colorParameter(part, 'rimColor', '#cbd5e1');

  const tire = mesh(
    new THREE.CylinderGeometry(radius, radius, width, 40, 1),
    material('#151922', 0.04, tireType === 'slick' ? 0.66 : 0.94),
    'vehicle-wheel-tire',
  );
  tire.rotation.x = Math.PI / 2;
  group.add(tire);

  const rimRadius = radius * rimScale;
  const rim = mesh(
    new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.04, 32, 1),
    material(rimColor, 0.76, 0.24),
    'vehicle-wheel-rim',
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const hub = mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width * 1.16, 24),
    material('#475569', 0.85, 0.2),
    'vehicle-wheel-hub',
  );
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  for (let index = 0; index < spokeCount; index += 1) {
    const spoke = mesh(
      new THREE.BoxGeometry(rimRadius * 0.72, Math.max(radius * 0.045, 0.008), width * 1.08),
      material(rimColor, 0.78, 0.22),
      `vehicle-wheel-spoke-${index}`,
    );
    spoke.position.x = rimRadius * 0.36;
    spoke.rotation.z = (index / Math.max(spokeCount, 1)) * Math.PI * 2;
    group.add(spoke);
  }

  if (tireType !== 'slick') {
    const blockDepth = treadDepth * radius * (tireType === 'offroad' ? 1.7 : 1);
    for (let index = 0; index < treadCount; index += 1) {
      const angle = (index / Math.max(treadCount, 1)) * Math.PI * 2;
      const tread = mesh(
        new THREE.BoxGeometry(radius * 0.16, Math.max(blockDepth, 0.004), width * 1.06),
        material('#0b0e14', 0.02, 0.98),
        `vehicle-wheel-tread-${index}`,
      );
      tread.position.set(Math.cos(angle) * (radius + blockDepth * 0.48), Math.sin(angle) * (radius + blockDepth * 0.48), 0);
      tread.rotation.z = angle + Math.PI / 2;
      group.add(tread);
    }
  }
  return group;
}

function buildVehicleChassis(part: AssemblyPart): THREE.Group {
  const group = namedGroup('vehicle-chassis');
  const taper = numberParameter(part, 'noseTaper', 0.18, 0, 0.48);
  const bumperScale = numberParameter(part, 'bumperScale', 1, 0, 1.8);
  const panelInset = numberParameter(part, 'panelInset', 0.08, 0, 0.25);
  group.add(mesh(
    rounded(part.dimensions.x, part.dimensions.y, part.dimensions.z, 0.1),
    material(part.color, 0.5, 0.3),
    'vehicle-chassis-shell',
  ));
  const hood = mesh(
    rounded(part.dimensions.x * 0.42, part.dimensions.y * (0.55 + taper), part.dimensions.z * (0.86 - taper * 0.3), 0.08),
    material(part.color, 0.58, 0.25),
    'vehicle-chassis-hood',
  );
  hood.position.x = part.dimensions.x * 0.25;
  hood.position.y = part.dimensions.y * 0.32;
  group.add(hood);
  if (bumperScale > 0.01) {
    const bumper = mesh(
      rounded(part.dimensions.x * 0.06, part.dimensions.y * 0.25, part.dimensions.z * 0.9 * bumperScale, 0.04),
      material('#334155', 0.82, 0.25),
      'vehicle-chassis-bumper',
    );
    bumper.position.x = part.dimensions.x * 0.51;
    bumper.position.y = -part.dimensions.y * 0.18;
    group.add(bumper);
  }
  const panel = mesh(
    new THREE.BoxGeometry(part.dimensions.x * 0.66, Math.max(part.dimensions.y * 0.025, 0.008), part.dimensions.z * (1 - panelInset)),
    material('#0f172a', 0.5, 0.4),
    'vehicle-chassis-floor-panel',
  );
  panel.position.y = -part.dimensions.y * 0.48;
  group.add(panel);
  return group;
}

function buildVehicleCabin(part: AssemblyPart): THREE.Group {
  const group = namedGroup('vehicle-cabin');
  const roofHeight = numberParameter(part, 'roofHeight', 1, 0.55, 1.55);
  const rake = THREE.MathUtils.degToRad(numberParameter(part, 'windshieldRake', 18, 0, 45));
  const glassOpacity = numberParameter(part, 'glassOpacity', 0.58, 0.15, 1);
  const shell = mesh(
    rounded(part.dimensions.x, part.dimensions.y * roofHeight, part.dimensions.z, 0.14),
    material(part.color, 0.35, 0.3),
    'vehicle-cabin-shell',
  );
  group.add(shell);
  const glassMaterial = material('#7dd3fc', 0.08, 0.1, glassOpacity);
  const windshield = mesh(
    new THREE.BoxGeometry(part.dimensions.x * 0.035, part.dimensions.y * roofHeight * 0.58, part.dimensions.z * 0.82),
    glassMaterial,
    'vehicle-cabin-windshield',
  );
  windshield.position.x = part.dimensions.x * 0.48;
  windshield.rotation.z = rake;
  group.add(windshield);
  return group;
}

function buildVehicleShock(part: AssemblyPart): THREE.Group {
  const group = namedGroup('vehicle-shock');
  const turns = Math.round(numberParameter(part, 'springTurns', 7, 2, 14));
  const springRadius = part.dimensions.x * numberParameter(part, 'springRadius', 0.9, 0.45, 1.4);
  const rod = mesh(
    new THREE.CylinderGeometry(part.dimensions.x * 0.34, part.dimensions.x * 0.34, part.dimensions.y, 18),
    material('#dbeafe', 0.84, 0.2),
    'vehicle-shock-rod',
  );
  group.add(rod);
  for (let index = 0; index < turns; index += 1) {
    const coil = mesh(
      new THREE.TorusGeometry(springRadius, Math.max(part.dimensions.x * 0.12, 0.006), 8, 24),
      material(part.color, 0.65, 0.25),
      `vehicle-shock-coil-${index}`,
    );
    coil.rotation.x = Math.PI / 2;
    coil.position.y = -part.dimensions.y * 0.42 + (index / Math.max(1, turns - 1)) * part.dimensions.y * 0.84;
    group.add(coil);
  }
  return group;
}

function buildRobotTorso(part: AssemblyPart): THREE.Group {
  const group = namedGroup('robot-torso');
  const chest = numberParameter(part, 'chestScale', 1, 0.6, 1.6);
  const waist = numberParameter(part, 'waistScale', 0.78, 0.4, 1.25);
  const shoulders = numberParameter(part, 'shoulderWidth', 1, 0.7, 1.6);
  const accent = colorParameter(part, 'accentColor', '#22d3ee');
  const shell = mesh(
    rounded(part.dimensions.x * chest, part.dimensions.y, part.dimensions.z, 0.12),
    material(part.color, 0.72, 0.28),
    'robot-torso-chest',
  );
  group.add(shell);
  const waistMesh = mesh(
    rounded(part.dimensions.x * waist, part.dimensions.y * 0.28, part.dimensions.z * 0.86, 0.08),
    material('#1e293b', 0.82, 0.3),
    'robot-torso-waist',
  );
  waistMesh.position.y = -part.dimensions.y * 0.42;
  group.add(waistMesh);
  const shoulder = mesh(
    rounded(part.dimensions.x * shoulders, part.dimensions.y * 0.16, part.dimensions.z * 1.08, 0.06),
    material(accent, 0.65, 0.25),
    'robot-torso-shoulder-rail',
  );
  shoulder.position.y = part.dimensions.y * 0.42;
  group.add(shoulder);
  if (booleanParameter(part, 'coreGlow', true)) {
    const coreMaterial = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.6, metalness: 0.25, roughness: 0.22 });
    const core = mesh(new THREE.CircleGeometry(Math.min(part.dimensions.x, part.dimensions.y) * 0.16, 24), coreMaterial, 'robot-torso-core');
    core.position.z = part.dimensions.z * 0.51;
    group.add(core);
  }
  return group;
}

function buildRobotHead(part: AssemblyPart): THREE.Group {
  const group = namedGroup('robot-head');
  const visorWidth = numberParameter(part, 'visorWidth', 0.72, 0.3, 1.1);
  const antennaLength = numberParameter(part, 'antennaLength', 0.4, 0, 1.4);
  const accent = colorParameter(part, 'accentColor', '#67e8f9');
  group.add(mesh(
    rounded(part.dimensions.x * 1.7, part.dimensions.y * 1.5, part.dimensions.z * 1.55, 0.18),
    material(part.color, 0.7, 0.25),
    'robot-head-shell',
  ));
  const visorMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: booleanParameter(part, 'sensorGlow', true) ? accent : '#000000',
    emissiveIntensity: 1.4,
    metalness: 0.18,
    roughness: 0.2,
  });
  const visor = mesh(
    rounded(part.dimensions.x * 1.5 * visorWidth, part.dimensions.y * 0.32, part.dimensions.z * 0.08, 0.06),
    visorMaterial,
    'robot-head-visor',
  );
  visor.position.z = part.dimensions.z * 0.82;
  group.add(visor);
  if (antennaLength > 0.01) {
    const antenna = mesh(
      new THREE.CylinderGeometry(part.dimensions.x * 0.05, part.dimensions.x * 0.035, part.dimensions.y * antennaLength, 12),
      material('#cbd5e1', 0.85, 0.2),
      'robot-head-antenna',
    );
    antenna.position.y = part.dimensions.y * (0.75 + antennaLength * 0.5);
    group.add(antenna);
  }
  return group;
}

/** Proof generator: one schema controls length, armor, joints, colour, and end tool. */
function buildRobotArm(part: AssemblyPart): THREE.Group {
  const group = namedGroup('robot-arm');
  const length = part.dimensions.y * numberParameter(part, 'armLengthScale', 1, 0.5, 1.8);
  const thickness = numberParameter(part, 'armThickness', 1, 0.5, 1.8);
  const jointScale = numberParameter(part, 'jointScale', 1, 0.5, 1.6);
  const armorScale = numberParameter(part, 'armorScale', 1, 0, 1.6);
  const gripperSize = numberParameter(part, 'gripperSize', 0.7, 0, 1.4);
  const accent = colorParameter(part, 'accentColor', '#2dd4bf');
  const segmentHeight = length * 0.42;
  const segmentWidth = part.dimensions.x * thickness;
  for (const [index, y] of [-length * 0.24, length * 0.24].entries()) {
    const segment = mesh(
      rounded(segmentWidth, segmentHeight, part.dimensions.z * thickness, 0.11),
      material(index === 0 ? part.color : accent, 0.72, 0.28),
      `robot-arm-segment-${index + 1}`,
    );
    segment.position.y = y;
    group.add(segment);
  }
  for (const [name, y] of [['shoulder', length * 0.5], ['elbow', 0], ['wrist', -length * 0.5]] as const) {
    const joint = mesh(
      new THREE.SphereGeometry(segmentWidth * 0.52 * jointScale, 24, 16),
      material('#334155', 0.86, 0.22),
      `robot-arm-${name}-joint`,
    );
    joint.position.y = y;
    group.add(joint);
  }
  if (armorScale > 0.01) {
    const plate = mesh(
      rounded(segmentWidth * 1.16 * armorScale, segmentHeight * 0.5, part.dimensions.z * 0.16, 0.05),
      material(accent, 0.62, 0.25),
      'robot-arm-armor',
    );
    plate.position.set(0, length * 0.25, part.dimensions.z * thickness * 0.56);
    group.add(plate);
  }
  addRobotTool(group, part, length, segmentWidth, gripperSize, accent);
  return group;
}

function addRobotTool(
  group: THREE.Group,
  part: AssemblyPart,
  length: number,
  width: number,
  size: number,
  accent: string,
): void {
  if (size <= 0.01) return;
  const mode = stringParameter(part, 'toolMode', 'gripper');
  if (mode === 'welder') {
    const tool = mesh(new THREE.ConeGeometry(width * 0.22 * size, width * 0.8 * size, 16), material(accent, 0.8, 0.18), 'robot-arm-tool-welder');
    tool.position.y = -length * 0.67;
    tool.rotation.z = Math.PI;
    group.add(tool);
    return;
  }
  const spread = mode === 'claw' ? 0.56 : 0.38;
  for (const side of [-1, 1]) {
    const finger = mesh(
      rounded(width * 0.2 * size, width * 0.76 * size, width * 0.18 * size, 0.04),
      material(accent, 0.72, 0.22),
      `robot-arm-tool-${mode}-${side < 0 ? 'left' : 'right'}`,
    );
    finger.position.set(side * width * spread * size, -length * 0.67, 0);
    finger.rotation.z = side * 0.28;
    group.add(finger);
  }
}

function buildRobotLeg(part: AssemblyPart): THREE.Group {
  const group = namedGroup('robot-leg');
  const thickness = numberParameter(part, 'legThickness', 1, 0.55, 1.7);
  const footScale = numberParameter(part, 'footScale', 1, 0.5, 1.8);
  const jointScale = numberParameter(part, 'jointScale', 1, 0.5, 1.6);
  const leg = mesh(
    new THREE.CylinderGeometry(part.dimensions.x * thickness, part.dimensions.z * thickness, part.dimensions.y * 0.82, 24),
    material(part.color, 0.78, 0.3),
    'robot-leg-column',
  );
  leg.position.y = part.dimensions.y * 0.08;
  group.add(leg);
  const knee = mesh(
    new THREE.SphereGeometry(part.dimensions.x * 0.72 * jointScale, 20, 14),
    material('#334155', 0.85, 0.22),
    'robot-leg-knee',
  );
  group.add(knee);
  const foot = mesh(
    rounded(part.dimensions.x * 2.1 * footScale, part.dimensions.y * 0.2, part.dimensions.z * 2.8 * footScale, 0.09),
    material('#1e293b', 0.82, 0.28),
    'robot-leg-foot',
  );
  foot.position.set(0, -part.dimensions.y * 0.48, part.dimensions.z * 0.5);
  group.add(foot);
  return group;
}

function namedGroup(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

function rounded(x: number, y: number, z: number, radiusFraction: number): THREE.BufferGeometry {
  const radius = Math.max(0.002, Math.min(x, y, z) * radiusFraction);
  return new RoundedBoxGeometry(Math.max(x, 0.01), Math.max(y, 0.01), Math.max(z, 0.01), 3, radius);
}

function mesh(geometry: THREE.BufferGeometry, meshMaterial: THREE.Material, name: string): THREE.Mesh {
  const result = new THREE.Mesh(geometry, meshMaterial);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function material(color: string, metalness: number, roughness: number, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    transparent: opacity < 1,
    opacity,
  });
}

function numberParameter(part: AssemblyPart, key: string, fallback: number, min: number, max: number): number {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function booleanParameter(part: AssemblyPart, key: string, fallback: boolean): boolean {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function stringParameter(part: AssemblyPart, key: string, fallback: string): string {
  const value = part.visualProfile?.parameters?.[key];
  return typeof value === 'string' && value.length <= 80 ? value : fallback;
}

function colorParameter(part: AssemblyPart, key: string, fallback: string): string {
  const value = stringParameter(part, key, fallback);
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
