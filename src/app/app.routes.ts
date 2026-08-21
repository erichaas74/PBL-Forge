import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalog',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPage),
  },
  {
    path: 'project/:projectId',
    loadComponent: () => import('./features/project/project.page').then((m) => m.ProjectPage),
  },
  {
    path: 'project/:projectId/activity/:activityId',
    loadComponent: () =>
      import('./features/activity-player/activity-player.page').then((m) => m.ActivityPlayerPage),
  },
  {
    path: 'dragon-genetics',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-genetics.page').then((m) => m.DragonGeneticsPage),
  },
  {
    path: 'dragon-genetics/allele-workbench-reference',
    pathMatch: 'full',
    redirectTo: 'dragon-genetics/allele-workbench',
  },
  {
    path: 'dragon-genetics/pedigree-lab',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/pedigree-lab/dragon-pedigree-lab.page').then(
        (m) => m.DragonPedigreeLabPage,
      ),
  },
  {
    path: 'dragon-genetics/protein-rescue',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/protein-rescue/protein-rescue-lab.page').then(
        (m) => m.ProteinRescueLabPage,
      ),
  },
  {
    path: 'dragon-genetics/blood-type-lab',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/blood-compatibility/blood-compatibility-lab.page').then(
        (m) => m.BloodCompatibilityLabPage,
      ),
  },
  {
    path: 'dragon-genetics/companion-show',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/companion-show/companion-show.page').then(
        (m) => m.CompanionShowPage,
      ),
  },
  {
    path: 'dragon-genetics/mini-dragon-training',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/mini-dragon-training/mini-dragon-training.page').then(
        (m) => m.MiniDragonTrainingPage,
      ),
  },
  {
    path: 'dragon-genetics/mini-dragon-arena',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/mini-dragon-arena/mini-dragon-arena.page').then(
        (m) => m.MiniDragonArenaPage,
      ),
  },
  {
    path: 'dragon-genetics/mini-dragon-pedigree',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/mini-dragon-pedigree/mini-dragon-pedigree.page').then(
        (m) => m.MiniDragonPedigreePage,
      ),
  },
  {
    path: 'dragon-genetics/island-diversity',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/island-diversity/island-diversity-manager.page').then(
        (m) => m.IslandDiversityManagerPage,
      ),
  },
  {
    path: 'dragon-genetics/island-expedition',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/island-expedition/island-expedition.page').then(
        (m) => m.IslandExpeditionPage,
      ),
  },
  {
    path: 'dragon-genetics/viking-breeding',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/viking-breeding/viking-breeding.page').then(
        (m) => m.VikingBreedingPage,
      ),
  },
  {
    path: 'dragon-genetics/dragon-arena',
    loadComponent: () =>
      import('./features/dragon-genetics/capstones/arena/dragon-arena-mission.page').then(
        (m) => m.DragonArenaMissionPage,
      ),
  },
  {
    path: 'dragon-genetics/wise-dragon',
    loadComponent: () =>
      import('./features/dragon-genetics/wise-dragon/wise-dragon.page').then(
        (m) => m.WiseDragonPage,
      ),
  },
  {
    path: 'dragon-genetics/trait-evidence',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/trait-evidence/trait-evidence.page').then(
        (m) => m.TraitEvidencePage,
      ),
  },
  {
    path: 'dragon-genetics/candling-workstation',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/candling-workstation/candling-workstation.page').then(
        (m) => m.CandlingWorkstationPage,
      ),
  },
  {
    path: 'dragon-genetics/journey',
    loadComponent: () =>
      import('./features/dragon-genetics/journey/dragon-journey.page').then(
        (m) => m.DragonJourneyPage,
      ),
  },
  {
    path: 'dragon-genetics/journey/:pathId',
    loadComponent: () =>
      import('./features/dragon-genetics/journey/dragon-journey.page').then(
        (m) => m.DragonJourneyPage,
      ),
  },
  {
    path: 'dragon-genetics/journey/:pathId/lesson/:lessonId',
    loadComponent: () =>
      import('./features/dragon-genetics/journey/dragon-lesson.page').then(
        (m) => m.DragonLessonPage,
      ),
  },
  {
    path: 'dragon-genetics/:simulationId',
    loadComponent: () =>
      import('./features/dragon-genetics/adaptive/dragon-simulation-experience.page').then(
        (m) => m.DragonSimulationExperiencePage,
      ),
  },
  {
    path: 'dragon-test-bench',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-test-bench.page').then(
        (m) => m.DragonTestBenchPage,
      ),
  },
  {
    path: 'dragon-duel',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-duel.page').then((m) => m.DragonDuelPage),
  },
  {
    path: 'teacher',
    loadComponent: () => import('./features/teacher/teacher.page').then((m) => m.TeacherPage),
  },
  {
    path: 'teacher/dragon-genetics',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-teacher.page').then((m) => m.DragonTeacherPage),
  },
  {
    path: '**',
    redirectTo: 'catalog',
  },
];
