import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/** Keeps teacher-only bundles and local authoring state out of student sessions. */
export const teacherAccessGuard: CanMatchFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const user = await session.ensureUser();
  return user && session.isTeacher()
    ? true
    : router.createUrlTree(['/dragon-genetics'], { queryParams: { access: 'teacher' } });
};
