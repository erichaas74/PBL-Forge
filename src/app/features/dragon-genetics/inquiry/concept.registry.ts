import { Concept, ConceptId, CONCEPT_IDS } from './inquiry.models';
import { InstructionLevel } from '../adaptive/dragon-simulation.models';

/**
 * The concept graph — the pedagogical unit this whole layer is organized around.
 *
 * Before this registry, misconceptions were loose strings scattered through the simulation
 * registry, so nothing could guarantee coverage, prevent a typo, ask the same misconception in a
 * different lab, or report which misconceptions a class still holds. Each id here is the *correct*
 * idea; `misconception` names the wrong idea it displaces.
 */

const ALL: readonly InstructionLevel[] = ['grade-7', 'grade-8', 'high-school', 'ap-biology'];
const LOWER: readonly InstructionLevel[] = ['grade-7', 'grade-8'];
const UPPER: readonly InstructionLevel[] = ['grade-8', 'high-school', 'ap-biology'];
const ADVANCED: readonly InstructionLevel[] = ['high-school', 'ap-biology'];

function concept(
  id: ConceptId,
  skillId: Concept['skillId'],
  statement: string,
  misconception: string,
  probes: Concept['probes'],
  prerequisites: readonly ConceptId[] = [],
  gradeBands: readonly InstructionLevel[] = ALL,
): Concept {
  return { id, skillId, statement, misconception, probes, prerequisites, gradeBands };
}

export const DRAGON_CONCEPTS: readonly Concept[] = [
  // --- GEN-1 · inherited traits ------------------------------------------------
  concept(
    'learned-is-genetic',
    'GEN-1',
    'A trait an animal was taught is not passed to its offspring through its genes.',
    'Anything a dragon can do well must have been inherited.',
    ['trait.inherited-vs-acquired', 'trait.evidence-source'],
    [],
    ALL,
  ),
  concept(
    'reflex-is-trained',
    'GEN-1',
    'A reflex present at hatching is inherited, even though it looks like a skill.',
    'Fast reactions are always the result of practice.',
    ['trait.evidence-source', 'trait.inherited-vs-acquired'],
    ['learned-is-genetic'],
    ALL,
  ),
  concept(
    'appearance-as-proof',
    'GEN-1',
    'Looking alike is not proof of a shared genotype; a record is needed.',
    'Two dragons that look the same must carry the same alleles.',
    ['trait.observe', 'trait.evidence-source'],
    [],
    ALL,
  ),
  concept(
    'outcome-as-cause',
    'GEN-1',
    'A good result does not identify which trait produced it.',
    'Whatever won the trial must be the inherited advantage.',
    ['trait.evidence-source', 'trial.outcome'],
    ['appearance-as-proof'],
    UPPER,
  ),
  concept(
    'correlation-as-causation',
    'GEN-1',
    'Two traits appearing together does not mean one causes the other.',
    'Traits that show up together must be linked by cause.',
    ['trait.evidence-source', 'population.scan'],
    ['appearance-as-proof'],
    ADVANCED,
  ),

  // --- GEN-2 · genome organization ---------------------------------------------
  concept(
    'hierarchy-confusion',
    'GEN-2',
    'A cell holds chromosomes, a chromosome holds many genes, and a gene is a stretch of DNA.',
    'Cell, chromosome, gene, and allele are interchangeable names for the same object.',
    ['genome.hierarchy', 'chromosome.pair', 'gene.locus'],
    [],
    ALL,
  ),
  concept(
    'allele-chromosome-swap',
    'GEN-2',
    'Homologous chromosomes carry the same genes at the same loci, with possibly different alleles.',
    'A different allele means a different chromosome.',
    ['chromosome.pair', 'gene.locus', 'allele.pair'],
    ['hierarchy-confusion'],
    ALL,
  ),
  concept(
    'chromatin-is-separate',
    'GEN-2',
    'Chromatin and a chromosome are the same DNA molecule at different packing levels.',
    'Chromatin is a different substance that sits alongside the chromosome.',
    ['chromatin.packing', 'genome.hierarchy'],
    ['hierarchy-confusion'],
    UPPER,
  ),
  concept(
    'dna-structure-confusion',
    'GEN-2',
    'DNA stores information in the order of its bases along two complementary strands.',
    'DNA stores information in its shape or its colour rather than its base order.',
    ['dna.sequence', 'genome.hierarchy'],
    ['hierarchy-confusion'],
    ALL,
  ),

  // --- GEN-3 · alleles and phenotype -------------------------------------------
  concept(
    'allele-definition',
    'GEN-3',
    'An allele is one version of a gene; a dragon carries two copies of each autosomal gene.',
    'Alleles are separate genes rather than versions of one gene.',
    ['allele.pair', 'allele.compare', 'gene.locus'],
    ['hierarchy-confusion'],
    ALL,
  ),
  concept(
    'dominant-means-two',
    'GEN-3',
    'One dominant allele is enough to show the dominant form.',
    'A dragon needs two dominant alleles to show the dominant trait.',
    ['allele.pair', 'genotype.to.phenotype'],
    ['allele-definition'],
    ALL,
  ),
  concept(
    'recessive-disappears',
    'GEN-3',
    'A recessive allele is still carried and can reappear in later offspring.',
    'A recessive allele is lost when it is masked.',
    ['allele.pair', 'genotype.to.phenotype', 'pedigree.trace'],
    ['dominant-means-two'],
    ALL,
  ),
  concept(
    'genotype-equals-phenotype',
    'GEN-3',
    'Two different genotypes can produce the same visible form.',
    'Every visible difference means a different genotype, and the reverse.',
    ['genotype.to.phenotype', 'allele.compare'],
    ['dominant-means-two'],
    ALL,
  ),

  // --- GEN-4 · inheritance patterns --------------------------------------------
  concept(
    'two-from-one-parent',
    'GEN-4',
    'Each parent contributes exactly one allele per gene to an offspring.',
    'A parent passes both of its alleles to the same offspring.',
    ['gamete.select', 'gamete.ploidy', 'cross.predict'],
    ['allele-definition'],
    ALL,
  ),
  concept(
    'identical-gametes',
    'GEN-4',
    'Meiosis produces gametes that differ from one another.',
    'All of a parent’s gametes carry the same alleles.',
    ['meiosis.stage', 'gamete.select'],
    ['two-from-one-parent'],
    ALL,
  ),
  concept(
    'gamete-stays-diploid',
    'GEN-4',
    'A gamete carries half the chromosome number of a body cell.',
    'A gamete carries a full set of chromosome pairs.',
    ['gamete.ploidy', 'meiosis.stage'],
    ['identical-gametes'],
    ALL,
  ),
  concept(
    'genotype-phenotype-ratio',
    'GEN-4',
    'The genotype ratio and the phenotype ratio of a cross are different numbers.',
    'The 1:2:1 and 3:1 ratios describe the same thing.',
    ['cross.predict', 'offspring.ratio'],
    ['dominant-means-two', 'two-from-one-parent'],
    UPPER,
  ),
  concept(
    'punnett-count-error',
    'GEN-4',
    'Each Punnett cell is one equally likely combination, not one offspring.',
    'A four-cell grid predicts a litter of exactly four.',
    ['cross.predict', 'offspring.ratio'],
    ['two-from-one-parent'],
    ALL,
  ),
  concept(
    'grid-equals-family',
    'GEN-4',
    'A Punnett square shows probability for each birth, not a family roster.',
    'The grid lists the actual offspring a pair will have.',
    ['cross.predict', 'offspring.sample'],
    ['punnett-count-error'],
    ALL,
  ),
  concept(
    'probability-guarantee',
    'GEN-4',
    'A 3:1 expectation is a long-run tendency, not a guarantee for any clutch.',
    'Three out of every four offspring must show the dominant form.',
    ['offspring.ratio', 'offspring.sample'],
    ['punnett-count-error'],
    ALL,
  ),
  concept(
    'sample-size-irrelevant',
    'GEN-4',
    'Observed ratios approach the predicted ratio as the sample grows.',
    'A small clutch tests a prediction as well as a large batch does.',
    ['offspring.sample', 'offspring.ratio'],
    ['probability-guarantee'],
    ALL,
  ),

  // --- GEN-5 · pedigree evidence -----------------------------------------------
  concept(
    'carrier-shows-trait',
    'GEN-5',
    'A carrier holds a recessive allele without showing the recessive form.',
    'Anyone carrying the allele displays the trait.',
    ['pedigree.carrier', 'pedigree.trace'],
    ['recessive-disappears'],
    ALL,
  ),
  concept(
    'skipped-generation-impossible',
    'GEN-5',
    'A recessive trait can skip a generation and reappear.',
    'A trait absent in the parents cannot appear in the offspring.',
    ['pedigree.trace', 'pedigree.carrier'],
    ['carrier-shows-trait'],
    ALL,
  ),
  concept(
    'pedigree-symbol-confusion',
    'GEN-5',
    'Pedigree symbols encode sex, affected status, and relationship separately.',
    'A filled symbol simply means an important individual.',
    ['pedigree.trace'],
    [],
    LOWER,
  ),
  concept(
    'sequencing-replaces-reasoning',
    'GEN-5',
    'Deduction narrows the candidates; sequencing confirms what reasoning already suggested.',
    'Testing everyone is a substitute for reasoning from the pedigree.',
    ['pedigree.sequence', 'pedigree.carrier'],
    ['carrier-shows-trait'],
    UPPER,
  ),

  // --- GEN-6 · DNA and proteins ------------------------------------------------
  concept(
    'one-gene-one-trait',
    'GEN-6',
    'A gene contributes a protein, and traits emerge from proteins acting in cells.',
    'A gene simply is the trait.',
    ['gene.to.trait', 'protein.product', 'protein.shape'],
    ['dna-structure-confusion'],
    ALL,
  ),
  concept(
    'rna-uses-thymine',
    'GEN-6',
    'RNA uses uracil where DNA uses thymine.',
    'RNA and DNA use the same four bases.',
    ['dna.transcribe', 'dna.sequence'],
    ['dna-structure-confusion'],
    ALL,
  ),
  concept(
    'replication-destroys-template',
    'GEN-6',
    'Replication copies DNA and preserves the original strands as templates.',
    'Copying DNA consumes or destroys the original molecule.',
    ['dna.replicate'],
    ['dna-structure-confusion'],
    UPPER,
  ),
  concept(
    'transcription-equals-translation',
    'GEN-6',
    'Transcription makes RNA from DNA; translation makes protein from RNA.',
    'Transcription and translation are two words for the same step.',
    ['dna.transcribe', 'rna.translate'],
    ['rna-uses-thymine'],
    ALL,
  ),
  concept(
    'mutation-types-confused',
    'GEN-6',
    'Substitutions, insertions, and deletions change a sequence in different ways.',
    'All mutations are the same kind of change.',
    ['dna.mutate', 'dna.sequence'],
    ['dna-structure-confusion'],
    UPPER,
  ),
  concept(
    'mutation-always-harmful',
    'GEN-6',
    'A sequence change can be harmful, neutral, or occasionally useful.',
    'Every mutation damages the organism.',
    ['dna.mutate', 'protein.product'],
    ['mutation-types-confused'],
    ALL,
  ),
  concept(
    'repair-guarantees-no-mutations',
    'GEN-6',
    'Repair reduces errors but does not eliminate them.',
    'A cell with repair machinery never keeps a mutation.',
    ['dna.repair', 'dna.mutate'],
    ['mutation-always-harmful'],
    ADVANCED,
  ),
  concept(
    'percent-difference-error',
    'GEN-6',
    'Sequence similarity is measured against the compared length, not the count of differences.',
    'More differences always means a larger percentage difference.',
    ['allele.compare', 'dna.sequence'],
    ['dna-structure-confusion'],
    ADVANCED,
  ),
  concept(
    'protein-shape-irrelevant',
    'GEN-6',
    'A protein’s shape determines what it can bind and therefore what it does.',
    'Protein shape is decoration; only the amino acid list matters.',
    ['protein.shape', 'enzyme.substrate', 'gene.to.trait'],
    ['one-gene-one-trait'],
    UPPER,
  ),

  // --- GEN-7 · multiple alleles ------------------------------------------------
  concept(
    'two-alleles-max',
    'GEN-7',
    'A population can carry more than two alleles of one gene, while an individual carries two.',
    'Every gene has exactly two possible alleles.',
    ['multiple.alleles', 'antiserum.test'],
    ['allele-definition'],
    ALL,
  ),
  concept(
    'codominance-vs-incomplete',
    'GEN-7',
    'Codominance shows both forms at once; incomplete dominance blends them.',
    'Any non-Mendelian result is the same kind of blending.',
    ['multiple.alleles', 'genotype.to.phenotype'],
    ['two-alleles-max'],
    UPPER,
  ),
  concept(
    'universal-donor-confusion',
    'GEN-7',
    'Compatibility depends on which markers the recipient can react against.',
    'A donor that worked once will work for any recipient.',
    ['donor.compatibility', 'antiserum.test'],
    ['two-alleles-max'],
    ALL,
  ),

  // --- GEN-8 · population diversity --------------------------------------------
  concept(
    'phenotype-equals-diversity',
    'GEN-8',
    'A population that looks varied can still carry few alleles.',
    'Visible variety proves genetic diversity.',
    ['population.scan', 'population.metric'],
    ['genotype-equals-phenotype'],
    ALL,
  ),
  concept(
    'phenotype-frequency-equals-allele',
    'GEN-8',
    'Allele frequency and phenotype frequency are different measurements.',
    'Counting visible forms counts alleles.',
    ['population.metric', 'population.scan'],
    ['phenotype-equals-diversity'],
    ADVANCED,
  ),
  concept(
    'wrong-diversity-metric',
    'GEN-8',
    'Population size and allele richness answer different questions.',
    'A bigger population is automatically a healthier one.',
    ['population.metric', 'population.intervene'],
    ['phenotype-equals-diversity'],
    UPPER,
  ),
  concept(
    'best-with-best',
    'GEN-8',
    'Selecting only top performers narrows the allele pool the line can draw on.',
    'Breeding the best with the best is always the best strategy.',
    ['selection.rationale', 'population.metric'],
    ['wrong-diversity-metric'],
    ALL,
  ),
  concept(
    'battle-equals-mastery',
    'GEN-8',
    'A trial result is one measurement, not proof of a breeding claim.',
    'Winning proves the breeding decision was correct.',
    ['trial.outcome', 'selection.rationale'],
    ['outcome-as-cause'],
    ALL,
  ),
  concept(
    'single-trial-causation',
    'GEN-8',
    'One trial cannot separate an inherited advantage from chance.',
    'A single win identifies the cause.',
    ['trial.outcome', 'population.metric'],
    ['battle-equals-mastery'],
    UPPER,
  ),
  concept(
    'no-statistical-test',
    'GEN-8',
    'A difference between groups needs a test before it counts as real.',
    'Any visible difference in the numbers is a finding.',
    ['population.metric', 'offspring.sample'],
    ['sample-size-irrelevant'],
    ADVANCED,
  ),
  concept(
    'confounded-comparison',
    'GEN-8',
    'A comparison is only informative when one variable differs at a time.',
    'Two groups can be compared however they happen to differ.',
    ['population.scan', 'trial.outcome'],
    ['single-trial-causation'],
    ADVANCED,
  ),
  concept(
    'unfair-comparison',
    'GEN-8',
    'Groups must start from comparable conditions for a result to mean anything.',
    'Any two groups can be pitted against each other.',
    ['trial.outcome', 'population.scan'],
    ['confounded-comparison'],
    UPPER,
  ),
  concept(
    'model-is-universal',
    'GEN-8',
    'Every model omits factors, and naming its limits is part of using it.',
    'If the model shows it, that is how biology works.',
    ['genome.hierarchy', 'population.metric', 'gene.to.trait'],
    [],
    ADVANCED,
  ),
];

const BY_ID = new Map<ConceptId, Concept>(DRAGON_CONCEPTS.map((item) => [item.id, item]));

export function dragonConcept(id: string | null | undefined): Concept | null {
  return id ? (BY_ID.get(id as ConceptId) ?? null) : null;
}

export function conceptsForSkill(skillId: Concept['skillId']): readonly Concept[] {
  return DRAGON_CONCEPTS.filter((item) => item.skillId === skillId);
}

/** Concepts a given instrument can evidence, from the probes it declares. */
export function conceptsForProbes(probeIds: readonly string[]): readonly Concept[] {
  const available = new Set(probeIds);
  return DRAGON_CONCEPTS.filter((item) => item.probes.some((probe) => available.has(probe)));
}

/** Fails the build when the registry and the id vocabulary drift apart. */
export function assertValidConceptRegistry(): void {
  const seen = new Set<string>();
  for (const item of DRAGON_CONCEPTS) {
    if (seen.has(item.id)) throw new Error(`Duplicate Dragon concept ${item.id}.`);
    seen.add(item.id);
    if (!item.probes.length) throw new Error(`Concept ${item.id} declares no probe.`);
    if (!item.gradeBands.length) throw new Error(`Concept ${item.id} declares no grade band.`);
    for (const prerequisite of item.prerequisites) {
      if (!BY_ID.has(prerequisite)) {
        throw new Error(`Concept ${item.id} requires unknown concept ${prerequisite}.`);
      }
    }
  }
  const missing = CONCEPT_IDS.filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`Concept ids without a record: ${missing.join(', ')}.`);
}

assertValidConceptRegistry();
