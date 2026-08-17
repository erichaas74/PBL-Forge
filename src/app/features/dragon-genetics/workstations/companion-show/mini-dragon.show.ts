import { MiniTrialId, MiniTrialResult, runMiniShowCard } from './mini-dragon.events';
import { MiniGenome, miniPhenotypeFormId } from './mini-dragon.genetics';
import {
  BreedStandardTarget,
  MiniShowDivisionId,
  MiniShowRunRecord,
  MiniTrainingSessionRecord,
  MiniTrainingSkillId,
} from './companion-show.models';

export const MINI_TRAINING_LEVEL_MAX = 4;

export interface MiniTrainingSkillDefinition {
  id: MiniTrainingSkillId;
  name: string;
  shortName: string;
  trialId: MiniTrialId;
  cue: string;
  practice: string;
}

export interface MiniShowDivisionDefinition {
  id: MiniShowDivisionId;
  name: string;
  motto: string;
  description: string;
  targets: readonly BreedStandardTarget[];
  aptitudeWeights: Readonly<Record<MiniTrialId, number>>;
}

export interface MiniShowAptitudeRow {
  trialId: MiniTrialId;
  trialName: string;
  outcomeLabel: string;
  aptitudePercent: number;
  weight: number;
  geneticPoints: number;
}

export interface MiniShowJudgement {
  division: MiniShowDivisionDefinition;
  matchedTargets: number;
  targetCount: number;
  conformationScore: number;
  aptitudeScore: number;
  aptitudeRows: readonly MiniShowAptitudeRow[];
  trainingLevels: Readonly<Record<MiniTrainingSkillId, number>>;
  geneticScore: number;
  trainingScore: number;
  combinedScore: number;
  award: string;
}

export const MINI_TRAINING_SKILLS: readonly MiniTrainingSkillDefinition[] = [
  {
    id: 'course-cue',
    name: 'Course cue',
    shortName: 'Follow course',
    trialId: 'flight',
    cue: 'Pennant',
    practice: 'Follow the pennant across the ring and return to the handler.',
  },
  {
    id: 'weave',
    name: 'Post weave',
    shortName: 'Weave',
    trialId: 'agility',
    cue: 'Two taps',
    practice: 'Change direction around the marker posts without missing one.',
  },
  {
    id: 'settle',
    name: 'Bench settle',
    shortName: 'Settle',
    trialId: 'endurance',
    cue: 'Open palm',
    practice: 'Hold a calm show pose while the judge walks around the stand.',
  },
  {
    id: 'ember-cue',
    name: 'Ember cue',
    shortName: 'Ember cue',
    trialId: 'ember',
    cue: 'Lantern',
    practice: 'Open on the lantern cue, hold the display, and close safely.',
  },
];

export const MINI_SHOW_DIVISIONS: readonly MiniShowDivisionDefinition[] = [
  {
    id: 'sky-circuit',
    name: 'Sky Circuit',
    motto: 'Light, quick, and steady in the air',
    description: 'Judges favour a compact, smooth-backed dragon with broad lift and a clear blue display.',
    targets: [
      { geneId: 'wings', formId: 'wings:broad' },
      { geneId: 'size', formId: 'size:teacup' },
      { geneId: 'coat', formId: 'coat:sleek' },
      { geneId: 'ember', formId: 'ember:blue' },
    ],
    aptitudeWeights: { flight: 4, agility: 3, endurance: 1, ember: 2 },
  },
  {
    id: 'hearth-companion',
    name: 'Hearth Companion',
    motto: 'Warm, settled, and unmistakable',
    description: 'Judges look for cute baby-bumpy scale rows, gold patterning, curled horns, and a gentle pale glow.',
    targets: [
      { geneId: 'coat', formId: 'coat:fluffy' },
      { geneId: 'pattern', formId: 'pattern:gold' },
      { geneId: 'horns', formId: 'horns:curled' },
      { geneId: 'ember', formId: 'ember:pale' },
    ],
    aptitudeWeights: { flight: 1, agility: 1, endurance: 5, ember: 3 },
  },
  {
    id: 'festival-star',
    name: 'Festival Star',
    motto: 'Pattern, presence, and a brilliant finish',
    description: 'Judges reward a two-tone coat, rose ember, curled horns, and controlled small wings.',
    targets: [
      { geneId: 'pattern', formId: 'pattern:ash-gold' },
      { geneId: 'ember', formId: 'ember:rose' },
      { geneId: 'horns', formId: 'horns:curled' },
      { geneId: 'wings', formId: 'wings:small' },
    ],
    aptitudeWeights: { flight: 1, agility: 2, endurance: 2, ember: 5 },
  },
];

export function miniShowDivision(id: MiniShowDivisionId | null): MiniShowDivisionDefinition | null {
  return MINI_SHOW_DIVISIONS.find((division) => division.id === id) ?? null;
}

export function miniTrainingSkill(id: MiniTrainingSkillId): MiniTrainingSkillDefinition {
  const skill = MINI_TRAINING_SKILLS.find((candidate) => candidate.id === id);
  if (!skill) throw new Error(`Unknown mini dragon training skill: ${id}`);
  return skill;
}

export function miniTrainingLevels(
  dragonId: string,
  sessions: readonly MiniTrainingSessionRecord[],
): Readonly<Record<MiniTrainingSkillId, number>> {
  return Object.fromEntries(
    MINI_TRAINING_SKILLS.map((skill) => [
      skill.id,
      Math.min(
        MINI_TRAINING_LEVEL_MAX,
        sessions.filter((session) => session.dragonId === dragonId && session.skillId === skill.id)
          .length,
      ),
    ]),
  ) as Record<MiniTrainingSkillId, number>;
}

export function miniTrainingLevelLabel(level: number): string {
  return (
    ['Unstarted', 'Learning', 'Steady', 'Polished', 'Ring-ready'][
      clamp(Math.round(level), 0, MINI_TRAINING_LEVEL_MAX)
    ] ?? 'Unstarted'
  );
}

export function judgeMiniDragon(
  genome: MiniGenome,
  division: MiniShowDivisionDefinition,
  trainingLevels: Readonly<Record<MiniTrainingSkillId, number>>,
): MiniShowJudgement {
  const matchedTargets = division.targets.filter(
    (target) => miniPhenotypeFormId(target.geneId, genome) === target.formId,
  ).length;
  const conformationScore = round1(25 * matchedTargets / division.targets.length);
  const card = runMiniShowCard(genome);
  const totalWeight = Object.values(division.aptitudeWeights).reduce((sum, value) => sum + value, 0);
  const aptitudeRows = card.map((result): MiniShowAptitudeRow => {
    const weight = division.aptitudeWeights[result.trial.id];
    return {
      trialId: result.trial.id,
      trialName: result.trial.name,
      outcomeLabel: result.outcome.label,
      aptitudePercent: result.outcome.aptitudePercent,
      weight,
      geneticPoints: round1(25 * weight / totalWeight * result.outcome.aptitudePercent / 100),
    };
  });
  const aptitudeScore = round1(aptitudeRows.reduce((sum, row) => sum + row.geneticPoints, 0));
  const geneticScore = round1(conformationScore + aptitudeScore);
  const trainingScore = round1(
    MINI_TRAINING_SKILLS.reduce(
      (sum, skill) => sum + 50 * trainingLevels[skill.id] / MINI_TRAINING_LEVEL_MAX,
      0,
    ) / MINI_TRAINING_SKILLS.length,
  );
  const combinedScore = round1(geneticScore + trainingScore);

  return {
    division,
    matchedTargets,
    targetCount: division.targets.length,
    conformationScore,
    aptitudeScore,
    aptitudeRows,
    trainingLevels,
    geneticScore,
    trainingScore,
    combinedScore,
    award: miniShowAward(combinedScore),
  };
}

export function showRunFromJudgement(
  id: string,
  dragonId: string,
  judgement: MiniShowJudgement,
  judgedAtIso = new Date().toISOString(),
): MiniShowRunRecord {
  return {
    id,
    dragonId,
    divisionId: judgement.division.id,
    geneticScore: judgement.geneticScore,
    trainingScore: judgement.trainingScore,
    combinedScore: judgement.combinedScore,
    award: judgement.award,
    trainingLevels: { ...judgement.trainingLevels },
    judgedAtIso,
  };
}

export function showResultForTrial(
  results: readonly MiniTrialResult[],
  trialId: MiniTrialId,
): MiniTrialResult | null {
  return results.find((result) => result.trial.id === trialId) ?? null;
}

function miniShowAward(score: number): string {
  if (score >= 90) return 'Grand Champion';
  if (score >= 75) return 'Gold Rosette';
  if (score >= 60) return 'Silver Rosette';
  if (score >= 45) return 'Bronze Rosette';
  return 'Developing Entry';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
