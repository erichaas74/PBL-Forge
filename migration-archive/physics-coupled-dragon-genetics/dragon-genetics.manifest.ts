import { GameManifest } from '../../interfaces/game-plugin.interface';

export const DRAGON_GENETICS_MANIFEST: GameManifest = {
  id: 'dragon-genetics',
  name: 'Dragon Genetics Lab',
  description: 'Investigate heredity, model allele inheritance, analyze offspring variation, and defend a diversity-focused breeding recommendation.',
  icon: 'genetics',
  category: 'biology',
  difficulty: 'beginner',
  loadComponent: () => import('./dragon-genetics-lab.component')
    .then(module => module.DragonGeneticsLabComponent),
  teacherControls: [],
  studentControls: [],
  minPlayers: 1,
  maxPlayers: 4,
  supportsTeams: true,
  hasRealTimePhysics: false,
  hasDiscreteSteps: true,
  supportsReplay: true,
  version: '1.0.0',
  author: 'Royal Dragon Hatchery Science Team',
};
