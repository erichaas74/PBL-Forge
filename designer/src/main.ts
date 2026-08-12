import { bootstrapApplication } from '@angular/platform-browser';
import { designerConfig } from './app/designer.config';
import { DesignerApp } from './app/designer-app';

bootstrapApplication(DesignerApp, designerConfig)
  .catch(error => console.error(error));

