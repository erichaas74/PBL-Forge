import { Routes } from '@angular/router';

export const designerRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'parts-lab' },
  {
    path: 'parts-lab',
    loadComponent: () => import('./parts-lab/parts-lab.page').then(module => module.PartsLabPage),
  },
  {
    path: 'dragon-garage',
    loadComponent: () => import('./dragon-garage.page').then(module => module.DragonGaragePage),
  },
  {
    path: 'snap-workshop',
    loadComponent: () =>
      import('./snap-workshop/snap-workshop.page').then(module => module.SnapWorkshopPage),
  },
  { path: '**', redirectTo: 'parts-lab' },
];

