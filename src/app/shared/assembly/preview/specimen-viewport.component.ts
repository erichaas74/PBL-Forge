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
  output,
  signal,
} from '@angular/core';
import { AssemblyAbilityId } from '../combat/assembly-abilities';
import { SpecimenSource } from './specimen.models';
import { DRAGON_IDLE_BREATH, DRAGON_RESTING_POSE } from './specimen-stance';
import { SpecimenMotionDefinition } from './specimen-motion';
import { SPECIMEN_PROFILES, SpecimenProfileRegistry } from './specimen-profile.registry';
import { SpecimenRendererService, isSpecimenRenderingAvailable } from './specimen-renderer.service';

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
  readonly focusedTraitId = input<string | null>(null);
  readonly partSelected = output<string>();

  @ViewChild('stage', { static: true })
  private readonly stageRef!: ElementRef<HTMLElement>;

  private readonly renderer = inject(SpecimenRendererService);
  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly mounted = signal(false);
  private visibility: IntersectionObserver | null = null;

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

    effect(() => {
      const focusedTraitId = this.focusedTraitId();
      if (this.mounted() && this.descriptor()) this.renderer.setTraitFocus(focusedTraitId);
    });
  }

  ngAfterViewInit(): void {
    if (!this.renderingAvailable) return;
    // Quality left to the service, which resolves it per device. This was
    // pinned to 'low' and that pin is what kept the post chain and the
    // full-resolution material maps out of every student-facing viewer.
    this.renderer.mount(this.stageRef.nativeElement, {
      interactive: true,
      showGroundShadow: this.showGroundShadow(),
      framePadding: this.framePadding(),
      pose: DRAGON_RESTING_POSE,
      partSelected: (partId) => this.partSelected.emit(partId),
    });
    this.mounted.set(true);
    this.watchVisibility();
  }

  ngOnDestroy(): void {
    this.visibility?.disconnect();
    this.visibility = null;
    this.renderer.dispose();
  }

  /**
   * Runs the ambient idle only while the viewport is actually on screen.
   *
   * A workstation page can mount several of these, and a permanent render loop
   * for a dragon scrolled out of view is pure cost. Without the observer the
   * idle would be the one thing in this viewer that breaks the "a still
   * specimen costs exactly one frame" property the renderer is built around.
   *
   * No observer available (jsdom, older engines) means no idle, rather than an
   * ungated one.
   */
  private watchVisibility(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.visibility = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        this.renderer.setIdleMotion(visible ? DRAGON_IDLE_BREATH : null);
      },
      { threshold: 0.1 },
    );
    this.visibility.observe(this.stageRef.nativeElement);
  }

  playAbility(ability: AssemblyAbilityId): Promise<void> {
    return this.mounted() ? this.renderer.playAbility(ability) : Promise.resolve();
  }

  playMotion(motion: SpecimenMotionDefinition): Promise<void> {
    return this.mounted() ? this.renderer.playMotion(motion) : Promise.resolve();
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
    const level = this.renderer.setZoomLevel(this.zoomPercent() / 100 + delta);
    this.zoomPercent.set(Math.round(level * 100));
  }
}
