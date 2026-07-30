import { DragonTraitId } from '../domain/dragon-lab.models';

export interface DragonGenomeTraitFile {
  traitId: DragonTraitId;
  bodyRegion: string;
  tissueSample: string;
  mysteryStem: string;
  arenaConnection: string;
}

export const DRAGON_GENOME_TRAIT_FILES: readonly DragonGenomeTraitFile[] = [
  {
    traitId: 'wings',
    bodyRegion: 'wing membrane',
    tissueSample: 'wing membrane cell',
    mysteryStem: 'Where are the two modeled versions of the wing-development gene stored?',
    arenaConnection: 'Wings later affect access to the Wing Buffet move and aerial positioning.',
  },
  {
    traitId: 'fire',
    bodyRegion: 'fire-gland region',
    tissueSample: 'fire-gland tissue cell',
    mysteryStem: 'Where is the simplified fire-gland gene located and packaged?',
    arenaConnection: 'Fire-gland phenotype later contributes to fire-based arena actions.',
  },
  {
    traitId: 'scales',
    bodyRegion: 'scale plate',
    tissueSample: 'scale-forming skin cell',
    mysteryStem: 'Which DNA section is used in the simplified scale-pattern model?',
    arenaConnection: 'Scale appearance is visible in the arena, but appearance does not prove performance.',
  },
  {
    traitId: 'horns',
    bodyRegion: 'crest and horn bud',
    tissueSample: 'horn-bud tissue cell',
    mysteryStem: 'Where would the modeled horn-development gene be found?',
    arenaConnection: 'Horn structure may affect a dragon profile, while training and strategy remain separate.',
  },
];

export function genomeTraitFile(traitId: DragonTraitId): DragonGenomeTraitFile {
  return DRAGON_GENOME_TRAIT_FILES.find(file => file.traitId === traitId)
    ?? DRAGON_GENOME_TRAIT_FILES[0];
}
