/**
 * Runtime status: ACTIVE-HYBRID — retained legacy lesson/capstone graph with no public journey routes.
 * Inputs/signals: static path, lesson, workstation-visit, evidence, and starter-pair definitions.
 * Data access: no persistence; normalization consumes assignment journey settings.
 * Connects to: /explore recommendations, teacher journey controls, and DragonJourneyFacade.
 */
import {
  DragonClassJourneyPlan,
  DragonLearningPathDefinition,
  DragonLearningPathId,
  DragonLessonDefinition,
  DragonLessonId,
  DragonStarterPairPreset,
} from '../domain/dragon-journey.models';

const OPEN_SIDE_QUESTS = [
  'pedigree-lab',
  'protein-rescue',
  'blood-type-lab',
  'candling-workstation',
  'island-diversity',
] as const;

export const DRAGON_STARTER_PAIR_PRESETS: readonly DragonStarterPairPreset[] = [
  {
    id: 'classic-ember-tide',
    pathId: 'dragon-arena',
    lineage: 'classic',
    label: 'Ember and Tide',
    starters: [
      { dragonId: 'ember', sex: 'female', label: 'Ember' },
      { dragonId: 'tide', sex: 'male', label: 'Tide' },
    ],
  },
  {
    id: 'mini-biscuit-pepper',
    pathId: 'mini-dragon-show',
    lineage: 'mini',
    label: 'Biscuit and Pepper',
    starters: [
      { dragonId: 'mini-biscuit', sex: 'female', label: 'Biscuit' },
      { dragonId: 'mini-pepper', sex: 'male', label: 'Pepper' },
    ],
  },
  {
    id: 'mini-cinder-sorrel',
    pathId: 'mini-dragon-show',
    lineage: 'mini',
    label: 'Cinder and Sorrel',
    starters: [
      { dragonId: 'mini-cinder', sex: 'female', label: 'Cinder' },
      { dragonId: 'mini-sorrel', sex: 'male', label: 'Sorrel' },
    ],
  },
];

export const DRAGON_LESSONS: readonly DragonLessonDefinition[] = [
  lesson(
    'arena-meet-pair',
    'dragon-arena',
    'Meet your breeding pair',
    'Two foundation dragons have been placed in your care. Begin by recording what can be observed.',
    'Distinguish visible traits from claims about inherited information.',
    ['GEN-1'],
    visit(
      'trait-evidence',
      '/dragon-genetics/trait-evidence',
      'Trait Evidence',
      'classic',
      'Compare a reference litter from your two starters and save an evidence-backed claim.',
    ),
    [
      metric(
        'arena-starters',
        'roster.starter-dragons',
        2,
        'Receive one female and one male starter',
      ),
      metric('arena-trait-claim', 'trait.claims', 1, 'Save a trait-evidence claim'),
    ],
  ),
  lesson(
    'arena-map-genome',
    'dragon-arena',
    'Map the inherited instructions',
    'The pair looks different because their chromosomes carry different instructions.',
    'Connect genes, chromosomes, and inherited traits.',
    ['GEN-2'],
    visit(
      'genome-microscope',
      '/dragon-genetics/genome-microscope',
      'Genome Microscope',
      'classic',
      'Use either starter as the specimen while you map genes to chromosomes.',
    ),
    [
      activity(
        'arena-map-genome-complete',
        'genome-microscope',
        'Complete a genome map investigation',
      ),
    ],
  ),
  lesson(
    'arena-test-alleles',
    'dragon-arena',
    'Test allele combinations',
    'Before breeding, investigate which allele combinations change the visible dragon.',
    'Use repeatable tests to connect allele pairs to phenotype.',
    ['GEN-3'],
    visit(
      'allele-workbench',
      '/dragon-genetics/allele-workbench',
      'Allele Workbench',
      'classic',
      'Run several comparisons and save them to the genetics notebook.',
    ),
    [metric('arena-allele-tests', 'notebook.experiments', 2, 'Save allele experiments', true)],
  ),
  lesson(
    'arena-predict-cross',
    'dragon-arena',
    'Predict the first cross',
    'Use the evidence from the pair to predict which offspring are possible.',
    'Build and interpret an inheritance prediction.',
    ['GEN-4'],
    visit(
      'punnett-composer',
      '/dragon-genetics/punnett-composer',
      'Punnett Composer',
      'classic',
      'Build a prediction using alleles carried by your breeding line.',
    ),
    [activity('arena-punnett-complete', 'punnett-composer', 'Complete an inheritance prediction')],
  ),
  lesson(
    'arena-breed-generation-one',
    'dragon-arena',
    'Breed generation one',
    'It is time to test the prediction by forming the first clutch.',
    'Follow meiosis and fertilization from two parents to an offspring.',
    ['GEN-4'],
    visit(
      'dragon-hatchery',
      '/dragon-genetics/dragon-hatchery',
      'Dragon Hatchery',
      'classic',
      'Your starter pair is staged for breeding; generate the first offspring.',
    ),
    [
      metric(
        'arena-first-offspring',
        'hatchery.fertilizations',
        1,
        'Breed a first-generation dragon',
        true,
      ),
    ],
  ),
  lesson(
    'arena-study-offspring',
    'dragon-arena',
    'Study variation in the clutch',
    'Compare predicted ratios with the traits that actually appeared.',
    'Explain why siblings from the same parents can differ.',
    ['GEN-4'],
    visit(
      'incubator-sampler',
      '/dragon-genetics/incubator-sampler',
      'Incubator Sampler',
      'classic',
      'Compare a larger sample before deciding which line to continue.',
    ),
    [
      activity(
        'arena-incubator-complete',
        'incubator-sampler',
        'Complete an offspring sample comparison',
      ),
    ],
  ),
  lesson(
    'arena-refine-line',
    'dragon-arena',
    'Build your contender line',
    'Return to the Hatchery and breed enough dragons to make an evidence-based selection.',
    'Select parents and offspring using inherited evidence instead of appearance alone.',
    ['GEN-4', 'GEN-8'],
    visit(
      'dragon-hatchery',
      '/dragon-genetics/dragon-hatchery',
      'Dragon Hatchery',
      'classic',
      'Breed more candidates or continue the line through a new generation.',
    ),
    [metric('arena-roster-size', 'roster.bred-dragons', 3, 'Build a roster of bred dragons', true)],
  ),
  lesson(
    'arena-capstone',
    'dragon-arena',
    'Enter the Dragon Arena',
    'Choose one dragon from the line and test how its inherited traits perform.',
    'Defend a champion choice with breeding and trial evidence.',
    ['GEN-8'],
    visit(
      'dragon-arena',
      '/dragon-genetics/dragon-arena',
      'Dragon Arena',
      'classic',
      'Select a bred dragon, run a trial, and compare the result with your prediction.',
    ),
    [metric('arena-trial', 'arena.trials', 1, 'Complete an arena trial', true)],
  ),
  lesson(
    'show-meet-pair',
    'mini-dragon-show',
    'Meet your mini-dragon pair',
    'The Royal Mini Dragon Society has entrusted you with one female and one male founder.',
    'Observe how inherited mini-dragon forms combine into a whole animal.',
    ['GEN-1'],
    visit(
      'companion-show',
      '/dragon-genetics/companion-show',
      'Mini Dragon Kennel',
      'mini',
      'Meet the staged founders and compare their visible forms.',
    ),
    [
      metric(
        'show-starters',
        'companion.standard-targets',
        1,
        'Record one visible founder form you observed',
      ),
    ],
  ),
  lesson(
    'show-write-standard',
    'mini-dragon-show',
    'Write a breed standard',
    'Choose the visible forms that will define the line you are trying to build.',
    'Describe a breeding goal using observable phenotype rather than genotype.',
    ['GEN-1', 'GEN-3'],
    visit(
      'companion-show',
      '/dragon-genetics/companion-show',
      'Mini Dragon Kennel',
      'mini',
      'Use the standard desk to choose the forms your new breed should show.',
    ),
    [
      metric(
        'show-standard-targets',
        'companion.standard-targets',
        2,
        'Set visible breed-standard targets',
        true,
      ),
    ],
  ),
  lesson(
    'show-plan-cross',
    'mini-dragon-show',
    'Plan the first cross',
    'Compare the founders and choose the pairing most likely to move toward the standard.',
    'Use parent evidence to make a testable inheritance prediction.',
    ['GEN-4'],
    visit(
      'companion-show',
      '/dragon-genetics/companion-show',
      'Mini Dragon Kennel',
      'mini',
      'Stage both assigned founders and inspect the predicted forms.',
    ),
    [
      metric(
        'show-selected-pair',
        'companion.selected-parents',
        2,
        'Stage two parents for breeding',
      ),
    ],
  ),
  lesson(
    'show-breed-generation-one',
    'mini-dragon-show',
    'Breed generation one',
    'Whelp the first litter and compare every pup with the written standard.',
    'Compare expected inheritance with variation in a real litter.',
    ['GEN-4'],
    visit(
      'companion-show',
      '/dragon-genetics/companion-show',
      'Mini Dragon Kennel',
      'mini',
      'Breed the first litter and inspect both matching and off-standard pups.',
    ),
    [metric('show-first-litter', 'companion.litters', 1, 'Breed a first litter', true)],
  ),
  lesson(
    'show-read-pedigree',
    'mini-dragon-show',
    'Read the emerging pedigree',
    'Keep promising pups and use their family relationships as evidence.',
    'Trace inherited forms through a student-built pedigree.',
    ['GEN-5'],
    visit(
      'mini-dragon-pedigree',
      '/dragon-genetics/mini-dragon-pedigree',
      'Mini Dragon Pedigree Lab',
      'mini',
      'Keep candidates and compare their parents, siblings, and hidden forms.',
    ),
    [
      metric(
        'show-pedigree-candidate',
        'companion.pedigree-candidates',
        1,
        'Flag a candidate using pedigree evidence',
        true,
      ),
    ],
  ),
  lesson(
    'show-refine-line',
    'mini-dragon-show',
    'Refine and train the line',
    'Breed another generation, then train a candidate without confusing learned skill with inheritance.',
    'Separate inherited characteristics from trained performance.',
    ['GEN-4', 'GEN-8'],
    visit(
      'mini-dragon-training',
      '/dragon-genetics/mini-dragon-training',
      'Mini Dragon Training Ground',
      'mini',
      'Practice several learned show skills, then breed another litter back in the kennel.',
    ),
    [
      metric('show-second-litter', 'companion.litters', 2, 'Breed multiple litters', true),
      metric('show-training', 'companion.training-sessions', 4, 'Record training sessions', true),
    ],
  ),
  lesson(
    'show-capstone',
    'mini-dragon-show',
    'Enter the Mini Dragon Show',
    'Select a champion, run the show card, and register the breed with cited evidence.',
    'Defend a breed claim using phenotype, pedigree, consistency, and performance evidence.',
    ['GEN-5', 'GEN-8'],
    visit(
      'mini-dragon-arena',
      '/dragon-genetics/mini-dragon-arena',
      'Mini Dragon Show Arena',
      'mini',
      'Run a judged show and submit the completed breed to the registry.',
    ),
    [
      metric('show-run', 'companion.show-runs', 1, 'Complete a judged show run', true),
      metric(
        'show-registry',
        'companion.registry-entries',
        1,
        'Submit a breed registry entry',
        true,
      ),
    ],
  ),
];

export const DRAGON_JOURNEY_PATHS: readonly DragonLearningPathDefinition[] = [
  {
    id: 'dragon-arena',
    title: 'Dragon Arena Breeder',
    shortTitle: 'Arena',
    description: 'Study a classic breeding pair, build a contender line, and test a champion.',
    lineage: 'classic',
    starterPairPresetId: 'classic-ember-tide',
    lessonIds: DRAGON_LESSONS.filter((lesson) => lesson.pathId === 'dragon-arena').map(
      (lesson) => lesson.id,
    ),
    capstoneLessonId: 'arena-capstone',
    capstoneActivityId: 'dragon-arena',
    sideQuestActivityIds: OPEN_SIDE_QUESTS,
    freePlayActivityIds: [
      'trait-evidence',
      'allele-workbench',
      'punnett-composer',
      'dragon-hatchery',
      'dragon-arena',
    ],
  },
  {
    id: 'mini-dragon-show',
    title: 'Mini Dragon Breed Founder',
    shortTitle: 'Show',
    description:
      'Create a mini-dragon breed, trace its pedigree, train a champion, and enter the show.',
    lineage: 'mini',
    starterPairPresetId: 'mini-biscuit-pepper',
    lessonIds: DRAGON_LESSONS.filter((lesson) => lesson.pathId === 'mini-dragon-show').map(
      (lesson) => lesson.id,
    ),
    capstoneLessonId: 'show-capstone',
    capstoneActivityId: 'companion-show',
    sideQuestActivityIds: OPEN_SIDE_QUESTS,
    freePlayActivityIds: ['companion-show'],
  },
];

export const DEFAULT_DRAGON_CLASS_JOURNEY_PLAN: DragonClassJourneyPlan = {
  schemaVersion: 1,
  selectionMode: 'student-choice',
  offeredPathIds: ['dragon-arena', 'mini-dragon-show'],
  defaultPathId: 'dragon-arena',
  pathSettings: Object.fromEntries(
    DRAGON_JOURNEY_PATHS.map((path) => [
      path.id,
      {
        lessonIds: [...path.lessonIds],
        requiredLessonIds: [...path.lessonIds],
        starterPairPresetId: path.starterPairPresetId,
        requirementOverrides: {},
      },
    ]),
  ) as unknown as DragonClassJourneyPlan['pathSettings'],
  sideQuestActivityIds: [...OPEN_SIDE_QUESTS],
};

export function dragonJourneyPath(
  id: string | null | undefined,
): DragonLearningPathDefinition | null {
  return DRAGON_JOURNEY_PATHS.find((path) => path.id === id) ?? null;
}

export function dragonJourneyLesson(id: string | null | undefined): DragonLessonDefinition | null {
  return DRAGON_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export function starterPairPreset(id: string | null | undefined): DragonStarterPairPreset | null {
  return DRAGON_STARTER_PAIR_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function normalizeDragonClassJourneyPlan(value: unknown): DragonClassJourneyPlan {
  if (!isRecord(value) || value['schemaVersion'] !== 1) return cloneDefaultPlan();
  const offered = stringList(value['offeredPathIds']).filter(isPathId);
  const offeredPathIds = offered.length
    ? unique(offered)
    : [...DEFAULT_DRAGON_CLASS_JOURNEY_PLAN.offeredPathIds];
  const rawSettings = isRecord(value['pathSettings']) ? value['pathSettings'] : {};
  const pathSettings = Object.fromEntries(
    DRAGON_JOURNEY_PATHS.map((path) => {
      const fallback = DEFAULT_DRAGON_CLASS_JOURNEY_PLAN.pathSettings[path.id];
      const hasRawSetting = isRecord(rawSettings[path.id]);
      const raw = hasRawSetting ? (rawSettings[path.id] as Record<string, unknown>) : {};
      const configuredLessons = stringList(raw['lessonIds']).filter((id): id is DragonLessonId =>
        path.lessonIds.includes(id as DragonLessonId),
      );
      const lessonIds = hasRawSetting ? unique(configuredLessons) : [...fallback.lessonIds];
      if (!lessonIds.includes(path.capstoneLessonId)) lessonIds.push(path.capstoneLessonId);
      const requiredLessonIds = hasRawSetting
        ? unique(stringList(raw['requiredLessonIds'])).filter((id): id is DragonLessonId =>
            lessonIds.includes(id as DragonLessonId),
          )
        : [...fallback.requiredLessonIds];
      const preset = starterPairPreset(String(raw['starterPairPresetId'] ?? ''));
      const overrides = normalizeRequirementOverrides(path.id, raw['requirementOverrides']);
      return [
        path.id,
        {
          lessonIds: lessonIds.length ? lessonIds : [...fallback.lessonIds],
          requiredLessonIds,
          starterPairPresetId:
            preset?.pathId === path.id ? preset.id : fallback.starterPairPresetId,
          requirementOverrides: overrides,
        },
      ];
    }),
  ) as unknown as DragonClassJourneyPlan['pathSettings'];
  const defaultPath = dragonJourneyPath(String(value['defaultPathId'] ?? ''));
  const defaultPathId =
    defaultPath && offeredPathIds.includes(defaultPath.id) ? defaultPath.id : offeredPathIds[0];
  return {
    schemaVersion: 1,
    selectionMode:
      value['selectionMode'] === 'teacher-assigned' ? 'teacher-assigned' : 'student-choice',
    offeredPathIds,
    defaultPathId,
    pathSettings,
    sideQuestActivityIds: unique(stringList(value['sideQuestActivityIds'])).filter((id) =>
      OPEN_SIDE_QUESTS.includes(id as (typeof OPEN_SIDE_QUESTS)[number]),
    ),
  };
}

export function assertValidDragonJourneyRegistry(): void {
  const lessonIds = new Set<DragonLessonId>();
  for (const lesson of DRAGON_LESSONS) {
    if (lessonIds.has(lesson.id)) throw new Error(`Duplicate Dragon lesson ${lesson.id}.`);
    lessonIds.add(lesson.id);
    if (!lesson.workstationVisits.length)
      throw new Error(`Dragon lesson ${lesson.id} has no workstation.`);
    if (
      lesson.workstationVisits.some(
        (visit) => visit.supportsLineage !== dragonJourneyPath(lesson.pathId)?.lineage,
      )
    ) {
      throw new Error(`Dragon lesson ${lesson.id} uses an incompatible lineage.`);
    }
  }
  for (const path of DRAGON_JOURNEY_PATHS) {
    if (!path.lessonIds.length || path.lessonIds.at(-1) !== path.capstoneLessonId) {
      throw new Error(`Dragon path ${path.id} must end in its capstone lesson.`);
    }
    const preset = starterPairPreset(path.starterPairPresetId);
    if (!preset || preset.pathId !== path.id || preset.lineage !== path.lineage) {
      throw new Error(`Dragon path ${path.id} has an invalid starter pair.`);
    }
    for (const lessonId of path.lessonIds) {
      const lessonDefinition = dragonJourneyLesson(lessonId);
      if (!lessonDefinition || lessonDefinition.pathId !== path.id) {
        throw new Error(`Dragon path ${path.id} references invalid lesson ${lessonId}.`);
      }
    }
  }
}

assertValidDragonJourneyRegistry();

function lesson(
  id: DragonLessonId,
  pathId: DragonLearningPathId,
  title: string,
  story: string,
  learningGoal: string,
  masterySkillIds: DragonLessonDefinition['masterySkillIds'],
  workstationVisit: DragonLessonDefinition['workstationVisits'][number],
  requirements: DragonLessonDefinition['requirements'],
): DragonLessonDefinition {
  return {
    id,
    pathId,
    title,
    story,
    learningGoal,
    masterySkillIds,
    workstationVisits: [workstationVisit],
    requirements,
  };
}

function visit(
  activityId: string,
  route: string,
  title: string,
  supportsLineage: 'classic' | 'mini',
  launchHint: string,
): DragonLessonDefinition['workstationVisits'][number] {
  return { activityId, route, title, supportsLineage, launchHint };
}

function metric(
  id: string,
  metricId: Extract<DragonLessonDefinition['requirements'][number], { kind: 'metric' }>['metric'],
  minimum: number,
  label: string,
  teacherAdjustable = false,
): DragonLessonDefinition['requirements'][number] {
  return { id, kind: 'metric', metric: metricId, minimum, label, teacherAdjustable };
}

function activity(
  id: string,
  activityId: string,
  label: string,
): DragonLessonDefinition['requirements'][number] {
  return { id, kind: 'activity-complete', activityId, label };
}

function normalizeRequirementOverrides(
  pathId: DragonLearningPathId,
  value: unknown,
): Record<string, { minimum?: number }> {
  if (!isRecord(value)) return {};
  const requirementIds = new Set(
    DRAGON_LESSONS.filter((lesson) => lesson.pathId === pathId)
      .flatMap((lesson) => lesson.requirements)
      .filter((requirement) => requirement.kind === 'metric' && requirement.teacherAdjustable)
      .map((requirement) => requirement.id),
  );
  return Object.fromEntries(
    Object.entries(value).flatMap(([id, override]) => {
      if (!requirementIds.has(id) || !isRecord(override)) return [];
      const minimum = Number(override['minimum']);
      return Number.isInteger(minimum) && minimum >= 1 && minimum <= 100 ? [[id, { minimum }]] : [];
    }),
  );
}

function cloneDefaultPlan(): DragonClassJourneyPlan {
  return normalizeDragonClassJourneyPlan({
    ...DEFAULT_DRAGON_CLASS_JOURNEY_PLAN,
    pathSettings: Object.fromEntries(
      Object.entries(DEFAULT_DRAGON_CLASS_JOURNEY_PLAN.pathSettings).map(([id, setting]) => [
        id,
        {
          ...setting,
          lessonIds: [...setting.lessonIds],
          requiredLessonIds: [...setting.requiredLessonIds],
          requirementOverrides: {},
        },
      ]),
    ),
  });
}

function isPathId(value: string): value is DragonLearningPathId {
  return DRAGON_JOURNEY_PATHS.some((path) => path.id === value);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
