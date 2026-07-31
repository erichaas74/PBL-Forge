import {
  DragonSimulationDefinition,
  GeneratedSimulationQuestion,
  InstructionLevel,
  ResolvedSimulationSettings,
} from './dragon-simulation.models';
import { LEVEL_PROFILES } from './dragon-simulation.registry';

const LEVEL_ORDER: readonly InstructionLevel[] = [
  'grade-7',
  'grade-8',
  'high-school',
  'ap-biology',
];

export function generateSimulationQuestions(
  definition: DragonSimulationDefinition,
  settings: ResolvedSimulationSettings,
  seed: string,
): GeneratedSimulationQuestion[] {
  const targetIndex = LEVEL_ORDER.indexOf(settings.level);
  const eligibleLevels = LEVEL_ORDER.slice(0, targetIndex + 1);
  const candidates = eligibleLevels.flatMap((level, levelIndex) => {
    const challenge = definition.levelChallenges[level];
    const section = definition.sections[levelIndex % definition.sections.length];
    const shuffledOptions = shuffleDeterministic(challenge.options, `${seed}:${level}:options`);
    return [{
      id: `${definition.id}:${level}:${hashSeed(`${seed}:${level}`)}`,
      templateId: `${definition.id}:${level}`,
      simulationId: definition.id,
      sectionId: section.id,
      phase: section.phase,
      level,
      skill: definition.skill,
      prompt: challenge.prompt,
      options: shuffledOptions.map((option) => ({
        ...option,
        nodeId: option.id === challenge.correctOptionId ? challenge.focusNodeId : undefined,
      })),
      correctOptionId: challenge.correctOptionId,
      explanation: challenge.explanation,
      misconceptionFlag: challenge.misconceptionFlag,
      interaction: levelIndex % 2 === 0 ? 'visual-choice' : 'evidence-select',
      hint: settings.hintsAllowed
        ? `Inspect “${definition.nodes.find((node) => node.id === challenge.focusNodeId)?.label ?? definition.nodes[0].label}” and compare it with the claim.`
        : null,
    } satisfies GeneratedSimulationQuestion];
  });

  const foundational = buildFoundationalQuestions(definition, settings, seed);
  const targetChallenge = candidates.find((question) => question.level === settings.level)
    ?? candidates[candidates.length - 1];
  const supportingPool = shuffleDeterministic(
    [...foundational, ...candidates.filter((question) => question !== targetChallenge)],
    `${seed}:supporting-questions`,
  );
  const selected = [targetChallenge, ...supportingPool.slice(0, settings.questionCount - 1)];
  return shuffleDeterministic(selected, `${seed}:questions`)
    .map((question, index) => ({
      ...question,
      sectionId: definition.sections[index % definition.sections.length].id,
      phase: definition.sections[index % definition.sections.length].phase,
    }));
}

function buildFoundationalQuestions(
  definition: DragonSimulationDefinition,
  settings: ResolvedSimulationSettings,
  seed: string,
): GeneratedSimulationQuestion[] {
  const correctNode = definition.nodes[hashSeed(seed) % definition.nodes.length];
  const evidenceNode = definition.nodes[(definition.nodes.indexOf(correctNode) + 1) % definition.nodes.length];
  const nodeOptions = shuffleDeterministic(
    definition.nodes.slice(0, 3).map((node) => ({ id: node.id, label: node.label, nodeId: node.id })),
    `${seed}:nodes`,
  );
  if (!nodeOptions.some((option) => option.id === correctNode.id)) {
    nodeOptions[0] = { id: correctNode.id, label: correctNode.label, nodeId: correctNode.id };
  }

  return [
    {
      id: `${definition.id}:observe:${hashSeed(`${seed}:observe`)}`,
      templateId: `${definition.id}:observe`,
      simulationId: definition.id,
      sectionId: 'observe',
      phase: 'observe',
      level: settings.level,
      skill: definition.skill,
      prompt: `Locate the part of the model labeled “${correctNode.label}.”`,
      options: nodeOptions,
      correctOptionId: correctNode.id,
      explanation: correctNode.detail,
      misconceptionFlag: 'visual-model-location',
      interaction: 'visual-choice',
      hint: settings.hintsAllowed ? `Look for the ${correctNode.symbol} symbol.` : null,
    },
    {
      id: `${definition.id}:evidence:${hashSeed(`${seed}:evidence`)}`,
      templateId: `${definition.id}:evidence`,
      simulationId: definition.id,
      sectionId: 'explain',
      phase: 'explain',
      level: settings.level,
      skill: definition.skill,
      prompt: `Which model record should be opened next to strengthen the explanation?`,
      options: shuffleDeterministic([
        { id: evidenceNode.id, label: evidenceNode.label, nodeId: evidenceNode.id },
        { id: 'appearance-only', label: 'Appearance only' },
        { id: 'arena-score', label: 'Arena score' },
      ], `${seed}:evidence-options`),
      correctOptionId: evidenceNode.id,
      explanation: evidenceNode.detail,
      misconceptionFlag: 'unsupported-evidence',
      interaction: 'evidence-select',
      hint: settings.hintsAllowed ? 'Choose a scientific record, not a value judgment.' : null,
    },
  ];
}

export function evaluateSimulationAnswer(
  question: GeneratedSimulationQuestion,
  selectedOptionId: string,
): { correct: boolean; misconceptionFlag: string | null } {
  const correct = selectedOptionId === question.correctOptionId;
  return { correct, misconceptionFlag: correct ? null : question.misconceptionFlag };
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleDeterministic<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  let state = hashSeed(seed) || 1;
  const random = () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function defaultQuestionCount(level: InstructionLevel): number {
  return LEVEL_PROFILES[level].questionCount;
}
