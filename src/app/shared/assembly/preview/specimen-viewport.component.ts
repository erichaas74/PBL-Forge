import {
  AfterViewInit,
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
import { StageTheme } from '../rendering/scene-environment';
import { SpecimenSource } from './specimen.models';
import { DRAGON_IDLE_BREATH, DRAGON_RESTING_POSE, dragonRestingPose } from './specimen-stance';
import { SpecimenIdleMotion, SpecimenMotionDefinition } from './specimen-motion';
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
  providers: [SpecimenRendererService],
})
export class SpecimenViewportComponent implements AfterViewInit, OnDestroy {
  readonly source = input<SpecimenSource | null>(null);
  readonly ariaLabel = input('Specimen model');
  readonly controls = input(true);
  /** Enables pointer orbiting. Cards turn this off while retaining idle motion. */
  readonly interactive = input(true);
  /** Runs the ambient living pose while visible. Scripted motions remain available. */
  readonly animated = input(true);
  /** Ambient pose; cards can opt into a livelier idle while lab viewers stay restrained. */
  readonly idleMotion = input<SpecimenIdleMotion>(DRAGON_IDLE_BREATH);
  /** Optional on-screen-only ability loop used by animated specimen cards. */
  readonly autoAbilities = input<readonly AssemblyAbilityId[]>([]);
  readonly controlsPlacement = input<'below' | 'side'>('below');
  readonly showGroundShadow = input(true);
  readonly framePadding = input(1.12);
  readonly theme = input<StageTheme | null>(null);
  readonly transparent = input(false);
  readonly focusedTraitId = input<string | null>(null);
  readonly partSelected = output<string>();

  @ViewChild('stage', { static: true })
  private readonly stageRef!: ElementRef<HTMLElement>;

  private readonly renderer = inject(SpecimenRendererService);
  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly mounted = signal(false);
  private readonly visible = signal(false);
  private visibility: IntersectionObserver | null = null;
  private autoAbilityTimer: ReturnType<typeof setTimeout> | null = null;
  private autoAbilityIndex = 0;

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
      // The stance is a property of the animal, not of this surface: a dragon
      // whose forelimbs grasp has to rear, and it does so wherever it is shown.
      if (descriptor) {
        this.renderer.show(descriptor, { pose: dragonRestingPose(descriptor.blueprint) });
      } else {
        this.renderer.clear();
      }
    });

    effect(() => {
      const focusedTraitId = this.focusedTraitId();
      if (this.mounted() && this.descriptor()) this.renderer.setTraitFocus(focusedTraitId);
    });

    effect(() => {
      const shouldAnimate = this.animated() && this.visible();
      const idleMotion = this.idleMotion();
      if (!this.mounted()) return;
      this.renderer.setIdleMotion(shouldAnimate ? idleMotion : null);
    });

    effect(() => {
      const canShowcase =
        this.mounted()
        && this.visible()
        && this.animated()
        && Boolean(this.descriptor())
        && this.autoAbilities().length > 0
        && !prefersReducedMotion();
      this.stopAutoAbilities();
      if (canShowcase) this.scheduleAutoAbility(2100);
    });
  }

  ngAfterViewInit(): void {
    if (!this.renderingAvailable) return;
    // Quality left to the service, which resolves it per device. This was
    // pinned to 'low' and that pin is what kept the post chain and the
    // full-resolution material maps out of every student-facing viewer.
    this.renderer.mount(this.stageRef.nativeElement, {
      interactive: this.interactive(),
      theme: this.theme() ?? undefined,
      transparent: this.transparent(),
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
    this.stopAutoAbilities();
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
      (entries) => {
        this.visible.set(entries.some((entry) => entry.isIntersecting));
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

  private scheduleAutoAbility(delayMs: number): void {
    this.autoAbilityTimer = setTimeout(async () => {
      this.autoAbilityTimer = null;
      const abilities = this.autoAbilities();
      if (!this.visible() || !this.animated() || !abilities.length) return;
      const ability = abilities[this.autoAbilityIndex % abilities.length];
      this.autoAbilityIndex += 1;
      await this.renderer.playAbility(ability);
      if (this.visible() && this.animated()) {
        // An uneven pause keeps the animal from feeling like a mechanical loop.
        this.scheduleAutoAbility(3300 + (this.autoAbilityIndex % 3) * 650);
      }
    }, delayMs);
  }

  private stopAutoAbilities(): void {
    if (this.autoAbilityTimer !== null) clearTimeout(this.autoAbilityTimer);
    this.autoAbilityTimer = null;
  }

  zoomIn(): void {
    this.updateZoom(0.2);
  }

  zoomOut(): void {
    this.updateZoom(-0.2);
  }

  resetView(): void {
    this.renderer.setViewDirection(undefined);
    const level = this.renderer.resetZoom();
    this.zoomPercent.set(Math.round(level * 100));
  }

  private updateZoom(delta: number): void {
    const level = this.renderer.setZoomLevel(this.zoomPercent() / 100 + delta);
    this.zoomPercent.set(Math.round(level * 100));
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
