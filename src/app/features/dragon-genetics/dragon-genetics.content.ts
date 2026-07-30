import {
  DragonModuleDefinition,
  LicenseQuestion,
  TraitRuleChallenge,
} from './dragon-genetics.models';

export const DRAGON_MODULES: readonly DragonModuleDefinition[] = [
  {
    number: 1,
    week: 1,
    title: 'Trait Detective',
    shortTitle: 'Traits',
    learningTarget: 'I can distinguish inherited traits from learned behaviors and environmental effects.',
    evidence: 'Complete the diagnostic, choose a rotating role, classify eight observations, and correct a misconception.',
    skills: ['GEN-1'],
  },
  {
    number: 2,
    week: 1,
    title: 'Genome Decoder',
    shortTitle: 'DNA map',
    learningTarget: 'I can connect a dragon, cell, chromosome, DNA, gene, and allele.',
    evidence: 'Build the biological information pathway in the correct order.',
    skills: ['GEN-2'],
  },
  {
    number: 3,
    week: 1,
    title: 'Genotype → Phenotype',
    shortTitle: 'Genotype',
    learningTarget: 'I can use genotype evidence to identify possible phenotypes and vice versa.',
    evidence: 'Solve phenotype-first and genotype-first evidence cards.',
    skills: ['GEN-3'],
  },
  {
    number: 4,
    week: 1,
    title: 'Trait Rule Lab',
    shortTitle: 'Rules',
    learningTarget: 'I can apply a simplified dominant/recessive model without treating dominant as better.',
    evidence: 'Predict the phenotype after an allele changes, before revealing the result.',
    skills: ['GEN-4'],
  },
  {
    number: 5,
    week: 1,
    title: 'Breeding Predictor',
    shortTitle: 'Predict',
    learningTarget: 'I can use allele combinations to predict offspring probabilities.',
    evidence: 'Submit genotype and phenotype probabilities, then pass the Week 1 mastery check.',
    skills: ['GEN-3', 'GEN-4', 'GEN-5'],
  },
  {
    number: 6,
    week: 2,
    title: 'Probability vs. Actual',
    shortTitle: 'Samples',
    learningTarget: 'I can compare expected probability with observed results in different sample sizes.',
    evidence: 'Run a small clutch and a large trial, then compare their results.',
    skills: ['GEN-5', 'GEN-7'],
  },
  {
    number: 7,
    week: 2,
    title: 'Sexual vs. Asexual',
    shortTitle: 'Reproduce',
    learningTarget: 'I can explain how sexual reproduction combines information from two parents.',
    evidence: 'Identify which model creates new allele combinations and explain the clone-style model.',
    skills: ['GEN-6', 'GEN-7'],
  },
  {
    number: 8,
    week: 2,
    title: 'Sibling Variation',
    shortTitle: 'Siblings',
    learningTarget: 'I can trace sibling differences to alleles inherited from each parent.',
    evidence: 'Compare two hatchlings and explain one allele-path difference.',
    skills: ['GEN-5', 'GEN-7'],
  },
  {
    number: 9,
    week: 2,
    title: 'Diversity Manager',
    shortTitle: 'Diversity',
    learningTarget: 'I can use evidence to recommend a breeding strategy that preserves variation.',
    evidence: 'Compare two strategies, defend a parent pair, complete peer review, and pass Week 2 mastery.',
    skills: ['GEN-8'],
  },
  {
    number: 10,
    week: 3,
    title: 'Breeder License & Arena',
    shortTitle: 'Challenge',
    learningTarget: 'I can plan, predict, breed, and defend decisions using evidence from my own dragons.',
    evidence: 'Earn a license, use three official crosses, select a champion, battle, and complete an evidence defense.',
    skills: ['GEN-1', 'GEN-2', 'GEN-3', 'GEN-4', 'GEN-5', 'GEN-6', 'GEN-7', 'GEN-8'],
  },
];

export const GENOME_PATH = ['Dragon', 'Cell', 'Chromosome', 'DNA', 'Gene', 'Allele'] as const;

export const TEAM_ROLES = [
  { id: 'hatchery-director', name: 'Hatchery Director', job: 'Keeps the team on task and submits shared decisions.' },
  { id: 'genetics-modeler', name: 'Genetics Modeler', job: 'Builds and checks inheritance predictions.' },
  { id: 'data-analyst', name: 'Data Analyst', job: 'Records offspring results and compares observed data with predictions.' },
  { id: 'diversity-officer', name: 'Diversity Officer', job: 'Monitors the breeding pool and diversity evidence.' },
  { id: 'arena-strategist', name: 'Arena Strategist', job: 'Manages the final squad and battle decisions.' },
] as const;

export const DIAGNOSTIC_PROMPTS = [
  { id: 'diagnostic-inherited', prompt: 'Which evidence would convince you a dragon characteristic is inherited?' },
  { id: 'diagnostic-hidden', prompt: 'How could a hatchling show a trait that is not visible in both parents?' },
  { id: 'diagnostic-learned', prompt: 'Name one dragon characteristic that could develop during life instead of being inherited.' },
] as const;

export const GENOME_QUICK_QUESTIONS: readonly LicenseQuestion[] = [
  question('genome-quick-1', 'GEN-2', 'What is the genetic material in this information model?', ['DNA', 'A phenotype', 'A learned behavior', 'A scar'], 0, 'DNA is the molecule that stores genetic information.', 'dna-definition'),
  question('genome-quick-2', 'GEN-2', 'A chromosome is best described as…', ['a package of DNA containing many genes', 'one visible trait', 'a version of a gene', 'an environmental effect'], 0, 'Chromosomes are organized packages of DNA and contain many genes.', 'hierarchy-confusion'),
  question('genome-quick-3', 'GEN-2', 'A gene is…', ['a section of DNA associated with inherited information', 'an entire organism', 'always a dominant allele', 'a learned response'], 0, 'A gene is a section of DNA.', 'gene-definition'),
  question('genome-quick-4', 'GEN-2', 'W and w are two versions of the wings gene. They are…', ['alleles', 'chromosomes', 'phenotypes', 'cells'], 0, 'Alleles are versions of a gene.', 'allele-definition'),
];

export const PHENOTYPE_QUESTIONS = [
  {
    id: 'winged-genotypes',
    prompt: 'Possible eggs: Which offspring genotypes can a Ww parent and a ww parent produce?',
    options: [
      { id: 'ww-only', label: 'WW and Ww' },
      { id: 'ww-or-wx', label: 'Ww and ww' },
      { id: 'recessive-only', label: 'WW only' },
    ],
    correctOptionId: 'ww-or-wx',
    explanation: 'The Ww parent can contribute W or w, while the ww parent can contribute only w. The possible eggs are Ww and ww.',
  },
  {
    id: 'wingless-genotype',
    prompt: 'Hidden parent: A winged dragon crossed with a wingless ww dragon produces a wingless hatchling. What must the winged parent carry?',
    options: [
      { id: 'WW', label: 'WW' },
      { id: 'Ww', label: 'Ww' },
      { id: 'ww', label: 'ww' },
    ],
    correctOptionId: 'Ww',
    explanation: 'The wingless hatchling received w from both parents. The winged parent must carry and contribute w, so it is Ww.',
  },
  {
    id: 'fire-phenotype',
    prompt: 'A hatchling has genotype Ff. What phenotype will the model show?',
    options: [
      { id: 'fire', label: 'Breathes fire' },
      { id: 'no-fire', label: 'Does not breathe fire' },
      { id: 'unknown', label: 'There is not enough information' },
    ],
    correctOptionId: 'fire',
    explanation: 'One F allele is enough for the dominant fire-breathing phenotype in this model.',
  },
  {
    id: 'horned-genotypes',
    prompt: 'Same look, different genes: Two sibling hatchlings are both horned. What can you conclude?',
    options: [
      { id: 'same-horns', label: 'They must have the same genotype.' },
      { id: 'different-horns', label: 'Each could be HH or Hh, so their genotypes may differ.' },
      { id: 'recessive-horns', label: 'Both must be hh.' },
    ],
    correctOptionId: 'different-horns',
    explanation: 'The same dominant phenotype can be produced by HH or Hh, so sibling hatchlings can look alike while carrying different genotypes.',
  },
] as const;

export const TRAIT_RULE_CHALLENGES: readonly TraitRuleChallenge[] = [
  { id: 'wings-hetero', traitId: 'wings', genotype: ['W', 'w'], prompt: 'One wing allele changes from w to W. Predict the new phenotype.', correctAnswer: 'dominant' },
  { id: 'fire-recessive', traitId: 'fire', genotype: ['f', 'f'], prompt: 'Both fire alleles are recessive. Predict before reveal.', correctAnswer: 'recessive' },
  { id: 'horns-homo-dominant', traitId: 'horns', genotype: ['H', 'H'], prompt: 'Both horn alleles are dominant. Predict before reveal.', correctAnswer: 'dominant' },
  { id: 'scales-hetero', traitId: 'scales', genotype: ['S', 's'], prompt: 'The scale-pattern genotype is heterozygous. Predict before reveal.', correctAnswer: 'dominant' },
];

export const LICENSE_QUESTIONS: readonly LicenseQuestion[] = [
  question('license-1', 'GEN-1', 'Which characteristic is inherited in the hatchery model?', ['A scar from a thorn', 'A practiced flight route', 'Scale pattern', 'Dust on scales'], 2, 'Inherited traits are influenced by genetic information passed from parents.', 'acquired-as-inherited'),
  question('license-2', 'GEN-1', 'Why is a training response not passed to hatchlings?', ['It is learned during life', 'It is always recessive', 'It is stored on chromosome 4', 'It only appears in adults'], 0, 'Learned behaviors are acquired, not alleles inherited at fertilization.', 'learned-is-genetic'),
  question('license-3', 'GEN-2', 'Which sequence correctly narrows biological information?', ['Gene → chromosome → DNA → allele', 'Chromosome → DNA → gene → allele', 'Allele → cell → dragon → DNA', 'DNA → dragon → gene → chromosome'], 1, 'A chromosome is packaged DNA; a gene is a section of DNA; an allele is a version of a gene.', 'hierarchy-confusion'),
  question('license-4', 'GEN-2', 'What is an allele?', ['A version of a gene', 'A whole chromosome', 'An environmental change', 'An observable trait only'], 0, 'An allele is a version of a gene.', 'allele-definition'),
  question('license-5', 'GEN-3', 'Which item is a genotype?', ['Winged', 'Spotted scales', 'Ww', 'Fire breathing'], 2, 'Ww names the two alleles carried for the modeled wings gene.', 'genotype-phenotype-swap'),
  question('license-6', 'GEN-3', 'A recessive phenotype appears. Which genotype is required in this model?', ['AA', 'Aa', 'aa', 'Any genotype'], 2, 'A simple recessive phenotype requires two recessive alleles.', 'recessive-carrier'),
  question('license-7', 'GEN-4', 'What does dominant mean in this model?', ['Stronger and healthier', 'More common in the population', 'Expressed when at least one copy is present', 'Better for battle'], 2, 'Dominant describes an expression rule, not value, strength, health, or frequency.', 'dominant-means-better'),
  question('license-8', 'GEN-5', 'For Ww × ww, what percent of model outcomes are winged?', ['0%', '25%', '50%', '100%'], 2, 'Two of four equally likely Punnett cells contain W.', 'punnett-probability'),
  question('license-9', 'GEN-5', 'A model predicts 75% fire breathing. What must happen in four eggs?', ['Exactly three must breathe fire', 'All four must breathe fire', 'Any small result is possible; 75% is a long-run expectation', 'Exactly one must breathe fire'], 2, 'Probability is not a promise for a small batch.', 'probability-is-guarantee'),
  question('license-10', 'GEN-6', 'Which process combines one modeled allele from each of two parents?', ['Asexual reproduction', 'Sexual reproduction', 'Training', 'Environmental exposure'], 1, 'Sexual reproduction combines genetic information from two parents.', 'reproduction-confusion'),
  question('license-11', 'GEN-7', 'Why can siblings from the same parents differ?', ['They may inherit different allele combinations', 'Dominant alleles choose the strongest sibling', 'Each egg receives every allele from both parents', 'Scars change the DNA model'], 0, 'Each sibling can receive a different allele from each parent at each modeled gene.', 'siblings-identical'),
  question('license-12', 'GEN-8', 'Which plan best protects modeled genetic diversity?', ['Breed only the current battle winner', 'Repeat the pair with the rarest-looking dragon', 'Use evidence to preserve multiple alleles across the population', 'Choose only dominant phenotypes'], 2, 'Diversity is about maintaining variation, not selecting “better” or visually rare individuals.', 'rare-means-better'),
];

export const WEEK1_MASTERY_QUESTIONS: readonly LicenseQuestion[] = [
  question('week1-1', 'GEN-1', 'Which change is acquired during a dragon’s life?', ['Scale genotype', 'A scar from a thorn', 'Inherited horn alleles', 'A chromosome'], 1, 'A scar develops from an environmental event.', 'acquired-as-inherited'),
  question('week1-2', 'GEN-1', 'Why is improved strength from nutrition not automatically inherited?', ['Nutrition changes experience and growth, not the allele pair in this model', 'Strength is recessive', 'Only wings are inherited', 'Food removes chromosomes'], 0, 'An environmental effect on one dragon is not an inherited allele.', 'environmental-is-genetic'),
  question('week1-3', 'GEN-2', 'Which order is correct?', ['DNA → chromosome → allele → gene', 'Chromosome → DNA → gene → allele', 'Allele → dragon → cell → DNA', 'Gene → cell → chromosome → DNA'], 1, 'Chromosomes package DNA, genes are DNA sections, and alleles are gene versions.', 'hierarchy-confusion'),
  question('week1-4', 'GEN-2', 'Where is a gene located in this model?', ['As a section of DNA on a chromosome', 'Inside a phenotype', 'In a learned behavior', 'Only in offspring'], 0, 'Genes are sections of DNA located on chromosomes.', 'gene-definition'),
  question('week1-5', 'GEN-2', 'What is an allele?', ['A version of a gene', 'A complete chromosome pair', 'A visible trait only', 'A random sample'], 0, 'An allele is a version of a gene.', 'allele-definition'),
  question('week1-6', 'GEN-3', 'Which is a genotype?', ['Winged', 'Ww', 'Spotted', 'Horned'], 1, 'Ww names an allele combination.', 'genotype-phenotype-swap'),
  question('week1-7', 'GEN-3', 'A winged phenotype could come from…', ['WW or Ww', 'ww only', 'W only', 'any environmental change'], 0, 'The dominant phenotype can come from WW or Ww.', 'dominant-genotype-inference'),
  question('week1-8', 'GEN-4', 'Which genotype shows a recessive phenotype?', ['AA', 'Aa', 'aa', 'AA and Aa'], 2, 'Two recessive alleles are required in the simplified model.', 'recessive-carrier'),
  question('week1-9', 'GEN-4', 'Dominant means…', ['strongest', 'most common', 'expressed with at least one copy', 'best for battle'], 2, 'Dominance is an expression rule, not a ranking.', 'dominant-means-better'),
  question('week1-10', 'GEN-3', 'Can a dominant phenotype reveal the exact genotype?', ['Always', 'No; it may be homozygous dominant or heterozygous', 'Only after training', 'Only for scars'], 1, 'A dominant phenotype alone does not distinguish AA from Aa.', 'dominant-genotype-inference'),
];

export const WEEK2_MASTERY_QUESTIONS: readonly LicenseQuestion[] = [
  question('week2-1', 'GEN-3', 'Which statement correctly compares genotype and phenotype?', ['Genotype is alleles; phenotype is the observable trait', 'They are identical terms', 'Phenotype is inherited but genotype is learned', 'Genotype means stronger'], 0, 'Genotype names alleles; phenotype is observable.', 'genotype-phenotype-swap'),
  question('week2-2', 'GEN-5', 'For Ww × ww, what percentage of model outcomes are winged?', ['0%', '25%', '50%', '100%'], 2, 'Two of four Punnett cells contain W.', 'punnett-probability'),
  question('week2-3', 'GEN-5', 'For Aa × Aa, what percentage are expected to be aa?', ['0%', '25%', '50%', '75%'], 1, 'One of four equally likely combinations is aa.', 'punnett-probability'),
  question('week2-4', 'GEN-5', 'What must all genotype probabilities total?', ['25%', '50%', '75%', '100%'], 3, 'The complete sample space totals 100%.', 'probability-total'),
  question('week2-5', 'GEN-5', 'A 50% prediction produces 5 of 8 offspring with the trait. Is the model disproved?', ['Yes', 'No; small random samples can differ', 'Only if the trait is dominant', 'The offspring must be changed'], 1, 'A probability is not an exact small-batch promise.', 'probability-is-guarantee'),
  question('week2-6', 'GEN-7', 'Why do larger trials often look more stable?', ['Observed frequencies tend to settle nearer long-run probabilities', 'Dominant alleles become stronger', 'All siblings become identical', 'Environmental traits disappear'], 0, 'Larger samples often reduce random fluctuation in observed percentages.', 'sample-size-confusion'),
  question('week2-7', 'GEN-6', 'Which model combines alleles from two parents?', ['Sexual reproduction', 'Asexual clone-style reproduction', 'Training', 'Nutrition'], 0, 'Sexual reproduction combines genetic information from two parents.', 'reproduction-confusion'),
  question('week2-8', 'GEN-6', 'In the required asexual model, offspring…', ['keep the same modeled genotype as the parent', 'always gain a dominant allele', 'combine two parent genotypes', 'must have different phenotypes'], 0, 'The required model uses clone-style genotype copying and does not add mutation.', 'asexual-model-confusion'),
  question('week2-9', 'GEN-7', 'Why can siblings from the same parents differ?', ['Different allele combinations can be inherited', 'One sibling receives all parent alleles', 'Scars rewrite the model', 'Probability forces identical groups of four'], 0, 'Each sibling can receive different alleles at each gene.', 'siblings-identical'),
  question('week2-10', 'GEN-7', 'Why are offspring similar to but not identical to a parent?', ['They combine modeled information from both parents', 'They copy only learned behaviors', 'Dominant alleles erase all others', 'The environment chooses every allele'], 0, 'Sexual offspring combine information from two parents.', 'parent-copy-confusion'),
  question('week2-11', 'GEN-8', 'Which strategy best preserves variation?', ['Repeatedly breed one visible rare trait', 'Maintain multiple alleles across a broader breeding pool', 'Use only battle winners', 'Keep only dominant phenotypes'], 1, 'A broader pool preserves more modeled genetic options.', 'diversity-strategy-narrow'),
  question('week2-12', 'GEN-8', 'Why is a rare-looking trait not automatically better?', ['Rarity is not evidence of health, fitness, or value', 'Rare traits are always recessive', 'Rare traits are environmental', 'Every rare trait wins battles'], 0, 'Frequency and biological value are different ideas.', 'rare-means-better'),
];

export const FINAL_REFLECTION_PROMPTS = [
  'What genetics idea most changed how you bred your dragons?',
  'Which prediction was wrong or surprising, and what evidence explains it?',
  'How did your team balance desired traits with genetic diversity?',
  'What is one genetics misconception you can now correct?',
  'What did you personally contribute to the team’s science reasoning?',
] as const;

function question(
  id: string,
  skill: LicenseQuestion['skill'],
  prompt: string,
  labels: string[],
  correctIndex: number,
  explanation: string,
  misconceptionFlag: string,
): LicenseQuestion {
  const options = labels.map((label, index) => ({ id: `${id}-${index}`, label }));
  return {
    id,
    skill,
    prompt,
    options,
    correctOptionId: options[correctIndex].id,
    explanation,
    misconceptionFlag,
  };
}
