import {
  RnaTranslationStep,
  complementaryDna,
  dnaSequence,
  transcribedRna,
  translateRna,
} from '../../../../shared/dna-process-visuals/dna-process.models';
import { AccountDragonRecord } from '../shared/account-genetics-library.models';

export type DracaseGenotype = 'DD' | 'Dd' | 'dd';
export type DracaseAlleleKind = 'full-length' | 'premature-stop';
export type ProteinRescueSampleSlot = 'chr4-a' | 'chr4-b';
export type DragonFoodId =
  'moonmilk' | 'fermented-moonmilk' | 'emberroot-stew' | 'enzyme-treated-moonmilk';

export interface ProteinRescueGeneSample {
  id: string;
  slot: ProteinRescueSampleSlot;
  sampleCode: 'CHR4-A' | 'CHR4-B';
  alleleKind: DracaseAlleleKind;
  codingDna: string;
  templateDna: string;
  mrna: string;
}

export type ProteinTranslationStep = RnaTranslationStep;

export interface ProteinTranslationResult {
  codons: readonly string[];
  steps: readonly ProteinTranslationStep[];
  aminoAcids: readonly string[];
  stoppedEarly: boolean;
  enzymeWorks: boolean;
}

export interface ProteinRescuePatient {
  dragon: AccountDragonRecord;
  genotype: DracaseGenotype;
  samples: readonly [ProteinRescueGeneSample, ProteinRescueGeneSample];
  chartSummary: string;
  observations: readonly string[];
  dietLog: readonly string[];
}

export interface DragonFood {
  id: DragonFoodId;
  name: string;
  shortName: string;
  dracoseLoad: 'none' | 'low' | 'high';
  treatment: 'none' | 'fermented' | 'enzyme';
  description: string;
}

export type DigestionResultKind = 'digested' | 'managed' | 'no-dracose' | 'undigested';

export interface DigestionTrial {
  id: string;
  foodId: DragonFoodId;
  foodName: string;
  result: DigestionResultKind;
  sugarSplit: boolean;
  energy: 'steady' | 'reduced';
  symptoms: string;
  explanation: string;
  testedAtIso: string;
}

export interface ProteinRescueSampleEvidence {
  sampleCode: string;
  codingDna: string;
  templateDna: string;
  mrna: string;
  aminoAcids: readonly string[];
  stoppedEarly: boolean;
  enzymeWorks: boolean;
}

export interface ProteinRescueCaseRecord {
  id: string;
  patientId: string;
  patientName: string;
  chartSummary: string;
  observations: readonly string[];
  sampleEvidence: readonly ProteinRescueSampleEvidence[];
  digestionTrials: readonly DigestionTrial[];
  claimedGenotype: DracaseGenotype;
  recommendedFoodIds: readonly DragonFoodId[];
  explanation: string;
  savedAtIso: string;
}

export interface StoredProteinRescueCases {
  schemaVersion: 1;
  studentId: string;
  records: readonly ProteinRescueCaseRecord[];
}

export const WORKING_DRACASE_CODING_DNA = 'ATGTTTGGCAAACCT';
export const STOP_DRACASE_CODING_DNA = 'ATGTTTTAGAAACCT';

export const DRAGON_FOODS: readonly DragonFood[] = [
  {
    id: 'moonmilk',
    name: 'Moonmilk custard',
    shortName: 'Moonmilk',
    dracoseLoad: 'high',
    treatment: 'none',
    description: 'A rich hatchery food containing intact Dracose.',
  },
  {
    id: 'fermented-moonmilk',
    name: 'Fermented moonmilk',
    shortName: 'Fermented',
    dracoseLoad: 'low',
    treatment: 'fermented',
    description: 'Fermentation pre-splits most of the Dracose before feeding.',
  },
  {
    id: 'emberroot-stew',
    name: 'Emberroot meat stew',
    shortName: 'No Dracose',
    dracoseLoad: 'none',
    treatment: 'none',
    description: 'A complete meal made without Moonmilk sugar.',
  },
  {
    id: 'enzyme-treated-moonmilk',
    name: 'Enzyme-treated moonmilk',
    shortName: 'Enzyme treated',
    dracoseLoad: 'high',
    treatment: 'enzyme',
    description: 'A Dracase supplement splits the sugar before it reaches the gut.',
  },
];

const FOUNDATION_GENOTYPES: Readonly<Record<string, DracaseGenotype>> = {
  ember: 'Dd',
  tide: 'dd',
  moss: 'DD',
  quartz: 'Dd',
};

export function proteinRescuePatientFor(dragon: AccountDragonRecord): ProteinRescuePatient {
  const genotype = FOUNDATION_GENOTYPES[dragon.id] ?? generatedGenotype(dragon.id);
  const alleleKinds = genotypeAlleles(genotype);
  if (genotype === 'Dd' && stableHash(`${dragon.id}:sample-order`) % 2 === 1) {
    alleleKinds.reverse();
  }
  const samples = alleleKinds.map((alleleKind, index) =>
    geneSample(dragon.id, index === 0 ? 'chr4-a' : 'chr4-b', alleleKind),
  ) as [ProteinRescueGeneSample, ProteinRescueGeneSample];
  const affected = genotype === 'dd';
  return {
    dragon,
    genotype,
    samples,
    chartSummary: affected
      ? 'Recurring digestive distress after rich hatchery feeds'
      : 'Routine nutrition review; no current digestive distress',
    observations: affected
      ? [
          'Bloating and abdominal rumbling 30–60 minutes after Moonmilk meals.',
          'Low flight energy follows high-Moonmilk feedings.',
          'Symptoms fade on Emberroot stew days.',
        ]
      : [
          'Stable flight energy across the current feeding schedule.',
          'No recurring bloating documented in the last seven days.',
          'Routine screening requested because a bloodline relative had food intolerance.',
        ],
    dietLog: affected
      ? [
          'Moonmilk custard — symptoms',
          'Fermented moonmilk — comfortable',
          'Emberroot stew — comfortable',
        ]
      : [
          'Moonmilk custard — comfortable',
          'Fermented moonmilk — comfortable',
          'Emberroot stew — comfortable',
        ],
  };
}

export function translateMessengerRna(mrna: string): ProteinTranslationResult {
  const translation = translateRna(mrna);
  return {
    ...translation,
    enzymeWorks: !translation.stoppedEarly && translation.aminoAcids.length === 5,
  };
}

export function runDigestionTrial(
  patient: ProteinRescuePatient,
  food: DragonFood,
  testedAtIso = new Date().toISOString(),
): DigestionTrial {
  const endogenousEnzymeWorks = patient.genotype !== 'dd';
  if (food.dracoseLoad === 'none') {
    return trial(
      food,
      'no-dracose',
      false,
      'steady',
      'No digestive symptoms observed.',
      'This meal adds no Dracose, so Dracase is not required.',
      testedAtIso,
    );
  }
  if (food.treatment === 'fermented' || food.treatment === 'enzyme') {
    const source = food.treatment === 'fermented' ? 'Fermentation' : 'The added enzyme';
    return trial(
      food,
      'managed',
      true,
      'steady',
      'No digestive symptoms observed.',
      `${source} pre-splits the Dracose. The diet manages exposure but does not change the gene.`,
      testedAtIso,
    );
  }
  if (endogenousEnzymeWorks) {
    return trial(
      food,
      'digested',
      true,
      'steady',
      'No digestive symptoms observed.',
      'Patient Dracase fits the sugar and splits it into absorbable products.',
      testedAtIso,
    );
  }
  return trial(
    food,
    'undigested',
    false,
    'reduced',
    'Bloating, gut rumbling, and reduced flight energy.',
    'Intact Dracose reaches the gut because no working Dracase is available.',
    testedAtIso,
  );
}

export function genotypeHasWorkingEnzyme(genotype: DracaseGenotype): boolean {
  return genotype === 'DD' || genotype === 'Dd';
}

function geneSample(
  dragonId: string,
  slot: ProteinRescueSampleSlot,
  alleleKind: DracaseAlleleKind,
): ProteinRescueGeneSample {
  const codingDna =
    alleleKind === 'full-length' ? WORKING_DRACASE_CODING_DNA : STOP_DRACASE_CODING_DNA;
  const coding = dnaSequence(codingDna);
  return {
    id: `${dragonId}:${slot}`,
    slot,
    sampleCode: slot === 'chr4-a' ? 'CHR4-A' : 'CHR4-B',
    alleleKind,
    codingDna: coding.join(''),
    templateDna: complementaryDna(coding).join(''),
    mrna: transcribedRna(coding).join(''),
  };
}

function genotypeAlleles(genotype: DracaseGenotype): DracaseAlleleKind[] {
  if (genotype === 'DD') return ['full-length', 'full-length'];
  if (genotype === 'dd') return ['premature-stop', 'premature-stop'];
  return ['full-length', 'premature-stop'];
}

function generatedGenotype(dragonId: string): DracaseGenotype {
  return (['DD', 'Dd', 'Dd', 'dd'] as const)[stableHash(`${dragonId}:dracase`) % 4];
}

function trial(
  food: DragonFood,
  result: DigestionResultKind,
  sugarSplit: boolean,
  energy: DigestionTrial['energy'],
  symptoms: string,
  explanation: string,
  testedAtIso: string,
): DigestionTrial {
  return {
    id: `${food.id}:${testedAtIso}`,
    foodId: food.id,
    foodName: food.name,
    result,
    sugarSplit,
    energy,
    symptoms,
    explanation,
    testedAtIso,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
