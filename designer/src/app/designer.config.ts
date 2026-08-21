import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { designerRoutes } from './designer.routes';

/** Deliberately contains no Firebase, authentication, lesson, or student-data providers. */
export const designerConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(designerRoutes),
  ],
};
