import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Route, UrlSegment } from '@angular/router';

import { teacherAccessGuard } from './teacher-access.guard';
import { SessionService } from './session.service';

describe('teacherAccessGuard', () => {
  const teacher = signal(false);
  const currentUser = { uid: 'test-user' };

  beforeEach(() => {
    teacher.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            ensureUser: async () => currentUser,
            isTeacher: teacher,
          },
        },
      ],
    });
  });

  it('allows a verified teacher session', async () => {
    teacher.set(true);

    const result = await TestBed.runInInjectionContext(() =>
      teacherAccessGuard({} as Route, [] as UrlSegment[], {} as never),
    );

    expect(result).toBe(true);
  });

  it('redirects a student session away from teacher routes', async () => {
    const router = TestBed.inject(Router);

    const result = await TestBed.runInInjectionContext(() =>
      teacherAccessGuard({} as Route, [] as UrlSegment[], {} as never),
    );

    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/dragon-genetics?access=teacher',
    );
  });
});
