export type DragonPathContextId = 'arena' | 'mini-show';

export interface DragonLessonPlanQuestion {
  id: string;
  prompt: string;
  kind: 'multiple-choice' | 'written-response';
  options?: readonly string[];
}

export interface DragonLessonPlanWorkstation {
  id: string;
  title: string;
  route: string;
  guide: string;
  required: boolean;
}

export interface DragonSharedLesson {
  id: string;
  title: string;
  learningGoal: string;
  guide: string;
  published: boolean;
  questions: readonly DragonLessonPlanQuestion[];
  workstations: readonly DragonLessonPlanWorkstation[];
}

export interface DragonPathContext {
  id: DragonPathContextId;
  title: string;
  shortTitle: string;
  goal: string;
  specimenKind: 'full-size-dragons' | 'mini-dragons';
}

/**
 * The teacher-owned curriculum document. Lessons exist once and both story paths read the same
 * ordered list. Path contexts may change the specimens and final purpose, never the science or
 * questions.
 */
export interface DragonLessonPlanDocument {
  schemaVersion: 6;
  revision: number;
  title: string;
  updatedAtIso: string;
  paths: Readonly<Record<DragonPathContextId, DragonPathContext>>;
  lessons: readonly DragonSharedLesson[];
}

export const DEFAULT_DRAGON_LESSON_PLAN: DragonLessonPlanDocument = {
  schemaVersion: 6,
  revision: 1,
  title: 'Dragon Genetics',
  updatedAtIso: '2026-08-22T00:00:00.000Z',
  paths: {
    arena: {
      id: 'arena',
      title: 'Dragon Arena',
      shortTitle: 'Arena',
      goal: 'Breed a strong fighting dragon using evidence from genetics.',
      specimenKind: 'full-size-dragons',
    },
    'mini-show': {
      id: 'mini-show',
      title: 'Mini Dragon Show',
      shortTitle: 'Show',
      goal: 'Breed a cute, well-trained show dragon using evidence from genetics.',
      specimenKind: 'mini-dragons',
    },
  },
  lessons: [
    {
      id: 'meet-the-dragons',
      title: 'Meet the Dragons',
      learningGoal:
        'Use observations and records to distinguish inherited characteristics from learned behaviors.',
      guide:
        'Open either mystery card, inspect both dragons, and run any comparison that seems useful. Record the differences you think matter in your Genetics Notebook.',
      published: true,
      workstations: [
        {
          id: 'mystery-pair',
          title: 'Mystery Pair Investigation',
          route: '/dragon-genetics/mystery-pair',
          guide: 'Compare the two dragons in any order and record evidence when you are ready.',
          required: true,
        },
      ],
      questions: [
        {
          id: 'meet-difference',
          prompt: 'What important differences did you observe between the two dragons?',
          kind: 'written-response',
        },
        {
          id: 'meet-genetic',
          prompt: 'Which differences appear genetic, and what evidence supports that conclusion?',
          kind: 'written-response',
        },
        {
          id: 'meet-learned',
          prompt: 'Which differences appear learned, and what evidence supports that conclusion?',
          kind: 'written-response',
        },
        {
          id: 'meet-inheritance',
          prompt: 'Which characteristics could offspring inherit, and which would require training?',
          kind: 'written-response',
        },
      ],
    },
    {
      id: 'breeding-and-offspring',
      title: 'Breeding Dragons',
      learningGoal:
        'Use offspring counts to investigate how visible traits pass from parents to offspring.',
      guide:
        'Choose example parents, select one visible trait, and hatch any sample size. Compare the number of offspring in each phenotype bucket and repeat with another pairing or sample size.',
      published: true,
      workstations: [
        {
          id: 'breeding-incubator',
          title: 'Breeding Incubator',
          route: '/dragon-genetics/breeding-incubator',
          guide:
            'Breed example dragons and use the counted offspring buckets as evidence. You may repeat or change the investigation in any order.',
          required: true,
        },
      ],
      questions: [
        {
          id: 'breeding-parent-offspring',
          prompt: 'How were the offspring similar to and different from their parents?',
          kind: 'written-response',
        },
        {
          id: 'breeding-buckets',
          prompt: 'How many offspring appeared in each visible-trait bucket?',
          kind: 'written-response',
        },
        {
          id: 'breeding-sample',
          prompt: 'What changed when you repeated the cross or used a different sample size?',
          kind: 'written-response',
        },
        {
          id: 'breeding-claim',
          prompt: 'What do the bucket counts suggest about how this trait passes to offspring?',
          kind: 'written-response',
        },
      ],
    },
    {
      id: 'where-genes-live',
      title: 'Where Do Genes Live?',
      learningGoal:
        'Locate genes inside chromosomes and connect chromosomes to the nucleus and cell.',
      guide:
        'Load an example dragon and explore the microscope at your own pace. Compare the cell, nucleus, chromosome set, one chromosome, and one gene. Use the scale map or zoom controls in any order.',
      published: true,
      workstations: [
        {
          id: 'cell-gene-microscope',
          title: 'Cell-to-Gene Microscope',
          route: '/dragon-genetics/cell-gene-microscope',
          guide:
            'Follow one dragon sample from the whole organism into a cell, its nucleus, a chromosome, and a gene locus. Select different chromosomes and genes to compare their locations.',
          required: true,
        },
      ],
      questions: [
        {
          id: 'gene-location-order',
          prompt: 'Describe the path from a dragon body cell to one gene in the correct nested order.',
          kind: 'written-response',
        },
        {
          id: 'gene-chromosome-evidence',
          prompt: 'Which chromosome and gene locus did you inspect, and what showed that the gene was located there?',
          kind: 'written-response',
        },
        {
          id: 'gene-location-compare',
          prompt: 'What changed when you selected a different chromosome or gene?',
          kind: 'written-response',
        },
        {
          id: 'gene-location-claim',
          prompt: 'How does the microscope evidence explain where inherited information is stored in a dragon?',
          kind: 'written-response',
        },
      ],
    },
    {
      id: 'alleles-and-phenotypes',
      title: 'Allele Experiments',
      learningGoal:
        'Use complete allele-pair evidence to determine which phenotype is expressed by dominant and recessive alleles.',
      guide:
        'Choose a gene and test any allele pair. Observe the dragon phenotype and compare it with the chart. Test all three unique pairings to reveal the complete outcome pattern, then try another gene if useful.',
      published: true,
      workstations: [
        {
          id: 'allele-workbench',
          title: 'Allele Workbench',
          route: '/dragon-genetics/allele-workbench',
          guide:
            'Combine two allele copies, express the phenotype, and build a three-row evidence chart for homozygous dominant, heterozygous, and homozygous recessive outcomes.',
          required: true,
        },
      ],
      questions: [
        {
          id: 'allele-chart-pattern',
          prompt: 'What phenotype appeared for each of the three allele combinations in your completed chart?',
          kind: 'written-response',
        },
        {
          id: 'allele-dominant-evidence',
          prompt: 'Which allele appears dominant, and which chart evidence supports your answer?',
          kind: 'written-response',
        },
        {
          id: 'allele-recessive-evidence',
          prompt: 'When was the recessive phenotype expressed?',
          kind: 'written-response',
        },
        {
          id: 'allele-phenotype-claim',
          prompt: 'How does an allele pair determine the visible phenotype in this model?',
          kind: 'written-response',
        },
      ],
    },
    {
      id: 'meiosis-and-dragon-eggs',
      title: 'Meiosis and Dragon Eggs',
      learningGoal:
        'Use meiosis, crossing over, and selected gametes to explain how one offspring receives a new chromosome combination.',
      guide:
        'Choose one of two female starters and one of two male starters. Explore meiosis in either parent, slow down crossing over if useful, and inspect the four resulting cells. Choose one egg cell and one sperm cell to form a dragon egg.',
      published: true,
      workstations: [
        {
          id: 'meiosis-hatchery',
          title: 'Meiosis Hatchery',
          route: '/dragon-genetics/meiosis-hatchery',
          guide:
            'Compare parent chromosomes, watch homologs exchange segments, choose gametes, and inspect the paired chromosomes inside the fertilized egg before opening it.',
          required: true,
        },
      ],
      questions: [
        {
          id: 'meiosis-stages',
          prompt: 'What happened to the chromosomes as the parent cell moved through meiosis?',
          kind: 'written-response',
        },
        {
          id: 'meiosis-crossing-over',
          prompt: 'What did crossing over change in the chromosome or gene combinations?',
          kind: 'written-response',
        },
        {
          id: 'meiosis-gamete-choice',
          prompt: 'Which egg cell and sperm cell did you combine, and what alleles did each contribute?',
          kind: 'written-response',
        },
        {
          id: 'meiosis-offspring',
          prompt: 'How did meiosis and your gamete choices help create a genetically different offspring?',
          kind: 'written-response',
        },
      ],
    },
  ],
};

export function isDragonPathContextId(value: string | null): value is DragonPathContextId {
  return value === 'arena' || value === 'mini-show';
}

export function normalizeDragonLessonPlan(value: unknown): DragonLessonPlanDocument {
  if (!isRecord(value) || value['schemaVersion'] !== 6) return structuredClone(DEFAULT_DRAGON_LESSON_PLAN);
  const paths = isRecord(value['paths']) ? value['paths'] : {};
  const lessons = Array.isArray(value['lessons'])
    ? value['lessons'].flatMap((item, index) => normalizeLesson(item, index))
    : [];
  return {
    schemaVersion: 6,
    revision: positiveInteger(value['revision'], 1),
    title: text(value['title'], DEFAULT_DRAGON_LESSON_PLAN.title),
    updatedAtIso: text(value['updatedAtIso'], DEFAULT_DRAGON_LESSON_PLAN.updatedAtIso),
    paths: {
      arena: normalizePath(paths['arena'], DEFAULT_DRAGON_LESSON_PLAN.paths.arena),
      'mini-show': normalizePath(paths['mini-show'], DEFAULT_DRAGON_LESSON_PLAN.paths['mini-show']),
    },
    lessons: uniqueById(lessons),
  };
}

function normalizePath(value: unknown, fallback: DragonPathContext): DragonPathContext {
  if (!isRecord(value)) return { ...fallback };
  return {
    ...fallback,
    title: text(value['title'], fallback.title),
    shortTitle: text(value['shortTitle'], fallback.shortTitle),
    goal: text(value['goal'], fallback.goal),
  };
}

function normalizeLesson(value: unknown, index: number): DragonSharedLesson[] {
  if (!isRecord(value)) return [];
  const id = slug(text(value['id'], `lesson-${index + 1}`));
  if (!id) return [];
  return [{
    id,
    title: text(value['title'], `Lesson ${index + 1}`),
    learningGoal: text(value['learningGoal'], ''),
    guide: text(value['guide'], ''),
    published: value['published'] === true,
    questions: Array.isArray(value['questions'])
      ? value['questions'].flatMap(normalizeQuestion)
      : [],
    workstations: Array.isArray(value['workstations'])
      ? value['workstations'].flatMap(normalizeWorkstation)
      : [],
  }];
}

function normalizeQuestion(value: unknown, index: number): DragonLessonPlanQuestion[] {
  if (!isRecord(value)) return [];
  const prompt = text(value['prompt'], '');
  if (!prompt) return [];
  const options = Array.isArray(value['options'])
    ? value['options'].filter((option): option is string => typeof option === 'string')
    : undefined;
  return [{
    id: slug(text(value['id'], `question-${index + 1}`)),
    prompt,
    kind: value['kind'] === 'multiple-choice' ? 'multiple-choice' : 'written-response',
    ...(options?.length ? { options } : {}),
  }];
}

function normalizeWorkstation(value: unknown, index: number): DragonLessonPlanWorkstation[] {
  if (!isRecord(value)) return [];
  const id = slug(text(value['id'], `workstation-${index + 1}`));
  const route = text(value['route'], '');
  if (!route.startsWith('/dragon-genetics/')) return [];
  return [{
    id,
    title: text(value['title'], `Workstation ${index + 1}`),
    route,
    guide: text(value['guide'], ''),
    required: value['required'] !== false,
  }];
}

function uniqueById(lessons: readonly DragonSharedLesson[]): DragonSharedLesson[] {
  const seen = new Set<string>();
  return lessons.filter((lesson) => !seen.has(lesson.id) && Boolean(seen.add(lesson.id)));
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
