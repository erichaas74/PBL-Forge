import {
  EXPRESSIVE_DRAGON_TRAITS,
  ExpressiveDragonTraitDefinition,
  ExpressiveDragonTraitId,
} from '../../simulation/domain/dragon-expressive-genome';
import { geneDnaRecord } from '../shared/dragon-gene-dna.catalog';

export type AlleleDominance = 'dominant' | 'recessive';

export interface AlleleVaultGene {
  /** Stable ID shared with the expressive-dragon renderer. */
  id: ExpressiveDragonTraitId;
  /** Explicit renderer link so future catalog adapters cannot silently drift. */
  renderTraitId: ExpressiveDragonTraitId;
  name: string;
  symbol: string;
  /** Student-facing locus identifier that does not reveal the trait or allele notation. */
  sampleCode: string;
  chromosome: ExpressiveDragonTraitDefinition['chromosome'];
  inheritance: ExpressiveDragonTraitDefinition['inheritance'];
  locus: string;
  icon: string;
  /** Canonical color shared by this gene's locus in every chromosome view. */
  locusColor: string;
  dominantPhenotype: string;
  recessivePhenotype: string;
  heterozygousPhenotype?: string;
  alleleIds: readonly [string, string];
}

export interface AlleleVaultAllele {
  id: string;
  geneId: ExpressiveDragonTraitId;
  /** Student-facing neutral identifier; it does not reveal allele notation. */
  sampleCode: string;
  symbol: string;
  name: string;
  dominance: AlleleDominance;
  phenotype: string;
  modelSequence: readonly string[];
}

export interface AlleleWorkbenchQuestionInput {
  id: string;
  focusGeneId?: string;
  startingPairIds?: readonly [string, string];
  requestedPairIds?: readonly [string, string];
  comparisonAlleleIds?: readonly [string, string];
  allowedAlleleIds?: readonly string[];
  highlight?: 'vault' | 'comparison' | 'pair' | 'expression';
}

export type AlleleWorkbenchInteractionType =
  | 'gene-selected'
  | 'allele-selected'
  | 'comparison-swapped'
  | 'allele-installed'
  | 'expression-run'
  | 'dna-analysis-requested'
  | 'discovery-claim';

export interface AlleleWorkbenchInteraction {
  type: AlleleWorkbenchInteractionType;
  geneId: string;
  alleleId?: string;
  pairIds?: readonly [string, string];
  genotype?: string;
  phenotype?: string;
  traitId?: string;
  dominantAlleleId?: string;
  recessiveAlleleId?: string;
  semanticTargetId?: 'slot-a' | 'slot-b' | 'carrier' | 'expression';
}

export interface AlleleClaimFeedback {
  geneId: string;
  status: 'solved' | 'incorrect' | 'incomplete-evidence';
  revision: number;
}

interface VaultGeneMetadata {
  id: ExpressiveDragonTraitId;
  locus: string;
  icon: string;
}

/**
 * The teacher's initial catalog contains the eleven autosomal loci plus the
 * shared X-linked locus. Trait science comes from EXPRESSIVE_DRAGON_TRAITS;
 * this table owns only instrument-specific locus labels and icons.
 */
const VAULT_GENE_METADATA: readonly VaultGeneMetadata[] = [
  { id: 'wings', locus: 'WNG-04', icon: 'W' },
  { id: 'tail', locus: 'TCL-09', icon: 'K' },
  { id: 'legs', locus: 'LEG-16', icon: 'L' },
  { id: 'fire', locus: 'FIR-11', icon: 'F' },
  { id: 'horns', locus: 'HRN-08', icon: 'H' },
  { id: 'claws', locus: 'CLW-18', icon: 'C' },
  { id: 'scales', locus: 'SCL-17', icon: 'S' },
  { id: 'body-color', locus: 'CLR-12', icon: 'B' },
  { id: 'crest', locus: 'CRS-21', icon: 'R' },
  { id: 'fangs', locus: 'FNG-13', icon: 'G' },
  { id: 'spikes', locus: 'SPK-22', icon: 'P' },
  { id: 'eye-color', locus: 'EYE-07', icon: 'E' },
];

export const ALLELE_VAULT_GENES: readonly AlleleVaultGene[] = VAULT_GENE_METADATA.map(
  (metadata, index) => {
    const trait = expressiveTrait(metadata.id);
    const geneNumber =
      VAULT_GENE_METADATA.slice(0, index).filter(
        (previous) => expressiveTrait(previous.id).chromosome === trait.chromosome,
      ).length + 1;
    return {
      id: trait.id,
      renderTraitId: trait.id,
      name: trait.name,
      symbol: `${trait.dominantAllele}/${trait.recessiveAllele}`,
      sampleCode: `CH${trait.chromosome.replace(/^Chr\s*/i, '')}-G${geneNumber}`,
      chromosome: trait.chromosome,
      inheritance: trait.inheritance,
      locus: metadata.locus,
      icon: metadata.icon,
      locusColor: geneDnaRecord(trait.id).locusColor,
      dominantPhenotype: trait.dominantPhenotype,
      recessivePhenotype: trait.recessivePhenotype,
      heterozygousPhenotype: trait.heterozygousPhenotype,
      alleleIds: [`${trait.id}-${trait.dominantAllele}`, `${trait.id}-${trait.recessiveAllele}`],
    } satisfies AlleleVaultGene;
  },
);

export const ALLELE_VAULT_ALLELES: readonly AlleleVaultAllele[] = ALLELE_VAULT_GENES.flatMap(
  (gene) => makeAllelePair(gene),
);

/**
 * Normalizes persisted teacher catalogs after the original mock catalog put
 * eye color on chromosome 1. Unknown IDs are dropped, the former `eyes` slot
 * becomes the real chromosome-1 leg-arrangement locus, and the former complete
 * eleven-gene default gains the newly released X-linked locus.
 */
export function normalizeAlleleVaultGeneIds(geneIds: readonly string[]): string[] {
  const valid = new Set(ALLELE_VAULT_GENES.map((gene) => gene.id));
  const normalized = geneIds.map((geneId) => (geneId === 'eyes' ? 'legs' : geneId));
  const released = [
    ...new Set(normalized.filter((geneId) => valid.has(geneId as ExpressiveDragonTraitId))),
  ];
  const formerDefault = VAULT_GENE_METADATA.filter((gene) => gene.id !== 'eye-color').map(
    (gene) => gene.id,
  );
  if (
    released.length === formerDefault.length &&
    formerDefault.every((geneId) => released.includes(geneId))
  ) {
    released.push('eye-color');
  }
  return released;
}

export function expressedAllelePairPhenotype(
  gene: AlleleVaultGene,
  pair: readonly [AlleleVaultAllele, AlleleVaultAllele],
): string {
  if (
    gene.inheritance === 'incomplete-dominance' &&
    gene.heterozygousPhenotype &&
    pair[0].symbol !== pair[1].symbol
  ) {
    return gene.heterozygousPhenotype;
  }
  return pair.some((allele) => allele.dominance === 'dominant')
    ? gene.dominantPhenotype
    : gene.recessivePhenotype;
}

function expressiveTrait(id: ExpressiveDragonTraitId): ExpressiveDragonTraitDefinition {
  const trait = EXPRESSIVE_DRAGON_TRAITS.find((candidate) => candidate.id === id);
  if (!trait) throw new Error(`Expressive dragon trait ${id} is not registered.`);
  return trait;
}

function makeAllelePair(gene: AlleleVaultGene): readonly [AlleleVaultAllele, AlleleVaultAllele] {
  const [dominantSymbol, recessiveSymbol] = gene.symbol.split('/');
  const sampleRoot = gene.sampleCode;
  const dna = geneDnaRecord(gene.id);
  return [
    {
      id: gene.alleleIds[0],
      geneId: gene.id,
      sampleCode: `${sampleRoot}a`,
      symbol: dominantSymbol,
      name: `${sampleRoot}a allele sample`,
      dominance: 'dominant',
      phenotype: gene.dominantPhenotype,
      modelSequence: dna.alleleASequence.split(''),
    },
    {
      id: gene.alleleIds[1],
      geneId: gene.id,
      sampleCode: `${sampleRoot}b`,
      symbol: recessiveSymbol,
      name: `${sampleRoot}b allele sample`,
      dominance: 'recessive',
      phenotype: gene.recessivePhenotype,
      modelSequence: dna.alleleBSequence.split(''),
    },
  ];
}
