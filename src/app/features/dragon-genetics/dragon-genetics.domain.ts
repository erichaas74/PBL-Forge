import {
  DRAGON_PARENTS,
  DRAGON_TRAITS,
  breedLabClutch,
  buildPunnettCells,
  createEducationalAssembly,
  createVisualGenome,
  dominantPhenotypeProbability,
} from './simulation/domain/dragon-inheritance';
import {
  DragonOffspring,
  DragonParentProfile,
  DragonTraitId,
} from './simulation/domain/dragon-lab.models';
import { LICENSE_QUESTIONS } from './dragon-genetics.content';
import {
  BatchObservation,
  DragonGeneticsSnapshot,
  GeneticsSkill,
  MasteryRecord,
  StudentDragonRecord,
} from './dragon-genetics.models';

export function createDefaultDragonSnapshot(): DragonGeneticsSnapshot {
  return {
    schemaVersion: 3,
    activeModule: 1,
    activeMode: 'learn',
    completedModules: [],
    mastery: {},
    diagnosticAnswers: {},
    correctedMisconception: '',
    teamRole: '',
    sortAnswers: {},
    traitEvidenceRecords: [],
    genomeMicroscopeRecords: [],
    genotypeScanRecords: [],
    hatcheryRecords: [],
    alleleWorkbenchRecords: [],
    genomePath: [],
    genomeQuickAnswers: {},
    phenotypeAnswers: {},
    module3EggTraitId: 'wings',
    module3EggPredictions: [],
    module3EggPredictionLocked: false,
    ruleAnswers: {},
    parentAId: DRAGON_PARENTS[0].id,
    parentBId: DRAGON_PARENTS[1].id,
    predictions: {},
    genotypePredictions: {},
    predictionsChecked: false,
    predictionAccuracy: 0,
    smallBatch: null,
    largeBatch: null,
    reproductionAnswer: null,
    siblingIds: [],
    siblingExplanation: '',
    recommendedPairId: null,
    diversityRecommendation: '',
    diversityStrategy: null,
    peerReview: '',
    week1Answers: {},
    week1Score: null,
    week1Passed: false,
    week2Answers: {},
    week2Score: null,
    week2Passed: false,
    licenseQuestionOrder: shuffle(LICENSE_QUESTIONS.map(question => question.id)),
    licenseAnswers: {},
    licenseScore: null,
    licensePassed: false,
    officialPredictions: {},
    officialGenotypePredictions: {},
    officialAttempts: [],
    officialPool: [],
    championId: null,
    finalEvidence: '',
    defenseAnswers: ['', '', ''],
    reflectionAnswers: ['', '', '', '', ''],
    battleResult: null,
    finalSubmitted: false,
    events: [],
    updatedAtIso: new Date().toISOString(),
  };
}

export const GENOTYPE_DISTRIBUTION_CHOICES = [
  '100-0-0',
  '50-50-0',
  '0-100-0',
  '25-50-25',
  '0-50-50',
  '0-0-100',
] as const;

export function findParent(parentId: string): DragonParentProfile {
  return DRAGON_PARENTS.find(parent => parent.id === parentId) ?? DRAGON_PARENTS[0];
}

export function expectedPredictions(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
): Record<DragonTraitId, number> {
  return Object.fromEntries(DRAGON_TRAITS.map(trait => [
    trait.id,
    dominantPhenotypeProbability(parentA, parentB, trait.id),
  ])) as Record<DragonTraitId, number>;
}

export function predictionAccuracy(
  predictions: Partial<Record<DragonTraitId, number>>,
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
): number {
  const expected = expectedPredictions(parentA, parentB);
  const correct = DRAGON_TRAITS.filter(trait => predictions[trait.id] === expected[trait.id]).length;
  return Math.round(100 * correct / DRAGON_TRAITS.length);
}

export function genotypeDistribution(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  traitId: DragonTraitId,
): string {
  const trait = DRAGON_TRAITS.find(item => item.id === traitId) ?? DRAGON_TRAITS[0];
  const cells = buildPunnettCells(parentA, parentB, traitId);
  const homozygousDominant = cells.filter(cell =>
    cell.genotype[0] === trait.dominantAllele && cell.genotype[1] === trait.dominantAllele).length;
  const homozygousRecessive = cells.filter(cell =>
    cell.genotype[0] === trait.recessiveAllele && cell.genotype[1] === trait.recessiveAllele).length;
  const heterozygous = cells.length - homozygousDominant - homozygousRecessive;
  return [homozygousDominant, heterozygous, homozygousRecessive]
    .map(count => Math.round(100 * count / cells.length))
    .join('-');
}

export function genotypePredictionAccuracy(
  predictions: Partial<Record<DragonTraitId, string>>,
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
): number {
  const correct = DRAGON_TRAITS.filter(trait =>
    predictions[trait.id] === genotypeDistribution(parentA, parentB, trait.id)).length;
  return Math.round(100 * correct / DRAGON_TRAITS.length);
}

export function hasAllTraitPredictions(
  predictions: Partial<Record<DragonTraitId, number>>,
): predictions is Record<DragonTraitId, number> {
  return DRAGON_TRAITS.every(trait => predictions[trait.id] !== undefined);
}

export function hasAllGenotypePredictions(
  predictions: Partial<Record<DragonTraitId, string>>,
): predictions is Record<DragonTraitId, string> {
  return DRAGON_TRAITS.every(trait => !!predictions[trait.id]);
}

export function runDragonBatch(
  parentA: DragonParentProfile,
  parentB: DragonParentProfile,
  run: number,
  size: number,
): BatchObservation {
  const offspring = breedLabClutch(parentA, parentB, run, size);
  const dominantCounts = Object.fromEntries(DRAGON_TRAITS.map(trait => [
    trait.id,
    offspring.filter(dragon => dragon.genome[trait.id].includes(trait.dominantAllele)).length,
  ])) as Record<DragonTraitId, number>;

  return {
    size,
    run,
    dominantCounts,
    sample: offspring.slice(0, 12).map(toStudentDragonRecord),
  };
}

export function toStudentDragonRecord(dragon: DragonOffspring): StudentDragonRecord {
  return {
    id: dragon.id,
    name: dragon.name,
    title: dragon.title,
    color: dragon.color,
    accentColor: dragon.accentColor,
    genome: dragon.genome,
    parentIds: dragon.parentIds,
    generation: dragon.generation,
  };
}

export function materializeDragon(record: StudentDragonRecord): DragonOffspring {
  const engineGenome = createVisualGenome(record.id, record.genome, record.generation);
  const build = createEducationalAssembly(record.genome, engineGenome);
  return {
    ...record,
    engineGenome,
    assembly: build.assembly,
    combatProfile: build.combatProfile,
  };
}

export function masteryFromScore(
  correct: number,
  total: number,
  attempts: number,
  misconceptionFlags: string[] = [],
): MasteryRecord {
  const ratio = total ? correct / total : 0;
  const level = ratio >= 1 ? 4 : ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : 1;
  return {
    level,
    correct,
    total,
    attempts,
    misconceptionFlags: [...new Set(misconceptionFlags)],
  };
}

export function mergeMastery(
  current: MasteryRecord | undefined,
  next: MasteryRecord,
): MasteryRecord {
  if (!current) return next;
  const better = next.level > current.level ||
    next.level === current.level && next.correct / next.total > current.correct / current.total;
  return {
    ...(better ? next : current),
    attempts: current.attempts + 1,
    misconceptionFlags: [...new Set([...current.misconceptionFlags, ...next.misconceptionFlags])],
  };
}

export function academicMasteryPercent(snapshot: DragonGeneticsSnapshot): number {
  const skills: GeneticsSkill[] = ['GEN-1', 'GEN-2', 'GEN-3', 'GEN-4', 'GEN-5', 'GEN-6', 'GEN-7', 'GEN-8'];
  const points = skills.reduce((total, skill) => total + (snapshot.mastery[skill]?.level ?? 1), 0);
  return Math.round(100 * (points - skills.length) / (skills.length * 3));
}

export function challengeScore(snapshot: DragonGeneticsSnapshot): {
  genetics: number;
  diversity: number;
  battle: number;
  evidence: number;
  total: number;
} {
  const geneticsAccuracy = snapshot.officialAttempts.length
    ? snapshot.officialAttempts.reduce((sum, attempt) => sum + attempt.predictionAccuracy, 0)
      / snapshot.officialAttempts.length
    : 0;
  const selectedAttempt = snapshot.officialAttempts.find(attempt =>
    attempt.offspring.some(dragon => dragon.id === snapshot.championId),
  );
  const genetics = Math.round(30 * geneticsAccuracy / 100);
  const diversity = Math.round(25 * (selectedAttempt?.diversityScore ?? 0) / 100);
  const battle = snapshot.battleResult ? (snapshot.battleResult.won ? 25 : 13) : 0;
  const defenseComplete = snapshot.defenseAnswers.filter(answer => answer.trim().length >= 25).length;
  const evidence = Math.min(20, Math.round(
    12 * Math.min(1, snapshot.finalEvidence.trim().length / 100) + 8 * defenseComplete / 3,
  ));
  return { genetics, diversity, battle, evidence, total: genetics + diversity + battle + evidence };
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
