import {
  DragonSex,
  EXPRESSIVE_DRAGON_TRAITS,
  ExpressiveDragonTraitDefinition,
  ExpressiveDragonTraitId,
} from '../../simulation/domain/dragon-expressive-genome';

/**
 * The loci the historical dragon archive keeps records for.
 *
 * Every one of them is a real entry in EXPRESSIVE_DRAGON_TRAITS — this list
 * selects, it does not redefine. Four are investigations a student can open and
 * the fifth (`wings`) is the harmful recessive that rides along inside one of
 * the same bloodlines.
 */
export const PEDIGREE_GENE_IDS = [
  'scales',
  'body-color',
  'eye-color',
  'tail',
  'wings',
] as const satisfies readonly ExpressiveDragonTraitId[];

export type PedigreeGeneId = (typeof PEDIGREE_GENE_IDS)[number];

/** An allele pair. A hemizygous male carries `Y` in the second position. */
export type PedigreeAllelePair = readonly [string, string];
export type PedigreeGenome = Record<PedigreeGeneId, PedigreeAllelePair>;

export const PEDIGREE_GENES: readonly ExpressiveDragonTraitDefinition[] = PEDIGREE_GENE_IDS.map(
  (id) => {
    const gene = EXPRESSIVE_DRAGON_TRAITS.find((trait) => trait.id === id);
    if (!gene) throw new Error(`Pedigree gene ${id} is not registered as an expressive trait.`);
    return gene;
  },
);

export function pedigreeGene(id: PedigreeGeneId): ExpressiveDragonTraitDefinition {
  const gene = PEDIGREE_GENES.find((candidate) => candidate.id === id);
  if (!gene) throw new Error(`Pedigree gene ${id} is not part of the archive.`);
  return gene;
}

/** The year the archive is being read in. Every age and "last seen" gap counts from here. */
export const ARCHIVE_YEAR = 384;

export interface PedigreeDragon {
  id: string;
  name: string;
  /** Historical byname. Empty for dragons the records list by name alone. */
  epithet: string;
  sex: DragonSex;
  bloodline: string;
  breed: string;
  /** 1 for the oldest recorded dragons; one more than the older parent otherwise. */
  generation: number;
  birthYear: number;
  deathYear: number | null;
  alive: boolean;
  motherId: string | null;
  fatherId: string | null;
  mateIds: readonly string[];
  offspringIds: readonly string[];
  /**
   * The archive's truth. Students never read this directly: the workstation
   * shows a phenotype only where `recordedGeneIds` says the record survived,
   * and a genotype only where the student spent a DNA test.
   */
  genome: PedigreeGenome;
  dnaAvailable: boolean;
  /** Loci whose observed phenotype survives in the written record. */
  recordedGeneIds: readonly PedigreeGeneId[];
  legendary: boolean;
  historicalNote: string | null;
  achievements: readonly string[];
  origin: 'archive' | 'hatched';
}

export type PedigreePopulation = readonly PedigreeDragon[];

/**
 * How a student proposes the trait is inherited.
 *
 * The workstation never states the pattern. The student picks one of these, the
 * deduction engine runs the whole pedigree under it, and records the model
 * cannot explain are reported as contradictions. Choosing the model is the
 * scientific move; the contradiction list is the evidence.
 */
export type InheritanceModel =
  | 'autosomal-recessive'
  | 'autosomal-dominant'
  | 'x-linked-recessive'
  | 'incomplete-dominance';

export const INHERITANCE_MODELS: readonly InheritanceModel[] = [
  'autosomal-recessive',
  'autosomal-dominant',
  'x-linked-recessive',
  'incomplete-dominance',
];

export const INHERITANCE_MODEL_LABELS: Record<InheritanceModel, string> = {
  'autosomal-recessive': 'Autosomal recessive',
  'autosomal-dominant': 'Autosomal dominant',
  'x-linked-recessive': 'X-linked recessive',
  'incomplete-dominance': 'Incomplete dominance',
};

export const INHERITANCE_MODEL_SUMMARIES: Record<InheritanceModel, string> = {
  'autosomal-recessive':
    'Two copies of the traced allele are needed before the trait appears, on a numbered chromosome.',
  'autosomal-dominant':
    'One copy of the traced allele is enough for the trait to appear, on a numbered chromosome.',
  'x-linked-recessive': 'The locus sits on the X chromosome; males carry a single copy.',
  'incomplete-dominance': 'One copy produces a third, intermediate appearance.',
};

/** One bloodline mystery a student can open from the archive. */
export interface BloodlineInvestigation {
  id: string;
  geneId: PedigreeGeneId;
  /** The legendary dragon the trait is traced from. */
  ancestorId: string;
  bloodline: string;
  /** The appearance that has stopped being observed. */
  lostPhenotype: string;
  archiveTitle: string;
  brief: string;
  /** A second locus in the same bloodline worth checking before breeding. */
  riskGeneId: PedigreeGeneId | null;
  dnaTestBudget: number;
}

/**
 * The allele being traced: the one whose presence produces the lost appearance.
 *
 * Derived from the catalog rather than declared, so it cannot drift from the
 * phenotype the archive is hunting. Nothing in the interface renders this letter
 * directly — {@link modelAlleleSymbols} restates it in whichever notation the
 * student's current model implies.
 */
export function tracedAllele(investigation: BloodlineInvestigation): string {
  const gene = pedigreeGene(investigation.geneId);
  if (investigation.lostPhenotype === gene.recessivePhenotype) return gene.recessiveAllele;
  if (investigation.lostPhenotype === gene.dominantPhenotype) return gene.dominantAllele;
  throw new Error(
    `${investigation.id} hunts "${investigation.lostPhenotype}", which is not a ${gene.name} phenotype.`,
  );
}

export interface ModelAlleleSymbols {
  /** How the traced allele is written under the student's current model. */
  traced: string;
  /** How the other allele at the locus is written. */
  alternate: string;
}

/**
 * Notation follows the student's hypothesis, not the answer key.
 *
 * Capitalisation is the whole convention for dominance, so printing the
 * catalog's own letters would hand over the pattern before a student has looked
 * at a single record. Under a recessive model the traced allele is lower case;
 * under a dominant model it is upper case; the student's choice decides.
 */
export function modelAlleleSymbols(
  investigation: BloodlineInvestigation,
  model: InheritanceModel,
): ModelAlleleSymbols {
  const gene = pedigreeGene(investigation.geneId);
  const letter = gene.geneSymbol.toUpperCase();
  const tracedIsDominant = model === 'autosomal-dominant';
  return tracedIsDominant
    ? { traced: letter, alternate: letter.toLowerCase() }
    : { traced: letter.toLowerCase(), alternate: letter };
}

/** Where a dragon's status came from. Shown beside every status, never inferred by colour alone. */
export type PedigreeEvidenceSource =
  | 'dna-test'
  | 'phenotype-record'
  | 'pedigree-deduction'
  | 'no-evidence';

export type PedigreeCarrierStatus =
  | 'shows-trait'
  | 'confirmed-carrier'
  | 'possible-carrier'
  | 'eliminated'
  | 'unrecorded'
  | 'contradiction';

export const CARRIER_STATUS_LABELS: Record<PedigreeCarrierStatus, string> = {
  'shows-trait': 'Shows the trait',
  'confirmed-carrier': 'Must carry',
  'possible-carrier': 'Possible carrier',
  eliminated: 'Eliminated',
  unrecorded: 'No record',
  contradiction: 'Record conflicts with model',
};

/**
 * Text glyphs, so status survives greyscale printing and colour-vision deficiency.
 *
 * The carrier mark is a centre dot rather than a DNA icon because that is the
 * notation on every real pedigree chart a student will meet afterwards — and a
 * dot stays legible at the size a symbol actually gets drawn on the canvas.
 */
export const CARRIER_STATUS_GLYPHS: Record<PedigreeCarrierStatus, string> = {
  'shows-trait': '✓',
  'confirmed-carrier': '●',
  'possible-carrier': '?',
  eliminated: '✕',
  unrecorded: '·',
  contradiction: '!',
};

export interface PedigreeDnaTestRecord {
  dragonId: string;
  geneId: PedigreeGeneId;
  /** The archive's true pair for that locus, in catalog letters. */
  alleles: PedigreeAllelePair;
  testedAtIso: string;
}

export interface PedigreeCarrierNote {
  dragonId: string;
  /** The student's own call, which may disagree with the deduction engine. */
  status: 'carrier' | 'not-carrier' | 'uncertain';
  note: string;
  updatedAtIso: string;
}

export interface PedigreeBreedingAuthorization {
  targetGeneId: PedigreeGeneId;
  ancestorId: string;
  motherId: string;
  fatherId: string;
  predictedMotherGenotype: string;
  predictedFatherGenotype: string;
  predictedPercent: number;
  riskNote: string;
  justification: string;
}

export interface PedigreeHatchRecord {
  id: string;
  investigationId: string;
  motherId: string;
  motherName: string;
  fatherId: string;
  fatherName: string;
  attempt: number;
  /** Kinship of the pair, which is the inbreeding coefficient of this clutch. */
  inbreedingCoefficient: number;
  predictedPercent: number;
  observedPercent: number;
  recoveredCount: number;
  affectedByRiskCount: number;
  hatchlingIds: readonly string[];
  hatchedAtIso: string;
}

export interface PedigreeInvestigationRecord {
  testedDragonIds: readonly string[];
  dnaTests: readonly PedigreeDnaTestRecord[];
  model: InheritanceModel | null;
  carrierNotes: readonly PedigreeCarrierNote[];
  hypothesis: string;
  trayDragonIds: readonly string[];
  hatchRecords: readonly PedigreeHatchRecord[];
  hatchlings: readonly PedigreeDragon[];
  recoveredAtIso: string | null;
}

export interface PedigreeLabSnapshot {
  schemaVersion: 1;
  studentId: string;
  activeInvestigationId: string;
  investigations: Readonly<Record<string, PedigreeInvestigationRecord>>;
  updatedAtIso: string;
}

export function createEmptyInvestigationRecord(): PedigreeInvestigationRecord {
  return {
    testedDragonIds: [],
    dnaTests: [],
    model: null,
    carrierNotes: [],
    hypothesis: '',
    trayDragonIds: [],
    hatchRecords: [],
    hatchlings: [],
    recoveredAtIso: null,
  };
}

export const PEDIGREE_DRAGON_DRAG_TYPE = 'application/x-pbl-pedigree-dragon';

export function parsePedigreeDragonDragPayload(value: string): string | null {
  try {
    const candidate = JSON.parse(value) as { dragonId?: unknown };
    return typeof candidate.dragonId === 'string' ? candidate.dragonId : null;
  } catch {
    // Native drag payloads are untrusted browser input; anything unreadable is ignored.
    return null;
  }
}

export function dragonDisplayName(dragon: PedigreeDragon): string {
  return dragon.epithet ? `${dragon.name} ${dragon.epithet}` : dragon.name;
}

export function dragonLifespanLabel(dragon: PedigreeDragon): string {
  return dragon.alive
    ? `Born ${dragon.birthYear} · age ${ARCHIVE_YEAR - dragon.birthYear}`
    : `${dragon.birthYear}–${dragon.deathYear ?? '?'}`;
}
