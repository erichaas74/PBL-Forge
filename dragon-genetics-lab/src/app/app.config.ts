import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import {
  DRAGON_LAB_REPOSITORY,
  DRAGON_LAB_SESSION_ID,
} from './core/persistence/dragon-lab.repository';
import { LocalDragonLabRepository } from './core/persistence/local-dragon-lab.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: DRAGON_LAB_REPOSITORY, useClass: LocalDragonLabRepository },
    { provide: DRAGON_LAB_SESSION_ID, useValue: 'local-student' },
  ],
};
