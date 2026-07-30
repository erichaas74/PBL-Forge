import { DragonTraitId } from '../domain/dragon-lab.models';

export type GalleryTraitCategory =
  | 'external-structure'
  | 'color-pattern'
  | 'ability'
  | 'movement-condition'
  | 'behavior'
  | 'life-history'
  | 'sensory';

export interface DragonGalleryTrait {
  id: string;
  traitId?: DragonTraitId;
  icon: string;
  name: string;
  category: GalleryTraitCategory;
  variation: string;
  competitionConnection: string;
  evidenceNeeded: string;
}

export interface FirstImpressionPrompt {
  id: string;
  prompt: string;
  note: string;
}

export interface TraitOrTrickChallenge {
  id: string;
  left: string;
  right: string;
  inheritedSide: 'left' | 'right';
  evidence: string;
}

/**
 * Module 1's visual field guide. The four modeled genes match the later breeding and arena
 * pipeline; the remaining entries deliberately require training, condition, or life-history
 * evidence so students do not treat every impressive model feature as inherited.
 */
export const DRAGON_GALLERY_TRAITS: readonly DragonGalleryTrait[] = [
  {
    id: 'wings',
    traitId: 'wings',
    icon: 'W',
    name: 'Wing structure',
    category: 'external-structure',
    variation: 'Winged and wingless body plans; future models may add span and membrane variation.',
    competitionConnection: 'A winged champion can use the Wing buffet move in the final arena.',
    evidenceNeeded: 'Family records, hatch measurements, and a gene record are needed to support inheritance.',
  },
  {
    id: 'scales',
    traitId: 'scales',
    icon: 'S',
    name: 'Scale pattern',
    category: 'color-pattern',
    variation: 'Spotted and solid scale patterns are visible on the complete dragon model.',
    competitionConnection: 'Scale pattern changes the generated champion’s appearance; it does not prove defense or value.',
    evidenceNeeded: 'Compare the hatch record with parent and gene records. Ash, dust, or sunlight can also change appearance.',
  },
  {
    id: 'horns',
    traitId: 'horns',
    icon: 'H',
    name: 'Horn structure',
    category: 'external-structure',
    variation: 'Horned and hornless profiles; future models can vary horn curve, direction, and number.',
    competitionConnection: 'Horns affect the generated body silhouette and may change collisions, but do not guarantee a win.',
    evidenceNeeded: 'A hatch record and gene/family evidence distinguish inherited structure from damage during life.',
  },
  {
    id: 'fire',
    traitId: 'fire',
    icon: 'F',
    name: 'Elemental ability',
    category: 'ability',
    variation: 'Fire-breathing and non-fire-breathing readouts in the current classroom model.',
    competitionConnection: 'The final arena connects the fire trait to the champion’s bite/fire attack system.',
    evidenceNeeded: 'A controlled ability test plus gene and parent records; training timing alone does not prove origin.',
  },
  {
    id: 'flight-condition',
    icon: '↗',
    name: 'Flight condition',
    category: 'movement-condition',
    variation: 'Endurance, turn control, and muscle condition can change with exercise, nutrition, and injury.',
    competitionConnection: 'Movement, boost use, timing, and player control influence the arena result.',
    evidenceNeeded: 'Training logs, nutrition records, repeated performance trials, and baseline measurements.',
  },
  {
    id: 'injury',
    icon: '+',
    name: 'Injury and condition',
    category: 'life-history',
    variation: 'Scars, broken structures, ash coatings, and sun bleaching can alter a dragon’s visible model.',
    competitionConnection: 'Condition may affect an individual competitor without being passed to its offspring.',
    evidenceNeeded: 'Hatch photographs, intake records, medical notes, and environment or incident logs.',
  },
  {
    id: 'trained-response',
    icon: '!',
    name: 'Trained response',
    category: 'behavior',
    variation: 'Recall signals, preferred routes, defensive crouches, and practiced maneuvers.',
    competitionConnection: 'Tactics and control choices can change the outcome even when two dragons have similar traits.',
    evidenceNeeded: 'A dated training log showing repeated practice and a change in performance over time.',
  },
  {
    id: 'senses',
    icon: '◎',
    name: 'Sensory response',
    category: 'sensory',
    variation: 'Future models may display eye, pupil, crest, or sensory-organ variation.',
    competitionConnection: 'A later sensory challenge could test detection without assuming appearance proves ability.',
    evidenceNeeded: 'Controlled sensory trials plus family and gene records if inheritance is claimed.',
  },
] as const;

export const FIRST_IMPRESSION_PROMPTS: readonly FirstImpressionPrompt[] = [
  {
    id: 'flight',
    prompt: 'Which dragon appears most prepared for a flight challenge?',
    note: 'A model can support an observation about visible wings, but speed and endurance require a performance test.',
  },
  {
    id: 'defense',
    prompt: 'Which dragon appears best defended?',
    note: 'Horns, size, and scales may shape a prediction. Records and arena trials are still needed.',
  },
  {
    id: 'champion',
    prompt: 'Which dragon would you choose first for the arena?',
    note: 'This is a first impression, not a scientific conclusion. Genetics, tactics, collisions, and chance all matter later.',
  },
] as const;

export const TRAIT_OR_TRICK_CHALLENGES: readonly TraitOrTrickChallenge[] = [
  {
    id: 'scales-or-ash',
    left: 'Naturally dark scale pattern present in hatch and family records',
    right: 'Scales darkened after six weeks near volcanic ash vents',
    inheritedSide: 'left',
    evidence: 'The hatch and family records support inherited pattern; the ash log supports an environmental coating.',
  },
  {
    id: 'horn-or-break',
    left: 'A horn broken during an arena collision',
    right: 'Curved horn structure recorded at hatching and in the gene record',
    inheritedSide: 'right',
    evidence: 'The inherited structure is supported from hatching; the break is an injury acquired during life.',
  },
  {
    id: 'muscle-or-wing',
    left: 'Larger flight muscles after a season of training and enriched feed',
    right: 'Wing structure supported by hatch, parent, and gene records',
    inheritedSide: 'right',
    evidence: 'Training and nutrition explain muscle condition; the records support inherited wing structure.',
  },
] as const;

export const ARENA_CONNECTIONS = [
  { label: 'Wing buffet', detail: 'Requires a winged champion in the current arena.' },
  { label: 'Bite / fire', detail: 'Connects the champion’s jaw and fire trait.' },
  { label: 'Tail sweep', detail: 'Depends on timing and position, not an inheritance claim.' },
  { label: 'Boost and movement', detail: 'Player control and physics influence performance.' },
] as const;
