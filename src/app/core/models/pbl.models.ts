export type ProjectStatus = 'draft' | 'published' | 'archived';
export type ProjectAccent = 'coral' | 'teal' | 'gold';
export type ActivityType = 'choice' | 'matching' | 'reflection';

export interface PblProject {
  id: string;
  title: string;
  summary: string;
  essentialQuestion: string;
  status: ProjectStatus;
  ownerId: string;
  subject: string[];
  gradeBand: string;
  durationMinutes: number;
  durationLabel?: string;
  activityCount: number;
  accent: ProjectAccent;
  experienceType?: 'standard' | 'dragon-genetics';
  updatedAt?: unknown;
}

interface BaseActivity {
  id: string;
  order: number;
  type: ActivityType;
  title: string;
  prompt: string;
}

export interface ChoiceActivity extends BaseActivity {
  type: 'choice';
  options: { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
}

export interface MatchingActivity extends BaseActivity {
  type: 'matching';
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
  correctMatches: Record<string, string>;
}

export interface ReflectionActivity extends BaseActivity {
  type: 'reflection';
  minWords: number;
}

export type PblActivity = ChoiceActivity | MatchingActivity | ReflectionActivity;

export type ActivityResponse =
  | { selectedOptionId: string; correct: boolean }
  | { matches: Record<string, string>; correctCount: number; total: number }
  | { reflection: string; wordCount: number };
