/**
 * Runtime status: ACTIVE — canonical route registry for the student and teacher applications.
 * Inputs/signals: Angular navigation URLs, path/lesson/branch parameters, and teacher guard results.
 * Data access: lazy imports route containers; generated microscope metadata supplies level routes.
 * Connects to: public lesson pages, cases, open workstations, capstones, and guarded teacher tools.
 */
import { Routes } from '@angular/router';
import { teacherAccessGuard } from './core/firebase/teacher-access.guard';
import { MICROSCOPE_LEVEL_ROUTES } from './features/dragon-genetics/workstations/genome-microscope/microscope-level.routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dragon-genetics',
  },
  {
    path: 'dragon-genetics',
    loadComponent: () =>
      import('./features/dragon-genetics/lesson-plan/dragon-paths.page').then(
        (m) => m.DragonPathsPage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId',
    loadComponent: () =>
      import('./features/dragon-genetics/lesson-plan/dragon-paths.page').then(
        (m) => m.DragonPathsPage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/pedigree-reading/adventure/:chapterId',
    data: { lessonId: 'pedigree-reading' },
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/pedigree-reading',
    data: { lessonId: 'pedigree-reading' },
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/pedigree-models/adventure/:chapterId',
    data: { lessonId: 'pedigree-models' },
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/pedigree-models',
    data: { lessonId: 'pedigree-models' },
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/:lessonId',
    loadComponent: () =>
      import('./features/dragon-genetics/lesson-plan/dragon-shared-lesson.page').then(
        (m) => m.DragonSharedLessonPage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/:lessonId/branch/:branch/adventure/:chapterId',
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/path/:pathId/lesson/:lessonId/branch/:branch',
    loadComponent: () =>
      import('./features/dragon-genetics/adventures/dragon-adventure.page').then(
        (m) => m.DragonAdventurePage,
      ),
  },
  {
    path: 'dragon-genetics/explore',
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-genetics.page').then(
        (m) => m.DragonGeneticsPage,
      ),
  },
  {
    path: 'dragon-genetics/allele-workbench-reference',
    pathMatch: 'full',
    redirectTo: 'dragon-genetics/allele-workbench',
  },
  {
    path: 'dragon-genetics/allele-workbench',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/allele-workbench/allele-workbench.page').then(
        (m) => m.AlleleWorkbenchPage,
      ),
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
    path: 'dragon-genetics/mystery-pair',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/mystery-pair/mystery-pair.page').then(
        (m) => m.MysteryPairPage,
      ),
  },
  {
    path: 'dragon-genetics/breeding-incubator',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/incubator-sampler/breeding-incubator.page').then(
        (m) => m.BreedingIncubatorPage,
      ),
  },
  {
    path: 'dragon-genetics/cell-gene-microscope',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/genome-microscope/cell-gene-microscope.page').then(
        (m) => m.CellGeneMicroscopePage,
      ),
  },
  {
    path: 'dragon-genetics/meiosis-hatchery',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/dragon-hatchery/meiosis-hatchery.page').then(
        (m) => m.MeiosisHatcheryPage,
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
    path: 'dragon-genetics/punnett-composer',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/punnett-composer/punnett-composer.page').then(
        (m) => m.PunnettComposerPage,
      ),
  },
  {
    path: 'dragon-genetics/genome-microscope',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/genome-microscope/genome-microscope.page').then(
        (m) => m.GenomeMicroscopePage,
      ),
  },
  ...MICROSCOPE_LEVEL_ROUTES.map(({ level, path }) => ({
    path,
    data: { microscopeLevel: level },
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/genome-microscope/microscope-level.page').then(
        (m) => m.MicroscopeLevelPage,
      ),
  })),
  {
    path: 'dragon-genetics/incubator-sampler',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/incubator-sampler/incubator-sampler.page').then(
        (m) => m.IncubatorSamplerPage,
      ),
  },
  {
    path: 'dragon-genetics/dna-process-lab',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/dna-process-lab/dna-process-lab.page').then(
        (m) => m.DnaProcessLabPage,
      ),
  },
  {
    path: 'dragon-genetics/dragon-hatchery',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery.page').then(
        (m) => m.DragonHatcheryPage,
      ),
  },
  {
    path: 'dragon-genetics/diversity-manager',
    loadComponent: () =>
      import('./features/dragon-genetics/workstations/island-diversity/island-diversity-manager.page').then(
        (m) => m.IslandDiversityManagerPage,
      ),
  },
  {
    path: 'teacher',
    canMatch: [teacherAccessGuard],
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-teacher.page').then((m) => m.DragonTeacherPage),
  },
  {
    path: 'teacher/lesson-plan',
    canMatch: [teacherAccessGuard],
    loadComponent: () =>
      import('./features/dragon-genetics/lesson-plan/dragon-lesson-plan-editor.page').then(
        (m) => m.DragonLessonPlanEditorPage,
      ),
  },
  {
    path: 'teacher/dragon-test-bench',
    canMatch: [teacherAccessGuard],
    loadComponent: () =>
      import('./features/dragon-genetics/dragon-test-bench.page').then(
        (m) => m.DragonTestBenchPage,
      ),
  },
  {
    path: 'teacher/dragon-genetics',
    pathMatch: 'full',
    redirectTo: 'teacher',
  },
  {
    path: 'catalog',
    pathMatch: 'full',
    redirectTo: 'dragon-genetics',
  },
  {
    path: 'project/:projectId',
    redirectTo: 'dragon-genetics',
  },
  {
    path: 'project/:projectId/activity/:activityId',
    redirectTo: 'dragon-genetics',
  },
  {
    path: '**',
    redirectTo: 'dragon-genetics',
  },
];
