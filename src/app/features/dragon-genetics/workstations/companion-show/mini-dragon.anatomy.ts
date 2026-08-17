import {
  AssemblyBlueprint,
  AssemblyJoint,
  AssemblyPart,
  Vector3Data,
} from '../../../../shared/assembly/domain/assembly.models';
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
  'tail:fork': 1,
  'tail:pom': 2,
};

const FRAME_SHAPE: Readonly<Record<string, Vector3Data>> = {
  'frame:long': { x: 1.34, y: 0.8, z: 0.84 },
  'frame:balanced': { x: 1, y: 1, z: 1 },
  'frame:round': { x: 0.82, y: 1.25, z: 1.18 },
};

export function buildMiniDragonBlueprint(
  genome: MiniGenome,
  individualId: string,
): AssemblyBlueprint {
  const paint = miniCoatPaint(genome, individualId);
  const features = miniIndividualFeatures(individualId);
  const proportions =
    miniPhenotypeFormId('size', genome) === 'size:teacup'
      ? TEACUP_PROPORTIONS
      : STANDARD_PROPORTIONS;

  const dorsalBumps = miniPhenotypeFormId('coat', genome) === 'coat:fluffy' ? 1 : 0;
  const hornCurl = miniPhenotypeFormId('horns', genome) === 'horns:curled' ? 1 : 0.05;
  const wingSpread = WING_SPREAD[miniPhenotypeFormId('wings', genome)] ?? 1;
  const earScale = EAR_SCALE[miniPhenotypeFormId('ears', genome)] ?? 1;
  const muzzleLength = MUZZLE_LENGTH[miniPhenotypeFormId('muzzle', genome)] ?? 0.46;
  const legLength = LEG_LENGTH[miniPhenotypeFormId('legs', genome)] ?? 1;
  const tailStyle = TAIL_STYLE[miniPhenotypeFormId('tail', genome)] ?? 2;
  const crestForm = miniPhenotypeFormId('crest', genome);
  const frameShape = FRAME_SHAPE[miniPhenotypeFormId('frame', genome)] ?? FRAME_SHAPE['frame:balanced'];

  /** Parameters every part carries, whatever it is. */
  const surfaceParameters = {
    // The inherited locus controls clear rows of rounded back scales rather than
    // an expensive full fur coat.
    miniDorsalBumps: dorsalBumps,
    miniPatchColor: paint.patchColor,
    miniEmberColor: paint.emberColor,
    miniJointBall: 1,
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
      parameters: { ...surfaceParameters },
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
      parameters: { ...surfaceParameters },
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
      parameters: { ...surfaceParameters },
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
        ...surfaceParameters,
        miniHornCurl: hornCurl,
        miniHornLength: 0.48,
        miniEyeSize: features.eyeSize,
        miniSnoutLength: muzzleLength,
        miniEarScale: earScale,
        miniEarTuft: features.earTuft,
        miniCheekTuft: features.cheekTuft,
        miniCrestCrown: crestForm === 'crest:crown' || crestForm === 'crest:crown-frill' ? 1 : 0,
        miniCrestFrill: crestForm === 'crest:frill' || crestForm === 'crest:crown-frill' ? 1 : 0,
      },
    },
  };
  parts.push(head);
  joints.push(fixedJoint(neck, 'mini-head', headPosition));

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
      parameters: { ...surfaceParameters },
    },
  });
  joints.push(fixedJoint(head, 'mini-jaw', jawPosition));

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
        parameters: { ...surfaceParameters },
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
        parameters: { ...surfaceParameters, miniToeCount: features.toeCount },
      },
    };
    parts.push(thigh, lowerLeg);
    joints.push(fixedJointAt(body, thigh, hipPosition));
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
        profileId: 'mini-dragon-wing',
        meshType: 'procedural',
        parameters: { ...surfaceParameters, miniWingSpread: wingSpread, miniWingSide: side },
      },
    });
    joints.push(fixedJoint(body, `mini-wing-${name}`, position));
  }

  // Tail: two short, slim tapering segments, then the inherited tip. Every
  // segment shares one centreline; raising successive unrotated pieces created
  // visible stair-step gaps even though each piece carried a socket ball.
  let previous = body;
  const tailY = bodyDims.y * 0.08;
  const tailJointOverlap = tailDims.x * 0.1;
  let cursorX = -bodyDims.x * 0.44;
  for (const [index, taper] of [1, 0.8].entries()) {
    const segmentDims = scaled(tailDims, taper);
    cursorX -= segmentDims.x * 0.5 - tailJointOverlap;
    const position = { x: cursorX, y: tailY, z: 0 };
    const segment: AssemblyPart = {
      id: `mini-tail-${index + 1}`,
      label: `Tail ${index + 1}`,
      roles: ['tail'],
      shape: 'box',
      mass: 0.22,
      dimensions: segmentDims,
      position,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-tail',
        meshType: 'procedural',
        parameters: { ...surfaceParameters },
      },
    };
    parts.push(segment);
    joints.push(fixedJoint(previous, segment.id, position));
    previous = segment;
    cursorX -= segmentDims.x * 0.5;
  }

  // The plume's root ball sits at +12% of its local length. Put that ball just
  // inside the final segment rather than placing the two surfaces edge to edge.
  const plumePosition = {
    x: cursorX - plumeDims.x * 0.12 + tailJointOverlap,
    y: tailY,
    z: 0,
  };
  parts.push({
    id: 'mini-tail-plume',
    label: 'Tail plume',
    roles: ['tail'],
    shape: 'box',
    mass: 0.12,
    dimensions: plumeDims,
    position: plumePosition,
    color: paint.color,
    visualProfile: {
      profileId: 'mini-dragon-tail-plume',
      meshType: 'procedural',
      parameters: {
        ...surfaceParameters,
        miniPlumeFan: features.plumeFan,
        miniTailStyle: tailStyle,
      },
    },
  });
  joints.push(fixedJoint(previous, 'mini-tail-plume', plumePosition));

  return { parts, joints };
}

/**
 * Joints are authored even though the specimen viewer never reads them: a
 * blueprint with parts but no connections is an incomplete record of the animal,
 * and anything that later simulates one would have to invent them.
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

function scaled(value: Vector3Data | { x: number; y: number; z: number }, factor: number): Vector3Data {
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

function componentScaled(
  value: Vector3Data,
  factor: number,
  shape: Vector3Data,
): Vector3Data {
  return {
    x: value.x * factor * shape.x,
    y: value.y * factor * shape.y,
    z: value.z * factor * shape.z,
  };
}
