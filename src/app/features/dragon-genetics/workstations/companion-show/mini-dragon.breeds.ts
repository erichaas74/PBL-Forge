import { BreedStandardTarget } from './companion-show.models';
import {
  MINI_DRAGON_GENES,
  MiniGeneId,
  MiniGenome,
  miniGene,
  miniGenomeFromForms,
} from './mini-dragon.genetics';

export type MiniBreedId = 'puggle' | 'fairy' | 'triceratops' | 'imperial-serpent' | 'amphiptere';

export type MiniBreedDifficulty = 'Foundation' | 'Selective' | 'Advanced';
export type MiniBreedInheritanceKind = 'fixed' | 'masked' | 'splitting';

export interface MiniBreedDefinition {
  id: MiniBreedId;
  name: string;
  tagline: string;
  description: string;
  cuteDirection: string;
  difficulty: MiniBreedDifficulty;
  breedingSummary: string;
  targets: readonly BreedStandardTarget[];
  exampleGenome: MiniGenome;
}

export interface MiniBreedTargetPlan {
  target: BreedStandardTarget;
  geneName: string;
  formLabel: string;
  kind: MiniBreedInheritanceKind;
  kindLabel: string;
  advice: string;
}

const EXAMPLE_BASE_FORMS: Readonly<Record<MiniGeneId, string>> = {
  coat: 'coat:sleek',
  horns: 'horns:curled',
  wings: 'wings:small',
  pattern: 'pattern:ash-gold',
  ember: 'ember:pale',
  size: 'size:standard',
  ears: 'ears:petal',
  muzzle: 'muzzle:medium',
  legs: 'legs:medium',
  tail: 'tail:pom',
  crest: 'crest:frill',
  frame: 'frame:balanced',
};

function target(geneId: MiniGeneId, formId: string): BreedStandardTarget {
  return { geneId, formId };
}

function defineBreed(definition: Omit<MiniBreedDefinition, 'exampleGenome'>): MiniBreedDefinition {
  const forms: Record<MiniGeneId, string> = { ...EXAMPLE_BASE_FORMS };
  for (const breedTarget of definition.targets) {
    forms[breedTarget.geneId] = breedTarget.formId;
  }
  return { ...definition, exampleGenome: miniGenomeFromForms(forms) };
}

/**
 * Published reference standards. They reuse the same visible forms students
 * can select by hand; applying one never bypasses segregation or creates a
 * dragon. The example genome exists only to draw the Society reference animal.
 */
export const MINI_DRAGON_BREEDS: readonly MiniBreedDefinition[] = [
  defineBreed({
    id: 'puggle',
    name: 'Puggle Dragon',
    tagline: 'A round, sleepy waddler built for warm laps.',
    description:
      'The ultimate couch potato: compact, squishy, and perpetually just awake from a nap. Tiny wings flutter while the dumpling body waddles close to the floor.',
    cuteDirection:
      'A belly-low dumpling silhouette, soft toothless pug muzzle, large forward eyes, and slightly drooped button ears keep this line puppy-like rather than fierce.',
    difficulty: 'Foundation',
    breedingSummary:
      'Every defining Puggle form is a fixed-form target once it is visible. The challenge is combining five uncommon forms in the same dragon, not maintaining a mixed form.',
    targets: [
      target('frame', 'frame:round'),
      target('muzzle', 'muzzle:pug'),
      target('legs', 'legs:waddler'),
      target('ears', 'ears:button'),
      target('size', 'size:teacup'),
    ],
  }),
  defineBreed({
    id: 'fairy',
    name: 'Fairy Dragon',
    tagline: 'A bright garden sprite with petal-soft features.',
    description:
      'Delicate, graceful, and expressive, this curious little dragon resembles a friendly forest sprite and uses its petal-like features to disappear among oversized flowers.',
    cuteDirection:
      'Rounded leaf-like frills and ears, a plush dandelion-pom tail, broad butterfly-like wings, and large amazed eyes keep the silhouette soft and playful.',
    difficulty: 'Advanced',
    breedingSummary:
      'Balanced frame and petal ears are mixed forms. Even two matching Fairy parents can produce young outside the standard, so each generation must be selected again.',
    targets: [
      target('frame', 'frame:balanced'),
      target('crest', 'crest:frill'),
      target('ears', 'ears:petal'),
      target('wings', 'wings:broad'),
      target('tail', 'tail:pom'),
    ],
  }),
  defineBreed({
    id: 'triceratops',
    name: 'Triceratops Dragon',
    tagline: 'A sturdy baby dinosaur with a gentle bumper head.',
    description:
      'A heavy-stepping mini dragon that thinks it is enormous. Its crowned head and bumpy back look armored, but it uses them for affectionate nudges rather than combat.',
    cuteDirection:
      'Crown bumps and back rows read as polished rubbery knobs, the star club resembles a squeaky plush toy, and a chunky neck keeps the whole animal babyish.',
    difficulty: 'Selective',
    breedingSummary:
      'Medium legs are a mixed form and the star club can hide other tail forms. Fix the crown, muzzle, and bumpy back first, then use several litters to test the remaining pair.',
    targets: [
      target('crest', 'crest:crown'),
      target('muzzle', 'muzzle:long'),
      target('coat', 'coat:fluffy'),
      target('legs', 'legs:medium'),
      target('tail', 'tail:star'),
    ],
  }),
  defineBreed({
    id: 'imperial-serpent',
    name: 'Imperial Serpent Dragon',
    tagline: 'A floating golden ribbon with the manners of a house cat.',
    description:
      'A majestic but friendly living scarf. The long body undulates through the air on vestigial wings, then curls around a familiar arm and purrs.',
    cuteDirection:
      'A thick caterpillar-like noodle body, velvet-rounded straight horns, a cloud-soft crown-and-frill crest, and a gentle oversized face prevent a fierce serpent profile.',
    difficulty: 'Advanced',
    breedingSummary:
      'Seven target forms can be fixed, but the crown-and-frill crest is a mixed form that always segregates. Preserve gold and the long silhouette while selecting the crest anew.',
    targets: [
      target('frame', 'frame:long'),
      target('wings', 'wings:vestigial'),
      target('muzzle', 'muzzle:long'),
      target('legs', 'legs:waddler'),
      target('horns', 'horns:straight'),
      target('crest', 'crest:crown-frill'),
      target('tail', 'tail:pom'),
      target('pattern', 'pattern:gold'),
    ],
  }),
  defineBreed({
    id: 'amphiptere',
    name: 'Amphiptere',
    tagline: 'An energetic winged noodle that rests like a loaf.',
    description:
      'All wings and tail in the air, all belly on the ground. Its tiny legs make landings endearingly awkward, but broad wings make it a joyful, aerodynamic swooper.',
    cuteDirection:
      'Glossy smooth scales, backward-curving sail ears, rounded koi-like tail forks, and comically tiny legs replace the sharp viper silhouette with a friendly loaf.',
    difficulty: 'Selective',
    breedingSummary:
      'Most Amphiptere forms can be fixed. Smooth scales and the forked paddle can conceal alternatives, so repeated litters are the evidence that a promising pair is stable.',
    targets: [
      target('frame', 'frame:long'),
      target('wings', 'wings:broad'),
      target('legs', 'legs:waddler'),
      target('muzzle', 'muzzle:long'),
      target('coat', 'coat:sleek'),
      target('ears', 'ears:sail'),
      target('tail', 'tail:fork'),
    ],
  }),
];

export function miniBreed(id: MiniBreedId): MiniBreedDefinition {
  const breed = MINI_DRAGON_BREEDS.find((candidate) => candidate.id === id);
  if (!breed) throw new Error(`Unknown mini dragon breed: ${id}`);
  return breed;
}

/** Explains how a visible target behaves without exposing inheritance symbols. */
export function miniBreedTargetPlan(targetForm: BreedStandardTarget): MiniBreedTargetPlan {
  const gene = miniGene(targetForm.geneId);
  const formIndex = gene.forms.findIndex((form) => form.id === targetForm.formId);
  if (formIndex < 0) {
    throw new Error(`Unknown form ${targetForm.formId} for ${targetForm.geneId}.`);
  }
  const formLabel = gene.forms[formIndex].label;
  const kind = inheritanceKind(gene.pattern, formIndex, gene.forms.length);

  if (kind === 'splitting') {
    return {
      target: targetForm,
      geneName: gene.name,
      formLabel,
      kind,
      kindLabel: 'Mixed form splits',
      advice: `Two ${formLabel.toLowerCase()} parents can produce both outside forms as well as this one. Select matching young again each generation.`,
    };
  }
  if (kind === 'masked') {
    return {
      target: targetForm,
      geneName: gene.name,
      formLabel,
      kind,
      kindLabel: 'May hide variants',
      advice: `A ${formLabel.toLowerCase()} dragon may carry a form you cannot see. Compare several litters; an off-standard young reveals hidden variation in the pair.`,
    };
  }
  return {
    target: targetForm,
    geneName: gene.name,
    formLabel,
    kind,
    kindLabel: 'Can be fixed',
    advice: `This visible form identifies a matching inherited pair. Once both parents show it, this locus can breed true.`,
  };
}

function inheritanceKind(
  pattern: (typeof MINI_DRAGON_GENES)[number]['pattern'],
  formIndex: number,
  formCount: number,
): MiniBreedInheritanceKind {
  switch (pattern) {
    case 'complete-dominance':
      return formIndex === 0 ? 'masked' : 'fixed';
    case 'incomplete-dominance':
    case 'codominance':
      return formIndex === 1 ? 'splitting' : 'fixed';
    case 'multiple-alleles':
      return formIndex === formCount - 1 ? 'fixed' : 'masked';
  }
}
