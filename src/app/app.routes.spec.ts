import { routes } from './app.routes';
import { INSTRUMENT_MANIFESTS } from './features/dragon-genetics/inquiry/instrument.registry';
import { DEFAULT_DRAGON_LESSON_PLAN } from './features/dragon-genetics/lesson-plan/dragon-lesson-plan.models';

describe('Dragon Genetics application routes', () => {
  it('uses Dragon Genetics as the only public application home', () => {
    expect(routes.find((route) => route.path === '')?.redirectTo).toBe('dragon-genetics');
    expect(routes.find((route) => route.path === 'catalog')?.redirectTo).toBe('dragon-genetics');
    expect(routes.find((route) => route.path === '**')?.redirectTo).toBe('dragon-genetics');
  });

  it('keeps student and teacher entry points separate', () => {
    expect(routes.find((route) => route.path === 'dragon-genetics')?.loadComponent).toBeDefined();
    expect(routes.find((route) => route.path === 'teacher')?.loadComponent).toBeDefined();
    expect(routes.find((route) => route.path === 'teacher/lesson-plan')?.loadComponent).toBeDefined();
    expect(
      routes.find((route) => route.path === 'teacher/dragon-test-bench')?.loadComponent,
    ).toBeDefined();
    expect(routes.find((route) => route.path === 'teacher/dragon-genetics')?.redirectTo).toBe(
      'teacher',
    );
  });

  it('uses one shared lesson route for both path contexts', () => {
    expect(routes.find((route) => route.path === 'dragon-genetics/path/:pathId')?.loadComponent).toBeDefined();
    expect(
      routes.find((route) => route.path === 'dragon-genetics/path/:pathId/lesson/:lessonId')
        ?.loadComponent,
    ).toBeDefined();
    expect(
      routes.find((route) => route.path === 'dragon-genetics/explore')?.loadComponent,
    ).toBeDefined();
    expect(
      routes.find(
        (route) =>
          route.path === 'dragon-genetics/path/:pathId/lesson/:lessonId/branch/:branch',
      )?.loadComponent,
    ).toBeDefined();
  });

  it('routes optional adventures and their refresh-safe chapters before shared lesson pages', () => {
    for (const lessonId of ['pedigree-reading', 'pedigree-models']) {
      const basePath = `dragon-genetics/path/:pathId/lesson/${lessonId}`;
      expect(routes.find((route) => route.path === basePath)?.loadComponent).toBeDefined();
      expect(
        routes.find((route) => route.path === `${basePath}/adventure/:chapterId`)?.loadComponent,
      ).toBeDefined();
    }
    expect(
      routes.find(
        (route) =>
          route.path ===
          'dragon-genetics/path/:pathId/lesson/:lessonId/branch/:branch/adventure/:chapterId',
      )?.loadComponent,
    ).toBeDefined();
  });

  it('does not expose the retired journey or adaptive catch-all routes', () => {
    expect(routes.some((route) => route.path?.startsWith('dragon-genetics/journey'))).toBe(false);
    expect(routes.some((route) => route.path === 'dragon-genetics/:simulationId')).toBe(false);
  });

  it('keeps every workstation explicitly routed for future lesson linking', () => {
    const exactRoutes = new Map(routes.map((route) => [`/${route.path}`, route]));
    const guidedRoutes = DEFAULT_DRAGON_LESSON_PLAN.lessons.flatMap((lesson) =>
      lesson.workstations.map((workstation) => workstation.route),
    );
    const workstationRoutes = INSTRUMENT_MANIFESTS.map((manifest) => manifest.route);

    for (const route of [...guidedRoutes, ...workstationRoutes]) {
      expect(exactRoutes.get(route)?.loadComponent, `${route} is not explicitly routed`).toBeDefined();
    }
  });
});
