import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalog'
  },
  {
    path: 'catalog',
    loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPage)
  },
  {
    path: 'project/:projectId',
    loadComponent: () => import('./features/project/project.page').then((m) => m.ProjectPage)
  },
  {
    path: 'project/:projectId/activity/:activityId',
    loadComponent: () =>
      import('./features/activity-player/activity-player.page').then((m) => m.ActivityPlayerPage)
  },
  {
    path: 'dragon-genetics',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-genetics.page').then((m) => m.DragonGeneticsPage)
  },
  {
    path: 'dragon-genetics/:simulationId',
    loadComponent: () =>
      import('./features/dragon-genetics/adaptive/dragon-simulation-experience.page')
        .then((m) => m.DragonSimulationExperiencePage)
  },
  {
    path: 'dragon-duel',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-duel.page').then((m) => m.DragonDuelPage)
  },
  {
    path: 'dragon-garage',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-garage.page').then((m) => m.DragonGaragePage)
  },
  {
    path: 'teacher',
    loadComponent: () => import('./features/teacher/teacher.page').then((m) => m.TeacherPage)
  },
  {
    path: 'teacher/dragon-genetics',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-teacher.page').then((m) => m.DragonTeacherPage)
  },
  {
    path: '**',
    redirectTo: 'catalog'
  }
];
