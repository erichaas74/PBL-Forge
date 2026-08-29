import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/** Opens teacher tools to all testers until the environment testing flag is removed. */
export const teacherAccessGuard: CanMatchFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.hasTeacherAccess()) return true;
  const user = await session.ensureUser();
  return user && session.isTeacher()
    ? true
    : router.createUrlTree(['/dragon-genetics'], { queryParams: { access: 'teacher' } });
};
