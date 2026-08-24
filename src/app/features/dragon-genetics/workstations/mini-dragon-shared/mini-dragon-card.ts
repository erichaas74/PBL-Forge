import { SpecimenSource } from '../../../../shared/assembly/preview/specimen.models';
import { StandardMatch, companionPaint } from '../companion-show/companion-show.domain';
import { CompanionDragon } from '../companion-show/companion-show.models';
import { specimenSource } from '../companion-show/mini-dragon-kennel.store';
import {
  MiniGeneId,
  MiniGenome,
  MiniInheritancePattern,
  expressMiniGenome,
  miniIndividualFeatureList,
} from '../companion-show/mini-dragon.genetics';

/** One locus as a breeder reads it: a visible form, never a symbol. */
export interface MiniDragonCardTrait {
  geneId: MiniGeneId;
  geneName: string;
  formLabel: string;
  patternLabel: string;
  /** Whether this trait meets the breed standard, or null when the standard is silent here. */
  matched: boolean | null;
}

export interface MiniDragonCardStat {
  id: string;
  label: string;
  value: string | number;
}

/**
 * A mini dragon as a card.
 *
 * The large-dragon deck resolves its card face through
 * `buildAccountDragonCardView`; this is the mini dragon's equivalent, and it is
 * deliberately *not* the same view. A lab dragon card shows combat numbers and a
 * chromosome back, because that species is examined. A mini dragon is bred to a
 * written standard across four rooms, so the card carries what a breeder judges
 * by: the visible form at every locus, how many of them meet the standard, the
 * ribbons the show card already awarded, and the characteristics that are not
 * inherited at all.
 *
 * No allele symbol appears anywhere here, for the reason `mini-dragon.genetics`
 * gives: a student who could read a genotype off a card would stop breeding to
 * find out.
 */
export interface MiniDragonCardView {
  id: string;
  name: string;
  title: string;
  source: SpecimenSource | null;
  genome: MiniGenome;
  color: string;
  patchColor: string;
  emberColor: string;
  originLabel: string;
  generationLabel: string;
  ribbons: number;
  matchedCount: number;
  targetCount: number;
  meetsStandard: boolean;
  traits: readonly MiniDragonCardTrait[];
  /** Characteristics hashed off the individual, labelled as not inherited. */
  individualFeatures: readonly { label: string; value: string }[];
}

export interface MiniDragonCardOptions {
  /** The standard read against this dragon, from `matchesFor(genome)`. Empty when none is written. */
  matches?: readonly StandardMatch[];
  ribbons?: number;
}

export function buildMiniDragonCardView(
  dragon: CompanionDragon,
  options: MiniDragonCardOptions = {},
): MiniDragonCardView {
  const matches = options.matches ?? [];
  const matchByGene = new Map(matches.map((match) => [match.geneId, match.matched] as const));
  const paint = companionPaint(dragon);
  const traits = expressMiniGenome(dragon.genome).map(({ gene, form }) => ({
    geneId: gene.id,
    geneName: gene.name,
    formLabel: form.label,
    patternLabel: inheritanceLabel(gene.pattern),
    matched: matchByGene.get(gene.id) ?? null,
  }));

  return {
    id: dragon.id,
    name: dragon.name,
    title: dragon.title,
    source: specimenSource(dragon),
    genome: dragon.genome,
    color: paint.color,
    patchColor: paint.patchColor,
    emberColor: paint.emberColor,
    originLabel: dragon.origin === 'founder' ? 'Founder line' : 'Bred here',
    generationLabel: `Generation ${dragon.generation}`,
    ribbons: options.ribbons ?? 0,
    matchedCount: matches.filter((match) => match.matched).length,
    targetCount: matches.length,
    meetsStandard: matches.length > 0 && matches.every((match) => match.matched),
    traits,
    individualFeatures: miniIndividualFeatureList(dragon.id),
  };
}

function inheritanceLabel(pattern: MiniInheritancePattern): string {
  switch (pattern) {
    case 'incomplete-dominance':
      return 'Blending';
    case 'codominance':
      return 'Both showing';
    case 'multiple-alleles':
      return 'Three forms';
    default:
      return 'Hidden form possible';
  }
}
