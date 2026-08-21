import { TestBed } from '@angular/core/testing';
import { SpecimenRendererService } from './specimen-renderer.service';
import { SpecimenThumbComponent } from './specimen-thumb.component';
import { SpecimenThumbnailService } from './specimen-thumbnail.service';
import { SpecimenViewComponent } from './specimen-view.component';
import { SpecimenViewportComponent } from './specimen-viewport.component';

type ViewportRendererSurface = Pick<
  SpecimenRendererService,
  | 'mount'
  | 'show'
  | 'clear'
  | 'setTraitFocus'
  | 'setIdleMotion'
  | 'setTurntable'
  | 'playAbility'
  | 'playMotion'
  | 'setViewDirection'
  | 'setZoomLevel'
  | 'resetZoom'
  | 'dispose'
>;

/**
 * Keeps component tests on the viewport contract without allocating WebGL contexts.
 * Renderer behavior belongs in renderer-focused tests and real-browser flows.
 */
export function stubSpecimenViewportRendering(): void {
  const providers = [
    {
      provide: SpecimenRendererService,
      useFactory: createViewportRendererStub,
    },
  ];

  TestBed.overrideComponent(SpecimenViewportComponent, { set: { providers } });
  TestBed.overrideComponent(SpecimenViewComponent, { set: { providers } });
}

/** Uses the thumbnail fallback in component tests; pixel output has its own renderer suite. */
export function stubSpecimenThumbnailRendering(): void {
  TestBed.overrideComponent(SpecimenThumbComponent, {
    set: {
      providers: [
        {
          provide: SpecimenThumbnailService,
          useValue: { bake: () => null },
        },
      ],
    },
  });
}

function createViewportRendererStub(): ViewportRendererSurface {
  let zoomLevel = 1;

  return {
    mount: () => undefined,
    show: () => undefined,
    clear: () => undefined,
    setTraitFocus: () => undefined,
    setIdleMotion: () => undefined,
    setTurntable: () => undefined,
    playAbility: () => Promise.resolve(),
    playMotion: () => Promise.resolve(),
    setViewDirection: () => undefined,
    setZoomLevel: (level) => {
      zoomLevel = Math.min(2, Math.max(0.65, level));
      return zoomLevel;
    },
    resetZoom: () => {
      zoomLevel = 1;
      return zoomLevel;
    },
    dispose: () => undefined,
  };
}
