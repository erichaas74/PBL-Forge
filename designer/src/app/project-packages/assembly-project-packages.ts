import {
  AssemblyInspectorControlDefinition,
  AssemblyInspectorSectionDefinition,
  AssemblyPartProfileSchema,
  AssemblyProjectPackageManifest,
  validateAssemblyProjectPackage,
} from '@pbl/assembly/domain/assembly-part-schema';
import {
  DRAGON_VISUAL_PARAMETER_REGISTRY,
  DragonVisualParameterDefinition,
} from '@pbl/assembly/model-pack/dragon-visual-parameter-registry';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
} from '../assembly-garage/data/assembly-part-definitions';
import { MINI_DRAGON_PART_DEFINITIONS } from '../parts-lab/mini-dragon-part-definitions';

const FORM: AssemblyInspectorSectionDefinition = {
  id: 'form', label: 'Form', description: 'Primary proportions and silhouette.', category: 'Form', structural: true,
};
const SURFACE: AssemblyInspectorSectionDefinition = {
  id: 'surface', label: 'Surface', description: 'Material, colour, texture, and finish.', category: 'Surface',
};
const DETAILS: AssemblyInspectorSectionDefinition = {
  id: 'details', label: 'Details', description: 'Generated secondary forms and repeated features.', category: 'Appendage',
};
const MECHANISM: AssemblyInspectorSectionDefinition = {
  id: 'mechanism', label: 'Mechanism', description: 'Moving joints and functional components.', category: 'Mechanism', structural: true,
};

const numberControl = (
  key: string,
  label: string,
  description: string,
  sectionId: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  options: Partial<AssemblyInspectorControlDefinition> = {},
): AssemblyInspectorControlDefinition => ({
  key, label, description, sectionId, type: 'number', defaultValue,
  binding: 'parameter', min, max, step, ...options,
});

const colorControl = (
  key: string,
  label: string,
  defaultValue: string,
  sectionId = 'surface',
): AssemblyInspectorControlDefinition => ({
  key, label, description: `${label} used by this generated part.`, sectionId,
  type: 'color', defaultValue, binding: 'parameter', surface: true,
});

const booleanControl = (
  key: string,
  label: string,
  description: string,
  defaultValue: boolean,
  sectionId = 'details',
): AssemblyInspectorControlDefinition => ({
  key, label, description, sectionId, type: 'boolean', defaultValue, binding: 'parameter',
});

const selectControl = (
  key: string,
  label: string,
  description: string,
  defaultValue: string,
  values: readonly string[],
  sectionId: string,
): AssemblyInspectorControlDefinition => ({
  key, label, description, sectionId, type: 'select', defaultValue, binding: 'parameter',
  options: values.map(value => ({ value, label: title(value) })),
});

const VEHICLE_PROFILES: readonly AssemblyPartProfileSchema[] = [
  profile('car-chassis', 'vehicle', 'frame', [FORM, DETAILS], [
    numberControl('noseTaper', 'Nose taper', 'Narrows and raises the generated hood.', 'form', 0.18, 0, 0.48, 0.01),
    numberControl('bumperScale', 'Bumper size', 'Scales the front bumper.', 'details', 1, 0, 1.8, 0.02),
    numberControl('panelInset', 'Floor-panel inset', 'Pulls the lower panel in from the chassis sides.', 'details', 0.08, 0, 0.25, 0.01),
  ]),
  profile('car-cabin', 'vehicle', 'bodywork', [FORM, SURFACE], [
    numberControl('roofHeight', 'Roof height', 'Changes cabin height without resizing its socket.', 'form', 1, 0.55, 1.55, 0.02),
    numberControl('windshieldRake', 'Windshield rake', 'Tilts the front glass in degrees.', 'form', 18, 0, 45, 1, { unit: '°', handle: { kind: 'rotate', axis: 'vertical' } }),
    numberControl('glassOpacity', 'Glass opacity', 'Controls how transparent the windows appear.', 'surface', 0.58, 0.15, 1, 0.02, { surface: true }),
  ]),
  profile('car-shock', 'vehicle', 'suspension', [MECHANISM], [
    numberControl('springTurns', 'Spring turns', 'Number of visible suspension coils.', 'mechanism', 7, 2, 14, 1),
    numberControl('springRadius', 'Spring radius', 'Width of the coil around the damper rod.', 'mechanism', 0.9, 0.45, 1.4, 0.02, { handle: { kind: 'scale', axis: 'horizontal' } }),
  ]),
  profile('car-wheel', 'vehicle', 'running-gear', [FORM, DETAILS, SURFACE], [
    numberControl('wheelRadiusScale', 'Wheel radius', 'Scales the tire and rim around the axle.', 'form', 1, 0.45, 2, 0.02, { handle: { kind: 'scale', axis: 'diagonal' } }),
    numberControl('wheelWidthScale', 'Wheel width', 'Changes tire width along the axle.', 'form', 1, 0.35, 2.4, 0.02, { handle: { kind: 'scale', axis: 'horizontal' } }),
    numberControl('rimScale', 'Rim radius', 'Sets rim size as a fraction of tire radius.', 'details', 0.58, 0.25, 0.9, 0.01),
    numberControl('spokeCount', 'Spoke count', 'Number of generated rim spokes.', 'details', 6, 0, 16, 1),
    numberControl('treadDepth', 'Tread depth', 'Raises tread blocks above the tire.', 'details', 0.055, 0, 0.2, 0.005),
    numberControl('treadCount', 'Tread count', 'Number of blocks around the tire.', 'details', 18, 0, 32, 1),
    selectControl('tireType', 'Tire type', 'Switches the generated tread treatment.', 'street', ['street', 'offroad', 'slick'], 'surface'),
    colorControl('rimColor', 'Rim colour', '#cbd5e1'),
  ]),
];

const ROBOT_PROFILES: readonly AssemblyPartProfileSchema[] = [
  profile('robot-torso', 'robot', 'frames', [FORM, DETAILS, SURFACE], [
    numberControl('chestScale', 'Chest width', 'Scales the upper torso shell.', 'form', 1, 0.6, 1.6, 0.02, { handle: { kind: 'scale', axis: 'horizontal' } }),
    numberControl('waistScale', 'Waist width', 'Scales the lower torso support.', 'form', 0.78, 0.4, 1.25, 0.02),
    numberControl('shoulderWidth', 'Shoulder rail', 'Changes spacing between shoulder mounts visually.', 'form', 1, 0.7, 1.6, 0.02),
    booleanControl('coreGlow', 'Core light', 'Shows or hides the emissive chest core.', true),
    colorControl('accentColor', 'Core colour', '#22d3ee'),
  ]),
  profile('robot-head', 'robot', 'sensors', [FORM, DETAILS, SURFACE], [
    numberControl('visorWidth', 'Visor width', 'Scales the front sensor band.', 'form', 0.72, 0.3, 1.1, 0.02),
    numberControl('antennaLength', 'Antenna length', 'Sets the height of the sensor antenna.', 'details', 0.4, 0, 1.4, 0.02, { handle: { kind: 'scale', axis: 'vertical' } }),
    booleanControl('sensorGlow', 'Sensor glow', 'Turns the emissive visor on or off.', true),
    colorControl('accentColor', 'Sensor colour', '#67e8f9'),
  ]),
  profile('robot-limb', 'robot', 'manipulators', [FORM, MECHANISM, DETAILS, SURFACE], [
    numberControl('armLengthScale', 'Arm length', 'Scales both generated arm segments.', 'form', 1, 0.5, 1.8, 0.02, { handle: { kind: 'scale', axis: 'vertical' } }),
    numberControl('armThickness', 'Arm thickness', 'Scales the arm cross-section.', 'form', 1, 0.5, 1.8, 0.02, { handle: { kind: 'scale', axis: 'horizontal' } }),
    numberControl('jointScale', 'Joint size', 'Scales shoulder, elbow, and wrist covers.', 'mechanism', 1, 0.5, 1.6, 0.02),
    numberControl('armorScale', 'Armor plate', 'Controls the outer upper-arm plate.', 'details', 1, 0, 1.6, 0.02),
    numberControl('gripperSize', 'Tool size', 'Scales the selected end tool.', 'details', 0.7, 0, 1.4, 0.02),
    selectControl('toolMode', 'End tool', 'Chooses a gripper, claw, or welding tip.', 'gripper', ['gripper', 'claw', 'welder'], 'mechanism'),
    colorControl('accentColor', 'Armor colour', '#2dd4bf'),
  ]),
  profile('robot-leg', 'robot', 'locomotion', [FORM, MECHANISM], [
    numberControl('legThickness', 'Leg thickness', 'Scales the load-bearing leg column.', 'form', 1, 0.55, 1.7, 0.02),
    numberControl('footScale', 'Foot size', 'Scales the stabilizing foot.', 'form', 1, 0.5, 1.8, 0.02),
    numberControl('jointScale', 'Knee size', 'Scales the knee cover.', 'mechanism', 1, 0.5, 1.6, 0.02),
  ]),
];

const DRAGON_PROFILE_IDS = [...new Set([
  ...ASSEMBLY_PART_DEFINITIONS.filter(definition => definition.family === 'dragon')
    .map(definition => definition.visualProfile?.profileId ?? ''),
  ...MINI_DRAGON_PART_DEFINITIONS.map(definition => definition.visualProfile?.profileId ?? ''),
].filter(Boolean))];

const DRAGON_PROFILES = DRAGON_PROFILE_IDS.map(profileId => dragonProfile(profileId));
const PRIMITIVE_PROFILES = ['primitive-box', 'primitive-sphere', 'primitive-cylinder']
  .map(profileId => profile(profileId, null, 'shapes', [FORM, SURFACE], []));

export const ASSEMBLY_PROJECT_PACKAGES: readonly AssemblyProjectPackageManifest[] = [
  validateAssemblyProjectPackage({
    schemaVersion: 1,
    id: 'dragon',
    label: 'Dragons',
    description: 'Arena and Mini Dragon anatomy, genetics-aware surfaces, and articulated appendages.',
    familyId: 'dragon',
    categories: [
      { id: 'body', label: 'Body', description: 'Core silhouette and support anatomy.' },
      { id: 'head', label: 'Head', description: 'Heads, jaws, teeth, horns, and sensory anatomy.' },
      { id: 'limbs', label: 'Limbs', description: 'Legs, feet, grasping limbs, and claws.' },
      { id: 'wings', label: 'Wings', description: 'Primary and secondary flight surfaces.' },
      { id: 'tail', label: 'Tail', description: 'Tail chains and terminal tools.' },
      { id: 'display', label: 'Display', description: 'Mini Dragon coats, fins, crests, and ornaments.' },
    ],
    materials: [
      { id: 'scales', label: 'Scales', description: 'Procedural biological scales.' },
      { id: 'keratin', label: 'Keratin', description: 'Horns, teeth, claws, and hard plates.' },
      { id: 'membrane', label: 'Membrane', description: 'Translucent wing and display tissue.' },
      { id: 'feathers', label: 'Feathers', description: 'Mini Dragon plumage cards.' },
    ],
    supportedJointTypes: ['fixed', 'hinge', 'spring', 'slider'],
    supportedConstraintTypes: ['socket', 'hinge-limit', 'surface', 'mirror', 'spacing', 'collision-clearance', 'follow-parent'],
    profiles: DRAGON_PROFILES,
  }),
  validateAssemblyProjectPackage({
    schemaVersion: 1,
    id: 'vehicle',
    label: 'Vehicles',
    description: 'Chassis, bodywork, suspension, and tunable running gear.',
    familyId: 'car',
    categories: [
      { id: 'frame', label: 'Frames', description: 'Load-bearing chassis parts.' },
      { id: 'bodywork', label: 'Bodywork', description: 'Cabins, shells, and glass.' },
      { id: 'suspension', label: 'Suspension', description: 'Springs and dampers.' },
      { id: 'running-gear', label: 'Running gear', description: 'Wheels, tires, hubs, and rims.' },
    ],
    materials: [
      { id: 'paint', label: 'Painted metal', description: 'Glossy vehicle bodywork.' },
      { id: 'glass', label: 'Glass', description: 'Transparent windows.' },
      { id: 'rubber', label: 'Rubber', description: 'Tires and vibration isolators.' },
      { id: 'metal', label: 'Bare metal', description: 'Rims and suspension hardware.' },
    ],
    supportedJointTypes: ['fixed', 'hinge', 'spring', 'slider'],
    supportedConstraintTypes: ['socket', 'hinge-limit', 'slider-limit', 'mirror', 'spacing', 'collision-clearance', 'follow-parent'],
    profiles: VEHICLE_PROFILES,
  }),
  validateAssemblyProjectPackage({
    schemaVersion: 1,
    id: 'robot',
    label: 'Robots',
    description: 'Frames, sensors, articulated manipulators, locomotion, and end tools.',
    familyId: 'robot',
    categories: [
      { id: 'frames', label: 'Frames', description: 'Torso and structural frames.' },
      { id: 'sensors', label: 'Sensors', description: 'Heads, visors, and antennae.' },
      { id: 'manipulators', label: 'Manipulators', description: 'Arms, grippers, and tools.' },
      { id: 'locomotion', label: 'Locomotion', description: 'Legs, feet, wheels, and tracks.' },
    ],
    materials: [
      { id: 'metal', label: 'Metal', description: 'Structural metallic surfaces.' },
      { id: 'armor', label: 'Armor', description: 'Painted protective shells.' },
      { id: 'sensor', label: 'Sensor glass', description: 'Emissive sensor surfaces.' },
      { id: 'rubber', label: 'Grip rubber', description: 'Feet and tool pads.' },
    ],
    supportedJointTypes: ['fixed', 'hinge', 'spring', 'slider'],
    supportedConstraintTypes: ['socket', 'hinge-limit', 'slider-limit', 'mirror', 'spacing', 'collision-clearance', 'follow-parent'],
    profiles: ROBOT_PROFILES,
  }),
  validateAssemblyProjectPackage({
    schemaVersion: 1,
    id: 'primitive',
    label: 'Primitives',
    description: 'Project-neutral starting shapes for custom assemblies.',
    familyId: 'primitive',
    categories: [{ id: 'shapes', label: 'Shapes', description: 'Basic editable solids.' }],
    materials: [{ id: 'default', label: 'Standard', description: 'Neutral physical material.' }],
    supportedJointTypes: ['fixed', 'hinge', 'spring', 'slider'],
    supportedConstraintTypes: ['socket', 'surface', 'mirror', 'spacing', 'collision-clearance', 'follow-parent'],
    profiles: PRIMITIVE_PROFILES,
  }),
];

export function projectPackageForFamily(family: AssemblyPartFamily): AssemblyProjectPackageManifest {
  return ASSEMBLY_PROJECT_PACKAGES.find(project => project.familyId === family)
    ?? ASSEMBLY_PROJECT_PACKAGES[ASSEMBLY_PROJECT_PACKAGES.length - 1];
}

export function projectPackageForId(id: string): AssemblyProjectPackageManifest | null {
  return ASSEMBLY_PROJECT_PACKAGES.find(project => project.id === id) ?? null;
}

export function partProfileSchema(
  definition: AssemblyPartDefinition,
): AssemblyPartProfileSchema {
  const project = projectPackageForFamily(definition.family);
  const profileId = definition.visualProfile?.profileId ?? `primitive-${definition.shape}`;
  return project.profiles.find(profileSchema => profileSchema.profileId === profileId)
    ?? profile(profileId, null, project.categories[0].id, [FORM, SURFACE], []);
}

export function projectTypeIdForDefinition(definition: AssemblyPartDefinition): string {
  return projectPackageForFamily(definition.family).id;
}

function profile(
  profileId: string,
  generatorId: string | null,
  categoryId: string,
  sections: readonly AssemblyInspectorSectionDefinition[],
  controls: readonly AssemblyInspectorControlDefinition[],
): AssemblyPartProfileSchema {
  return {
    schemaVersion: 1,
    profileId,
    generatorId,
    categoryId,
    capabilities: [
      'dimensions', 'materials', 'parameters', 'custom-pieces', 'imported-meshes',
      'sockets', 'constraints', 'symmetry', ...(controls.some(control => control.surface) ? ['surface'] : []),
    ],
    sections,
    controls,
  };
}

function dragonProfile(profileId: string): AssemblyPartProfileSchema {
  const parameters = DRAGON_VISUAL_PARAMETER_REGISTRY.filter(definition =>
    definition.profiles.includes(profileId) && !definition.geneticsOwned);
  const controls = parameters.flatMap(dragonControl);
  const mini = profileId.startsWith('mini-');
  return profile(
    profileId,
    mini ? 'mini-dragon' : 'dragon',
    dragonCategory(profileId),
    [FORM, SURFACE, DETAILS, MECHANISM],
    controls,
  );
}

function dragonControl(definition: DragonVisualParameterDefinition): AssemblyInspectorControlDefinition[] {
  if (definition.key === 'customPartRecipe') return [];
  const sectionId = dragonSection(definition.key);
  const base = {
    key: definition.key,
    label: definition.label,
    description: `${definition.label} for this procedural profile.`,
    sectionId,
    defaultValue: definition.defaultValue,
    binding: definition.styleSection ? 'style' as const : 'parameter' as const,
    styleSection: definition.styleSection,
    surface: sectionId === 'surface',
  };
  if (definition.type === 'number' && definition.min !== undefined && definition.max !== undefined) {
    return [{
      ...base,
      type: 'number',
      min: definition.min,
      max: definition.max,
      step: definition.step ?? 0.01,
      handle: inferredHandle(definition.key),
    }];
  }
  if (definition.type === 'boolean') return [{ ...base, type: 'boolean' }];
  if (definition.type === 'string' && typeof definition.defaultValue === 'string'
    && /^#[0-9a-f]{6}$/i.test(definition.defaultValue)) return [{ ...base, type: 'color' }];
  if (definition.key === 'miniPatternStyle') {
    return [{ ...base, type: 'select', options: ['saddle', 'mask', 'points'].map(value => ({ value, label: title(value) })) }];
  }
  if (definition.key === 'miniSurfaceStyle') {
    return [{ ...base, type: 'select', options: ['sleek', 'baby-bumpy', 'plumed'].map(value => ({ value, label: title(value) })) }];
  }
  return [];
}

function dragonCategory(profileId: string): string {
  if (/head|jaw|horn|ear|brow|whisker|chin|face|nose/.test(profileId)) return 'head';
  if (/wing/.test(profileId)) return 'wings';
  if (/tail/.test(profileId)) return 'tail';
  if (/leg|foot|claw|grasp|thigh/.test(profileId)) return 'limbs';
  if (/ruff|scute|fin|scale|dewlap|plate/.test(profileId)) return 'display';
  return 'body';
}

function dragonSection(key: string): string {
  if (/surface|pattern|color|coat/i.test(key)) return 'surface';
  if (/joint/i.test(key)) return 'mechanism';
  if (/count|spike|horn|crest|fang|tooth|eye|nostril|feather|claw|talon|finger|tuft|fin|ruff|plume/i.test(key)) return 'details';
  return 'form';
}

function inferredHandle(key: string): AssemblyInspectorControlDefinition['handle'] {
  const move = /(Offset[XYZ]|Axial|Start)$/i.test(key);
  const rotate = /(Splay|Rake|Sway|Tilt|Lean)$/i.test(key);
  const scale = /(Scale|Length|Radius|Width|Depth|Height|Span|Size)$/i.test(key);
  if (!move && !rotate && !scale) return undefined;
  const axis = /OffsetY|Height|Depth|Rake|Tilt/i.test(key)
    ? 'vertical' as const
    : scale && !/Width|Span/i.test(key) ? 'diagonal' as const : 'horizontal' as const;
  return { kind: move ? 'move' : rotate ? 'rotate' : 'scale', axis };
}

function title(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
