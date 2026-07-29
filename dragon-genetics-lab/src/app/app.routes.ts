import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dragon-lab/dragon-genetics-lab.component')
      .then(module => module.DragonGeneticsLabComponent),
    title: 'Dragon Genetics Lab',
  },
  { path: '**', redirectTo: '' },
];
