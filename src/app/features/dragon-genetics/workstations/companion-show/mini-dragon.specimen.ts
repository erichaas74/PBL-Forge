import { AssemblyPartRole } from '../../../../shared/assembly/domain/assembly.models';
import {
  SpecimenSource,
  SpecimenTraitReadout,
  describeSpecimen,
} from '../../../../shared/assembly/preview/specimen.models';
import { buildMiniDragonBlueprint } from './mini-dragon.anatomy';
import {
  MINI_DRAGON_GENES,
  MiniGeneId,
  MiniGenome,
  MiniInheritancePattern,
  expressMiniGene,
  miniCoatPaint,
  miniIndividualFeatureList,
} from './mini-dragon.genetics';

/**
 * A mini dragon as a *specimen*, for any viewer that inspects one animal.
 *
 * The show workstation hands the viewport a bare blueprint, which is all a
 * breeding surface needs. A bench asks a different question — which part of the
 * animal does this gene change — so this adds the trait readouts that drive
 * highlighting, and labels the non-inherited features as such right beside
 * them. That contrast is the whole reason both lists appear: a student who
 * could read a pedigree out of an ear tuft would have learned something false.
 */
export function miniDragonSpecimenSource(
  genome: MiniGenome,
  individualId: string,
  options: { label?: string } = {},
): SpecimenSource {
  return {
    kind: 'descriptor',
    descriptor: describeSpecimen(individualId, buildMiniDragonBlueprint(genome, individualId), {
      label: options.label ?? individualId,
      accentColor: miniCoatPaint(genome, individualId).color,
      traits: miniDragonTraitReadouts(genome, individualId),
    }),
  };
}

export function miniDragonTraitReadouts(
  genome: MiniGenome,
  individualId: string,
): SpecimenTraitReadout[] {
  return [
    ...MINI_DRAGON_GENES.map((gene) => ({
      id: `mini:${gene.id}`,
      label: gene.name,
      valueLabel: expressMiniGene(gene.id, genome).label,
      detail: `${MINI_PATTERN_LABELS[gene.pattern]}. ${gene.observation}`,
      roles: miniGeneRoles(gene.id),
    })),
    ...miniIndividualFeatureList(individualId).map((feature, index) => ({
      id: `mini:feature-${index}`,
      label: feature.label,
      valueLabel: feature.value,
      detail: 'Not inherited in this model. It varies between littermates and tells you nothing '
        + 'about the parents.',
      roles: [] as readonly AssemblyPartRole[],
    })),
  ];
}

export const MINI_PATTERN_LABELS: Readonly<Record<MiniInheritancePattern, string>> = {
  'complete-dominance': 'Complete dominance',
  'incomplete-dominance': 'Incomplete dominance',
  codominance: 'Codominance',
  'multiple-alleles': 'Multiple alleles',
};

/**
 * Which parts a gene changes.
 *
 * Back scales now own a dedicated procedural part, while pattern paints the
 * whole animal and ember lights it.
 */
function miniGeneRoles(geneId: MiniGeneId): readonly AssemblyPartRole[] {
  switch (geneId) {
    case 'horns':
    case 'ears':
    case 'muzzle':
    case 'crest':
      return ['head'];
    case 'wings':
      return ['wing'];
    case 'size':
    case 'legs':
      return ['leg'];
    case 'tail':
      return ['tail'];
    case 'coat':
      return ['dorsal-scales'];
    case 'frame':
      return ['core'];
    case 'pattern':
    case 'ember':
      return [];
  }
}
