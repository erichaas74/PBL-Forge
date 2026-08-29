/**
 * Runtime status: ACTIVE-HYBRID — retained selectable capstone definitions used by /explore.
 * Inputs/signals: static path metadata; selection state lives in DragonProjectHubFacade.
 * Data access: no persistence; references project-hub activity IDs.
 * Connects to: Arena/Hatchery, Companion Show, capstone selection, and teacher summaries.
 */
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
];
