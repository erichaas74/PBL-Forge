/**
 * Short, model-level explanations the Wise Dragon may give anywhere in the project.
 * They explain vocabulary without interpreting the student's untested specimen for them.
 */
export function answerGeneticsConcept(question: string): string | null {
  const words = normalize(question);

  if (includesAll(words, ['genotype', 'phenotype'])) {
    return 'A genotype is the allele combination in a genetic record. A phenotype is the observable result produced as that genotype is expressed in an environment. Use the page to test the connection instead of assuming that appearance reveals every allele.';
  }
  if (includesAny(words, ['genotype'])) {
    return 'A genotype records the alleles an organism carries for a gene. Two dragons can share a phenotype while carrying different genotypes, so check the genetic evidence when it is available.';
  }
  if (includesAny(words, ['phenotype'])) {
    return 'A phenotype is an observable or measurable characteristic. It can provide evidence, but appearance alone may not identify every allele in the genotype.';
  }
  if (includesAny(words, ['allele', 'alleles'])) {
    return 'Alleles are different versions of the same gene. An organism usually carries one allele copy from each biological parent at a matching locus.';
  }
  if (includesAll(words, ['gene', 'chromosome'])) {
    return 'A chromosome is a long DNA molecule containing many genes. A gene is a particular DNA region at a locus on that chromosome; alleles are variant forms of that gene.';
  }
  if (includesAny(words, ['dna'])) {
    return 'DNA is the molecule that stores inherited sequence information. A useful comparison names the exact position that differs and follows that difference to any change in RNA, protein, or phenotype.';
  }
  if (includesAny(words, ['dominant', 'recessive', 'dominance'])) {
    return 'Dominant describes an allele whose associated phenotype can appear with one copy in this model. Recessive describes a phenotype that generally requires two recessive copies. Dominant does not mean better, stronger, or more common.';
  }
  if (includesAny(words, ['inherited', 'inheritance', 'learned', 'environmental'])) {
    return 'Inherited characteristics are supported by parent-to-offspring genetic evidence. Training, injury, diet, and other life experiences can change a dragon without changing the alleles it inherited.';
  }
  if (includesAny(words, ['punnett', 'probability', 'ratio', 'chance'])) {
    return 'A Punnett square organizes possible gamete combinations. Its ratios predict probability across many offspring; they do not guarantee the result of one egg or a small clutch.';
  }
  if (includesAny(words, ['meiosis', 'gamete', 'gametes'])) {
    return 'Meiosis separates homologous chromosome copies so each gamete receives one allele at each modeled locus. Fertilization joins one gamete from each parent, restoring a pair.';
  }
  if (includesAny(words, ['mutation', 'mutations'])) {
    return 'A mutation is a change in a DNA sequence. Its consequence depends on where it occurs: some changes alter a codon or protein, while others produce no observable change in the model.';
  }
  if (includesAny(words, ['protein', 'translation', 'codon', 'rna'])) {
    return 'DNA can be transcribed into messenger RNA, and ribosomes read RNA codons to assemble an amino-acid chain. A sequence change matters when it changes the resulting protein or its function.';
  }
  if (includesAny(words, ['pedigree', 'carrier'])) {
    return 'A pedigree tracks traits and relationships across generations. Use every compatible inheritance pattern first, then use genetic samples to distinguish models that appearance alone cannot separate.';
  }
  if (includesAny(words, ['diversity', 'inbreeding', 'population'])) {
    return 'Genetic diversity describes the variety of alleles in a population. Compare allele counts across generations and watch for rare alleles, related pairings, and population size before judging a management choice.';
  }
  if (includesAny(words, ['blood', 'donor', 'transfusion', 'antigen'])) {
    return 'Blood compatibility depends on which markers are present on donor and recipient cells. Record the reagent reactions first, then use the laboratory model to compare the marker evidence before authorizing a trial.';
  }

  return null;
}

function normalize(value: string): readonly string[] {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/);
}

function includesAny(words: readonly string[], candidates: readonly string[]): boolean {
  return candidates.some((candidate) => words.includes(candidate));
}

function includesAll(words: readonly string[], candidates: readonly string[]): boolean {
  return candidates.every((candidate) => words.includes(candidate));
}
