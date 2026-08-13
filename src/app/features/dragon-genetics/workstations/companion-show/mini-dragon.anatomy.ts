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
  head: { x: 0.5, y: 0.58, z: 0.52 },
  leg: { x: 0.12, y: 0.3, z: 0.12 },
  wing: { x: 0.32, y: 0.28, z: 0.56 },
  tail: { x: 0.28, y: 0.22, z: 0.22 },
  plume: { x: 0.34, y: 0.24, z: 0.24 },
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

  const coatDepth = miniPhenotypeFormId('coat', genome) === 'coat:fluffy' ? 1 : 0.16;
  const hornCurl = miniPhenotypeFormId('horns', genome) === 'horns:curled' ? 1 : 0.05;
  const wingSpread = WING_SPREAD[miniPhenotypeFormId('wings', genome)] ?? 1;

  /** Parameters every part carries, whatever it is. */
  const coatParameters = {
    miniCoatDepth: coatDepth,
    miniPatchColor: paint.patchColor,
    miniEmberColor: paint.emberColor,
  };

  const bodyDims = scaled(BASE.body, proportions.body);
  const headDims = scaled(BASE.head, proportions.head);
  const legDims = {
    x: BASE.leg.x * proportions.body,
    y: BASE.leg.y * proportions.leg,
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
      parameters: { ...coatParameters },
    },
  };
  parts.push(body);

  const headPosition = {
    x: bodyDims.x * 0.46 + headDims.x * 0.3,
    y: bodyDims.y * 0.36,
    z: 0,
  };
  parts.push({
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
        ...coatParameters,
        miniHornCurl: hornCurl,
        miniHornLength: 0.75,
        miniEyeSize: features.eyeSize,
        miniSnoutLength: features.snoutLength,
        miniEarTuft: features.earTuft,
      },
    },
  });
  joints.push(fixedJoint(body, 'mini-head', headPosition));

  const legStations: readonly (readonly [string, number, number])[] = [
    ['front-left', 0.28, -1],
    ['front-right', 0.28, 1],
    ['rear-left', -0.3, -1],
    ['rear-right', -0.3, 1],
  ];
  for (const [name, axial, side] of legStations) {
    const position = {
      x: bodyDims.x * axial,
      y: -(bodyDims.y * 0.3 + legDims.y * 0.5),
      z: side * bodyDims.z * 0.32,
    };
    parts.push({
      id: `mini-leg-${name}`,
      label: `Leg ${name}`,
      roles: ['leg'],
      shape: 'cylinder',
      mass: 0.3,
      dimensions: legDims,
      position,
      color: paint.color,
      visualProfile: {
        profileId: 'mini-dragon-leg',
        meshType: 'procedural',
        parameters: { ...coatParameters, miniToeCount: features.toeCount },
      },
    });
    joints.push(fixedJoint(body, `mini-leg-${name}`, position));
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
        parameters: { ...coatParameters, miniWingSpread: wingSpread, miniWingSide: side },
      },
    });
    joints.push(fixedJoint(body, `mini-wing-${name}`, position));
  }

  // Tail: two tapering segments, then the plume.
  let previous = body;
  let cursorX = -bodyDims.x * 0.46;
  for (const [index, taper] of [1, 0.8].entries()) {
    const segmentDims = scaled(tailDims, taper);
    cursorX -= segmentDims.x * 0.5;
    const position = { x: cursorX, y: bodyDims.y * 0.06 * (index + 1), z: 0 };
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
        parameters: { ...coatParameters },
      },
    };
    parts.push(segment);
    joints.push(fixedJoint(previous, segment.id, position));
    previous = segment;
    cursorX -= segmentDims.x * 0.5;
  }

  const plumePosition = { x: cursorX - plumeDims.x * 0.2, y: bodyDims.y * 0.14, z: 0 };
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
      parameters: { ...coatParameters, miniPlumeFan: features.plumeFan },
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
