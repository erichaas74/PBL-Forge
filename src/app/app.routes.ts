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
