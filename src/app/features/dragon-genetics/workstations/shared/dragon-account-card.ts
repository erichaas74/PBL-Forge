import {
  createDragonBenchBuild,
  dragonParentCanvasSource,
} from '../../simulation/domain/dragon-specimen.profile';
import { AccountDragonRecord } from './account-genetics-library.models';
import { DragonFlipCardView } from './dragon-flip-card.component';

export interface DragonAccountPerformance {
  health: number;
  armor: number;
  abilities: readonly string[];
}

export function accountDragonPerformance(dragon: AccountDragonRecord): DragonAccountPerformance {
  const build = createDragonBenchBuild(dragon.id, dragon.genome, {
    label: dragon.name,
    generation: dragon.generation ?? 0,
    identity: { color: dragon.color, accentColor: dragon.accentColor },
  });
  const parts = Object.values(build.combatProfile.parts);
  const abilities = new Set(build.combatProfile.abilityIds);
  if (build.fireBreathing) abilities.add('fire-breath');
  return {
    health: parts.reduce((total, part) => total + part.maxHealth, 0),
    armor: Math.round(
      (parts.reduce((total, part) => total + part.armor, 0) / Math.max(parts.length, 1)) * 100,
    ),
    abilities: [...abilities].map(abilityLabel),
  };
}

export function buildAccountDragonCardView(dragon: AccountDragonRecord): DragonFlipCardView {
  const stats = accountDragonPerformance(dragon);
  return {
    id: dragon.id,
    name: dragon.name,
    title: dragon.title,
    color: dragon.color,
    accentColor: dragon.accentColor,
    source: dragonParentCanvasSource(dragon, dragon.sex),
    seriesLabel: 'Dragon Academy deck',
    catalogNumber: dragon.id.toUpperCase(),
    arenaRating: null,
    battleRole: `${dragon.sex === 'female' ? 'Female' : 'Male'} · ${dragonGeneration(dragon)}`,
    stats: [
      { id: 'health', label: 'Health', value: stats.health },
      { id: 'armor', label: 'Armor', value: stats.armor },
      { id: 'moves', label: 'Moves', value: stats.abilities.length },
    ],
  };
}

export function dragonGeneration(dragon: AccountDragonRecord): string {
  return `Generation ${dragon.generation ?? (dragon.source === 'foundation' ? 0 : 1)}`;
}

function abilityLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');
}
