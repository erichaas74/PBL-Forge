import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AssemblyAbilityId } from '../combat/assembly-abilities';
import { SpecimenSource } from './specimen.models';
import { SPECIMEN_PROFILES, SpecimenProfileRegistry } from './specimen-profile.registry';
import {
  SpecimenRendererService,
  isSpecimenRenderingAvailable,
} from './specimen-renderer.service';

/**
 * Renderer-only specimen surface shared by scientific instruments and the
 * full assay bench. It owns one WebGL context and no genetics, combat, scoring,
 * or instructional copy.
 */
@Component({
  selector: 'app-specimen-viewport',
  templateUrl: './specimen-viewport.component.html',
  styleUrl: './specimen-viewport.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SpecimenRendererService],
})
export class SpecimenViewportComponent implements AfterViewInit, OnDestroy {
  readonly source = input<SpecimenSource | null>(null);
  readonly ariaLabel = input('Specimen model');
  readonly controls = input(true);
  readonly controlsPlacement = input<'below' | 'side'>('below');
  readonly showGroundShadow = input(true);
  readonly framePadding = input(1.12);

  @ViewChild('stage', { static: true })
  private readonly stageRef!: ElementRef<HTMLElement>;

  private readonly renderer = inject(SpecimenRendererService);
  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly mounted = signal(false);

  readonly renderingAvailable = isSpecimenRenderingAvailable();
  readonly zoomPercent = signal(100);
  private readonly resolution = computed(() => {
    const source = this.source();
    return source ? this.registry.resolve(source) : null;
  });
  readonly descriptor = computed(() => {
    const resolution = this.resolution();
    return resolution?.status === 'ready' ? resolution.descriptor : null;
  });
  readonly errorMessage = computed(() => {
    const resolution = this.resolution();
    return resolution?.status === 'error' ? resolution.message : null;
  });

  constructor() {
    for (const profile of inject(SPECIMEN_PROFILES, { optional: true }) ?? []) {
      this.registry.register(profile);
    }

    effect(() => {
      if (!this.mounted()) return;
      const descriptor = this.descriptor();
      if (descriptor) this.renderer.show(descriptor);
      else this.renderer.clear();
    });
  }

  ngAfterViewInit(): void {
    if (!this.renderingAvailable) return;
    this.renderer.mount(this.stageRef.nativeElement, {
      quality: 'low',
      interactive: true,
      showGroundShadow: this.showGroundShadow(),
      framePadding: this.framePadding(),
      pose: { droopRadians: TAIL_DROOP_RADIANS },
    });
    this.mounted.set(true);
  }

  ngOnDestroy(): void {
    this.renderer.dispose();
  }

  playAbility(ability: AssemblyAbilityId): Promise<void> {
    return this.mounted() ? this.renderer.playAbility(ability) : Promise.resolve();
  }

  zoomIn(): void {
    this.updateZoom(0.2);
  }

  zoomOut(): void {
    this.updateZoom(-0.2);
  }

  resetView(): void {
    const level = this.renderer.resetZoom();
    this.zoomPercent.set(Math.round(level * 100));
  }

  private updateZoom(delta: number): void {
    const level = this.renderer.setZoomLevel((this.zoomPercent() / 100) + delta);
    this.zoomPercent.set(Math.round(level * 100));
  }
}

const TAIL_DROOP_RADIANS = 0.13;
