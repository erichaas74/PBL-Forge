import { InstrumentManifest, InstrumentProbe } from '../shared/instrument-manifest.models';
import { GenomeMicroscopeLevel } from './genome-microscope.models';

export interface MicroscopeLevelWorkstationDefinition {
  id: string;
  title: string;
  route: string;
  level: GenomeMicroscopeLevel;
  goal: string;
  lessonGuide: string;
  probes: readonly InstrumentProbe[];
}

const ROOT = '/dragon-genetics/microscope';

export const MICROSCOPE_LEVEL_WORKSTATIONS: readonly MicroscopeLevelWorkstationDefinition[] = [
  focused('dragon', 'Whole Dragon Microscope', 'microscope-dragon',
    'Compare whole dragon specimens as organisms whose inherited information is carried inside their cells.',
    'Load and inspect any released dragon specimen.',
    [{ id: 'genome.hierarchy', yields: 'selection', anchorId: 'level-stage' }]),
  focused('cell', 'Dragon Cell Microscope', 'microscope-cell',
    'Investigate how a dragon body cell contains the structures that preserve inherited information.',
    'Load different dragons and explore the code-driven body-cell model.',
    [{ id: 'genome.hierarchy', yields: 'selection', anchorId: 'level-stage' }]),
  focused('nucleus', 'Nucleus Microscope', 'microscope-nucleus',
    'Investigate how the nucleus contains and organizes a dragon chromosome set.',
    'Inspect the nucleus and freely select chromosome pairs within it.',
    [{ id: 'genome.hierarchy', yields: 'selection', anchorId: 'level-stage' }]),
  focused('chromosome-set', 'Chromosome Set Microscope', 'microscope-chromosome-set',
    'Compare homologous chromosome pairs and the matching gene locations they carry.',
    'Select and compare any chromosome pair in the loaded dragon cell.',
    [{ id: 'chromosome.pair', yields: 'comparison', anchorId: 'level-stage' }]),
  focused('chromosome', 'Chromosome Pair Microscope', 'microscope-chromosome',
    'Investigate how many genes occupy stable loci along one chromosome pair.',
    'Choose chromosome pairs and gene loci in any order.',
    [
      { id: 'chromosome.pair', yields: 'comparison', anchorId: 'level-stage' },
      { id: 'gene.locus', yields: 'selection', anchorId: 'level-stage' },
    ]),
  focused('chromatin', 'Chromatin Microscope', 'microscope-chromatin',
    'Investigate how one DNA molecule is packaged into a chromosome.',
    'Unpack the selected chromosome through chromatin, nucleosomes, and DNA.',
    [{ id: 'chromatin.packing', yields: 'selection', anchorId: 'level-stage' }]),
  focused('gene', 'Gene Locus Microscope', 'microscope-gene',
    'Compare where released genes are located on dragon chromosomes.',
    'Select any released chromosome and gene locus to compare positions.',
    [{ id: 'gene.locus', yields: 'selection', anchorId: 'level-stage' }]),
  focused('dna', 'DNA Sequence Microscope', 'microscope-dna',
    'Investigate how information is stored in the base order of a selected gene copy.',
    'Choose a released gene or allele source and inspect its DNA and replication model.',
    [
      { id: 'dna.sequence', yields: 'measurement', anchorId: 'level-stage' },
      { id: 'dna.replicate', yields: 'record', anchorId: 'level-stage' },
    ]),
  focused('allele', 'Allele Copy Microscope', 'microscope-allele',
    'Compare the two inherited versions of one gene carried by a dragon.',
    'Switch between homologous allele copies and compare their sequences.',
    [{ id: 'allele.compare', yields: 'comparison', anchorId: 'level-stage' }]),
  focused('rna', 'Messenger RNA Microscope', 'microscope-rna',
    'Investigate how a selected DNA sequence is transcribed into messenger RNA.',
    'Change the source allele and compare its DNA and RNA records.',
    [{ id: 'dna.transcribe', yields: 'record', anchorId: 'level-stage' }]),
  focused('base-chemistry', 'Base Molecule Microscope', 'microscope-base-chemistry',
    'Compare the molecular bases used by DNA and RNA.',
    'Explore DNA and RNA bases, atoms, bonds, and complementary pairing.',
    [{ id: 'dna.sequence', yields: 'measurement', anchorId: 'level-stage' }]),
  focused('protein', 'Protein Product Microscope', 'microscope-protein',
    'Investigate how messenger RNA base order produces a protein with a particular shape.',
    'Change the source gene or allele and compare translated protein products.',
    [
      { id: 'rna.translate', yields: 'record', anchorId: 'level-stage' },
      { id: 'protein.product', yields: 'record', anchorId: 'level-stage' },
      { id: 'protein.shape', yields: 'comparison', anchorId: 'level-stage' },
    ]),
  focused('enzyme', 'Enzyme Reaction Microscope', 'microscope-enzyme',
    'Determine how enzyme shape affects which substrates can be transformed.',
    'Run and repeat enzyme reactions, then compare their products.',
    [{ id: 'enzyme.substrate', yields: 'comparison', anchorId: 'level-stage' }]),
  focused('expression', 'Trait Expression Microscope', 'microscope-expression',
    'Investigate how molecular interactions inside cells can contribute to a visible dragon trait.',
    'Test protein forms against cell targets and observe the resulting dragon phenotype.',
    [{ id: 'gene.to.trait', yields: 'record', anchorId: 'level-stage' }]),
];

export const MICROSCOPE_LEVEL_MANIFESTS: readonly InstrumentManifest[] =
  MICROSCOPE_LEVEL_WORKSTATIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    route: definition.route,
    sessionModes: ['investigation'],
    probes: definition.probes,
    emits: ['microscope.evidence'],
  }));

export function microscopeLevelWorkstation(
  level: GenomeMicroscopeLevel,
): MicroscopeLevelWorkstationDefinition {
  return MICROSCOPE_LEVEL_WORKSTATIONS.find((definition) => definition.level === level)!;
}

function focused(
  level: GenomeMicroscopeLevel,
  title: string,
  id: string,
  goal: string,
  lessonGuide: string,
  probes: readonly InstrumentProbe[],
): MicroscopeLevelWorkstationDefinition {
  return { id, title, route: `${ROOT}/${level}`, level, goal, lessonGuide, probes };
}
