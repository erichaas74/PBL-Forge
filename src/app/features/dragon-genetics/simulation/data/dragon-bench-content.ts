import {
  SpecimenBenchCopy,
  SpecimenBenchMotion,
} from '../../../../shared/assembly/preview/specimen-bench.content';
import {
  DRAGON_LEARNED_BEHAVIOR_MOTIONS,
} from '../../workstations/trait-evidence/dragon-learned-behaviors';

/**
 * Dragon wording for the test bench. The bench computes the numbers; this file
 * is the only place the vocabulary of the dragon lab appears.
 */
export const DRAGON_BENCH_COPY: SpecimenBenchCopy = {
  abilities: {
    bite: {
      name: 'Bite',
      detail:
        'Snaps the jaws shut. Fang length (G) sets how long the teeth are, and the temperament '
        + 'gene is the only thing that makes this move hit harder.',
      missingDetail: 'This dragon has no jaw parts, so it cannot bite.',
    },
    'claw-rake': {
      name: 'Claw rake',
      detail:
        'A fast swipe of the foreclaws. Claw size (C) sets how long the talons are; the forelimb '
        + 'gene (L) decides whether the swipe comes from a walking foot or a grasping hand, and '
        + 'both can rake.',
      missingDetail: 'This dragon has no limbs, so there is nothing to rake with.',
    },
    'horn-charge': {
      name: 'Horn charge',
      detail: 'Drops the head and runs the target down, knocking it off its feet.',
      missingDetail:
        'Two recessive horn alleles (hh) means a smooth head, and nothing to charge with.',
    },
    'wing-buffet': {
      name: 'Wing buffet',
      detail: 'Slams both wings down and knocks the opponent backwards.',
      missingDetail: 'Two recessive wing alleles (ww) means no wings grew, so there is nothing to buffet with.',
    },
    'tail-sweep': {
      name: 'Tail sweep',
      detail:
        'Whips the tail in a wide arc. The club at the end is graded rather than switched: KK '
        + 'swings a large crown-spiked club, Kk an intermediate one, kk a small smooth one.',
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
      id: 'weapons',
      name: 'Horns, claws and back spikes',
      roles: ['weapon'],
      detail:
        'Hard keratin points, and three separate genes decide how much of it there is: horns (H), '
        + 'claw size (C), and the number and height of the dorsal spikes (P). They make the dragon '
        + 'dangerous to attack up close.',
      missingDetail: 'No horns, claws, or spikes on this build.',
    },
    {
      id: 'scales',
      name: 'Scaled body',
      roles: ['core', 'armor'],
      detail:
        'The armour-density gene thickens the scales, cutting the damage that reaches the body. '
        + 'The scale-pattern gene (S) changes how they are painted, not how well they protect — '
        + 'a banded dragon is no better armoured than a solid one.',
      missingDetail: 'No scaled body part found.',
    },
    {
      id: 'skull',
      name: 'Skull, crest and frills',
      roles: ['head'],
      detail:
        'A heavier skull protects the senses and takes hits that would otherwise reach the body. '
        + 'The crest gene (R) raises the crown fins, and the modelled sex adds either the male '
        + 'swept-back crest or the female neck frills — anatomy, not a gene the student picks.',
      missingDetail: 'No head part on this build.',
    },
    {
      id: 'limbs',
      name: 'Legs and feet',
      roles: ['leg'],
      detail:
        'Limbs carry the dragon and absorb damage that would otherwise land on the body. The '
        + 'forelimb gene (L) decides what the front pair is: walking legs, or the much lighter '
        + 'grasping arms of a reared dragon, which put far less limb between a hit and the body.',
      missingDetail: 'No legs, so nothing holds this dragon up.',
    },
  ],
  fitnessCaveat:
    'This score measures one thing: how this dragon performs in the arena model, using the weights '
    + 'shown above. It is not a measure of biological fitness. Change the environment — a cave, a '
    + 'contest for mates, a food shortage — and different traits would win. Real fitness always '
    + 'depends on where an organism lives. Several genes on this bench — body colour, scale '
    + 'pattern, back-spike rows, and eye colour — change the animal without changing this number at all.',
};

/**
 * Cue responses the bench can play.
 *
 * These are the same motions the trait-evidence workstation tests, and they are
 * here for the contrast the bench is otherwise missing: every other control on
 * this page is a gene, and a student who only ever changes genes can come away
 * believing everything a dragon does is inherited. A trained bow is not, and the
 * only honest way to show that is to let them play one on an animal whose genome
 * they just set themselves.
 */
export const DRAGON_BENCH_MOTIONS: readonly SpecimenBenchMotion[] = [
  {
    id: 'bell-bow',
    name: 'Bow after the bell',
    detail: 'A trained response to a bell. No allele anywhere in this genome produces it.',
    motion: DRAGON_LEARNED_BEHAVIOR_MOTIONS['bell-bow'],
  },
  {
    id: 'target-touch',
    name: 'Touch the coloured target',
    detail: 'Turns the head to a target it was taught to follow.',
    motion: DRAGON_LEARNED_BEHAVIOR_MOTIONS['target-touch'],
  },
  {
    id: 'wait-release',
    name: 'Wait for the release signal',
    detail: 'Holds still, tail low, until released. Training, not temperament.',
    motion: DRAGON_LEARNED_BEHAVIOR_MOTIONS['wait-release'],
  },
];
