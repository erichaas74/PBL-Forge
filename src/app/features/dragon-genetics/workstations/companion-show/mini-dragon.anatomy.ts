import {
  AssemblyBlueprint,
  AssemblyJoint,
  AssemblyPart,
  JointType,
  QuaternionData,
  Vector3Data,
} from '../../../../shared/assembly/domain/assembly.models';
import {
  identityQuaternion,
  invertQuaternion,
  quaternionFromEuler,
  rotateVectorByQuaternion,
} from '../../../../shared/assembly/domain/vector-data';
import {
  MiniDragonFormSelection,
  resolveMiniDragonBreedMorphology,
} from '../../../../shared/assembly/rendering/mini-dragon-breed-morphology';
import {
  MiniGenome,
  miniCoatPaint,
  miniIndividualFeatures,
  miniPhenotypeFormId,
} from './mini-dragon.genetics';

/**
 * Builds the animal a student looks at, straight from a mini dragon genome.
 *
 * Nothing here passes through the classic dragon's published model pack or its
 * phenotype builder. That pipeline stamps a genome onto one authored blueprint
 * and rescales it; this species is assembled part by part instead, because its
 * genes change *which parts exist* and their proportions relative to each other,
 * which a uniform rescale of a fixed skeleton cannot express.
 */

/** Base measurements of a standard-sized mini dragon, before any gene applies. */
const BASE = {
  // A short body under a big head. The first pass used a 1.0 body against a 0.5
  // head and rendered a ferret: on a neotenous animal the skull has to be a
  // serious fraction of the torso or nothing else in the silhouette matters.
  body: { x: 0.82, y: 0.58, z: 0.54 },
  neck: { x: 0.25, y: 0.3, z: 0.28 },
  head: { x: 0.43, y: 0.48, z: 0.44 },
  jaw: { x: 0.21, y: 0.085, z: 0.24 },
  leg: { x: 0.12, y: 0.3, z: 0.12 },
  wing: { x: 0.28, y: 0.22, z: 0.38 },
  tail: { x: 0.22, y: 0.15, z: 0.15 },
  plume: { x: 0.28, y: 0.19, z: 0.19 },
} as const;

/**
 * How the size gene reshapes the animal.
 *
 * Not a uniform scale: the specimen viewer frames whatever it is given, so an
 * animal that is simply smaller renders identically to a large one and the gene
 * would be invisible. A teacup is instead *differently proportioned* — a
 * relatively larger head on shorter legs, which is both what small breeds
 * actually look like and something that survives auto-framing.
 */
interface MiniProportions {
  body: number;
  head: number;
  leg: number;
  tail: number;
}

const STANDARD_PROPORTIONS: MiniProportions = { body: 1, head: 1, leg: 1, tail: 1 };
const TEACUP_PROPORTIONS: MiniProportions = { body: 0.76, head: 0.9, leg: 0.58, tail: 0.82 };

const WING_SPREAD: Readonly<Record<string, number>> = {
  'wings:broad': 1,
  'wings:small': 0.58,
  'wings:vestigial': 0.12,
};

const EAR_SCALE: Readonly<Record<string, number>> = {
  'ears:sail': 1.3,
  'ears:petal': 0.82,
  'ears:button': 0.46,
};

const MUZZLE_LENGTH: Readonly<Record<string, number>> = {
  'muzzle:long': 1.08,
  'muzzle:medium': 0.46,
  'muzzle:pug': 0.06,
};

const LEG_LENGTH: Readonly<Record<string, number>> = {
  'legs:stilt': 1.55,
  'legs:medium': 1,
  'legs:waddler': 0.5,
};

const TAIL_STYLE: Readonly<Record<string, number>> = {
  'tail:star': 0,
  'tail:split': 3,
  'tail:fork': 1,
  'tail:pom': 2,
};

const FRAME_SHAPE: Readonly<Record<string, Vector3Data>> = {
  'frame:long': { x: 1.34, y: 0.8, z: 0.84 },
  'frame:balanced': { x: 1, y: 1, z: 1 },
  'frame:round': { x: 0.82, y: 1.25, z: 1.18 },
};

const FEATHER_COVERAGE: Readonly<Record<string, number>> = {
  'plumage:full': 1,
  'plumage:fringe': 0.55,
  'plumage:bare': 0,
};

const BODY_MORPHOLOGY: Readonly<Record<string, Record<string, number>>> = {
  'frame:long': {
    miniChestScale: 0.84,
    miniBellyScale: 0.72,
    miniHipScale: 0.8,
    miniWaistScale: 0.82,
    miniSpineArch: 0.2,
    miniNeckCurve: 0.48,
    miniNeckThickness: 0.78,
    miniTailCurve: 0.22,
    miniTailTaper: 1.28,
  },
  'frame:balanced': {
    miniChestScale: 1,
    miniBellyScale: 1,
    miniHipScale: 1,
    miniWaistScale: 1,
    miniSpineArch: 0.05,
    miniNeckCurve: 0.2,
    miniNeckThickness: 1,
    miniTailCurve: 0.03,
    miniTailTaper: 1,
  },
  'frame:round': {
    miniChestScale: 1.18,
    miniBellyScale: 1.42,
    miniHipScale: 1.22,
    miniWaistScale: 1.12,
    miniSpineArch: -0.04,
    miniNeckCurve: 0.04,
    miniNeckThickness: 1.3,
    miniTailCurve: -0.08,
    miniTailTaper: 0.8,
  },
};

const SKULL_MORPHOLOGY: Readonly<Record<string, Record<string, number>>> = {
  'frame:long': { miniSkullLength: 1.14, miniSkullHeight: 0.9, miniSkullWidth: 0.88, miniEyeSpacing: 1.12 },
  'frame:balanced': { miniSkullLength: 1, miniSkullHeight: 1, miniSkullWidth: 1, miniEyeSpacing: 1 },
  'frame:round': { miniSkullLength: 0.84, miniSkullHeight: 1.12, miniSkullWidth: 1.16, miniEyeSpacing: 0.88 },
};

const MUZZLE_MORPHOLOGY: Readonly<Record<string, Record<string, number>>> = {
  'muzzle:long': { miniMuzzleWidth: 0.82, miniMuzzleDepth: 0.82, miniToothCount: 4 },
  'muzzle:medium': { miniMuzzleWidth: 1, miniMuzzleDepth: 1, miniToothCount: 2 },
  'muzzle:pug': { miniMuzzleWidth: 1.38, miniMuzzleDepth: 1.18, miniToothCount: 0 },
};

const EAR_FOLD: Readonly<Record<string, number>> = {
  'ears:sail': 0.02,
  'ears:petal': 0.42,
  'ears:button': 0.96,
};

const WING_MORPHOLOGY: Readonly<Record<string, Record<string, number>>> = {
  'wings:broad': { miniWingChord: 1.4, miniWingSweep: 0.32, miniWingScallop: 0.24, miniWingCamber: 0.18 },
  'wings:small': { miniWingChord: 0.86, miniWingSweep: 0.12, miniWingScallop: 0.07, miniWingCamber: 0.08 },
  'wings:vestigial': { miniWingChord: 0.62, miniWingSweep: 0.04, miniWingScallop: 0, miniWingCamber: 0 },
};

const LIMB_MORPHOLOGY: Readonly<Record<string, Record<string, number>>> = {
  'legs:stilt': { miniLegThickness: 0.7, miniPawScale: 0.76, miniToeSplay: 0.82 },
  'legs:medium': { miniLegThickness: 1, miniPawScale: 1, miniToeSplay: 1 },
  // Short does not mean swollen. The old values shortened the bones while
  // enlarging both thigh and paw, so serpent breeds looked four-legged first
  // and long-bodied second.
  'legs:waddler': { miniLegThickness: 0.92, miniPawScale: 0.82, miniToeSplay: 1 },
};

const CREST_SCALE: Readonly<Record<string, number>> = {
  'crest:crown': 1.28,
  'crest:crown-frill': 1.16,
  'crest:frill': 1.12,
};

const TAIL_TIP_SCALE: Readonly<Record<string, number>> = {
  'tail:star': 1.28,
  'tail:split': 0.72,
  'tail:fork': 1.24,
  'tail:pom': 1,
};

const EXPANDED_PART_SCALE: Readonly<Record<string, number>> = {
  'brow:crowned': 1.25,
  'brow:soft': 0.68,
  'brow:smooth': 0.12,
  'whiskers:long': 1.25,
  'whiskers:short': 0.65,
  'whiskers:none': 0,
  'chin:plume': 1.1,
  'chin:smooth': 0,
  'dewlap:full': 1.2,
  'dewlap:half': 0.65,
  'dewlap:none': 0,
  'ruff:mane': 1.22,
  'ruff:mane-petal': 0.86,
  'ruff:petal': 0.58,
  'shoulders:shield': 1.18,
  'shoulders:soft': 0.32,
  'belly:plated': 1.2,
  'belly:pebbled': 0.68,
  'belly:soft': 0.12,
  'flank-fins:sail': 1.22,
  'flank-fins:petal': 0.68,
  'flank-fins:none': 0,
  'hip-fins:sail': 1.22,
  'hip-fins:petal': 0.68,
  'hip-fins:none': 0,
  'tail-sail:ribbon': 1.2,
  'tail-sail:ridge': 0.62,
  'tail-sail:none': 0,
};

export function buildMiniDragonBlueprint(
  genome: MiniGenome,
  individualId: string,
): AssemblyBlueprint {
  const paint = miniCoatPaint(genome, individualId);
  const features = miniIndividualFeatures(individualId);
  const coatForm = miniPhenotypeFormId('coat', genome);
  const plumageForm = miniPhenotypeFormId('plumage', genome);
  const hornForm = miniPhenotypeFormId('horns', genome);
  const wingForm = miniPhenotypeFormId('wings', genome);
  const patternForm = miniPhenotypeFormId('pattern', genome);
  const emberForm = miniPhenotypeFormId('ember', genome);
  const sizeForm = miniPhenotypeFormId('size', genome);
  const eyeForm = miniPhenotypeFormId('eyes', genome);
  const earForm = miniPhenotypeFormId('ears', genome);
  const muzzleForm = miniPhenotypeFormId('muzzle', genome);
  const legForm = miniPhenotypeFormId('legs', genome);
  const tailForm = miniPhenotypeFormId('tail', genome);
  const crestForm = miniPhenotypeFormId('crest', genome);
  const frameForm = miniPhenotypeFormId('frame', genome);
  const browForm = miniPhenotypeFormId('brow', genome);
  const whiskerForm = miniPhenotypeFormId('whiskers', genome);
  const chinForm = miniPhenotypeFormId('chin', genome);
  const dewlapForm = miniPhenotypeFormId('dewlap', genome);
  const ruffForm = miniPhenotypeFormId('ruff', genome);
  const shoulderForm = miniPhenotypeFormId('shoulders', genome);
  const bellyForm = miniPhenotypeFormId('belly', genome);
  const flankFinForm = miniPhenotypeFormId('flank-fins', genome);
  const hipFinForm = miniPhenotypeFormId('hip-fins', genome);
  const tailSailForm = miniPhenotypeFormId('tail-sail', genome);
  const forms: MiniDragonFormSelection = {
    coat: coatForm,
    plumage: plumageForm,
    horns: hornForm,
    wings: wingForm,
    pattern: patternForm,
    ember: emberForm,
    size: sizeForm,
    eyes: eyeForm,
    ears: earForm,
    muzzle: muzzleForm,
    legs: legForm,
    tail: tailForm,
    crest: crestForm,
    frame: frameForm,
    brow: browForm,
    whiskers: whiskerForm,
    chin: chinForm,
    dewlap: dewlapForm,
    ruff: ruffForm,
    shoulders: shoulderForm,
    belly: bellyForm,
    'flank-fins': flankFinForm,
    'hip-fins': hipFinForm,
    'tail-sail': tailSailForm,
  };
  const breedMorphology = resolveMiniDragonBreedMorphology(forms);
  const proportions =
    sizeForm === 'size:teacup'
      ? TEACUP_PROPORTIONS
      : STANDARD_PROPORTIONS;

  const dorsalBumps = coatForm === 'coat:fluffy' ? 1 : 0;
  const featherCoverage = FEATHER_COVERAGE[plumageForm] ?? 0;
  const hornCurl = hornForm === 'horns:curled' ? 1 : 0.05;
  const wingSpread = WING_SPREAD[wingForm] ?? 1;
  const earScale = EAR_SCALE[earForm] ?? 1;
  const muzzleLength = MUZZLE_LENGTH[muzzleForm] ?? 0.46;
  const legLength = LEG_LENGTH[legForm] ?? 1;
  const tailStyle = TAIL_STYLE[tailForm] ?? 2;
  const frameShape = FRAME_SHAPE[frameForm] ?? FRAME_SHAPE['frame:balanced'];
  const bodyMorphology = BODY_MORPHOLOGY[frameForm] ?? BODY_MORPHOLOGY['frame:balanced'];
  const skullMorphology = SKULL_MORPHOLOGY[frameForm] ?? SKULL_MORPHOLOGY['frame:balanced'];
  const muzzleMorphology = MUZZLE_MORPHOLOGY[muzzleForm] ?? MUZZLE_MORPHOLOGY['muzzle:medium'];
  const wingMorphology = WING_MORPHOLOGY[wingForm] ?? WING_MORPHOLOGY['wings:small'];
  const baseLimbMorphology = LIMB_MORPHOLOGY[legForm] ?? LIMB_MORPHOLOGY['legs:medium'];
  const limbMorphology = {
    ...baseLimbMorphology,
    miniLegThickness:
      baseLimbMorphology['miniLegThickness'] * breedMorphology.legThicknessMultiplier,
    miniPawScale:
      baseLimbMorphology['miniPawScale'] * breedMorphology.pawScaleMultiplier,
  };

  /** Parameters every part carries, whatever it is. */
  const sharedParameters = {
    miniPatchColor: paint.patchColor,
    miniEmberColor: paint.emberColor,
    miniAccentColor: paint.accentColor,
    miniPatternStyle: paint.patternStyle,
    miniSurfaceStyle: paint.surfaceStyle,
    miniJointBall: 1,
  };
  const bodyParameters = {
    ...sharedParameters,
    miniChestScale: bodyMorphology['miniChestScale'],
    miniBellyScale: bodyMorphology['miniBellyScale'],
    miniHipScale: bodyMorphology['miniHipScale'],
    miniWaistScale: bodyMorphology['miniWaistScale'],
    miniSpineArch: bodyMorphology['miniSpineArch'],
    // Preserve the inherited coat marker on the body as well as the focused
    // dorsal renderer; lesson code reads this metadata independently of which
    // mesh owns the visible bumps.
    miniDorsalBumps: dorsalBumps,
    miniFeatherCoverage: featherCoverage,
    miniFeatherLength: plumageForm === 'plumage:full' ? 1.12 : 0.84,
    miniFeatherVolume: breedMorphology.featherVolume,
    miniPatchScale: frameForm === 'frame:long' ? 1.18 : frameForm === 'frame:round' ? 0.82 : 1,
  };
  const dorsalParameters = {
    ...sharedParameters,
    miniChestScale: bodyMorphology['miniChestScale'],
    miniBellyScale: bodyMorphology['miniBellyScale'],
    miniHipScale: bodyMorphology['miniHipScale'],
    miniWaistScale: bodyMorphology['miniWaistScale'],
    miniSpineArch: bodyMorphology['miniSpineArch'],
    miniDorsalBumps: dorsalBumps,
    miniScaleSize: coatForm === 'coat:fluffy' ? 1.22 : 0.82,
  };

  const bodyDims = componentScaled(BASE.body, proportions.body, frameShape);
  const neckDims = scaled(BASE.neck, proportions.body);
  const headDims = scaled(BASE.head, proportions.head);
  const jawDims = scaled(BASE.jaw, proportions.head);
  const legDims = {
    x: BASE.leg.x * proportions.body,
    y: BASE.leg.y * proportions.leg * legLength,
    z: BASE.leg.z * proportions.body,
  };
  const wingDims = scaled(BASE.wing, proportions.body);
  const tailDims = scaled(BASE.tail, proportions.tail);
  const plumeDims = scaled(BASE.plume, proportions.tail);

  const parts: AssemblyPart[] = [];
  const joints: AssemblyJoint[] = [];
  const addInheritedPart = (
    parent: AssemblyPart,
    id: string,
    label: string,
    roles: AssemblyPart['roles'],
    profileId: string,
    dimensions: Vector3Data,
    position: Vector3Data,
    parameterKey: string,
    parameterValue: number,
  ): AssemblyPart => {
    const part: AssemblyPart = {
      id,
      label,
      roles,
      shape: 'box',
      mass: 0.04,
      dimensions,
      position,
      color: paint.color,
      visualProfile: {
        profileId,
        meshType: 'procedural',
        parameters: { ...sharedParameters, [parameterKey]: parameterValue },
      },
    };
    parts.push(part);
    joints.push(fixedJoint(parent, id, position));
    return part;
  };

  const body: AssemblyPart = {
    id: 'mini-body',
    label: 'Body',
    roles: ['core'],
    shape: 'box',
    mass: 2.4,
    dimensions: bodyDims,
    position: { x: 0, y: 0, z: 0 },
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-body',
      meshType: 'procedural',
      parameters: bodyParameters,
    },
  };
  parts.push(body);

  parts.push({
    id: 'mini-dorsal-scales',
    label: 'Back scale rows',
    roles: ['core', 'dorsal-scales'],
    shape: 'box',
    mass: 0.08,
    dimensions: bodyDims,
    position: { x: 0, y: 0, z: 0 },
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-dorsal-scales',
      meshType: 'procedural',
      parameters: dorsalParameters,
    },
  });
  joints.push(fixedJoint(body, 'mini-dorsal-scales', { x: 0, y: 0, z: 0 }));

  const neckPosition = {
    x: bodyDims.x * 0.38,
    y: bodyDims.y * 0.28,
    z: 0,
  };
  const neck: AssemblyPart = {
    id: 'mini-neck',
    label: 'Neck',
    roles: ['neck'],
    shape: 'cylinder',
    mass: 0.35,
    dimensions: neckDims,
    position: neckPosition,
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-neck',
      meshType: 'procedural',
      parameters: {
        ...sharedParameters,
        miniNeckCurve: bodyMorphology['miniNeckCurve'],
        miniNeckThickness: bodyMorphology['miniNeckThickness'],
      },
    },
  };
  parts.push(neck);
  joints.push(fixedJoint(body, 'mini-neck', neckPosition));

  const headPosition = {
    x: bodyDims.x * 0.46 + headDims.x * 0.3,
    y: bodyDims.y * 0.36,
    z: 0,
  };
  const head: AssemblyPart = {
    id: 'mini-head',
    label: 'Head',
    roles: ['head'],
    shape: 'box',
    mass: 0.8,
    dimensions: headDims,
    position: headPosition,
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-head',
      meshType: 'procedural',
      parameters: {
        ...sharedParameters,
        ...skullMorphology,
        miniMuzzleWidth: muzzleMorphology['miniMuzzleWidth'],
        miniMuzzleDepth: muzzleMorphology['miniMuzzleDepth'],
        miniEyeSize: breedMorphology.eyeSize,
        miniSnoutLength: muzzleLength,
        miniCheekTuft: features.cheekTuft,
        miniCrestScale:
          (CREST_SCALE[crestForm] ?? 1) * breedMorphology.crownScaleMultiplier,
        miniCrestCrown: crestForm === 'crest:crown' || crestForm === 'crest:crown-frill' ? 1 : 0,
        miniCrestFrill: crestForm === 'crest:frill' || crestForm === 'crest:crown-frill' ? 1 : 0,
      },
    },
  };
  parts.push(head);
  joints.push(fixedJoint(neck, 'mini-head', headPosition));

  // Horns and ears are true rig parts. Horns remain fixed to the skull, while
  // each ear owns a hinge at its root so learned poses can perk or fold it
  // without rotating the whole head a second time.
  for (const side of [-1, 1] as const) {
    const name = side < 0 ? 'left' : 'right';
    const hornRoot = {
      x: headPosition.x - headDims.x * 0.03,
      y: headPosition.y + headDims.y * 0.36,
      z: headPosition.z + side * headDims.z * 0.2,
    };
    const horn: AssemblyPart = {
      id: `mini-horn-${name}`,
      label: `${name} horn`,
      roles: ['horn', `horn-${name}`],
      shape: 'cylinder',
      mass: 0.06,
      dimensions: {
        x: headDims.y * 0.72,
        y: headDims.y * 0.13,
        z: headDims.z * 0.13,
      },
      position: hornRoot,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-horn',
        meshType: 'procedural',
        parameters: {
          ...sharedParameters,
          miniHornCurl: hornCurl,
          miniHornLength: 0.48,
          miniHornSpread: hornForm === 'horns:straight' ? 1.38 : 0.82,
          miniHornScale: breedMorphology.hornScale,
          miniHornSide: side,
        },
      },
    };
    parts.push(horn);
    joints.push(jointAtWorldPivot(head, horn, hornRoot));

    const earRoot = {
      x: headPosition.x - headDims.x * 0.12,
      y: headPosition.y + headDims.y * 0.4,
      z: headPosition.z + side * headDims.z * 0.25,
    };
    const ear: AssemblyPart = {
      id: `mini-ear-${name}`,
      label: `${name} ear`,
      roles: ['ear', `ear-${name}`],
      shape: 'box',
      mass: 0.035,
      dimensions: {
        x: headDims.z * 0.26,
        y: headDims.y * 0.42,
        z: headDims.z * 0.07,
      },
      position: earRoot,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-ear',
        meshType: 'procedural',
        parameters: {
          ...sharedParameters,
          miniEarScale: earScale,
          miniEarFold: EAR_FOLD[earForm] ?? 0.42,
          miniEarRoundness: breedMorphology.earRoundness,
          miniEarTuft: features.earTuft,
          miniEarSide: side,
        },
      },
    };
    parts.push(ear);
    joints.push(jointAtWorldPivot(head, ear, earRoot, 'hinge', { x: 1, y: 0, z: 0 }));
  }

  /*
   * The show-training ember cue needs a real articulated mouth. The original
   * animal drew its whole muzzle inside the head mesh, which left a learned cue
   * with nothing to move. This lower jaw remains species anatomy (not a trained
   * trait); practice changes only its pose.
   */
  const jawPosition = {
    x: headPosition.x + headDims.x * 0.38,
    y: headPosition.y - headDims.y * 0.22,
    z: 0,
  };
  parts.push({
    id: 'mini-jaw',
    label: 'Lower jaw',
    roles: ['jaw'],
    shape: 'box',
    mass: 0.12,
    dimensions: jawDims,
    position: jawPosition,
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-jaw',
      meshType: 'procedural',
      parameters: { ...sharedParameters, miniToothCount: muzzleMorphology['miniToothCount'] },
    },
  });
  joints.push(fixedJoint(head, 'mini-jaw', jawPosition));

  addInheritedPart(
    head, 'mini-brow-plates', 'Brow plates', ['brow-plates'], 'mini-dragon-brow-plates',
    headDims, headPosition, 'miniBrowScale', EXPANDED_PART_SCALE[browForm] ?? 0.68,
  );
  addInheritedPart(
    head, 'mini-whiskers', 'Whiskers', ['whiskers'], 'mini-dragon-whiskers',
    headDims, headPosition, 'miniWhiskerScale', EXPANDED_PART_SCALE[whiskerForm] ?? 0.65,
  );
  addInheritedPart(
    head, 'mini-chin-tuft', 'Chin tuft', ['chin-tuft'], 'mini-dragon-chin-tuft',
    headDims, headPosition, 'miniChinScale', EXPANDED_PART_SCALE[chinForm] ?? 0,
  );
  addInheritedPart(
    head,
    'mini-face-shield',
    'Rounded face shield',
    ['face-shield'],
    'mini-dragon-face-shield',
    headDims,
    headPosition,
    'miniFaceShieldScale',
    breedMorphology.faceShieldScale,
  );
  addInheritedPart(
    head,
    'mini-nose-horn',
    'Nose bumper horn',
    ['nose-horn'],
    'mini-dragon-nose-horn',
    headDims,
    headPosition,
    'miniNoseHornScale',
    breedMorphology.noseHornScale,
  );
  addInheritedPart(
    neck, 'mini-dewlap', 'Dewlap', ['dewlap'], 'mini-dragon-dewlap',
    neckDims, neckPosition, 'miniDewlapScale', EXPANDED_PART_SCALE[dewlapForm] ?? 0.65,
  );
  addInheritedPart(
    neck, 'mini-neck-ruff', 'Neck ruff', ['neck-ruff'], 'mini-dragon-neck-ruff',
    neckDims, neckPosition, 'miniRuffScale', EXPANDED_PART_SCALE[ruffForm] ?? 0.82,
  );
  addInheritedPart(
    body, 'mini-shoulder-plates', 'Shoulder plates', ['shoulder-plates'], 'mini-dragon-shoulder-plates',
    bodyDims, body.position, 'miniShoulderScale', EXPANDED_PART_SCALE[shoulderForm] ?? 0.32,
  );
  addInheritedPart(
    body, 'mini-belly-scutes', 'Belly scutes', ['belly-scutes'], 'mini-dragon-belly-scutes',
    bodyDims, body.position, 'miniBellyScuteScale', EXPANDED_PART_SCALE[bellyForm] ?? 0.68,
  );
  addInheritedPart(
    body, 'mini-flank-fins', 'Flank fins', ['flank-fins'], 'mini-dragon-flank-fins',
    bodyDims, body.position, 'miniFlankFinScale', EXPANDED_PART_SCALE[flankFinForm] ?? 0.68,
  );
  addInheritedPart(
    body, 'mini-hip-fins', 'Hip fins', ['hip-fins'], 'mini-dragon-hip-fins',
    bodyDims, body.position, 'miniHipFinScale', EXPANDED_PART_SCALE[hipFinForm] ?? 0.68,
  );

  // The long serpent combinations gain a short, genuinely connected torso
  // chain. The continuous body remains the soft under-structure, while these
  // overlapping plush sections carry rear limbs and tail so idle yaw travels
  // through the silhouette instead of merely waving the tail behind a rigid log.
  let rearBodyAnchor = body;
  if (breedMorphology.serpentSegmentScale > 0) {
    let previous = body;
    const segmentDimensions = {
      x: bodyDims.x * 0.48,
      y: bodyDims.y * 1.08,
      z: bodyDims.z * 1.08,
    };
    const stations = [
      { id: 'mini-serpent-mid-body', x: bodyDims.x * 0.06, pivotX: bodyDims.x * 0.28 },
      { id: 'mini-serpent-rear-body', x: -bodyDims.x * 0.28, pivotX: -bodyDims.x * 0.1 },
    ] as const;
    for (const station of stations) {
      const position = { x: station.x, y: 0, z: 0 };
      const segment: AssemblyPart = {
        id: station.id,
        label: station.id.includes('rear') ? 'Rear serpent body segment' : 'Middle serpent body segment',
        roles: ['core', 'serpent-segment'],
        shape: 'box',
        mass: 0.42,
        dimensions: segmentDimensions,
        position,
        color: paint.color,
        visualProfile: {
          profileId: 'mini-dragon-serpent-body-segment',
          meshType: 'procedural',
          parameters: {
            ...sharedParameters,
            miniSerpentSegmentScale: breedMorphology.serpentSegmentScale,
          },
        },
      };
      parts.push(segment);
      joints.push(jointAtWorldPivot(
        previous,
        segment,
        { x: station.pivotX, y: 0, z: 0 },
        'hinge',
        { x: 0, y: 1, z: 0 },
      ));
      previous = segment;
    }
    rearBodyAnchor = previous;
  }

  const legStations: readonly (readonly [string, number, number])[] = [
    ['front-left', 0.28, -1],
    ['front-right', 0.28, 1],
    ['rear-left', -0.3, -1],
    ['rear-right', -0.3, 1],
  ];
  for (const [name, axial, side] of legStations) {
    const limbRole = name.startsWith('front') ? 'front-leg' : 'rear-leg';
    const hipPosition = {
      x: bodyDims.x * axial,
      y: -bodyDims.y * 0.3,
      z: side * bodyDims.z * 0.32,
    };
    const thighDims = {
      x: legDims.x * 1.15,
      y: legDims.y * 0.42,
      z: legDims.z * 1.15,
    };
    const lowerLegDims = {
      x: legDims.x * 0.9,
      y: legDims.y * 0.58,
      z: legDims.z * 0.9,
    };
    const thighPosition = {
      x: hipPosition.x,
      y: hipPosition.y - thighDims.y * 0.4,
      z: hipPosition.z,
    };
    const kneePosition = {
      x: hipPosition.x,
      y: thighPosition.y - thighDims.y * 0.4,
      z: hipPosition.z,
    };
    const lowerLegPosition = {
      x: kneePosition.x,
      y: kneePosition.y - lowerLegDims.y * 0.4,
      z: kneePosition.z,
    };
    const upperLegId = `mini-leg-${name}`;
    const lowerLegId = `${upperLegId}-lower-leg`;
    const thigh: AssemblyPart = {
      id: upperLegId,
      label: `Upper leg ${name}`,
      roles: ['leg', limbRole],
      shape: 'cylinder',
      mass: 0.16,
      dimensions: thighDims,
      position: thighPosition,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-thigh',
        meshType: 'procedural',
        parameters: {
          ...sharedParameters,
          miniLegThickness: limbMorphology['miniLegThickness'],
        },
      },
    };
    const lowerLeg: AssemblyPart = {
      id: lowerLegId,
      label: `Lower leg ${name}`,
      roles: ['leg', limbRole],
      shape: 'cylinder',
      mass: 0.18,
      dimensions: lowerLegDims,
      position: lowerLegPosition,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-leg',
        meshType: 'procedural',
        parameters: { ...sharedParameters, ...limbMorphology, miniToeCount: features.toeCount },
      },
    };
    parts.push(thigh, lowerLeg);
    const limbParent = name.startsWith('rear') ? rearBodyAnchor : body;
    joints.push(fixedJointAt(limbParent, thigh, hipPosition));
    joints.push(fixedJointAt(thigh, lowerLeg, kneePosition));
  }

  for (const side of [-1, 1] as const) {
    const name = side < 0 ? 'left' : 'right';
    // High on the shoulder and clear of the flank, so a wing is never buried in
    // the coat it grows out of.
    const position = {
      x: bodyDims.x * 0.06,
      y: bodyDims.y * 0.34,
      z: side * bodyDims.z * 0.44,
    };
    parts.push({
      id: `mini-wing-${name}`,
      label: `Wing ${name}`,
      roles: ['wing'],
      shape: 'box',
      mass: 0.2,
      dimensions: wingDims,
      position,
      color: paint.color,
      visualProfile: {
        profileId: breedMorphology.wingProfileId,
        meshType: 'procedural',
        parameters: {
          ...sharedParameters,
          ...wingMorphology,
          miniFeatherCoverage: featherCoverage,
          miniFeatherLength: plumageForm === 'plumage:full' ? 1.12 : 0.84,
          miniFeatherVolume: breedMorphology.featherVolume,
          miniWingSpread: wingSpread,
          miniWingSide: side,
        },
      },
    });
    joints.push(fixedJoint(body, `mini-wing-${name}`, position));
  }

  // Every tail begins as one shared base. The split phenotype then branches at
  // the base's distal socket into two complete three-link tails; other forms
  // continue as one link into the inherited tip.
  const tailY = bodyDims.y * 0.08;
  const rootPivot = { x: -bodyDims.x * 0.42, y: tailY, z: 0 };
  const rootPosition = { x: rootPivot.x - tailDims.x * 0.43, y: tailY, z: 0 };
  const tailBase = makeTailPart(
    'mini-tail-1',
    'Shared tail base',
    tailDims,
    rootPosition,
    ['tail', 'tail-base'],
    identityQuaternion(),
    paint.color,
    sharedParameters,
    bodyMorphology,
  );
  parts.push(tailBase);
  joints.push(jointAtWorldPivot(rearBodyAnchor, tailBase, rootPivot));

  addInheritedPart(
    tailBase,
    'mini-tail-sail',
    'Tail sail',
    ['tail-sail'],
    'mini-dragon-tail-sail',
    { x: tailDims.x * 1.75, y: tailDims.y * 1.35, z: tailDims.z * 1.1 },
    tailBase.position,
    'miniTailSailScale',
    EXPANDED_PART_SCALE[tailSailForm] ?? 0.62,
  );

  if (tailForm === 'tail:split') {
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'left' : 'right';
      let previous = tailBase;
      for (const [index, taper] of [1.12, 0.94, 0.76].entries()) {
        const segmentDims = {
          ...scaled(tailDims, taper),
          x: tailDims.x * taper * 1.18,
        };
        const rotation = quaternionFromEuler({
          x: 0,
          y: side * [breedMorphology.splitTailAngle, 0.3, 0.18][index],
          z: side < 0 ? -[0.32, 0.24, 0.14][index] : [0.05, 0.035, 0.02][index],
        });
        const branchOffset = previous === tailBase ? side * tailDims.z * 0.3 : 0;
        const pivot = distalTailPivot(previous, branchOffset);
        const position = subtractVectors(
          pivot,
          rotateVectorByQuaternion({ x: segmentDims.x * 0.43, y: 0, z: 0 }, rotation),
        );
        const segment = makeTailPart(
          `mini-tail-${name}-${index + 1}`,
          `${name} tail ${index + 1}`,
          segmentDims,
          position,
          ['tail', `tail-${name}`],
          rotation,
          paint.color,
          sharedParameters,
          bodyMorphology,
        );
        parts.push(segment);
        joints.push(jointAtWorldPivot(previous, segment, pivot));
        previous = segment;
      }
      const tipRotation = previous.rotation ?? identityQuaternion();
      const tipPivot = distalTailPivot(previous);
      const tipPosition = subtractVectors(
        tipPivot,
        rotateVectorByQuaternion({ x: plumeDims.x * 0.12, y: 0, z: 0 }, tipRotation),
      );
      const tip = makeTailTip(
        `mini-tail-plume-${name}`,
        `${name} tail streamer`,
        plumeDims,
        tipPosition,
        ['tail', `tail-${name}`],
        tipRotation,
        paint.color,
        sharedParameters,
        features.plumeFan,
        tailStyle,
        TAIL_TIP_SCALE[tailForm] ?? 0.72,
      );
      parts.push(tip);
      joints.push(jointAtWorldPivot(previous, tip, tipPivot));
    }
  } else if (breedMorphology.forkTailBranches) {
    const secondDims = scaled(tailDims, 0.86);
    const secondPivot = distalTailPivot(tailBase);
    const secondPosition = subtractVectors(secondPivot, { x: secondDims.x * 0.43, y: 0, z: 0 });
    const second = makeTailPart(
      'mini-tail-2',
      'Tail 2',
      secondDims,
      secondPosition,
      ['tail'],
      identityQuaternion(),
      paint.color,
      sharedParameters,
      bodyMorphology,
    );
    parts.push(second);
    joints.push(jointAtWorldPivot(tailBase, second, secondPivot));

    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'left' : 'right';
      const branchDimensions = {
        x: plumeDims.x * 1.16,
        y: plumeDims.y * 0.72,
        z: plumeDims.z * 0.72,
      };
      const branchRotation = quaternionFromEuler({
        x: 0,
        y: side * 0.2,
        z: side < 0 ? -0.42 : 0.04,
      });
      const branchPivot = distalTailPivot(second, side * secondDims.z * 0.16);
      const branchPosition = subtractVectors(
        branchPivot,
        rotateVectorByQuaternion({ x: branchDimensions.x * 0.44, y: 0, z: 0 }, branchRotation),
      );
      const branch: AssemblyPart = {
        id: `mini-tail-fork-${name}`,
        label: `${name} fork-tail paddle`,
        roles: ['tail', `tail-${name}`],
        shape: 'box',
        mass: 0.08,
        dimensions: branchDimensions,
        position: branchPosition,
        rotation: branchRotation,
        color: paint.color,
        visualProfile: {
          profileId: 'mini-dragon-fork-tail-branch',
          meshType: 'procedural',
          parameters: { ...sharedParameters, miniForkTailScale: 1.08 },
        },
      };
      parts.push(branch);
      joints.push(jointAtWorldPivot(second, branch, branchPivot));
    }
  } else {
    const secondDims = scaled(tailDims, 0.8);
    const secondPivot = distalTailPivot(tailBase);
    const secondPosition = subtractVectors(secondPivot, { x: secondDims.x * 0.43, y: 0, z: 0 });
    const second = makeTailPart(
      'mini-tail-2',
      'Tail 2',
      secondDims,
      secondPosition,
      ['tail'],
      identityQuaternion(),
      paint.color,
      sharedParameters,
      bodyMorphology,
    );
    parts.push(second);
    joints.push(jointAtWorldPivot(tailBase, second, secondPivot));

    const plumePivot = distalTailPivot(second);
    const plumePosition = subtractVectors(plumePivot, { x: plumeDims.x * 0.12, y: 0, z: 0 });
    const plume = makeTailTip(
      'mini-tail-plume',
      'Tail plume',
      plumeDims,
      plumePosition,
      ['tail'],
      identityQuaternion(),
      paint.color,
      sharedParameters,
      features.plumeFan,
      tailStyle,
      TAIL_TIP_SCALE[tailForm] ?? 1,
    );
    parts.push(plume);
    joints.push(jointAtWorldPivot(second, plume, plumePivot));
  }

  return { parts, joints };
}

/**
 * These joints are used by the specimen pose engine as well as by simulation.
 * A blueprint with parts but no connections is an incomplete record of the animal.
 *
 * Pivots are part-local, so the parent's pivot is the offset to the child rather
 * than the child's world position — the distinction is invisible here and would
 * tear the animal apart the first time it reached a physics solver.
 */
function fixedJoint(
  parent: AssemblyPart,
  childId: string,
  childPosition: Vector3Data,
): AssemblyJoint {
  return {
    id: `${parent.id}--${childId}`,
    type: 'fixed',
    parentPartId: parent.id,
    childPartId: childId,
    pivotOnParent: {
      x: childPosition.x - parent.position.x,
      y: childPosition.y - parent.position.y,
      z: childPosition.z - parent.position.z,
    },
    pivotOnChild: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 1, z: 0 },
  };
}

function jointAtWorldPivot(
  parent: AssemblyPart,
  child: AssemblyPart,
  pivot: Vector3Data,
  type: JointType = 'fixed',
  axis: Vector3Data = { x: 0, y: 1, z: 0 },
): AssemblyJoint {
  const parentRotation = parent.rotation ?? identityQuaternion();
  const childRotation = child.rotation ?? identityQuaternion();
  return {
    id: `${parent.id}--${child.id}`,
    type,
    parentPartId: parent.id,
    childPartId: child.id,
    pivotOnParent: rotateVectorByQuaternion(
      subtractVectors(pivot, parent.position),
      invertQuaternion(parentRotation),
    ),
    pivotOnChild: rotateVectorByQuaternion(
      subtractVectors(pivot, child.position),
      invertQuaternion(childRotation),
    ),
    axis,
    behavior: type === 'hinge'
      ? { profile: 'springHinge', springStiffness: 8, springDamping: 0.9 }
      : undefined,
  };
}

function makeTailPart(
  id: string,
  label: string,
  dimensions: Vector3Data,
  position: Vector3Data,
  roles: AssemblyPart['roles'],
  rotation: QuaternionData,
  color: string,
  sharedParameters: Readonly<Record<string, string | number | boolean>>,
  bodyMorphology: Readonly<Record<string, number>>,
): AssemblyPart {
  return {
    id,
    label,
    roles,
    shape: 'box',
    mass: 0.2,
    dimensions,
    position,
    rotation,
    color,
    visualProfile: {
      profileId: 'mini-dragon-tail',
      meshType: 'procedural',
      parameters: {
        ...sharedParameters,
        miniTailCurve: bodyMorphology['miniTailCurve'],
        miniTailTaper: bodyMorphology['miniTailTaper'],
      },
    },
  };
}

function makeTailTip(
  id: string,
  label: string,
  dimensions: Vector3Data,
  position: Vector3Data,
  roles: AssemblyPart['roles'],
  rotation: QuaternionData,
  color: string,
  sharedParameters: Readonly<Record<string, string | number | boolean>>,
  plumeFan: number,
  tailStyle: number,
  tailTipScale: number,
): AssemblyPart {
  return {
    id,
    label,
    roles,
    shape: 'box',
    mass: 0.1,
    dimensions,
    position,
    rotation,
    color,
    visualProfile: {
      profileId: 'mini-dragon-tail-plume',
      meshType: 'procedural',
      parameters: {
        ...sharedParameters,
        miniPlumeFan: plumeFan,
        miniTailStyle: tailStyle,
        miniTailTipScale: tailTipScale,
      },
    },
  };
}

function distalTailPivot(part: AssemblyPart, zOffset = 0): Vector3Data {
  const rotation = part.rotation ?? identityQuaternion();
  return addVectors(
    part.position,
    rotateVectorByQuaternion(
      { x: -part.dimensions.x * 0.43, y: 0, z: zOffset },
      rotation,
    ),
  );
}

function addVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVectors(a: Vector3Data, b: Vector3Data): Vector3Data {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaled(
  value: Vector3Data | { x: number; y: number; z: number },
  factor: number,
): Vector3Data {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor };
}

/** A fixed joint whose pivot sits on an anatomical landmark, not the child centre. */
function fixedJointAt(
  parent: AssemblyPart,
  child: AssemblyPart,
  pivot: Vector3Data,
): AssemblyJoint {
  return {
    id: `${parent.id}--${child.id}`,
    type: 'fixed',
    parentPartId: parent.id,
    childPartId: child.id,
    pivotOnParent: {
      x: pivot.x - parent.position.x,
      y: pivot.y - parent.position.y,
      z: pivot.z - parent.position.z,
    },
    pivotOnChild: {
      x: pivot.x - child.position.x,
      y: pivot.y - child.position.y,
      z: pivot.z - child.position.z,
    },
    axis: { x: 0, y: 0, z: 1 },
  };
}

function componentScaled(value: Vector3Data, factor: number, shape: Vector3Data): Vector3Data {
  return {
    x: value.x * factor * shape.x,
    y: value.y * factor * shape.y,
    z: value.z * factor * shape.z,
  };
}
