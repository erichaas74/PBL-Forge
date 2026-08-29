import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Route, UrlSegment } from '@angular/router';

import { teacherAccessGuard } from './teacher-access.guard';
import { SessionService } from './session.service';

describe('teacherAccessGuard', () => {
  const teacher = signal(false);
  const access = signal(true);
  const currentUser = { uid: 'test-user' };

  beforeEach(() => {
    teacher.set(false);
    access.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            ensureUser: async () => currentUser,
            isTeacher: teacher,
            hasTeacherAccess: access,
          },
        },
      ],
    });
  });

  it('allows every session while testing access is open', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      teacherAccessGuard({} as Route, [] as UrlSegment[], {} as never),
    );

    expect(result).toBe(true);
  });

  it('allows a verified teacher when testing access is closed', async () => {
    access.set(false);
    teacher.set(true);

    const result = await TestBed.runInInjectionContext(() =>
      teacherAccessGuard({} as Route, [] as UrlSegment[], {} as never),
    );

    expect(result).toBe(true);
  });

  it('still supports the teacher-only policy when testing access is closed', async () => {
    access.set(false);
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
