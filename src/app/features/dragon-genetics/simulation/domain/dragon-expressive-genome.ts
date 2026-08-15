import { DragonLabGenome, DragonTraitGenotype } from './dragon-lab.models';

export type DragonSex = 'female' | 'male';

export type ExpressiveDragonTraitId =
  | 'wings'
  | 'tail'
  | 'legs'
  | 'fire'
  | 'horns'
  | 'claws'
  | 'scales'
  | 'body-color'
  | 'crest'
  | 'glow'
  | 'fangs'
  | 'spikes'
  | 'eye-color';

export interface ExpressiveDragonTraitDefinition {
  id: ExpressiveDragonTraitId;
  name: string;
  geneSymbol: string;
  chromosome: 'Chr 1' | 'Chr 2' | 'Chr 3' | 'Chr 4' | 'Chr X';
  inheritance: 'autosomal' | 'x-linked' | 'incomplete-dominance';
  dominantAllele: string;
  recessiveAllele: string;
  dominantPhenotype: string;
  recessivePhenotype: string;
  heterozygousPhenotype?: string;
  description: string;
}

export type ExpressiveDragonGenome = Record<ExpressiveDragonTraitId, DragonTraitGenotype>;

export interface ExpressiveDragonProfile {
  sex: DragonSex;
  genome: ExpressiveDragonGenome;
}

export const EXPRESSIVE_DRAGON_TRAITS: readonly ExpressiveDragonTraitDefinition[] = [
  trait('wings', 'Wings', 'W', 'Chr 1', 'Winged', 'Wingless', 'Controls whether wing parts develop.'),
  {
    ...trait(
      'tail',
      'Tail club form',
      'K',
      'Chr 1',
      'Large crown-spiked club',
      'Small smooth club',
      'KK, Kk, and kk create three visibly graded tail ends.',
    ),
    inheritance: 'incomplete-dominance',
    heterozygousPhenotype: 'Intermediate five-spike club',
  },
  trait('legs', 'Leg arrangement', 'L', 'Chr 1', 'Four-legged', 'Two-legged', 'Retains either both leg pairs or only the rear pair.'),
  trait('fire', 'Fire breathing', 'F', 'Chr 2', 'Breathes fire', 'No fire breath', 'Changes jaw expression and unlocks the existing fire ability.'),
  trait('horns', 'Horns', 'H', 'Chr 2', 'Horned', 'Smooth-headed', 'Selects the horned or smooth real head profile.'),
  trait('claws', 'Claw size', 'C', 'Chr 2', 'Large claws', 'Small claws', 'Changes talon length on each foot.'),
  trait('scales', 'Scale pattern', 'S', 'Chr 3', 'Banded scales', 'Solid scales', 'Applies two-tone banding or one solid body color.'),
  trait('body-color', 'Body color', 'B', 'Chr 3', 'Bronze body', 'Teal body', 'Repaints the complete procedural dragon.'),
  trait('crest', 'Crest height', 'R', 'Chr 3', 'Tall crest', 'Low crest', 'Changes the height of crown fins on the head.'),
  /*
   * Bioluminescence replaced an ear-shape gene whose two phenotypes — a small
   * pointed flap or a small rounded one — were nearly impossible to tell apart
   * on a thumbnail, which made it useless for the one job a trait has here:
   * being read off the animal. Light is a channel nothing else in this genome
   * uses, so it can never be mistaken for a horn, a crest, or a colour.
   */
  trait('glow', 'Bioluminescence', 'N', 'Chr 4', 'Glowing markings', 'No glow', 'Lights a row of living lanterns along the flanks, throat and tail.'),
  trait('fangs', 'Fang length', 'G', 'Chr 4', 'Long fangs', 'Short fangs', 'Changes the size of the real jaw teeth.'),
  trait('spikes', 'Back spikes', 'P', 'Chr 4', 'Many tall spikes', 'Few low spikes', 'Changes dorsal spike number and height.'),
  {
    ...trait('eye-color', 'Eye glow', 'E', 'Chr X', 'Amber eyes', 'Blue eyes', 'An X-linked eye trait used to compare XX and XY inheritance.'),
    inheritance: 'x-linked',
  },
];

export const DEFAULT_EXPRESSIVE_DRAGON: ExpressiveDragonProfile = {
  sex: 'female',
  genome: {
    wings: ['W', 'w'],
    tail: ['K', 'k'],
    legs: ['L', 'l'],
    fire: ['F', 'f'],
    horns: ['H', 'h'],
    claws: ['C', 'c'],
    scales: ['S', 's'],
    'body-color': ['B', 'b'],
    crest: ['R', 'r'],
    glow: ['N', 'n'],
    fangs: ['G', 'g'],
    spikes: ['P', 'p'],
    'eye-color': ['E', 'e'],
  },
};

export function sexChromosomes(sex: DragonSex): 'XX' | 'XY' {
  return sex === 'female' ? 'XX' : 'XY';
}

export function genotypeChoices(
  traitDefinition: ExpressiveDragonTraitDefinition,
  sex: DragonSex,
): readonly DragonTraitGenotype[] {
  const dominant = traitDefinition.dominantAllele;
  const recessive = traitDefinition.recessiveAllele;
  if (traitDefinition.inheritance === 'x-linked' && sex === 'male') {
    return [[dominant, 'Y'], [recessive, 'Y']];
  }
  return [[dominant, dominant], [dominant, recessive], [recessive, recessive]];
}

export function normalizeGenomeForSex(
  profile: ExpressiveDragonProfile,
  sex: DragonSex,
): ExpressiveDragonProfile {
  const eye = profile.genome['eye-color'];
  const expressedAllele = eye.includes('E') ? 'E' : 'e';
  return {
    sex,
    genome: {
      ...profile.genome,
      'eye-color': sex === 'male' ? [expressedAllele, 'Y'] : [expressedAllele, 'e'],
    },
  };
}

export function expressivePhenotype(
  profile: ExpressiveDragonProfile,
  traitDefinition: ExpressiveDragonTraitDefinition,
): string {
  const pair = profile.genome[traitDefinition.id];
  if (
    traitDefinition.inheritance === 'incomplete-dominance'
    && traitDefinition.heterozygousPhenotype
    && pair[0] !== pair[1]
  ) {
    return traitDefinition.heterozygousPhenotype;
  }
  return showsExpressiveDominant(profile, traitDefinition)
    ? traitDefinition.dominantPhenotype
    : traitDefinition.recessivePhenotype;
}

export function showsExpressiveDominant(
  profile: ExpressiveDragonProfile,
  traitDefinition: ExpressiveDragonTraitDefinition,
): boolean {
  return profile.genome[traitDefinition.id].includes(traitDefinition.dominantAllele);
}

export function toCoreLabGenome(profile: ExpressiveDragonProfile): DragonLabGenome {
  return {
    wings: profile.genome.wings,
    fire: profile.genome.fire,
    scales: profile.genome.scales,
    horns: profile.genome.horns,
  };
}

function trait(
  id: ExpressiveDragonTraitId,
  name: string,
  geneSymbol: string,
  chromosome: ExpressiveDragonTraitDefinition['chromosome'],
  dominantPhenotype: string,
  recessivePhenotype: string,
  description: string,
): ExpressiveDragonTraitDefinition {
  return {
    id,
    name,
    geneSymbol,
    chromosome,
    inheritance: 'autosomal',
    dominantAllele: geneSymbol,
    recessiveAllele: geneSymbol.toLowerCase(),
    dominantPhenotype,
    recessivePhenotype,
    description,
  };
}
