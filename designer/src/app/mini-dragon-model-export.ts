import {
  AssemblyBlueprint,
  AssemblyJoint,
  AssemblyPart,
  AssemblyPreset,
  JointType,
  Vector3Data,
} from '@pbl/assembly/domain/assembly.models';
import { quaternionFromEuler, rotateVectorByQuaternion } from '@pbl/assembly/domain/vector-data';
import { DragonModelPackEntryV1, DragonModelPackV1 } from '@pbl/assembly/model-pack/dragon-model-pack.models';
import { parseDragonModelPack } from '@pbl/assembly/model-pack/dragon-model-pack.validation';
import { DesignerDragonDraftStore } from './designer-dragon-draft.store';
import { applyDesignerDraft } from './designer-part-overrides';
import { createPartFromDefinition } from './assembly-garage/data/assembly-part-definitions';
import { MINI_DRAGON_PART_DEFINITIONS } from './parts-lab/mini-dragon-part-definitions';
import {
  MINI_DRAGON_NEUTRAL_FORMS,
  MINI_DRAGON_REFERENCE_FORMS,
  MiniDragonBreedPresetId,
  MiniDragonFormSelection,
  resolveMiniDragonBreedMorphology,
} from '@pbl/assembly/rendering/mini-dragon-breed-morphology';
import {
  miniDragonHexColor,
  resolveMiniDragonCoatPaint,
} from '@pbl/assembly/rendering/mini-dragon-coat';

interface MiniNode {
  id: string;
  definitionId: string;
  parentId?: string;
  position: Vector3Data;
  parameters?: Record<string, string | number | boolean>;
  jointType?: JointType;
  axis?: Vector3Data;
}

const NODES: readonly MiniNode[] = [
  { id: 'mini-body', definitionId: 'mini-lab-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-dorsal-scales', definitionId: 'mini-lab-dorsal-scales', parentId: 'mini-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-neck', definitionId: 'mini-lab-neck', parentId: 'mini-body', position: { x: 0.46, y: 1.02, z: 0 } },
  { id: 'mini-head', definitionId: 'mini-lab-head', parentId: 'mini-neck', position: { x: 0.77, y: 1.13, z: 0 } },
  { id: 'mini-horn-left', definitionId: 'mini-lab-horn', parentId: 'mini-head', position: { x: 0.76, y: 1.3, z: -0.088 }, parameters: { miniHornSide: -1 } },
  { id: 'mini-horn-right', definitionId: 'mini-lab-horn', parentId: 'mini-head', position: { x: 0.76, y: 1.3, z: 0.088 }, parameters: { miniHornSide: 1 } },
  { id: 'mini-ear-left', definitionId: 'mini-lab-ear', parentId: 'mini-head', position: { x: 0.72, y: 1.32, z: -0.11 }, parameters: { miniEarSide: -1 }, jointType: 'hinge', axis: { x: 1, y: 0, z: 0 } },
  { id: 'mini-ear-right', definitionId: 'mini-lab-ear', parentId: 'mini-head', position: { x: 0.72, y: 1.32, z: 0.11 }, parameters: { miniEarSide: 1 }, jointType: 'hinge', axis: { x: 1, y: 0, z: 0 } },
  { id: 'mini-jaw', definitionId: 'mini-lab-jaw', parentId: 'mini-head', position: { x: 0.91, y: 0.96, z: 0 } },
  { id: 'mini-left-thigh', definitionId: 'mini-lab-thigh', parentId: 'mini-body', position: { x: -0.12, y: 0.58, z: -0.25 } },
  { id: 'mini-right-thigh', definitionId: 'mini-lab-thigh', parentId: 'mini-body', position: { x: -0.12, y: 0.58, z: 0.25 } },
  { id: 'mini-left-leg', definitionId: 'mini-lab-lower-leg', parentId: 'mini-left-thigh', position: { x: -0.08, y: 0.35, z: -0.25 } },
  { id: 'mini-right-leg', definitionId: 'mini-lab-lower-leg', parentId: 'mini-right-thigh', position: { x: -0.08, y: 0.35, z: 0.25 } },
  { id: 'mini-left-wing', definitionId: 'mini-lab-wing', parentId: 'mini-body', position: { x: -0.05, y: 1.03, z: -0.34 }, parameters: { miniWingSide: -1 } },
  { id: 'mini-right-wing', definitionId: 'mini-lab-wing', parentId: 'mini-body', position: { x: -0.05, y: 1.03, z: 0.34 }, parameters: { miniWingSide: 1 } },
  { id: 'mini-tail', definitionId: 'mini-lab-tail', parentId: 'mini-body', position: { x: -0.5, y: 0.82, z: 0 } },
  { id: 'mini-tail-left-1', definitionId: 'mini-lab-tail', parentId: 'mini-tail', position: { x: -0.72, y: 0.81, z: -0.055 } },
  { id: 'mini-tail-left-2', definitionId: 'mini-lab-tail', parentId: 'mini-tail-left-1', position: { x: -0.94, y: 0.8, z: -0.11 } },
  { id: 'mini-tail-left-3', definitionId: 'mini-lab-tail', parentId: 'mini-tail-left-2', position: { x: -1.16, y: 0.79, z: -0.155 } },
  { id: 'mini-tail-tip-left', definitionId: 'mini-lab-tail-tip', parentId: 'mini-tail-left-3', position: { x: -1.39, y: 0.78, z: -0.19 }, parameters: { miniTailStyle: 3, miniTailTipScale: 0.72 } },
  { id: 'mini-tail-right-1', definitionId: 'mini-lab-tail', parentId: 'mini-tail', position: { x: -0.72, y: 0.81, z: 0.055 } },
  { id: 'mini-tail-right-2', definitionId: 'mini-lab-tail', parentId: 'mini-tail-right-1', position: { x: -0.94, y: 0.8, z: 0.11 } },
  { id: 'mini-tail-right-3', definitionId: 'mini-lab-tail', parentId: 'mini-tail-right-2', position: { x: -1.16, y: 0.79, z: 0.155 } },
  { id: 'mini-tail-tip-right', definitionId: 'mini-lab-tail-tip', parentId: 'mini-tail-right-3', position: { x: -1.39, y: 0.78, z: 0.19 }, parameters: { miniTailStyle: 3, miniTailTipScale: 0.72 } },
  { id: 'mini-brow-plates', definitionId: 'mini-lab-brow-plates', parentId: 'mini-head', position: { x: 0.77, y: 1.13, z: 0 } },
  { id: 'mini-whiskers', definitionId: 'mini-lab-whiskers', parentId: 'mini-head', position: { x: 0.77, y: 1.13, z: 0 } },
  { id: 'mini-chin-tuft', definitionId: 'mini-lab-chin-tuft', parentId: 'mini-head', position: { x: 0.77, y: 1.13, z: 0 } },
  { id: 'mini-dewlap', definitionId: 'mini-lab-dewlap', parentId: 'mini-neck', position: { x: 0.46, y: 1.02, z: 0 } },
  { id: 'mini-neck-ruff', definitionId: 'mini-lab-neck-ruff', parentId: 'mini-neck', position: { x: 0.46, y: 1.02, z: 0 } },
  { id: 'mini-shoulder-plates', definitionId: 'mini-lab-shoulder-plates', parentId: 'mini-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-belly-scutes', definitionId: 'mini-lab-belly-scutes', parentId: 'mini-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-flank-fins', definitionId: 'mini-lab-flank-fins', parentId: 'mini-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-hip-fins', definitionId: 'mini-lab-hip-fins', parentId: 'mini-body', position: { x: 0, y: 0.85, z: 0 } },
  { id: 'mini-tail-sail', definitionId: 'mini-lab-tail-sail', parentId: 'mini-tail', position: { x: -0.5, y: 0.82, z: 0 } },
];

export function addMiniDragonModel(
  pack: DragonModelPackV1,
  draft: DesignerDragonDraftStore,
): DragonModelPackV1 {
  const model = createMiniDragonModel(draft);
  return parseDragonModelPack({
    ...pack,
    models: [...pack.models.filter(candidate => candidate.id !== model.id), model],
  });
}

export function createMiniDragonModel(draft: DesignerDragonDraftStore): DragonModelPackEntryV1 {
  const parts = NODES.map(node => createNodePart(node, draft));
  const partsById = new Map(parts.map(part => [part.id, part]));
  const joints: AssemblyJoint[] = NODES.flatMap(node => node.parentId ? [{
    id: `joint-${node.parentId}-${node.id}`,
    type: node.jointType ?? 'fixed',
    parentPartId: node.parentId,
    childPartId: node.id,
    pivotOnParent: localOffset(partsById, node.parentId, node.id),
    pivotOnChild: { x: 0, y: 0, z: 0 },
    axis: node.axis ?? { x: 0, y: 1, z: 0 },
    behavior: node.jointType === 'hinge'
      ? { profile: 'springHinge' as const, springStiffness: 8, springDamping: 0.9, breakForce: 160, breakDamage: 8 }
      : { profile: 'passive' as const, breakForce: 160, breakDamage: 8 },
  }] : []);
  const blueprint: AssemblyBlueprint = { parts, joints };
  applyMiniDragonCoat(blueprint, MINI_DRAGON_NEUTRAL_FORMS, 'mini-dragon');
  return {
    id: 'mini-dragon',
    label: 'Mini Dragon',
    description: 'The complete Mini Dragon authoring model, versioned with the lab dragon.',
    blueprint,
  };
}

/** Complete neutral Mini Dragon available beside the classic test rig in Garage. */
export function createMiniDragonAuthoringPreset(
  draft: DesignerDragonDraftStore,
): AssemblyPreset {
  const model = createMiniDragonModel(draft);
  return {
    id: model.id,
    name: model.label,
    description: model.description,
    state: model.blueprint,
  };
}

/** Five editable Garage assemblies driven by the same complete visual recipes as the Society library. */
export function createMiniDragonBreedAuthoringPresets(
  draft: DesignerDragonDraftStore,
): readonly AssemblyPreset[] {
  return (Object.keys(MINI_DRAGON_REFERENCE_FORMS) as MiniDragonBreedPresetId[])
    .map(id => createMiniDragonBreedAuthoringPreset(id, draft));
}

export function createMiniDragonBreedAuthoringPreset(
  id: MiniDragonBreedPresetId,
  draft: DesignerDragonDraftStore,
): AssemblyPreset {
  const forms = MINI_DRAGON_REFERENCE_FORMS[id];
  const blueprint = createMiniDragonModel(draft).blueprint;
  applyBreedRecipe(blueprint, forms, draft);
  applyMiniDragonCoat(blueprint, forms, `breed-reference-${id}`);
  return {
    id: `mini-dragon-${id}`,
    name: MINI_BREED_NAMES[id],
    description: `Editable ${MINI_BREED_NAMES[id]} reference assembly using the shared Mini Dragon morphology contract.`,
    state: blueprint,
  };
}

function applyMiniDragonCoat(
  blueprint: AssemblyBlueprint,
  forms: MiniDragonFormSelection,
  individualId: string,
): void {
  const paint = resolveMiniDragonCoatPaint(forms, individualId);
  for (const part of blueprint.parts) {
    if (!part.visualProfile?.profileId.startsWith('mini-dragon-')) continue;
    part.color = miniDragonHexColor(paint.color);
    setDesignerParameters(part, {
      miniPatchColor: miniDragonHexColor(paint.patchColor),
      miniEmberColor: paint.emberColor,
      miniAccentColor: paint.accentColor,
      miniPatternStyle: paint.patternStyle,
      miniSurfaceStyle: paint.surfaceStyle,
    });
  }
}

export const MINI_BREED_NAMES: Readonly<Record<MiniDragonBreedPresetId, string>> = {
  puggle: 'Puggle Dragon',
  fairy: 'Fairy Dragon',
  triceratops: 'Triceratops Dragon',
  'imperial-serpent': 'Imperial Serpent Dragon',
  amphiptere: 'Amphiptere',
};

export const MINI_DRAGON_BREED_OPTIONS: readonly {
  readonly id: MiniDragonBreedPresetId;
  readonly presetId: string;
  readonly name: string;
}[] = (Object.keys(MINI_BREED_NAMES) as MiniDragonBreedPresetId[]).map(id => ({
  id,
  presetId: `mini-dragon-${id}`,
  name: MINI_BREED_NAMES[id],
}));

function createNodePart(node: MiniNode, draft: DesignerDragonDraftStore): AssemblyPart {
  const source = MINI_DRAGON_PART_DEFINITIONS.find(definition => definition.id === node.definitionId);
  if (!source) throw new Error(`Mini Dragon definition ${node.definitionId} is missing.`);
  const definition = applyDesignerDraft(source, draft);
  const part = createPartFromDefinition(definition, node.position, node.id);
  if (part.visualProfile && node.parameters) {
    part.visualProfile = {
      ...part.visualProfile,
      parameters: { ...part.visualProfile.parameters, ...node.parameters },
    };
  }
  return part;
}

function localOffset(
  partsById: ReadonlyMap<string, AssemblyPart>,
  parentId: string,
  childId: string,
): Vector3Data {
  const parent = partsById.get(parentId);
  const child = partsById.get(childId);
  if (!parent || !child) throw new Error(`Mini Dragon joint ${parentId} -> ${childId} is invalid.`);
  return {
    x: child.position.x - parent.position.x,
    y: child.position.y - parent.position.y,
    z: child.position.z - parent.position.z,
  };
}

const DESIGNER_FRAME_SCALE: Readonly<Record<string, Vector3Data>> = {
  'frame:long': { x: 1.34, y: 0.8, z: 0.84 },
  'frame:balanced': { x: 1, y: 1, z: 1 },
  'frame:round': { x: 0.82, y: 1.25, z: 1.18 },
};

const DESIGNER_BODY_PARAMETERS: Readonly<Record<string, Record<string, number>>> = {
  'frame:long': {
    miniChestScale: 0.84, miniBellyScale: 0.72, miniHipScale: 0.8,
    miniWaistScale: 0.82, miniSpineArch: 0.2, miniNeckCurve: 0.48,
    miniNeckThickness: 0.78, miniTailCurve: 0.22, miniTailTaper: 1.28,
  },
  'frame:balanced': {
    miniChestScale: 1, miniBellyScale: 1, miniHipScale: 1,
    miniWaistScale: 1, miniSpineArch: 0.05, miniNeckCurve: 0.2,
    miniNeckThickness: 1, miniTailCurve: 0.03, miniTailTaper: 1,
  },
  'frame:round': {
    miniChestScale: 1.18, miniBellyScale: 1.42, miniHipScale: 1.22,
    miniWaistScale: 1.12, miniSpineArch: -0.04, miniNeckCurve: 0.04,
    miniNeckThickness: 1.3, miniTailCurve: -0.08, miniTailTaper: 0.8,
  },
};

function applyBreedRecipe(
  blueprint: AssemblyBlueprint,
  forms: MiniDragonFormSelection,
  draft: DesignerDragonDraftStore,
): void {
  const morphology = resolveMiniDragonBreedMorphology(forms);
  rebuildDesignerTail(blueprint, forms, morphology.forkTailBranches, draft);
  replaceDesignerWingProfiles(blueprint, morphology.wingProfileId, draft);
  addDesignerBreedParts(blueprint, morphology, draft);

  const frame = DESIGNER_FRAME_SCALE[forms.frame] ?? DESIGNER_FRAME_SCALE['frame:balanced'];
  const teacup = forms.size === 'size:teacup';
  const bodyScale = teacup ? 0.76 : 1;
  const headScale = teacup ? 0.9 : 1;
  const legLength = forms.legs === 'legs:stilt' ? 1.55 : forms.legs === 'legs:waddler' ? 0.5 : 1;
  const bodyParameters = DESIGNER_BODY_PARAMETERS[forms.frame]
    ?? DESIGNER_BODY_PARAMETERS['frame:balanced'];
  const featherCoverage = forms.plumage === 'plumage:full' ? 1 : forms.plumage === 'plumage:fringe' ? 0.55 : 0;
  const wingSpread = forms.wings === 'wings:broad' ? 1 : forms.wings === 'wings:vestigial' ? 0.12 : 0.58;
  const wingParameters = forms.wings === 'wings:broad'
    ? { miniWingChord: 1.4, miniWingSweep: 0.32, miniWingScallop: 0.24, miniWingCamber: 0.18 }
    : forms.wings === 'wings:vestigial'
      ? { miniWingChord: 0.62, miniWingSweep: 0.04, miniWingScallop: 0, miniWingCamber: 0 }
      : { miniWingChord: 0.86, miniWingSweep: 0.12, miniWingScallop: 0.07, miniWingCamber: 0.08 };
  const legBase = forms.legs === 'legs:stilt'
    ? { miniLegThickness: 0.7, miniPawScale: 0.76, miniToeSplay: 0.82 }
    : forms.legs === 'legs:waddler'
      ? { miniLegThickness: 0.92, miniPawScale: 0.82, miniToeSplay: 1 }
      : { miniLegThickness: 1, miniPawScale: 1, miniToeSplay: 1 };
  const crestScale = (forms.crest === 'crest:crown' ? 1.28 : forms.crest === 'crest:crown-frill' ? 1.16 : 1.12)
    * morphology.crownScaleMultiplier;

  const origin = { x: 0, y: 0.85, z: 0 };
  for (const part of blueprint.parts) {
    const profile = part.visualProfile?.profileId ?? '';
    part.position = {
      x: origin.x + (part.position.x - origin.x) * frame.x * bodyScale,
      y: origin.y + (part.position.y - origin.y) * frame.y * bodyScale,
      z: origin.z + (part.position.z - origin.z) * frame.z * bodyScale,
    };

    if (profile === 'mini-dragon-body' || profile === 'mini-dragon-dorsal-scales') {
      part.dimensions = scaledDimensions(part.dimensions, {
        x: frame.x * bodyScale, y: frame.y * bodyScale, z: frame.z * bodyScale,
      });
      setDesignerParameters(part, {
        ...bodyParameters,
        miniDorsalBumps: forms.coat === 'coat:fluffy' ? 1 : 0,
        miniScaleSize: forms.coat === 'coat:fluffy' ? 1.22 : 0.82,
        miniFeatherCoverage: featherCoverage,
        miniFeatherLength: forms.plumage === 'plumage:full' ? 1.12 : 0.84,
        miniFeatherVolume: morphology.featherVolume,
      });
    } else if (profile === 'mini-dragon-neck') {
      part.dimensions = scaledDimensions(part.dimensions, { x: bodyScale, y: bodyScale, z: bodyScale });
      setDesignerParameters(part, bodyParameters);
    } else if (profile === 'mini-dragon-head') {
      part.dimensions = scaledDimensions(part.dimensions, { x: headScale, y: headScale, z: headScale });
      setDesignerParameters(part, {
        miniEyeSize: morphology.eyeSize,
        miniSnoutLength: forms.muzzle === 'muzzle:long' ? 1.08 : forms.muzzle === 'muzzle:pug' ? 0.06 : 0.46,
        miniMuzzleWidth: forms.muzzle === 'muzzle:pug' ? 1.38 : forms.muzzle === 'muzzle:long' ? 0.82 : 1,
        miniMuzzleDepth: forms.muzzle === 'muzzle:pug' ? 1.18 : forms.muzzle === 'muzzle:long' ? 0.82 : 1,
        miniCrestScale: crestScale,
        miniCrestCrown: forms.crest === 'crest:crown' || forms.crest === 'crest:crown-frill' ? 1 : 0,
        miniCrestFrill: forms.crest === 'crest:frill' || forms.crest === 'crest:crown-frill' ? 1 : 0,
      });
    } else if (profile === 'mini-dragon-horn') {
      setDesignerParameters(part, {
        miniHornCurl: forms.horns === 'horns:curled' ? 1 : 0.05,
        miniHornSpread: forms.horns === 'horns:straight' ? 1.38 : 0.82,
        miniHornScale: morphology.hornScale,
      });
    } else if (profile === 'mini-dragon-ear') {
      setDesignerParameters(part, {
        miniEarScale: forms.ears === 'ears:sail' ? 1.3 : forms.ears === 'ears:button' ? 0.46 : 0.82,
        miniEarFold: forms.ears === 'ears:sail' ? 0.02 : forms.ears === 'ears:button' ? 0.96 : 0.42,
        miniEarRoundness: morphology.earRoundness,
      });
    } else if (profile === 'mini-dragon-jaw') {
      setDesignerParameters(part, {
        miniToothCount: forms.muzzle === 'muzzle:pug' ? 0 : forms.muzzle === 'muzzle:long' ? 4 : 2,
      });
    } else if (profile === 'mini-dragon-thigh' || profile === 'mini-dragon-leg') {
      part.dimensions = scaledDimensions(part.dimensions, { x: bodyScale, y: legLength, z: bodyScale });
      setDesignerParameters(part, {
        ...legBase,
        miniLegThickness: legBase.miniLegThickness * morphology.legThicknessMultiplier,
        miniPawScale: legBase.miniPawScale * morphology.pawScaleMultiplier,
      });
    } else if (profile.endsWith('-wing')) {
      setDesignerParameters(part, {
        ...wingParameters,
        miniWingSpread: wingSpread,
        miniFeatherCoverage: featherCoverage,
        miniFeatherLength: forms.plumage === 'plumage:full' ? 1.12 : 0.84,
        miniFeatherVolume: morphology.featherVolume,
      });
    } else if (profile === 'mini-dragon-tail') {
      setDesignerParameters(part, {
        miniTailCurve: bodyParameters['miniTailCurve'],
        miniTailTaper: bodyParameters['miniTailTaper'],
      });
    } else if (profile === 'mini-dragon-tail-plume') {
      setDesignerParameters(part, {
        miniTailStyle: forms.tail === 'tail:star' ? 0 : forms.tail === 'tail:split' ? 3 : forms.tail === 'tail:fork' ? 1 : 2,
        miniTailTipScale: forms.tail === 'tail:star' ? 1.28 : forms.tail === 'tail:split' ? 0.72 : forms.tail === 'tail:fork' ? 1.24 : 1,
      });
    }
  }

  setPartScale(blueprint, 'mini-brow-plates', 'miniBrowScale', formScale(forms.brow));
  setPartScale(blueprint, 'mini-whiskers', 'miniWhiskerScale', formScale(forms.whiskers));
  setPartScale(blueprint, 'mini-chin-tuft', 'miniChinScale', formScale(forms.chin));
  setPartScale(blueprint, 'mini-dewlap', 'miniDewlapScale', formScale(forms.dewlap));
  setPartScale(blueprint, 'mini-neck-ruff', 'miniRuffScale', formScale(forms.ruff));
  setPartScale(blueprint, 'mini-shoulder-plates', 'miniShoulderScale', formScale(forms.shoulders));
  setPartScale(blueprint, 'mini-belly-scutes', 'miniBellyScuteScale', formScale(forms.belly));
  setPartScale(blueprint, 'mini-flank-fins', 'miniFlankFinScale', formScale(forms['flank-fins']));
  setPartScale(blueprint, 'mini-hip-fins', 'miniHipFinScale', formScale(forms['hip-fins']));
  setPartScale(blueprint, 'mini-tail-sail', 'miniTailSailScale', formScale(forms['tail-sail']));
  seatDesignerBreedParts(blueprint, forms);
  reseatDesignerJoints(blueprint);
}

/** Re-seats scaled anatomy in world space so a valid joint graph also looks physically attached. */
function seatDesignerBreedParts(
  blueprint: AssemblyBlueprint,
  forms: MiniDragonFormSelection,
): void {
  for (const side of ['left', 'right'] as const) {
    const thigh = blueprint.parts.find(part => part.id === `mini-${side}-thigh`);
    const lower = blueprint.parts.find(part => part.id === `mini-${side}-leg`);
    if (!thigh || !lower) continue;
    lower.position = {
      x: thigh.position.x + thigh.dimensions.x * 0.08,
      y: thigh.position.y - thigh.dimensions.y * 0.5 - lower.dimensions.y * 0.42,
      z: thigh.position.z,
    };
  }

  if (forms.frame === 'frame:long') {
    const neck = blueprint.parts.find(part => part.id === 'mini-neck');
    const head = blueprint.parts.find(part => part.id === 'mini-head');
    if (neck && head) {
      const desiredHeadX = neck.position.x
        + neck.dimensions.x * 0.46
        + head.dimensions.x * 0.4;
      translateDesignerSubtree(blueprint, head.id, {
        x: desiredHeadX - head.position.x,
        y: 0,
        z: 0,
      });
    }
  }

  if (forms.tail === 'tail:split') seatDesignerSplitTail(blueprint);
}

function translateDesignerSubtree(
  blueprint: AssemblyBlueprint,
  rootId: string,
  offset: Vector3Data,
): void {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const joint of blueprint.joints) {
      if (ids.has(joint.parentPartId) && !ids.has(joint.childPartId)) {
        ids.add(joint.childPartId);
        added = true;
      }
    }
  }
  for (const part of blueprint.parts) {
    if (!ids.has(part.id)) continue;
    part.position = {
      x: part.position.x + offset.x,
      y: part.position.y + offset.y,
      z: part.position.z + offset.z,
    };
  }
}

function seatDesignerSplitTail(blueprint: AssemblyBlueprint): void {
  const tailRoot = blueprint.parts.find(part => part.id === 'mini-tail');
  if (!tailRoot) return;
  for (const side of [-1, 1] as const) {
    const name = side < 0 ? 'left' : 'right';
    let parent = tailRoot;
    for (const [index, id] of [1, 2, 3].map(value => [value - 1, `mini-tail-${name}-${value}`] as const)) {
      const child = blueprint.parts.find(part => part.id === id);
      if (!child) continue;
      const rotation = quaternionFromEuler({
        x: 0,
        y: side * [0.5, 0.3, 0.18][index],
        z: side < 0 ? -[0.32, 0.24, 0.14][index] : [0.05, 0.035, 0.02][index],
      });
      const parentRotation = parent.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
      const pivot = {
        x: parent.position.x,
        y: parent.position.y,
        z: parent.position.z,
      };
      const distal = rotateVectorByQuaternion({
        x: -parent.dimensions.x * 0.43,
        y: 0,
        z: index === 0 ? side * parent.dimensions.z * 0.3 : 0,
      }, parentRotation);
      pivot.x += distal.x;
      pivot.y += distal.y;
      pivot.z += distal.z;
      const childRoot = rotateVectorByQuaternion({ x: child.dimensions.x * 0.43, y: 0, z: 0 }, rotation);
      child.position = {
        x: pivot.x - childRoot.x,
        y: pivot.y - childRoot.y,
        z: pivot.z - childRoot.z,
      };
      child.rotation = rotation;
      parent = child;
    }
    const tip = blueprint.parts.find(part => part.id === `mini-tail-tip-${name}`);
    if (tip) {
      const parentRotation = parent.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
      const distal = rotateVectorByQuaternion({ x: -parent.dimensions.x * 0.43, y: 0, z: 0 }, parentRotation);
      tip.position = {
        x: parent.position.x + distal.x,
        y: parent.position.y + distal.y,
        z: parent.position.z + distal.z,
      };
      tip.rotation = parentRotation;
    }
  }
}

function rebuildDesignerTail(
  blueprint: AssemblyBlueprint,
  forms: MiniDragonFormSelection,
  forkTailBranches: boolean,
  draft: DesignerDragonDraftStore,
): void {
  if (forms.tail === 'tail:split') return;
  const removed = new Set(blueprint.parts
    .filter(part => /^mini-tail-(left|right)-/.test(part.id) || part.id.startsWith('mini-tail-tip-'))
    .map(part => part.id));
  blueprint.parts = blueprint.parts.filter(part => !removed.has(part.id));
  blueprint.joints = blueprint.joints.filter(joint => !removed.has(joint.childPartId) && !removed.has(joint.parentPartId));

  const tail2 = createNodePart({
    id: 'mini-tail-2', definitionId: 'mini-lab-tail', parentId: 'mini-tail',
    position: { x: -0.72, y: 0.82, z: 0 },
  }, draft);
  blueprint.parts.push(tail2);
  attachDesignerPart(blueprint, 'mini-tail', tail2);
  if (forkTailBranches) {
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'left' : 'right';
      const branch = createNodePart({
        id: `mini-tail-fork-${name}`,
        definitionId: 'mini-lab-fork-tail-branch',
        parentId: tail2.id,
        position: { x: -1.01, y: 0.82, z: side * 0.105 },
        parameters: { miniForkTailScale: 1.08 },
      }, draft);
      branch.rotation = quaternionFromEuler({
        x: 0,
        y: side * 0.2,
        z: side < 0 ? -0.42 : 0.04,
      });
      blueprint.parts.push(branch);
      attachDesignerPart(blueprint, tail2.id, branch);
    }
  } else {
    const tip = createNodePart({
      id: 'mini-tail-tip', definitionId: 'mini-lab-tail-tip', parentId: tail2.id,
      position: { x: -0.97, y: 0.82, z: 0 },
    }, draft);
    blueprint.parts.push(tip);
    attachDesignerPart(blueprint, tail2.id, tip);
  }
}

function replaceDesignerWingProfiles(
  blueprint: AssemblyBlueprint,
  profileId: string,
  draft: DesignerDragonDraftStore,
): void {
  const definitionId = profileId === 'mini-dragon-fairy-wing'
    ? 'mini-lab-fairy-wing'
    : profileId === 'mini-dragon-aero-wing'
      ? 'mini-lab-aero-wing'
      : 'mini-lab-wing';
  for (const side of [-1, 1] as const) {
    const id = side < 0 ? 'mini-left-wing' : 'mini-right-wing';
    const index = blueprint.parts.findIndex(part => part.id === id);
    if (index < 0) continue;
    const previous = blueprint.parts[index];
    blueprint.parts[index] = createNodePart({
      id, definitionId, parentId: 'mini-body', position: previous.position,
      parameters: { miniWingSide: side },
    }, draft);
  }
}

function addDesignerBreedParts(
  blueprint: AssemblyBlueprint,
  morphology: ReturnType<typeof resolveMiniDragonBreedMorphology>,
  draft: DesignerDragonDraftStore,
): void {
  const head = blueprint.parts.find(part => part.id === 'mini-head');
  if (head && morphology.faceShieldScale > 0) {
    const shield = createNodePart({
      id: 'mini-face-shield', definitionId: 'mini-lab-face-shield', parentId: head.id,
      position: head.position, parameters: { miniFaceShieldScale: morphology.faceShieldScale },
    }, draft);
    const noseHorn = createNodePart({
      id: 'mini-nose-horn', definitionId: 'mini-lab-nose-horn', parentId: head.id,
      position: head.position, parameters: { miniNoseHornScale: morphology.noseHornScale },
    }, draft);
    blueprint.parts.push(shield, noseHorn);
    attachDesignerPart(blueprint, head.id, shield);
    attachDesignerPart(blueprint, head.id, noseHorn);
  }
  if (morphology.serpentSegmentScale > 0) {
    let parentId = 'mini-body';
    for (const [id, position] of [
      ['mini-serpent-mid-body', { x: 0.06, y: 0.85, z: 0 }],
      ['mini-serpent-rear-body', { x: -0.28, y: 0.85, z: 0 }],
    ] as const) {
      const segment = createNodePart({
        id, definitionId: 'mini-lab-serpent-segment', parentId, position,
        parameters: { miniSerpentSegmentScale: morphology.serpentSegmentScale },
        jointType: 'hinge', axis: { x: 0, y: 1, z: 0 },
      }, draft);
      blueprint.parts.push(segment);
      attachDesignerPart(blueprint, parentId, segment, 'hinge', { x: 0, y: 1, z: 0 });
      parentId = id;
    }
    for (const childId of ['mini-tail', 'mini-left-thigh', 'mini-right-thigh']) {
      const joint = blueprint.joints.find(candidate => candidate.childPartId === childId);
      if (!joint) continue;
      joint.parentPartId = 'mini-serpent-rear-body';
      joint.id = `joint-mini-serpent-rear-body-${childId}`;
    }
  }
}

function attachDesignerPart(
  blueprint: AssemblyBlueprint,
  parentId: string,
  child: AssemblyPart,
  type: JointType = 'fixed',
  axis: Vector3Data = { x: 0, y: 1, z: 0 },
): void {
  const parent = blueprint.parts.find(part => part.id === parentId);
  if (!parent) throw new Error(`Mini Dragon preset parent ${parentId} is missing.`);
  blueprint.joints.push({
    id: `joint-${parentId}-${child.id}`,
    type,
    parentPartId: parentId,
    childPartId: child.id,
    pivotOnParent: {
      x: child.position.x - parent.position.x,
      y: child.position.y - parent.position.y,
      z: child.position.z - parent.position.z,
    },
    pivotOnChild: { x: 0, y: 0, z: 0 },
    axis,
    behavior: type === 'hinge'
      ? { profile: 'springHinge', springStiffness: 8, springDamping: 0.9, breakForce: 160, breakDamage: 8 }
      : { profile: 'passive', breakForce: 160, breakDamage: 8 },
  });
}

function setDesignerParameters(
  part: AssemblyPart,
  parameters: Readonly<Record<string, string | number | boolean | undefined>>,
): void {
  if (!part.visualProfile) return;
  const defined: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) defined[key] = value;
  }
  part.visualProfile = {
    ...part.visualProfile,
    parameters: {
      ...part.visualProfile.parameters,
      ...defined,
    },
  };
}

function setPartScale(
  blueprint: AssemblyBlueprint,
  partId: string,
  key: string,
  value: number,
): void {
  const part = blueprint.parts.find(candidate => candidate.id === partId);
  if (part) setDesignerParameters(part, { [key]: value });
}

function formScale(formId: string): number {
  const values: Readonly<Record<string, number>> = {
    'brow:crowned': 1.25, 'brow:soft': 0.68, 'brow:smooth': 0.12,
    'whiskers:long': 1.25, 'whiskers:short': 0.65, 'whiskers:none': 0,
    'chin:plume': 1.1, 'chin:smooth': 0,
    'dewlap:full': 1.2, 'dewlap:half': 0.65, 'dewlap:none': 0,
    'ruff:mane': 1.22, 'ruff:mane-petal': 0.86, 'ruff:petal': 0.58,
    'shoulders:shield': 1.18, 'shoulders:soft': 0.32,
    'belly:plated': 1.2, 'belly:pebbled': 0.68, 'belly:soft': 0.12,
    'flank-fins:sail': 1.22, 'flank-fins:petal': 0.68, 'flank-fins:none': 0,
    'hip-fins:sail': 1.22, 'hip-fins:petal': 0.68, 'hip-fins:none': 0,
    'tail-sail:ribbon': 1.2, 'tail-sail:ridge': 0.62, 'tail-sail:none': 0,
  };
  return values[formId] ?? 0;
}

function scaledDimensions(value: Vector3Data, scale: Vector3Data): Vector3Data {
  return { x: value.x * scale.x, y: value.y * scale.y, z: value.z * scale.z };
}

function reseatDesignerJoints(blueprint: AssemblyBlueprint): void {
  const parts = new Map(blueprint.parts.map(part => [part.id, part]));
  for (const joint of blueprint.joints) {
    const parent = parts.get(joint.parentPartId);
    const child = parts.get(joint.childPartId);
    if (!parent || !child) continue;
    joint.pivotOnParent = {
      x: child.position.x - parent.position.x,
      y: child.position.y - parent.position.y,
      z: child.position.z - parent.position.z,
    };
    joint.pivotOnChild = { x: 0, y: 0, z: 0 };
  }
}
