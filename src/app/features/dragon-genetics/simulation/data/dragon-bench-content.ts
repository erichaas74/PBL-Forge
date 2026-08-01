import { SpecimenBenchCopy } from '../../../../shared/assembly/preview/specimen-bench.content';

/**
 * Dragon wording for the test bench. The bench computes the numbers; this file
 * is the only place the vocabulary of the dragon lab appears.
 */
export const DRAGON_BENCH_COPY: SpecimenBenchCopy = {
  abilities: {
    bite: {
      name: 'Bite',
      detail: 'Snaps the jaws shut. The only move that gets stronger with the temperament gene.',
      missingDetail: 'This dragon has no jaw parts, so it cannot bite.',
    },
    'wing-buffet': {
      name: 'Wing buffet',
      detail: 'Slams both wings down and knocks the opponent backwards.',
      missingDetail: 'Two recessive wing alleles (ww) means no wings grew, so there is nothing to buffet with.',
    },
    'tail-sweep': {
      name: 'Tail sweep',
      detail: 'Whips the tail in a wide arc. A longer tail sweeps further.',
      missingDetail: 'This dragon has no tail segments.',
    },
    'fire-breath': {
      name: 'Fire breath',
      detail: 'Breathes a cone of fire that can catch up to three targets at once.',
      missingDetail: 'Two recessive fire alleles (ff) means this dragon cannot breathe fire.',
    },
  },
  defensiveFeatures: [
    {
      id: 'horns',
      name: 'Horns, claws and spikes',
      roles: ['weapon'],
      detail: 'Hard keratin points. They make the dragon dangerous to attack up close.',
      missingDetail: 'No horns, claws, or spikes on this build.',
    },
    {
      id: 'scales',
      name: 'Scaled body',
      roles: ['core', 'armor'],
      detail: 'The armour-density gene thickens the scales, cutting the damage that reaches the body.',
      missingDetail: 'No scaled body part found.',
    },
    {
      id: 'skull',
      name: 'Skull and head plating',
      roles: ['head'],
      detail: 'A heavier skull protects the senses and takes hits that would otherwise reach the body.',
      missingDetail: 'No head part on this build.',
    },
    {
      id: 'limbs',
      name: 'Legs and feet',
      roles: ['leg'],
      detail: 'Limbs carry the dragon and absorb damage that would otherwise land on the body.',
      missingDetail: 'No legs, so nothing holds this dragon up.',
    },
  ],
  fitnessCaveat:
    'This score measures one thing: how this dragon performs in the arena model, using the weights '
    + 'shown above. It is not a measure of biological fitness. Change the environment — a cave, a '
    + 'contest for mates, a food shortage — and different traits would win. Real fitness always '
    + 'depends on where an organism lives.',
};
