import { DragonMiniLesson, TraitSortCard } from '../domain/dragon-lab.models';

export const DRAGON_MINI_LESSONS: readonly DragonMiniLesson[] = [
  {
    id: 'inherited-or-acquired',
    number: 1,
    title: 'Inherited traits and acquired characteristics',
    summary: 'An inherited trait is influenced by genetic information passed from parent to offspring. Learned behaviors and many environmental effects are acquired during life.',
    modelNote: 'Some real traits are influenced by both genes and environment. Our dragon cards separate them so the model is easier to test.',
    vocabulary: ['inherited trait', 'learned behavior', 'environment'],
  },
  {
    id: 'dna-information',
    number: 2,
    title: 'Genes, DNA, and chromosomes',
    summary: 'DNA stores biological information. A gene is a section of DNA, and chromosomes are long packages of DNA containing many genes.',
    modelNote: 'The lab places each dragon gene on a numbered model chromosome. Real chromosomes carry many genes, not just one.',
    vocabulary: ['DNA', 'gene', 'chromosome'],
  },
  {
    id: 'genotype-phenotype',
    number: 3,
    title: 'Genotype and phenotype',
    summary: 'A genotype names the alleles an organism carries. A phenotype is an observable trait produced from genetic information, often together with environmental influences.',
    modelNote: 'For example, Ww is a genotype and winged is its phenotype in this model.',
    vocabulary: ['allele', 'genotype', 'phenotype'],
  },
  {
    id: 'dominance',
    number: 4,
    title: 'A simplified dominant/recessive model',
    summary: 'A dominant allele is expressed when one or two copies are present. A recessive phenotype appears when both alleles are recessive.',
    modelNote: 'Dominant does not mean stronger, healthier, better, or more common. Many real traits do not follow a single-gene dominant/recessive pattern.',
    vocabulary: ['dominant', 'recessive', 'homozygous', 'heterozygous'],
  },
  {
    id: 'reproduction',
    number: 5,
    title: 'Sexual and asexual reproduction',
    summary: 'Sexual reproduction combines genetic information from two parents. Asexual reproduction starts with one parent and usually produces offspring with much less genetic variation.',
    modelNote: 'Mutations can still introduce differences. This lab focuses on allele mixing as the main source of variation in sexual reproduction.',
    vocabulary: ['sexual reproduction', 'asexual reproduction', 'offspring'],
  },
  {
    id: 'probability',
    number: 6,
    title: 'Variation and probability',
    summary: 'Each offspring receives one allele for a modeled gene from each parent. Probability predicts possible outcomes, but a small clutch may not match the predicted percentage exactly.',
    modelNote: 'A Punnett square shows possible combinations, not a promise that every four eggs will contain each outcome once.',
    vocabulary: ['variation', 'probability', 'sample'],
  },
  {
    id: 'diversity',
    number: 7,
    title: 'Why genetic diversity matters',
    summary: 'A population with more genetic variation has more possible responses when environments, diseases, or other conditions change.',
    modelNote: 'The diversity score is a classroom indicator based only on four modeled genes. It is not a medical test and does not rank individual dragons.',
    vocabulary: ['genetic diversity', 'population', 'variation'],
  },
];

export const TRAIT_SORT_CARDS: readonly TraitSortCard[] = [
  { id: 'scale-pattern', label: 'Scale pattern', detail: 'Pattern visible when a dragon hatches', category: 'inherited' },
  { id: 'fire-breathing', label: 'Fire-breathing ability', detail: 'A modeled biological trait', category: 'inherited' },
  { id: 'horn-shape', label: 'Horn shape', detail: 'A physical feature influenced by genes', category: 'inherited' },
  { id: 'wing-shape', label: 'Wing shape', detail: 'A physical feature influenced by genes', category: 'inherited' },
  { id: 'flight-route', label: 'Favorite flight route', detail: 'A route learned through experience', category: 'learned-environmental' },
  { id: 'training-command', label: 'Response to a training command', detail: 'A practiced behavior', category: 'learned-environmental' },
  { id: 'scar', label: 'Scar from a thorn', detail: 'A change caused by the environment', category: 'learned-environmental' },
  { id: 'nest-dust', label: 'Dust on scales', detail: 'A temporary environmental effect', category: 'learned-environmental' },
];

export const DRAGON_VOCABULARY: readonly { term: string; definition: string }[] = [
  { term: 'Heredity', definition: 'The passing of genetic information from parents to offspring.' },
  { term: 'DNA', definition: 'The molecule that stores genetic information in living things.' },
  { term: 'Chromosome', definition: 'A long package of DNA that contains many genes.' },
  { term: 'Gene', definition: 'A section of DNA associated with a biological function or trait.' },
  { term: 'Allele', definition: 'A version of a gene.' },
  { term: 'Genotype', definition: 'The allele combination an organism carries.' },
  { term: 'Phenotype', definition: 'An observable trait produced by genotype and sometimes environment.' },
  { term: 'Dominant', definition: 'An allele expressed with one or two copies in this simplified model.' },
  { term: 'Recessive', definition: 'An allele expressed only when both copies are recessive in this model.' },
  { term: 'Variation', definition: 'Differences among individuals in a population.' },
  { term: 'Offspring', definition: 'A new organism produced by one or more parents.' },
  { term: 'Model', definition: 'A simplified representation used to explain or predict a system.' },
];
