import { StationCopy } from '../../../../shared/dragon-visuals';
import { DRAGON_TRAITS } from '../domain/dragon-inheritance';
import { HatcheryEvidenceOption } from '../domain/dragon-hatchery.models';

/**
 * Curriculum content shared by every module that hosts the Dragon Hatchery.
 *
 * A module supplies its own prompt, evidence marks, and tool budget; this file holds only the
 * wording the instrument itself needs — teaching captions, trait names, and a default evidence
 * set whose distractors model the errors the hatchery exists to correct.
 */
export const HATCHERY_STATION_COPY: StationCopy = {
  'hatchery.read-clutch': 'This clutch came from one cross. Every egg carries a full genome already.',
  'hatchery.predict': 'Predict before you open anything. Lock a number, then start examining.',
  'hatchery.examine': 'Candling reads the traits an egg will show. It reports nothing about the alleles.',
  'hatchery.sample': 'A DNA sample reads the allele pair. Two eggs that look alike can differ here.',
  'hatchery.hatch': 'Only the eggs you chose crack open. The rest of the clutch stays sealed.',
  'hatchery.evidence': 'Pin the mark that reports what you actually observed.',

  ...Object.fromEntries(DRAGON_TRAITS.map(trait => [`trait.${trait.id}.name`, trait.name])),
};

/**
 * Default evidence marks. Only `phenotype-record` and `genotype-record` report what the
 * instrument actually showed; the other two are the misconceptions this station diagnoses.
 */
export const DEFAULT_HATCHERY_EVIDENCE: readonly HatcheryEvidenceOption[] = [
  {
    id: 'genotype-record',
    text: 'The DNA samples showed the allele pairs, which is the only record that names the alleles.',
    anchorId: 'allele-slot-a',
  },
  {
    id: 'phenotype-record',
    text: 'Candling showed the traits each egg will display, but not the alleles behind them.',
    anchorId: 'phenotype-readout',
  },
  {
    id: 'hatch-record',
    text: 'Hatching the eggs showed me which alleles each dragon carries.',
    anchorId: 'hatch-control',
    misconception: 'hatching-shows-genotype',
  },
  {
    id: 'matching-look',
    text: 'The eggs that showed the same trait must carry the same alleles.',
    anchorId: 'egg-tray',
    misconception: 'same-phenotype-same-genotype',
  },
];

export const HATCHERY_MISCONCEPTION_NOTES: Readonly<Record<string, string>> = {
  'hatching-shows-genotype':
    'Hatching shows what a dragon looks like. Only a DNA sample reports the allele pair behind it.',
  'same-phenotype-same-genotype':
    'One dominant allele is enough to show the dominant trait, so eggs that look alike can be WW or Ww.',
  'dominant-means-common':
    'Dominant describes which allele is expressed, not how often it appears in a clutch.',
  'sample-equals-clutch':
    'A few examined eggs are a sample. A small sample often differs from the whole clutch.',
};

/** Wording for one clutch, built at run time because egg IDs come from the cross. */
export function hatcheryClutchCopy(input: {
  clutchId: string;
  clutchLabel: string;
  eggIds: readonly string[];
  eggCaption?: (eggId: string, index: number) => string;
  evidence?: readonly HatcheryEvidenceOption[];
}): StationCopy {
  return {
    ...HATCHERY_STATION_COPY,
    [`clutch.${input.clutchId}.label`]: input.clutchLabel,
    ...Object.fromEntries(input.eggIds.map((eggId, index) => [
      `sample.${eggId}.caption`,
      input.eggCaption?.(eggId, index)
        ?? `Egg ${index + 1} · incubation record only; no hatchling artwork is used as evidence.`,
    ])),
    ...Object.fromEntries((input.evidence ?? DEFAULT_HATCHERY_EVIDENCE)
      .map(mark => [`evidence.${mark.id}`, mark.text])),
  };
}
