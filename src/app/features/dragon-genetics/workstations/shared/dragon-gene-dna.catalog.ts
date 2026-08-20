import {
  AminoAcidGroup,
  AminoAcidGroupPalette,
  AMINO_ACID_GROUP_PALETTES,
  aminoAcidChemistry,
  aminoAcidGroupRadius,
} from '../../../../shared/dna-process-visuals/amino-acid-chemistry.models';
import { translateRna } from '../../../../shared/dna-process-visuals/dna-process.models';
import { ExpressiveDragonTraitId } from '../../simulation/domain/dragon-expressive-genome';
import {
  enzymeBodyPath,
  enzymeMoleculeGeometry,
  foldedProteinPath,
  residueChainPath,
} from './dragon-protein.geometry';

export type DragonDnaBase = 'A' | 'T' | 'C' | 'G';
export type DragonGeneMutationType = 'substitution' | 'deletion' | 'insertion';
export type DragonGeneBarcodeMutationType = 'reference' | DragonGeneMutationType;

/** Canonical colors used anywhere a DNA base is drawn. */
export const DRAGON_DNA_BASE_COLORS: Readonly<Record<DragonDnaBase, string>> = {
  A: '#48a43b',
  T: '#e34c45',
  C: '#2877e8',
  G: '#e2a11a',
};

export type DragonGeneMutation =
  | {
      type: 'substitution';
      /** Zero-based position in the reference allele. */
      index: number;
      referenceBase: DragonDnaBase;
      variantBase: DragonDnaBase;
    }
  | {
      type: 'deletion';
      /** Zero-based position in the reference allele. */
      index: number;
      referenceBase: DragonDnaBase;
    }
  | {
      type: 'insertion';
      /** Zero-based insertion point in the reference allele. */
      index: number;
      variantBase: DragonDnaBase;
    };

export interface DragonGeneBarcodePair {
  topBase: DragonDnaBase;
  bottomBase: DragonDnaBase;
  topColor: string;
  bottomColor: string;
}

/** What a finished protein is for once the cell has folded it. */
export type DragonProteinRole = 'enzyme' | 'structural' | 'signal';

/** Whether an enzyme joins two molecules or splits one apart. */
export type DragonEnzymeAction = 'build' | 'break-down';

/** One amino acid, with the codons that specified it and its chemistry. */
export interface DragonProteinResidue {
  /** One-based position in the chain. */
  position: number;
  /** Coding-strand triplet from the gene's DNA. */
  dnaCodon: string;
  /** The same triplet as it appears in messenger RNA. */
  rnaCodon: string;
  aminoAcid: string;
  shortName: string;
  group: AminoAcidGroup;
  groupLabel: string;
  sideChain: string;
  /** Group color, shared with every other residue drawing in the app. */
  color: string;
}

/** A molecule an enzyme acts on or releases. */
export interface DragonMoleculeShape {
  id: string;
  name: string;
  /** Closed SVG path in the shared -90 -50 180 100 protein viewBox. */
  path: string;
}

/**
 * What an enzyme does in the cell.
 *
 * `fragmentA` and `fragmentB` are cut from `joined` along one shared seam, so a
 * build reaction and a break-down reaction are the same geometry read in
 * opposite directions.
 */
export interface DragonEnzymeActivity {
  action: DragonEnzymeAction;
  actionLabel: string;
  fragmentA: DragonMoleculeShape;
  fragmentB: DragonMoleculeShape;
  joined: DragonMoleculeShape;
  /** What goes into the active site. */
  reactants: readonly DragonMoleculeShape[];
  /** What comes back out. */
  products: readonly DragonMoleculeShape[];
  /** The product this gene's trait actually depends on. */
  traitProduct: DragonMoleculeShape;
  /** Student-facing word equation, e.g. "A + B to AB". */
  equation: string;
}

/** One allele's translated protein: the RNA, the code, and the resulting shape. */
export interface DragonProteinForm {
  role: 'reference' | 'variant';
  /** Messenger RNA transcribed from this allele's coding strand. */
  rnaSequence: string;
  /** RNA triplets read by the ribosome. */
  codons: readonly string[];
  residues: readonly DragonProteinResidue[];
  /** Short chain caption, e.g. "Met-Pro-Tyr-Arg". */
  chainLabel: string;
  /** Folded silhouette generated from this chain. */
  shapePath: string;
  /** Open backbone glyph for the same chain. */
  backbonePath: string;
  /** True when a codon told the ribosome to stop before the chain finished. */
  truncated: boolean;
}

/** The protein a gene codes for, and what the cell does with it. */
export interface DragonGeneProtein {
  proteinId: string;
  /** Student-facing protein code, e.g. ENZ-F11. */
  proteinCode: string;
  name: string;
  role: DragonProteinRole;
  roleLabel: string;
  /** What the protein does inside a cell. */
  cellRole: string;
  /** How that cell activity reaches the visible trait. */
  traitContribution: string;
  /** Commonest residue group in the reference chain; drives the protein's palette. */
  dominantGroup: AminoAcidGroup;
  palette: AminoAcidGroupPalette;
  /** Enzyme silhouette, in the wider enzyme space. Null for non-enzymes. */
  bodyPath: string | null;
  activity: DragonEnzymeActivity | null;
  /**
   * The molecule the trait pathway actually reads: an enzyme's product, or the
   * structural protein itself. Every gene has one, so trait expression can be
   * modelled the same way for enzymes and non-enzymes.
   */
  traitSignal: DragonMoleculeShape;
  /** Protein translated from allele A. */
  form: DragonProteinForm;
  /** Protein translated from allele B, after the gene's mutation. */
  variantForm: DragonProteinForm;
}

export interface DragonGeneAlleleMarking {
  role: 'reference' | 'variant';
  sequence: string;
  mutationType: DragonGeneBarcodeMutationType;
  barcode: readonly DragonGeneBarcodePair[];
  /** The protein this allele copy translates into. */
  protein: DragonProteinForm;
}

export interface DragonGeneDnaRecord {
  geneId: ExpressiveDragonTraitId;
  /** The stable color for this gene's chromosome locus. */
  locusColor: string;
  /** DNA carried by the gene's first allele sample. */
  alleleASequence: string;
  /** DNA carried by the gene's second allele sample. */
  alleleBSequence: string;
  /** The explicit change that produces allele B from allele A. */
  mutation: DragonGeneMutation;
  /** Render-ready markings in the same order as the gene's two allele samples. */
  alleles: readonly [DragonGeneAlleleMarking, DragonGeneAlleleMarking];
  /** Protein identity, chemistry, and cellular job for this gene. */
  protein: DragonGeneProtein;
}

const COMPLEMENT: Readonly<Record<DragonDnaBase, DragonDnaBase>> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

const BARCODE_BASE_COUNT = 6;

const ROLE_LABELS: Readonly<Record<DragonProteinRole, string>> = {
  enzyme: 'Enzyme',
  structural: 'Structural protein',
  signal: 'Signal protein',
};

const ACTION_LABELS: Readonly<Record<DragonEnzymeAction, string>> = {
  build: 'Builds',
  'break-down': 'Breaks down',
};

interface EnzymeMoleculeNames {
  action: DragonEnzymeAction;
  fragmentA: readonly [string, string];
  fragmentB: readonly [string, string];
  joined: readonly [string, string];
}

interface ProteinDefinition {
  proteinId: string;
  proteinCode: string;
  name: string;
  role: DragonProteinRole;
  cellRole: string;
  traitContribution: string;
  molecules?: EnzymeMoleculeNames;
}

/**
 * Canonical molecular identity, protein product, and visual marking for every
 * identified dragon gene.
 *
 * Allele A is the reference strand. Allele B is generated from the declared
 * mutation, so the sequence, mutation label, barcode bases, and barcode colors
 * cannot drift apart. Each allele is then transcribed and translated here, and
 * every protein, enzyme, and molecule shape in the genome microscope is
 * generated from the resulting residue chain — there is no second place where a
 * dragon protein can be drawn differently. Chromosome location and
 * student-facing sample codes remain owned by the gene catalog.
 */
export const DRAGON_GENE_DNA_CATALOG: readonly DragonGeneDnaRecord[] = [
  defineGene(
    'wings',
    '#ff6d68',
    'ATGCCGTACCGAGCTACCGGATCA',
    { type: 'substitution', index: 4, referenceBase: 'C', variantBase: 'T' },
    {
      proteinId: 'wing-membrane-synthase',
      proteinCode: 'ENZ-W31',
      name: 'Wing-membrane synthase',
      role: 'enzyme',
      cellRole: 'Fastens a flexible protein strand to a membrane-compatible anchor.',
      traitContribution:
        'Each finished patch stiffens the growing wing web, so a dragon with a working copy completes a flight-ready membrane.',
      molecules: {
        action: 'build',
        fragmentA: ['collagen-strand', 'Collagen strand'],
        fragmentB: ['lipid-anchor', 'Lipid anchor'],
        joined: ['membrane-patch', 'Elastic wing-membrane patch'],
      },
    },
  ),
  defineGene(
    'tail',
    '#49a8ff',
    'TGCATACGGTCAGACCTTGGACCA',
    { type: 'deletion', index: 3, referenceBase: 'A' },
    {
      proteinId: 'tail-club-osteoblastin',
      proteinCode: 'PRO-K09',
      name: 'Tail-club osteoblastin',
      role: 'structural',
      cellRole: 'Stacks into the bone-building scaffold inside cells at the tip of the tail.',
      traitContribution:
        'More scaffold means longer crown spikes. Because each copy contributes, the heterozygote builds a visibly intermediate club.',
    },
  ),
  defineGene(
    'legs',
    '#67d790',
    'GCATGGCCTTGGACTGGCCAAGTT',
    { type: 'insertion', index: 5, variantBase: 'C' },
    {
      proteinId: 'limb-pattern-morphogen',
      proteinCode: 'PRO-L16',
      name: 'Limb-pattern morphogen',
      role: 'signal',
      cellRole: 'Released by limb-bud cells to tell neighbouring cells how far to extend.',
      traitContribution:
        'A strong signal grows weight-bearing forelegs; a weak signal leaves short grasping forearms.',
    },
  ),
  defineGene(
    'fire',
    '#ff6d68',
    'CATGACTGGCATGGATTCCAGACT',
    { type: 'insertion', index: 2, variantBase: 'T' },
    {
      proteinId: 'ember-synthase',
      proteinCode: 'ENZ-F11',
      name: 'Ember synthase',
      role: 'enzyme',
      cellRole: 'Joins an energy-rich sugar shape to an oxygen-carrying molecule.',
      traitContribution:
        'The fuel vesicles it builds collect in the throat gland, which is what a fire-breathing dragon ignites.',
      molecules: {
        action: 'build',
        fragmentA: ['spark-sugar', 'Spark sugar'],
        fragmentB: ['oxygen-carrier', 'Oxygen carrier'],
        joined: ['ember-fuel', 'Ember-fuel vesicle'],
      },
    },
  ),
  defineGene(
    'horns',
    '#49a8ff',
    'AGTCGATCCGTAAACGGCTCTCCA',
    { type: 'substitution', index: 1, referenceBase: 'G', variantBase: 'A' },
    {
      proteinId: 'horn-matrix-ligase',
      proteinCode: 'ENZ-H08',
      name: 'Horn-matrix ligase',
      role: 'enzyme',
      cellRole: 'Links a structural peptide to a sulfur-rich molecular bridge.',
      traitContribution:
        'Cross-linked matrix hardens the head plate into a horn instead of leaving a smooth skull.',
      molecules: {
        action: 'build',
        fragmentA: ['keratin-peptide', 'Keratin peptide'],
        fragmentB: ['sulfur-bridge', 'Sulfur bridge'],
        joined: ['horn-matrix-link', 'Cross-linked horn matrix'],
      },
    },
  ),
  defineGene(
    'claws',
    '#67d790',
    'TCGAGTACCTGGCCTGAAGGCACT',
    { type: 'deletion', index: 4, referenceBase: 'G' },
    {
      proteinId: 'claw-keratin-sheath',
      proteinCode: 'PRO-C18',
      name: 'Claw keratin sheath',
      role: 'structural',
      cellRole: 'Layers itself into the hard sheath that grows over each toe bone.',
      traitContribution: 'Thicker sheath layers extend the talon; thin layers leave a short claw.',
    },
  ),
  defineGene(
    'scales',
    '#ff6d68',
    'GCTACGATTCGAGTTCCAGACGGC',
    { type: 'deletion', index: 2, referenceBase: 'T' },
    {
      proteinId: 'scale-chromatase',
      proteinCode: 'ENZ-S17',
      name: 'Scale chromatase',
      role: 'enzyme',
      cellRole: 'Combines a colorless precursor with a metal-shaped cofactor.',
      traitContribution:
        'Pigment is deposited only in scale cells that are switched on, which is what produces banding rather than one solid color.',
      molecules: {
        action: 'build',
        fragmentA: ['pigment-precursor', 'Pigment precursor'],
        fragmentB: ['copper-cofactor', 'Copper cofactor'],
        joined: ['scale-pigment', 'Iridescent scale pigment'],
      },
    },
  ),
  defineGene(
    'body-color',
    '#49a8ff',
    'CAGTGCATAGCTAACTGCCCTGGA',
    { type: 'substitution', index: 3, referenceBase: 'T', variantBase: 'C' },
    {
      proteinId: 'melanin-dispersase',
      proteinCode: 'ENZ-B12',
      name: 'Melanin dispersase',
      role: 'enzyme',
      cellRole: 'Splits a dark pigment granule into two paler fragments.',
      traitContribution:
        'Every granule it takes apart lightens the hide, so how much of this enzyme a cell makes decides how many colors show.',
      molecules: {
        action: 'break-down',
        fragmentA: ['pale-pigment-fragment', 'Pale pigment fragment'],
        fragmentB: ['amber-pigment-fragment', 'Amber pigment fragment'],
        joined: ['melanin-granule', 'Dark melanin granule'],
      },
    },
  ),
  defineGene(
    'crest',
    '#67d790',
    'ATCGGATCTGCAGGAACTCCAGTT',
    { type: 'insertion', index: 4, variantBase: 'A' },
    {
      proteinId: 'crest-fan-collagen',
      proteinCode: 'PRO-R21',
      name: 'Crest fan collagen',
      role: 'structural',
      cellRole: 'Bundles into the flexible rays that hold a skin fan open.',
      traitContribution: 'Enough rays raise a standing crest; too few leave the fan folded flat.',
    },
  ),
  defineGene(
    'glow',
    '#ff6d68',
    'TCACCTGAGCTACCTGACGGATTC',
    { type: 'substitution', index: 2, referenceBase: 'A', variantBase: 'G' },
    {
      proteinId: 'luciferin-oxidase',
      proteinCode: 'ENZ-N05',
      name: 'Luciferin oxidase',
      role: 'enzyme',
      cellRole: 'Breaks a charged luciferin molecule apart, releasing light as it does.',
      traitContribution:
        'The light-releasing fragment is the glow itself, so the trait appears only while this reaction runs.',
      molecules: {
        action: 'break-down',
        fragmentA: ['spent-luciferin', 'Spent luciferin'],
        fragmentB: ['light-fragment', 'Light-releasing fragment'],
        joined: ['charged-luciferin', 'Charged luciferin'],
      },
    },
  ),
  defineGene(
    'fangs',
    '#49a8ff',
    'GACTGCTACCGTACTGGCCCAGAA',
    { type: 'insertion', index: 3, variantBase: 'T' },
    {
      proteinId: 'enamel-mineral-transferase',
      proteinCode: 'ENZ-G13',
      name: 'Enamel mineral transferase',
      role: 'enzyme',
      cellRole: 'Loads a calcium carrier onto the scaffold that shapes a tooth cap.',
      traitContribution:
        'Mineral caps sharpen and lengthen the front teeth into fangs rather than blunt pegs.',
      molecules: {
        action: 'build',
        fragmentA: ['calcium-carrier', 'Calcium carrier'],
        fragmentB: ['enamel-scaffold', 'Enamel scaffold'],
        joined: ['enamel-cap', 'Mineralised enamel cap'],
      },
    },
  ),
  defineGene(
    'spikes',
    '#67d790',
    'CTGACGTATCGAGACCCTTTCGGA',
    { type: 'deletion', index: 5, referenceBase: 'G' },
    {
      proteinId: 'spike-keratin-bundler',
      proteinCode: 'PRO-P22',
      name: 'Spike keratin bundler',
      role: 'structural',
      cellRole: 'Ties loose keratin fibres into the stiff rod inside a back spike.',
      traitContribution: 'Bundled rods stand the ridge spikes up instead of leaving low ridges.',
    },
  ),
  defineGene(
    'eye-color',
    '#b996d6',
    'ACGTTCGAGTCAGGCACTCAACCT',
    { type: 'substitution', index: 4, referenceBase: 'T', variantBase: 'C' },
    {
      proteinId: 'iris-pigment-reductase',
      proteinCode: 'ENZ-E07',
      name: 'Iris pigment reductase',
      role: 'enzyme',
      cellRole: 'Takes stored iris pigment apart into a bleached core and a free cofactor.',
      traitContribution:
        'Clearing stored pigment is what leaves a pale iris; leaving it intact keeps the eye dark.',
      molecules: {
        action: 'break-down',
        fragmentA: ['bleached-core', 'Bleached pigment core'],
        fragmentB: ['released-cofactor', 'Released cofactor'],
        joined: ['stored-iris-pigment', 'Stored iris pigment'],
      },
    },
  ),
];

export function geneDnaRecord(geneId: ExpressiveDragonTraitId): DragonGeneDnaRecord {
  const record = DRAGON_GENE_DNA_CATALOG.find((candidate) => candidate.geneId === geneId);
  if (!record) throw new Error(`DNA record for dragon gene ${geneId} is not registered.`);
  return record;
}

export function geneAlleleMarking(
  geneId: ExpressiveDragonTraitId,
  alleleIndex: 0 | 1,
): DragonGeneAlleleMarking {
  return geneDnaRecord(geneId).alleles[alleleIndex];
}

export function geneProtein(geneId: ExpressiveDragonTraitId): DragonGeneProtein {
  return geneDnaRecord(geneId).protein;
}

/** The protein translated from one allele copy of a gene. */
export function geneProteinForm(
  geneId: ExpressiveDragonTraitId,
  alleleIndex: 0 | 1,
): DragonProteinForm {
  return geneAlleleMarking(geneId, alleleIndex).protein;
}

/** Every gene whose protein works as an enzyme, in catalog order. */
export const DRAGON_ENZYME_GENES: readonly DragonGeneDnaRecord[] = DRAGON_GENE_DNA_CATALOG.filter(
  (record) => record.protein.activity !== null,
);

export function geneMutationTypeForComparison(
  geneId: ExpressiveDragonTraitId,
  referenceAlleleIndex: 0 | 1,
  comparisonAlleleIndex: 0 | 1,
): DragonGeneMutationType {
  const mutationType = geneDnaRecord(geneId).mutation.type;
  if (referenceAlleleIndex === comparisonAlleleIndex || referenceAlleleIndex === 0) {
    return mutationType;
  }
  if (mutationType === 'insertion') return 'deletion';
  if (mutationType === 'deletion') return 'insertion';
  return mutationType;
}

function defineGene(
  geneId: ExpressiveDragonTraitId,
  locusColor: string,
  referenceSequence: string,
  mutation: DragonGeneMutation,
  protein: ProteinDefinition,
): DragonGeneDnaRecord {
  assertDnaSequence(referenceSequence, geneId);
  assertMutationMatchesReference(referenceSequence, mutation, geneId);

  const variantSequence = applyMutation(referenceSequence, mutation);
  const referenceBarcode = referenceSequence.slice(0, BARCODE_BASE_COUNT);
  const variantBarcode = applyMutation(referenceBarcode, mutation);
  const referenceForm = translateAllele(referenceSequence, 'reference', geneId);
  const variantForm = translateAllele(variantSequence, 'variant', geneId);

  return {
    geneId,
    locusColor,
    alleleASequence: referenceSequence,
    alleleBSequence: variantSequence,
    mutation,
    alleles: [
      {
        role: 'reference',
        sequence: referenceSequence,
        mutationType: 'reference',
        barcode: barcodeFor(referenceBarcode),
        protein: referenceForm,
      },
      {
        role: 'variant',
        sequence: variantSequence,
        mutationType: mutation.type,
        barcode: barcodeFor(variantBarcode),
        protein: variantForm,
      },
    ],
    protein: buildGeneProtein(geneId, protein, referenceForm, variantForm),
  };
}

/**
 * Assembles the protein record from the reference chain.
 *
 * Shapes are generated rather than authored: the enzyme body, both substrate
 * fragments, and the folded silhouette all come from the same residue radii, so
 * the active site a student sees is the one this gene's codons produced.
 */
function buildGeneProtein(
  geneId: ExpressiveDragonTraitId,
  definition: ProteinDefinition,
  form: DragonProteinForm,
  variantForm: DragonProteinForm,
): DragonGeneProtein {
  const seed = seedFor(definition.proteinId);
  const radii = form.residues.map((residue) => aminoAcidGroupRadius(residue.shortName));
  const dominantGroup = dominantResidueGroup(form.residues);
  const activity = definition.molecules
    ? buildEnzymeActivity(definition.molecules, radii, seed)
    : null;

  return {
    proteinId: definition.proteinId,
    proteinCode: definition.proteinCode,
    name: definition.name,
    role: definition.role,
    roleLabel: ROLE_LABELS[definition.role],
    cellRole: definition.cellRole,
    traitContribution: definition.traitContribution,
    dominantGroup,
    palette: AMINO_ACID_GROUP_PALETTES[dominantGroup],
    bodyPath: activity ? enzymeBodyPath(radii, seed) : null,
    activity,
    traitSignal: activity
      ? activity.traitProduct
      : { id: definition.proteinId, name: definition.name, path: form.shapePath },
    form,
    variantForm,
  };

  function seedFor(value: string): number {
    let hash = geneId.length;
    for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 100_003;
    return hash;
  }
}

function buildEnzymeActivity(
  names: EnzymeMoleculeNames,
  radii: readonly number[],
  seed: number,
): DragonEnzymeActivity {
  const geometry = enzymeMoleculeGeometry(radii, seed);
  const fragmentA: DragonMoleculeShape = {
    id: names.fragmentA[0],
    name: names.fragmentA[1],
    path: geometry.fragmentA,
  };
  const fragmentB: DragonMoleculeShape = {
    id: names.fragmentB[0],
    name: names.fragmentB[1],
    path: geometry.fragmentB,
  };
  const joined: DragonMoleculeShape = {
    id: names.joined[0],
    name: names.joined[1],
    path: geometry.joined,
  };

  const building = names.action === 'build';
  const reactants = building ? [fragmentA, fragmentB] : [joined];
  const products = building ? [joined] : [fragmentA, fragmentB];

  return {
    action: names.action,
    actionLabel: ACTION_LABELS[names.action],
    fragmentA,
    fragmentB,
    joined,
    reactants,
    products,
    /*
     * A build reaction hands the trait its finished molecule. A break-down
     * reaction is useful for what it releases, so the trait reads the second
     * fragment — the freed piece — rather than the leftover core.
     */
    traitProduct: building ? joined : fragmentB,
    equation: `${reactants.map((molecule) => molecule.name).join(' + ')} → ${products
      .map((molecule) => molecule.name)
      .join(' + ')}`,
  };
}

/**
 * Transcribes and translates one allele.
 *
 * The coding strand is copied straight to mRNA with U in place of T, which is
 * the same result as complementing the template strand twice.
 */
function translateAllele(
  sequence: string,
  role: 'reference' | 'variant',
  geneId: ExpressiveDragonTraitId,
): DragonProteinForm {
  const rnaSequence = sequence.replace(/T/g, 'U');
  const translation = translateRna(rnaSequence);
  const residues = translation.steps
    .filter((step) => !step.stop)
    .map((step, index): DragonProteinResidue => {
      const chemistry = aminoAcidChemistry(step.shortName);
      return {
        position: index + 1,
        dnaCodon: sequence.slice(index * 3, index * 3 + 3),
        rnaCodon: step.codon,
        aminoAcid: step.aminoAcid,
        shortName: step.shortName,
        group: chemistry.group,
        groupLabel: chemistry.groupLabel,
        sideChain: chemistry.sideChain,
        color: chemistry.main,
      };
    });

  const radii = residues.map((residue) => aminoAcidGroupRadius(residue.shortName));
  const seed = chainSeed(`${geneId}:${role}:${rnaSequence}`);

  return {
    role,
    rnaSequence,
    codons: translation.codons,
    residues,
    chainLabel: residues.map((residue) => residue.shortName).join('-'),
    shapePath: foldedProteinPath(radii, seed),
    backbonePath: residueChainPath(radii, seed),
    truncated: translation.stoppedEarly,
  };
}

function dominantResidueGroup(residues: readonly DragonProteinResidue[]): AminoAcidGroup {
  const tally = new Map<AminoAcidGroup, number>();
  for (const residue of residues) {
    tally.set(residue.group, (tally.get(residue.group) ?? 0) + 1);
  }
  let winner: AminoAcidGroup = 'special';
  let best = -1;
  for (const [group, count] of tally) {
    if (count > best) {
      winner = group;
      best = count;
    }
  }
  return winner;
}

function chainSeed(value: string): number {
  let hash = 7;
  for (const character of value) hash = (hash * 33 + character.charCodeAt(0)) % 99_991;
  return hash;
}

function applyMutation(sequence: string, mutation: DragonGeneMutation): string {
  if (mutation.type === 'substitution') {
    return `${sequence.slice(0, mutation.index)}${mutation.variantBase}${sequence.slice(mutation.index + 1)}`;
  }
  if (mutation.type === 'deletion') {
    return `${sequence.slice(0, mutation.index)}${sequence.slice(mutation.index + 1)}`;
  }
  return `${sequence.slice(0, mutation.index)}${mutation.variantBase}${sequence.slice(mutation.index)}`;
}

function barcodeFor(sequence: string): readonly DragonGeneBarcodePair[] {
  return [...sequence].map((base) => {
    const topBase = base as DragonDnaBase;
    const bottomBase = COMPLEMENT[topBase];
    return {
      topBase,
      bottomBase,
      topColor: DRAGON_DNA_BASE_COLORS[topBase],
      bottomColor: DRAGON_DNA_BASE_COLORS[bottomBase],
    };
  });
}

function assertDnaSequence(sequence: string, geneId: ExpressiveDragonTraitId): void {
  if (!/^[ATCG]+$/.test(sequence)) {
    throw new Error(`DNA record for dragon gene ${geneId} contains an invalid base.`);
  }
}

function assertMutationMatchesReference(
  sequence: string,
  mutation: DragonGeneMutation,
  geneId: ExpressiveDragonTraitId,
): void {
  if (mutation.index < 0 || mutation.index >= BARCODE_BASE_COUNT) {
    throw new Error(
      `Mutation for dragon gene ${geneId} must be visible in its chromosome barcode.`,
    );
  }
  if ('referenceBase' in mutation && sequence[mutation.index] !== mutation.referenceBase) {
    throw new Error(`Mutation for dragon gene ${geneId} does not match its reference sequence.`);
  }
}
