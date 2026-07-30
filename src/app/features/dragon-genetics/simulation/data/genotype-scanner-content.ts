import { DragonScannerOption, StationCopy } from '../../../../shared/dragon-visuals';
import { DRAGON_TRAITS, getTrait } from '../domain/dragon-inheritance';
import { DragonLabGenome, DragonParentProfile, DragonTraitId } from '../domain/dragon-lab.models';
import {
  GenotypeScanDirection,
  GenotypeScannerMisconception,
  GenotypeScannerSetId,
  GenotypeScannerTask,
} from '../domain/genotype-scanner.models';

/**
 * Curriculum content for the Genotype Scanner (Module 3, GEN-3).
 *
 * Every task hides one half of the genotype/phenotype pair, asks the student to select all
 * supported records, and only then opens the scan. Distractor evidence models the errors this
 * station exists to correct: expecting a dominant phenotype to need two dominant alleles,
 * expecting equal phenotypes to prove equal genotypes, and reasoning from value instead of the
 * expression rule.
 */
function specimen(
  id: string,
  name: string,
  title: string,
  color: string,
  accentColor: string,
  genome: DragonLabGenome,
): DragonParentProfile {
  return { id, name, title, color, accentColor, genome };
}

export const GENOTYPE_SCANNER_SPECIMENS: readonly DragonParentProfile[] = [
  specimen('scan-s11', 'Specimen S-11', 'Intake 05-02', '#3f6f8f', '#9fd8e6', {
    wings: ['W', 'w'], fire: ['F', 'f'], scales: ['S', 's'], horns: ['H', 'h'],
  }),
  specimen('scan-s12', 'Specimen S-12', 'Intake 05-04', '#6f5a8f', '#c6b3e6', {
    wings: ['w', 'w'], fire: ['f', 'f'], scales: ['s', 's'], horns: ['H', 'H'],
  }),
  specimen('scan-s13', 'Specimen S-13', 'Intake 05-09', '#4f8168', '#a9d9be', {
    wings: ['W', 'W'], fire: ['F', 'f'], scales: ['S', 'S'], horns: ['h', 'h'],
  }),
  specimen('scan-s14', 'Specimen S-14', 'Intake 05-11', '#8f6a3f', '#e6c79f', {
    wings: ['W', 'w'], fire: ['F', 'F'], scales: ['S', 's'], horns: ['h', 'h'],
  }),
];

const SPECIMEN_BY_ID = new Map(
  GENOTYPE_SCANNER_SPECIMENS.map(profile => [profile.id, profile] as const),
);

export function genotypeScannerSpecimen(id: string): DragonParentProfile {
  const found = SPECIMEN_BY_ID.get(id);
  if (!found) throw new Error(`Unknown genotype scanner specimen: ${id}`);
  return found;
}

export const PHENOTYPE_OPTION_IDS = {
  dominant: 'dominant-readout',
  recessive: 'recessive-readout',
} as const;

/** Options are generated from the gene so the scanner and the content never drift apart. */
export function scannerOptions(
  traitId: DragonTraitId,
  direction: GenotypeScanDirection,
): readonly DragonScannerOption[] {
  const trait = getTrait(traitId);
  if (direction === 'genotype-first') {
    return [
      {
        id: PHENOTYPE_OPTION_IDS.dominant,
        kind: 'phenotype',
        labelId: `phenotype.${traitId}.dominant`,
      },
      {
        id: PHENOTYPE_OPTION_IDS.recessive,
        kind: 'phenotype',
        labelId: `phenotype.${traitId}.recessive`,
      },
    ];
  }
  const { dominantAllele: high, recessiveAllele: low } = trait;
  return [
    { id: `${high}${high}`, kind: 'genotype', alleles: [high, high] },
    { id: `${high}${low}`, kind: 'genotype', alleles: [high, low] },
    { id: `${low}${low}`, kind: 'genotype', alleles: [low, low] },
  ];
}

interface TaskInput {
  id: string;
  direction: GenotypeScanDirection;
  sampleId: string;
  comparisonSampleId?: string;
  traitId: DragonTraitId;
  prompt: string;
  supported: readonly string[];
  optionMisconceptions: Readonly<Record<string, GenotypeScannerMisconception>>;
  rule: string;
  evidence: string;
  evidenceAnchor?: string;
  distractors: readonly [ScannerDistractor, ScannerDistractor];
  sets: readonly GenotypeScannerSetId[];
  questionId?: string;
}

interface ScannerDistractor {
  text: string;
  anchorId?: string;
  misconception: GenotypeScannerMisconception;
}

function task(input: TaskInput): GenotypeScannerTask {
  const correctEvidenceId = `${input.id}.evidence`;
  return {
    id: input.id,
    direction: input.direction,
    sampleId: input.sampleId,
    comparisonSampleId: input.comparisonSampleId,
    traitId: input.traitId,
    prompt: input.prompt,
    supportedOptionIds: input.supported,
    optionMisconceptions: input.optionMisconceptions,
    rule: input.rule,
    correctEvidenceId,
    sets: input.sets,
    questionId: input.questionId,
    evidence: [
      { id: correctEvidenceId, text: input.evidence, anchorId: input.evidenceAnchor ?? 'allele-slot-a' },
      ...input.distractors.map((distractor, index) => ({
        id: `${input.id}.alt-${index + 1}`,
        text: distractor.text,
        anchorId: distractor.anchorId,
        misconception: distractor.misconception,
      })),
    ],
  };
}

export const GENOTYPE_SCANNER_TASKS: readonly GenotypeScannerTask[] = [
  task({
    id: 'winged-genotypes',
    questionId: 'winged-genotypes',
    direction: 'phenotype-first',
    sampleId: 'scan-s11',
    traitId: 'wings',
    prompt: 'The readout says Winged. Select every genotype the evidence still supports.',
    supported: ['WW', 'Ww'],
    optionMisconceptions: {
      Ww: 'dominant-requires-two',
      ww: 'recessive-shows-dominant',
    },
    rule: 'One dominant allele is enough for the dominant phenotype, so a winged sample can be WW or Ww.',
    evidence: 'The scan shows one W and one w, and the readout still reads Winged.',
    distractors: [
      {
        text: 'The readout says Winged, so the scan has to show two W alleles.',
        anchorId: 'phenotype-readout',
        misconception: 'dominant-requires-two',
      },
      {
        text: 'Winged dragons fly better, so W must be the stronger allele to carry.',
        anchorId: 'genotype-option',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['learn', 'practice'],
  }),
  task({
    id: 'wingless-genotype',
    questionId: 'wingless-genotype',
    direction: 'phenotype-first',
    sampleId: 'scan-s12',
    traitId: 'wings',
    prompt: 'The readout says Wingless. Select every genotype the evidence still supports.',
    supported: ['ww'],
    optionMisconceptions: {
      WW: 'phenotype-equals-genotype',
      Ww: 'recessive-hides-dominant',
      ww: 'recessive-shows-dominant',
    },
    rule: 'The recessive phenotype appears only when both modelled alleles are recessive, so no dominant allele can be hiding.',
    evidence: 'The scan shows w and w, which is the only pair that produces the recessive readout.',
    distractors: [
      {
        text: 'A wingless sample could still be Ww with the W allele hidden.',
        anchorId: 'genotype-option',
        misconception: 'recessive-hides-dominant',
      },
      {
        text: 'Wingless is rarer here, so the genotype cannot be predicted from the readout.',
        anchorId: 'phenotype-readout',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['learn', 'practice'],
  }),
  task({
    id: 'fire-phenotype',
    questionId: 'fire-phenotype',
    direction: 'genotype-first',
    sampleId: 'scan-s11',
    traitId: 'fire',
    prompt: 'The scan is already open at Ff. Select every readout this sample could show.',
    supported: [PHENOTYPE_OPTION_IDS.dominant],
    optionMisconceptions: {
      [PHENOTYPE_OPTION_IDS.dominant]: 'dominant-requires-two',
      [PHENOTYPE_OPTION_IDS.recessive]: 'heterozygous-blend',
    },
    rule: 'One F allele is enough for the dominant readout. A heterozygote shows the dominant phenotype, not a blend.',
    evidence: 'The scan holds one F allele, which is enough to produce the dominant readout.',
    evidenceAnchor: 'allele-slot-a',
    distractors: [
      {
        text: 'With one F and one f the sample should show a partial or weaker flame.',
        anchorId: 'phenotype-readout',
        misconception: 'heterozygous-blend',
      },
      {
        text: 'Only FF samples can breathe fire in this model.',
        anchorId: 'genotype-option',
        misconception: 'dominant-requires-two',
      },
    ],
    sets: ['learn', 'practice'],
  }),
  task({
    id: 'horned-genotypes',
    questionId: 'horned-genotypes',
    direction: 'phenotype-first',
    sampleId: 'scan-s11',
    comparisonSampleId: 'scan-s12',
    traitId: 'horns',
    prompt: 'Two samples both read Horned. Select every genotype that could produce that readout.',
    supported: ['HH', 'Hh'],
    optionMisconceptions: {
      Hh: 'dominant-requires-two',
      hh: 'recessive-shows-dominant',
    },
    rule: 'Two samples can share a phenotype and still carry different allele pairs, so an equal readout is not proof of an equal genotype.',
    evidence: 'Both readouts say Horned, but the scans read Hh and HH.',
    evidenceAnchor: 'comparison-record',
    distractors: [
      {
        text: 'Both samples read Horned, so both scans must show the same allele pair.',
        anchorId: 'comparison-record',
        misconception: 'phenotype-equals-genotype',
      },
      {
        text: 'The HH sample has better horns, so HH is the genotype worth keeping.',
        anchorId: 'genotype-option',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['learn', 'practice'],
  }),
  task({
    id: 'spotted-scales-scan',
    direction: 'phenotype-first',
    sampleId: 'scan-s13',
    comparisonSampleId: 'scan-s14',
    traitId: 'scales',
    prompt: 'The readout says Spotted scales. Select every genotype the evidence still supports.',
    supported: ['SS', 'Ss'],
    optionMisconceptions: {
      Ss: 'dominant-requires-two',
      ss: 'recessive-shows-dominant',
    },
    rule: 'A dominant readout supports both the homozygous dominant and the heterozygous genotype.',
    evidence: 'The two scans read SS and Ss, and both readouts say Spotted scales.',
    evidenceAnchor: 'comparison-record',
    distractors: [
      {
        text: 'Both samples show spots, so both scans must be SS.',
        anchorId: 'comparison-record',
        misconception: 'phenotype-equals-genotype',
      },
      {
        text: 'Spotted scales are the more useful pattern, so S must be present twice.',
        anchorId: 'phenotype-readout',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['practice', 'official'],
  }),
  task({
    id: 'solid-scales-scan',
    direction: 'phenotype-first',
    sampleId: 'scan-s12',
    traitId: 'scales',
    prompt: 'The readout says Solid scales. Select every genotype the evidence still supports.',
    supported: ['ss'],
    optionMisconceptions: {
      SS: 'phenotype-equals-genotype',
      Ss: 'recessive-hides-dominant',
      ss: 'recessive-shows-dominant',
    },
    rule: 'A recessive readout narrows the genotype to one option, because a single dominant allele would change the readout.',
    evidence: 'The scan shows s and s, and no dominant allele is present to change the readout.',
    distractors: [
      {
        text: 'A solid-scaled sample could be Ss and simply not show the spots.',
        anchorId: 'genotype-option',
        misconception: 'recessive-hides-dominant',
      },
      {
        text: 'Solid scales are plainer, so the sample must carry the weaker allele pair.',
        anchorId: 'phenotype-readout',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['practice', 'reteach'],
  }),
  task({
    id: 'horn-scan-open',
    direction: 'genotype-first',
    sampleId: 'scan-s12',
    traitId: 'horns',
    prompt: 'The scan is already open at HH. Select every readout this sample could show.',
    supported: [PHENOTYPE_OPTION_IDS.dominant],
    optionMisconceptions: {
      [PHENOTYPE_OPTION_IDS.dominant]: 'dominant-requires-two',
      [PHENOTYPE_OPTION_IDS.recessive]: 'heterozygous-blend',
    },
    rule: 'Two dominant alleles produce the same readout as one dominant allele in this model.',
    evidence: 'Both slots hold H, so the readout matches every other horned sample.',
    distractors: [
      {
        text: 'Two H alleles should produce larger horns than one H allele.',
        anchorId: 'phenotype-readout',
        misconception: 'heterozygous-blend',
      },
      {
        text: 'HH samples are the strongest, so the readout must be different from Hh.',
        anchorId: 'comparison-record',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['practice', 'official', 'reteach'],
  }),
  task({
    id: 'official-wing-scan',
    direction: 'phenotype-first',
    sampleId: 'scan-s14',
    traitId: 'wings',
    prompt: 'The readout says Winged. Select every genotype the evidence still supports.',
    supported: ['WW', 'Ww'],
    optionMisconceptions: {
      Ww: 'dominant-requires-two',
      ww: 'recessive-shows-dominant',
    },
    rule: 'The dominant readout supports two genotypes until the scan narrows it to one.',
    evidence: 'The scan shows W and w while the readout stays Winged.',
    distractors: [
      {
        text: 'The readout is Winged, so the pair has to be WW.',
        anchorId: 'phenotype-readout',
        misconception: 'dominant-requires-two',
      },
      {
        text: 'The stronger flier must carry two copies of the useful allele.',
        anchorId: 'genotype-option',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['official'],
  }),
  task({
    id: 'official-fire-scan',
    direction: 'genotype-first',
    sampleId: 'scan-s14',
    traitId: 'fire',
    prompt: 'The scan is already open at FF. Select every readout this sample could show.',
    supported: [PHENOTYPE_OPTION_IDS.dominant],
    optionMisconceptions: {
      [PHENOTYPE_OPTION_IDS.dominant]: 'dominant-requires-two',
      [PHENOTYPE_OPTION_IDS.recessive]: 'heterozygous-blend',
    },
    rule: 'The number of dominant alleles does not change the readout in this simplified model.',
    evidence: 'Both slots hold F, and the model gives one readout for FF and Ff alike.',
    distractors: [
      {
        text: 'Two F alleles should produce a hotter or larger flame than one.',
        anchorId: 'phenotype-readout',
        misconception: 'heterozygous-blend',
      },
      {
        text: 'FF is the better genotype, so its readout must rank higher.',
        anchorId: 'genotype-option',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['official'],
  }),
  task({
    id: 'reteach-hidden-allele',
    direction: 'phenotype-first',
    sampleId: 'scan-s13',
    comparisonSampleId: 'scan-s11',
    traitId: 'wings',
    prompt: 'Both samples read Winged. Select every genotype the evidence supports for this pair.',
    supported: ['WW', 'Ww'],
    optionMisconceptions: {
      WW: 'dominant-requires-two',
      Ww: 'dominant-requires-two',
      ww: 'recessive-shows-dominant',
    },
    rule: 'Equal readouts do not prove equal scans: one sample reads WW and the other reads Ww.',
    evidence: 'The two open scans read WW and Ww while both readouts say Winged.',
    evidenceAnchor: 'comparison-record',
    distractors: [
      {
        text: 'The samples look the same, so their allele pairs must match.',
        anchorId: 'comparison-record',
        misconception: 'phenotype-equals-genotype',
      },
      {
        text: 'The WW sample is the better breeder because it has more dominant alleles.',
        anchorId: 'genotype-option',
        misconception: 'dominant-means-better',
      },
    ],
    sets: ['reteach'],
  }),
];

const TASK_BY_ID = new Map(GENOTYPE_SCANNER_TASKS.map(item => [item.id, item] as const));

export function genotypeScannerTask(id: string): GenotypeScannerTask {
  const found = TASK_BY_ID.get(id);
  if (!found) throw new Error(`Unknown genotype scanner task: ${id}`);
  return found;
}

export const GENOTYPE_SCANNER_MISCONCEPTION_NOTES:
Readonly<Record<GenotypeScannerMisconception, string>> = {
  'dominant-requires-two': 'One dominant allele is enough in this model. A dominant readout supports both the homozygous dominant and the heterozygous genotype.',
  'recessive-shows-dominant': 'A pair of recessive alleles produces the recessive readout. It cannot produce the dominant one.',
  'recessive-hides-dominant': 'A recessive readout cannot hide a dominant allele. One dominant allele would have changed the readout.',
  'phenotype-equals-genotype': 'Two samples can share a readout and still carry different allele pairs. The readout narrows the genotype; it does not name it.',
  'heterozygous-blend': 'This model has no blending. A heterozygote shows the same readout as a homozygous dominant sample.',
  'dominant-means-better': 'Dominant describes expression, not strength, health, rarity, or value. Classify from the allele pair, not from which trait sounds better.',
};

/** Reteach bundles isolate one diagnosed misconception with tasks the student has not seen. */
export const GENOTYPE_SCANNER_RETEACH:
Readonly<Record<GenotypeScannerMisconception, readonly string[]>> = {
  'dominant-requires-two': ['reteach-hidden-allele', 'horn-scan-open'],
  'recessive-shows-dominant': ['solid-scales-scan', 'reteach-hidden-allele'],
  'recessive-hides-dominant': ['solid-scales-scan', 'horn-scan-open'],
  'phenotype-equals-genotype': ['reteach-hidden-allele', 'horn-scan-open'],
  'heterozygous-blend': ['horn-scan-open', 'reteach-hidden-allele'],
  'dominant-means-better': ['reteach-hidden-allele', 'solid-scales-scan'],
};

export function genotypeScannerTasks(
  setId: GenotypeScannerSetId,
  seed: string,
): readonly GenotypeScannerTask[] {
  const tasks = GENOTYPE_SCANNER_TASKS.filter(item => item.sets.includes(setId));
  if (setId === 'learn') return tasks;
  return deterministicOrder(tasks, seed);
}

export function genotypeScannerReteachTasks(
  misconception: GenotypeScannerMisconception | null,
): readonly GenotypeScannerTask[] {
  const ids = misconception
    ? GENOTYPE_SCANNER_RETEACH[misconception]
    : GENOTYPE_SCANNER_RETEACH['dominant-requires-two'];
  return ids.map(genotypeScannerTask);
}

function deterministicOrder<T extends { id: string }>(
  items: readonly T[],
  seed: string,
): readonly T[] {
  return [...items].sort((left, right) =>
    stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`)
    || left.id.localeCompare(right.id));
}

/** The station renders label IDs; this map supplies the wording. */
export const GENOTYPE_SCANNER_COPY: StationCopy = {
  'genotype-scan.read': 'Read the readout first. It reports what an observer can see, not the allele pair.',
  'genotype-scan.predict': 'Select every record the evidence still supports. The scan stays sealed until you lock in.',
  'genotype-scan.scan': 'Scanning the locus on both chromosomes…',
  'genotype-scan.reveal': 'The scan is open. Compare the actual allele pair with the records you selected.',
  'genotype-scan.compare': 'The readout never changed. Pin the mark that explains why.',

  ...Object.fromEntries(GENOTYPE_SCANNER_SPECIMENS.map(profile => [
    `sample.${profile.id}.caption`,
    `${profile.title} · analysed as records only; no body artwork is used as evidence.`,
  ])),

  ...Object.fromEntries(DRAGON_TRAITS.flatMap(trait => [
    [`phenotype.${trait.id}.dominant`, trait.dominantPhenotype],
    [`phenotype.${trait.id}.recessive`, trait.recessivePhenotype],
  ])),

  ...Object.fromEntries(GENOTYPE_SCANNER_TASKS.flatMap(item => [
    [`task.${item.id}.prompt`, item.prompt],
    ...item.evidence.map(mark => [`evidence.${mark.id}`, mark.text] as const),
  ])),
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
