import { EnvironmentInjector, runInInjectionContext } from '@angular/core';

export function runInFirebaseContext<T>(
  injector: EnvironmentInjector,
  operation: () => T,
): T {
  return runInInjectionContext(injector, operation);
}
