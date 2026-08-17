import { CompanionDragon } from './companion-show.models';
import {
  MINI_DRAGON_GENES,
  MiniGeneId,
  miniPhenotypeFormId,
} from './mini-dragon.genetics';

export interface MiniRareTraitTarget {
  geneId: MiniGeneId;
  geneName: string;
  formId: string;
  formLabel: string;
  clue: string;
}

export type MiniPedigreeEvidenceId =
  | 'shows-trait'
  | 'proven-by-offspring'
  | 'close-family-clue'
  | 'unresolved';

export interface MiniPedigreeEvidence {
  id: MiniPedigreeEvidenceId;
  label: string;
  detail: string;
  rank: number;
}

/**
 * Rare-trait targets are derived from the genetics catalog. Only the second
 * form of a complete-dominance locus is hidden in a visibly dominant dragon.
 */
export const MINI_RARE_TRAIT_TARGETS: readonly MiniRareTraitTarget[] = MINI_DRAGON_GENES
  .filter((gene) => gene.pattern === 'complete-dominance')
  .map((gene) => ({
    geneId: gene.id,
    geneName: gene.name,
    formId: gene.forms[1]!.id,
    formLabel: gene.forms[1]!.label,
    clue: gene.observation,
  }));

export function miniRareTraitTarget(geneId: MiniGeneId | null): MiniRareTraitTarget | null {
  return MINI_RARE_TRAIT_TARGETS.find((target) => target.geneId === geneId) ?? null;
}

export function miniPedigreeEvidence(
  dragon: CompanionDragon,
  population: readonly CompanionDragon[],
  target: MiniRareTraitTarget,
): MiniPedigreeEvidence {
  const showsTrait = (candidate: CompanionDragon): boolean =>
    miniPhenotypeFormId(target.geneId, candidate.genome) === target.formId;

  if (showsTrait(dragon)) {
    return {
      id: 'shows-trait',
      label: 'Known source',
      detail: `Shows ${target.formLabel.toLowerCase()}, so it can pass the hidden form.`,
      rank: 3,
    };
  }

  const children = population.filter((candidate) => candidate.parentIds?.includes(dragon.id));
  if (children.some(showsTrait)) {
    return {
      id: 'proven-by-offspring',
      label: 'Proven by offspring',
      detail: `Produced young showing ${target.formLabel.toLowerCase()}.`,
      rank: 2,
    };
  }

  const parentIds: readonly string[] = dragon.parentIds ?? [];
  const sharesParent = (candidate: CompanionDragon): boolean =>
    Boolean(
      dragon.parentIds &&
        candidate.id !== dragon.id &&
        candidate.parentIds?.some((parentId) => dragon.parentIds!.includes(parentId)),
    );
  const closeRelativeShows = population.some(
    (candidate) =>
      showsTrait(candidate) &&
      (parentIds.includes(candidate.id) || sharesParent(candidate)),
  );
  if (closeRelativeShows) {
    return {
      id: 'close-family-clue',
      label: 'Close-family clue',
      detail: `A parent or littermate shows ${target.formLabel.toLowerCase()}.`,
      rank: 1,
    };
  }

  return {
    id: 'unresolved',
    label: 'Unresolved',
    detail: 'The recorded family does not settle whether this dragon carries the hidden form.',
    rank: 0,
  };
}

export function miniRareTraitCount(
  dragons: readonly CompanionDragon[],
  target: MiniRareTraitTarget,
): number {
  return dragons.filter(
    (dragon) => miniPhenotypeFormId(target.geneId, dragon.genome) === target.formId,
  ).length;
}
