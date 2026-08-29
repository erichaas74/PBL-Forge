import { AssemblyPartDefinition } from '../assembly-garage/data/assembly-part-definitions';

export type PartWorkshopDragonSpecies = 'lab' | 'mini';

export interface PartGeneContext {
  readonly id: string;
  readonly label: string;
  readonly relationship: string;
}

const ARENA_PROFILE_GENES: Readonly<Record<string, readonly PartGeneContext[]>> = {
  'dragon-body': [
    gene('body-type', 'Body plan', 'Arena chassis and silhouette'),
    gene('armor', 'Armor', 'Body plating and defensive build'),
    gene('spikes', 'Back spike rows', 'P_ shows three rows; pp shows one row'),
  ],
  'dragon-head-horned': [
    gene('horns', 'Horn plan', 'Horn count and inherited horn form'),
    gene('crest', 'Crest', 'Inherited head crest scale'),
    gene('sex', 'Sex-linked form', 'Sex-specific head and display anatomy'),
  ],
  'dragon-upper-jaw': [gene('fangs', 'Fangs', 'Inherited fang size')],
  'dragon-lower-jaw': [gene('fangs', 'Fangs', 'Inherited fang size')],
  'dragon-foot': [gene('claws', 'Claws', 'Inherited claw size')],
  'dragon-grasp-hand': [gene('claws', 'Claws', 'Inherited claw size')],
  'dragon-wing': [gene('wings', 'Primary wings', 'Presence and inherited wing form')],
  'dragon-secondary-wing': [
    gene('secondary-wings', 'Second wing pair', 'Adds an independently joined second pair'),
  ],
  'dragon-tail': [gene('tail-length', 'Tail length', 'Controls the extended Arena tail plan')],
  'dragon-tail-club': [gene('tail', 'Tail terminal', 'Club, stinger, or alternate inherited tip')],
  'dragon-tail-stinger': [gene('tail', 'Tail terminal', 'Inherited stinger expression')],
};

const SHOW_PROFILE_GENES: Readonly<Record<string, readonly PartGeneContext[]>> = {
  'mini-dragon-body': [
    gene('frame', 'Frame', 'Chest, waist, belly, and hip proportions'),
    gene('size', 'Size', 'Whole-animal scale'),
    gene('coat', 'Back scales', 'Smooth or baby-bumpy dorsal rows'),
    gene('plumage', 'Feather coverage', 'Full mantle, fringe, or scale-only coat'),
    gene('pattern', 'Coat pattern', 'Ash, gold, or codominant patterning'),
  ],
  'mini-dragon-dorsal-scales': [gene('coat', 'Back scales', 'Smooth or baby-bumpy dorsal rows')],
  'mini-dragon-neck': [
    gene('frame', 'Frame', 'Neck thickness and carriage'),
    gene('ruff', 'Neck ruff', 'Inherited collar anatomy'),
  ],
  'mini-dragon-head': [
    gene('eyes', 'Eye size', 'Large, medium, or small eyes'),
    gene('muzzle', 'Muzzle', 'Inherited snout proportions'),
    gene('crest', 'Crest', 'Crown and frill expression'),
  ],
  'mini-dragon-horn': [gene('horns', 'Horns', 'Curled or straight horn expression')],
  'mini-dragon-ear': [gene('ears', 'Ears', 'Inherited ear shape and fold')],
  'mini-dragon-jaw': [
    gene('muzzle', 'Muzzle', 'Jaw proportions and milk teeth'),
    gene('ember', 'Ember', 'Inherited display color'),
  ],
  'mini-dragon-thigh': [gene('legs', 'Legs', 'Inherited limb length and thickness')],
  'mini-dragon-leg': [gene('legs', 'Legs', 'Inherited limb and paw proportions')],
  'mini-dragon-wing': [
    gene('wings', 'Wings', 'Broad, small, or vestigial wings'),
    gene('plumage', 'Feather coverage', 'Inherited wing feathering'),
  ],
  'mini-dragon-fairy-wing': [gene('wings', 'Wings', 'Rounded fairy-wing breed expression')],
  'mini-dragon-aero-wing': [gene('wings', 'Wings', 'Long amphiptere-wing breed expression')],
  'mini-dragon-tail': [gene('tail', 'Tail', 'Inherited taper, curve, and tail plan')],
  'mini-dragon-tail-plume': [gene('tail', 'Tail', 'Inherited plume and terminal shape')],
  'mini-dragon-brow-plates': [gene('brow', 'Brow plates', 'Inherited brow armor')],
  'mini-dragon-whiskers': [gene('whiskers', 'Whiskers', 'Inherited whisker length')],
  'mini-dragon-chin-tuft': [gene('chin', 'Chin tuft', 'Inherited chin feathering')],
  'mini-dragon-dewlap': [gene('dewlap', 'Dewlap', 'Inherited throat display')],
  'mini-dragon-neck-ruff': [gene('ruff', 'Neck ruff', 'Inherited collar anatomy')],
  'mini-dragon-shoulder-plates': [gene('shoulders', 'Shoulder plates', 'Inherited shoulder armor')],
  'mini-dragon-belly-scutes': [gene('belly', 'Belly scutes', 'Inherited belly armor')],
  'mini-dragon-flank-fins': [gene('flank-fins', 'Flank fins', 'Inherited side-fin size')],
  'mini-dragon-hip-fins': [gene('hip-fins', 'Hip fins', 'Inherited hip-fin size')],
  'mini-dragon-tail-sail': [gene('tail-sail', 'Tail sail', 'Inherited tail webbing')],
  'mini-dragon-face-shield': [gene('frame', 'Breed frame', 'Triceratops breed anatomy')],
  'mini-dragon-nose-horn': [gene('horns', 'Breed horns', 'Triceratops nose-horn anatomy')],
  'mini-dragon-serpent-body-segment': [gene('frame', 'Breed frame', 'Serpent breed body extension')],
  'mini-dragon-fork-tail-branch': [gene('tail', 'Tail', 'Fork-tail breed expression')],
};

export function partGeneContext(
  definition: AssemblyPartDefinition | null,
  species: PartWorkshopDragonSpecies,
): readonly PartGeneContext[] {
  const profile = definition?.visualProfile?.profileId;
  if (!profile) return [];
  return (species === 'mini' ? SHOW_PROFILE_GENES : ARENA_PROFILE_GENES)[profile] ?? [];
}

function gene(id: string, label: string, relationship: string): PartGeneContext {
  return { id, label, relationship };
}
