import { ProjectPathDefinition } from '../../project/domain/project-hub.models';

export type DragonCapstonePathId = 'dragon-arena' | 'mini-dragon-show' | 'island-diversity';

export const DRAGON_CAPSTONE_PATHS: readonly ProjectPathDefinition[] = [
  {
    id: 'dragon-arena' satisfies DragonCapstonePathId,
    title: 'Dragon Arena',
    objective: 'Breed and test a fighting dragon.',
    outcomeLabel: 'Arena trial record',
    order: 1,
    activityIds: ['dragon-hatchery', 'dragon-arena'],
    entryActivityId: 'dragon-hatchery',
    finalActivityId: 'dragon-arena',
  },
  {
    id: 'mini-dragon-show' satisfies DragonCapstonePathId,
    title: 'Mini Dragon Show',
    objective: 'Breed the best-adapted show dragon and support the choice with evidence.',
    outcomeLabel: 'Adaptation and breeding evidence',
    order: 2,
    activityIds: ['companion-show'],
    entryActivityId: 'companion-show',
    finalActivityId: 'companion-show',
  },
  {
    id: 'island-diversity' satisfies DragonCapstonePathId,
    title: 'Island Diversity',
    objective: 'Help island dragon populations survive across generations.',
    outcomeLabel: 'Island population survival rates',
    order: 3,
    activityIds: ['island-diversity'],
    entryActivityId: 'island-diversity',
    finalActivityId: 'island-diversity',
  },
];

