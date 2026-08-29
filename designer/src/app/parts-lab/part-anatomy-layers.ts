import { PartWorkshopDragonSpecies } from './part-workshop-context';

export type PartAnatomyLayerCategory = 'Form' | 'Surface' | 'Appendage' | 'Support';

/**
 * A human-sized editing layer over the renderer's flat parameter contract.
 *
 * Parameter keys stay canonical in the shared registry. This catalog only
 * groups them into anatomical ideas so the workshop does not present one long,
 * context-free slider stack.
 */
export interface PartAnatomyLayer {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: PartAnatomyLayerCategory;
  readonly parameterKeys: readonly string[];
  readonly geneIds: readonly string[];
  readonly structural?: boolean;
  readonly visibilityKey?: string;
  /** Child object names used to focus one generated layer inside a part. */
  readonly meshNamePrefixes?: readonly string[];
  /** Spatial handle channel available while viewing the whole assembly. */
  readonly placement?: 'part' | 'back-spikes';
}

const layer = (
  id: string,
  label: string,
  description: string,
  category: PartAnatomyLayerCategory,
  parameterKeys: readonly string[] = [],
  options: {
    readonly geneIds?: readonly string[];
    readonly structural?: boolean;
    readonly visibilityKey?: string;
    readonly meshNamePrefixes?: readonly string[];
    readonly placement?: 'part' | 'back-spikes';
  } = {},
): PartAnatomyLayer => ({
  id,
  label,
  description,
  category,
  parameterKeys,
  geneIds: options.geneIds ?? [],
  structural: options.structural,
  visibilityKey: options.visibilityKey,
  meshNamePrefixes: options.meshNamePrefixes,
  placement: options.placement,
});

const CLASSIC_LAYERS: Readonly<Record<string, readonly PartAnatomyLayer[]>> = {
  'dragon-body': [
    layer(
      'core-silhouette',
      'Core silhouette',
      'Neck, chest, waist, hips, spine, and tail-root stations.',
      'Form',
      [
        'bodyNeckWidth', 'bodyChestWidth', 'bodyChestHeight', 'bodyWaistWidth',
        'bodyHipWidth', 'bodySpineArch', 'bodyTailRootWidth',
      ],
      { geneIds: ['body-type'], structural: true, meshNamePrefixes: ['dragon-body-torso'] },
    ),
    layer(
      'belly-form',
      'Belly form',
      'The depth of the protected belly volume beneath the torso.',
      'Form',
      ['bodyBellyDepth'],
      { geneIds: ['body-type'], structural: true, meshNamePrefixes: ['dragon-belly'] },
    ),
    layer(
      'archetype-details',
      'Shoulder, hip, and armor forms',
      'Body-type forms such as shoulder mantles, haunches, keels, and scapulae.',
      'Surface',
      ['bodyArchetype'],
      {
        geneIds: ['body-type', 'armor'],
        structural: true,
        meshNamePrefixes: [
          'dragon-body-wyvern-', 'dragon-body-drake-', 'dragon-body-four-wing-',
          'dragon-body-regal-', 'dragon-body-bulwark-', 'dragon-body-courser-',
          'dragon-body-prowler-',
        ],
      },
    ),
    layer(
      'back-spike-rows',
      'Back spike rows',
      'Count, height, thickness, lean, and ridge coverage for the dorsal spikes.',
      'Surface',
      [
        'spikeCount', 'spikeSpread', 'spikeHeight', 'spikeRadius', 'spikeLean',
        'backSpikeCount', 'backSpikeRows', 'backSpikeScale',
      ],
      {
        geneIds: ['spikes'],
        visibilityKey: 'spikeCount',
        meshNamePrefixes: ['dragon-back-spike-row-'],
        placement: 'back-spikes',
      },
    ),
    layer(
      'inherited-surface',
      'Inherited scale surface',
      'Scale pattern and inherited pigment applied across the torso.',
      'Surface',
      ['scalePattern', 'patternColor'],
      { geneIds: ['armor'] },
    ),
  ],
  'dragon-head-horned': [
    layer('skull-form', 'Skull and muzzle', 'Braincase, muzzle, cheek, and brow proportions.', 'Form',
      ['cranium', 'browRidge', 'muzzleDepth', 'muzzleWidth', 'muzzleDrop', 'cheek'], { structural: true }),
    layer('eyes', 'Eyes', 'Size and exact paired placement around the eye sockets.', 'Surface',
      ['eyeAxial', 'eyeOffsetX', 'eyeOffsetY', 'eyeOffsetZ', 'eyeScale', 'eyeColor'],
      { meshNamePrefixes: ['dragon-eye-'] }),
    layer('horn-rack', 'Horn rack', 'Size, placement, splay, and rake of the main horn pair.', 'Appendage',
      ['hornLength', 'hornRadius', 'hornOffsetX', 'hornOffsetY', 'hornOffsetZ', 'hornSplay', 'hornRake'],
      { geneIds: ['horns'], meshNamePrefixes: ['dragon-horn-'] }),
    layer('brow-spikes', 'Brow spikes', 'Size, placement, splay, and rake above the eye line.', 'Appendage',
      ['browLength', 'browOffsetX', 'browOffsetY', 'browOffsetZ', 'browSplay', 'browRake'],
      { visibilityKey: 'browLength', meshNamePrefixes: ['dragon-brow-spike-'] }),
    layer('crest', 'Head crest', 'Inherited crest size with authored placement and tilt.', 'Appendage',
      ['crestScale', 'crestOffsetX', 'crestOffsetY', 'crestOffsetZ', 'crestTilt'],
      { geneIds: ['crest'], meshNamePrefixes: ['dragon-genetic-crest'] }),
    layer('sex-display', 'Sex-linked display', 'Sex-specific frill placement and tilt.', 'Appendage',
      ['sex', 'sexDisplayOffsetX', 'sexDisplayOffsetY', 'sexDisplayOffsetZ', 'sexDisplayTilt'],
      { geneIds: ['sex'], structural: true, meshNamePrefixes: ['dragon-sex-display'] }),
    layer('wise-regalia', 'Wise Dragon regalia', 'Spectacles and beard placement for the Wise Dragon avatar.', 'Appendage',
      ['wiseAvatar', 'wiseRegaliaOffsetX', 'wiseRegaliaOffsetY', 'wiseRegaliaOffsetZ', 'wiseRegaliaScale'],
      { structural: true, meshNamePrefixes: ['wise-dragon-'] }),
  ],
  'dragon-upper-jaw': jawLayers('upper'),
  'dragon-lower-jaw': jawLayers('lower'),
  'dragon-foot': [
    layer('talons', 'Talons', 'Talon count, length, and thickness.', 'Appendage',
      ['talonCount', 'talonLength', 'talonRadius'], { geneIds: ['claws'] }),
    layer('claw-expression', 'Inherited claw size', 'Genome-owned scale applied to every talon.', 'Appendage',
      ['clawScale'], { geneIds: ['claws'] }),
  ],
  'dragon-grasp-hand': [
    layer('grasping-fingers', 'Grasping fingers', 'Finger count, reach, thickness, wrist offset, and splay.', 'Appendage',
      ['fingerCount', 'fingerLength', 'fingerRadius', 'palmLength', 'fingerSplay'], { structural: true }),
    layer('grasping-claws', 'Grasping claws', 'Inherited claw scale at the finger tips.', 'Appendage',
      ['clawScale'], { geneIds: ['claws'] }),
  ],
  'dragon-wing': wingLayers(),
  'dragon-secondary-wing': wingLayers(['secondary-wings']),
  'dragon-tail-club': [
    layer('club-spikes', 'Tail-club spikes', 'Spike count, reach, and thickness around the club.', 'Appendage',
      ['spikeCount', 'spikeLength', 'spikeRadius', 'tailClubSpikeCount', 'tailClubSpikeScale'],
      { geneIds: ['tail'], visibilityKey: 'spikeCount', placement: 'part' }),
  ],
  'dragon-tail-stinger': [
    layer('stinger', 'Tail stinger', 'The inherited terminal blade at the end of the tail chain.', 'Appendage',
      [], { geneIds: ['tail'], structural: true, placement: 'part' }),
  ],
};

const MINI_LAYERS: Readonly<Record<string, readonly PartAnatomyLayer[]>> = {
  'mini-dragon-body': [
    layer('mini-core-form', 'Core body', 'Chest, waist, belly, hips, and spine stations.', 'Form',
      ['miniChestScale', 'miniWaistScale', 'miniBellyScale', 'miniHipScale', 'miniSpineArch'],
      { geneIds: ['frame'], structural: true }),
    layer('mini-feather-mantle', 'Feather mantle', 'Coverage, length, and volume of the body plumage.', 'Surface',
      ['miniFeatherCoverage', 'miniFeatherLength', 'miniFeatherVolume'],
      {
        geneIds: ['plumage'],
        visibilityKey: 'miniFeatherCoverage',
        meshNamePrefixes: ['mini-dragon-body-feathers'],
      }),
    layer('mini-coat-patches', 'Coat patches', 'Scale of the second-colour coat markings.', 'Surface',
      ['miniPatchScale'], { geneIds: ['pattern'], meshNamePrefixes: ['mini-dragon-coat-patch'] }),
    layer('mini-throat-ember', 'Throat ember', 'Protected glow marker tucked beneath the neck.', 'Surface',
      [], { structural: true, meshNamePrefixes: ['mini-dragon-throat-ember'] }),
  ],
  'mini-dragon-dorsal-scales': [
    layer('mini-scale-seating', 'Body-fit stations', 'Chest, waist, belly, hip, and spine fit for the separate scale rows.', 'Support',
      ['miniChestScale', 'miniWaistScale', 'miniBellyScale', 'miniHipScale', 'miniSpineArch'], { structural: true }),
    layer('mini-dorsal-rows', 'Dorsal scale rows', 'Scale size and smooth-to-bumpy expression.', 'Surface',
      ['miniScaleSize', 'miniDorsalBumps'], {
        geneIds: ['coat'],
        meshNamePrefixes: ['mini-dragon-dorsal-'],
        placement: 'part',
      }),
  ],
  'mini-dragon-neck': [
    layer('mini-neck-form', 'Neck form', 'Curve and thickness of the hinged neck.', 'Form',
      ['miniNeckCurve', 'miniNeckThickness'], { geneIds: ['frame'], structural: true }),
    layer('mini-neck-joint', 'Neck joint cover', 'Rounded cover that closes the neck hinge.', 'Support',
      ['miniJointBall'], { structural: true }),
  ],
  'mini-dragon-head': [
    layer('mini-skull', 'Skull', 'Length, height, and width of the cranium.', 'Form',
      ['miniSkullLength', 'miniSkullHeight', 'miniSkullWidth'], { structural: true }),
    layer('mini-muzzle', 'Muzzle', 'Snout length, muzzle width, and muzzle depth.', 'Form',
      ['miniSnoutLength', 'miniMuzzleWidth', 'miniMuzzleDepth'], { geneIds: ['muzzle'], structural: true }),
    layer('mini-eyes', 'Eyes', 'Eye size and spacing.', 'Surface',
      ['miniEyeSize', 'miniEyeSpacing'], { geneIds: ['eyes'] }),
    layer('mini-cheek-tuft', 'Cheek tufts', 'Soft feather tufts beside the face.', 'Appendage',
      ['miniCheekTuft'], { visibilityKey: 'miniCheekTuft' }),
    layer('mini-crest', 'Crown and frill', 'Crest crown, side frill, and inherited display scale.', 'Appendage',
      ['miniCrestCrown', 'miniCrestFrill', 'miniCrestScale'], { geneIds: ['crest'] }),
  ],
  'mini-dragon-horn': [optionalMiniLayer('horns', 'Horns', 'Curl, length, spread, side, and overall horn scale.',
    ['miniHornCurl', 'miniHornLength', 'miniHornSpread', 'miniHornSide', 'miniHornScale'], 'miniHornScale')],
  'mini-dragon-ear': [optionalMiniLayer('ears', 'Ears', 'Fold, roundness, tuft, side, and overall ear scale.',
    ['miniEarFold', 'miniEarRoundness', 'miniEarTuft', 'miniEarSide', 'miniEarScale'], 'miniEarScale')],
  'mini-dragon-jaw': [optionalMiniLayer('muzzle', 'Lower jaw and milk teeth', 'Inherited milk-tooth count on the lower muzzle.',
    ['miniToothCount'])],
  'mini-dragon-thigh': [
    layer('mini-thigh', 'Hip and thigh', 'Thickness of the upper walking limb.', 'Form',
      ['miniLegThickness', 'miniJointBall'], { geneIds: ['legs'], structural: true }),
  ],
  'mini-dragon-leg': [
    layer('mini-lower-leg', 'Lower leg and paw', 'Leg thickness and paw volume.', 'Form',
      ['miniLegThickness', 'miniPawScale', 'miniJointBall'], { geneIds: ['legs'], structural: true }),
    layer('mini-toes', 'Toes', 'Toe count and toe splay.', 'Appendage',
      ['miniToeCount', 'miniToeSplay'], { geneIds: ['legs'] }),
  ],
  'mini-dragon-wing': miniWingLayers(),
  'mini-dragon-fairy-wing': miniWingLayers(),
  'mini-dragon-aero-wing': miniWingLayers(),
  'mini-dragon-tail': [
    layer('mini-tail-form', 'Tail segment', 'Taper and curve of each articulated tail segment.', 'Form',
      ['miniTailTaper', 'miniTailCurve', 'miniJointBall'], {
        geneIds: ['tail'], structural: true, placement: 'part',
      }),
  ],
  'mini-dragon-tail-plume': [optionalMiniLayer('tail', 'Tail tip and plume', 'Tail style, tip size, and plume fan.',
    ['miniTailStyle', 'miniTailTipScale', 'miniPlumeFan'], 'miniPlumeFan')],
  'mini-dragon-brow-plates': [optionalMiniLayer('brow', 'Brow plates', 'Inherited armor plates above the eyes.', ['miniBrowScale'], 'miniBrowScale')],
  'mini-dragon-whiskers': [optionalMiniLayer('whiskers', 'Whiskers', 'Inherited sensory whisker length.', ['miniWhiskerScale'], 'miniWhiskerScale')],
  'mini-dragon-chin-tuft': [optionalMiniLayer('chin', 'Chin tuft', 'Inherited feather tuft beneath the jaw.', ['miniChinScale'], 'miniChinScale')],
  'mini-dragon-dewlap': [optionalMiniLayer('dewlap', 'Dewlap', 'Inherited throat display membrane.', ['miniDewlapScale'], 'miniDewlapScale')],
  'mini-dragon-neck-ruff': [optionalMiniLayer('ruff', 'Neck ruff', 'Inherited feather collar around the neck.', ['miniRuffScale'], 'miniRuffScale')],
  'mini-dragon-shoulder-plates': [optionalMiniLayer('shoulders', 'Shoulder plates', 'Inherited shoulder armor.', ['miniShoulderScale'], 'miniShoulderScale')],
  'mini-dragon-belly-scutes': [optionalMiniLayer('belly', 'Belly scutes', 'Inherited protective belly scales.', ['miniBellyScuteScale'], 'miniBellyScuteScale')],
  'mini-dragon-flank-fins': [optionalMiniLayer('flank-fins', 'Flank fins', 'Inherited fins along the sides of the body.', ['miniFlankFinScale'], 'miniFlankFinScale')],
  'mini-dragon-hip-fins': [optionalMiniLayer('hip-fins', 'Hip fins', 'Inherited fins mounted above the hips.', ['miniHipFinScale'], 'miniHipFinScale')],
  'mini-dragon-tail-sail': [optionalMiniLayer('tail-sail', 'Tail sail', 'Inherited webbing along the tail.', ['miniTailSailScale'], 'miniTailSailScale')],
  'mini-dragon-face-shield': [optionalMiniLayer('frame', 'Face shield', 'Broad Triceratops-style skull shield.', ['miniFaceShieldScale'], 'miniFaceShieldScale')],
  'mini-dragon-nose-horn': [optionalMiniLayer('horns', 'Nose horn', 'Forward Triceratops-style nose horn.', ['miniNoseHornScale'], 'miniNoseHornScale')],
  'mini-dragon-serpent-body-segment': [optionalMiniLayer('frame', 'Serpent body segment', 'Extra articulated body length for the serpent form.', ['miniSerpentSegmentScale'], 'miniSerpentSegmentScale')],
  'mini-dragon-fork-tail-branch': [optionalMiniLayer('tail', 'Fork-tail branch', 'Secondary tail branch and terminal paddle.', ['miniForkTailScale'], 'miniForkTailScale')],
};

/** Returns curated layers or a safe fallback for a newly introduced profile. */
export function partAnatomyLayers(
  profileId: string,
  species: PartWorkshopDragonSpecies,
  availableParameterKeys: readonly string[],
): readonly PartAnatomyLayer[] {
  const curated = (species === 'mini' ? MINI_LAYERS : CLASSIC_LAYERS)[profileId];
  if (curated) return curated;

  return [layer(
    'part-anatomy',
    availableParameterKeys.length ? 'Part anatomy' : 'Structural mesh',
    availableParameterKeys.length
      ? 'Registered controls for this procedural part.'
      : 'This part is structural and does not expose a removable visual layer.',
    'Form',
    availableParameterKeys,
    { structural: availableParameterKeys.length === 0 },
  )];
}

function jawLayers(variant: 'upper' | 'lower'): readonly PartAnatomyLayer[] {
  const teeth = layer(
    'teeth',
    'Teeth',
    'Per-jaw count, size, row spacing, position, splay, and rake.',
    'Appendage',
    [
      'toothCount', 'toothHeight', 'toothRadius', 'toothStart', 'toothRowSpan',
      'toothOffsetX', 'toothOffsetY', 'toothOffsetZ', 'toothSplay', 'toothRake',
    ],
    { visibilityKey: 'toothCount', meshNamePrefixes: ['dragon-tooth-'] },
  );
  if (variant === 'lower') return [teeth];
  return [
    teeth,
    layer('nostrils', 'Nostrils', 'Size and paired placement on the tapered muzzle.', 'Surface',
      ['nostrilOffsetX', 'nostrilOffsetY', 'nostrilOffsetZ', 'nostrilScale'],
      { meshNamePrefixes: ['dragon-nostril-'] }),
    layer('nose-horn', 'Nose horn', 'Size, position, sideways angle, and rake on the bridge.', 'Appendage',
      [
        'noseHornLength', 'noseHornOffsetX', 'noseHornOffsetY', 'noseHornOffsetZ',
        'noseHornSway', 'noseHornRake',
      ],
      { visibilityKey: 'noseHornLength', meshNamePrefixes: ['dragon-nose-horn'] }),
    layer('fangs', 'Inherited fangs', 'Genome-owned fang size with authored placement, splay, and rake.', 'Appendage',
      ['fangScale', 'fangOffsetX', 'fangOffsetY', 'fangOffsetZ', 'fangSplay', 'fangRake'],
      { geneIds: ['fangs'], meshNamePrefixes: ['dragon-fang-'] }),
  ];
}

function wingLayers(geneIds: readonly string[] = ['wings']): readonly PartAnatomyLayer[] {
  return [layer('wing-planform', 'Wing membrane and fingers', 'Camber, sag, dihedral, and trailing-edge scallop.', 'Form',
    ['camber', 'fingerSag', 'dihedral', 'scallop'], { geneIds, structural: true, placement: 'part' })];
}

function miniWingLayers(): readonly PartAnatomyLayer[] {
  return [
    layer('mini-wing-planform', 'Wing planform', 'Spread, chord, sweep, scallop, camber, and mirrored side.', 'Form',
      ['miniWingSpread', 'miniWingChord', 'miniWingSweep', 'miniWingScallop', 'miniWingCamber', 'miniWingSide'],
      { geneIds: ['wings'], structural: true, placement: 'part' }),
    layer('mini-wing-feathers', 'Wing feathers', 'Coverage, length, and volume of the feather layer.', 'Surface',
      ['miniFeatherCoverage', 'miniFeatherLength', 'miniFeatherVolume'],
      {
        geneIds: ['plumage'],
        visibilityKey: 'miniFeatherCoverage',
        meshNamePrefixes: ['mini-dragon-wing-feathers'],
        placement: 'part',
      }),
  ];
}

function optionalMiniLayer(
  geneId: string,
  label: string,
  description: string,
  keys: readonly string[],
  visibilityKey?: string,
): PartAnatomyLayer {
  return layer(geneId, label, description, 'Appendage', keys, {
    geneIds: [geneId],
    visibilityKey,
    placement: 'part',
  });
}
