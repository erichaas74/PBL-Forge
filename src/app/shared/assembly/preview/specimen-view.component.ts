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
import { RenderQuality } from '../rendering/render-quality';
import { StageTheme } from '../rendering/scene-environment';
import {
  SpecimenDescriptor,
  SpecimenSource,
  SpecimenTraitReadout,
} from './specimen.models';
import { SpecimenFrame } from './specimen-pose';
import { SpecimenProfileRegistry } from './specimen-profile.registry';
import {
  SpecimenRendererService,
  isSpecimenRenderingAvailable,
} from './specimen-renderer.service';

/**
 * Drop-in trait observation view for any simulation.
 *
 * Give it a {@link SpecimenSource} — a blueprint you built, a genome expressed
 * through a registered profile, or a record loaded from a student's saved work.
 * Selecting a trait mutes every part that trait did not shape, which is the
 * whole pedagogical point: it answers "which bits did this gene build?".
 *
 * It is a *phenotype* readout and nothing else. Chromosomes, allele pairs, and
 * Punnett grids belong in SVG diagrams beside it, where they stay accessible
 * and testable.
 */
@Component({
  selector: 'app-specimen-view',
  templateUrl: './specimen-view.component.html',
  styleUrl: './specimen-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SpecimenRendererService],
})
export class SpecimenViewComponent implements AfterViewInit, OnDestroy {
  readonly source = input.required<SpecimenSource>();
  /** Overrides the traits carried by the source. */
  readonly traits = input<readonly SpecimenTraitReadout[] | null>(null);
  /** Controlled focus. Leave unset to let the built-in trait list drive it. */
  readonly focusedTraitId = input<string | null>(null);
  readonly interactive = input(true);
  readonly turntable = input(false);
  readonly showTraitPanel = input(true);
  /**
   * Shared framing for side-by-side comparison. Without it each specimen is
   * fitted individually, which normalises away real size differences.
   */
  readonly frame = input<SpecimenFrame | null>(null);
  readonly quality = input<RenderQuality>('low');
  readonly theme = input<StageTheme | null>(null);
  readonly transparent = input(false);
  /** Accessible description of the specimen for screen readers. */
  readonly stageLabel = input<string>('Specimen viewer');

  readonly traitFocused = output<string | null>();
  readonly resolved = output<SpecimenDescriptor>();

  @ViewChild('stage', { static: true })
  private readonly stageRef!: ElementRef<HTMLElement>;

  private readonly renderer = inject(SpecimenRendererService);
  private readonly registry = inject(SpecimenProfileRegistry);
  private readonly mounted = signal(false);
  private readonly internalFocus = signal<string | null>(null);

  readonly renderingAvailable = isSpecimenRenderingAvailable();

  private readonly resolution = computed(() => this.registry.resolve(this.source()));

  readonly descriptor = computed(() => {
    const resolution = this.resolution();
    if (resolution.status !== 'ready') return null;
    const override = this.traits();
    return override ? { ...resolution.descriptor, traits: override } : resolution.descriptor;
  });

  readonly errorMessage = computed(() => {
    const resolution = this.resolution();
    return resolution.status === 'error' ? resolution.message : null;
  });

  readonly traitList = computed(() => this.descriptor()?.traits ?? []);

  readonly activeTraitId = computed(() => this.focusedTraitId() ?? this.internalFocus());

  readonly activeTrait = computed(() => {
    const id = this.activeTraitId();
    return id ? this.traitList().find(trait => trait.id === id) ?? null : null;
  });

  constructor() {
    effect(() => {
      const descriptor = this.descriptor();
      if (!this.mounted() || !descriptor) return;
      this.renderer.show(descriptor, {
        frame: this.frame(),
        focusedTraitId: this.activeTraitId(),
      });
      this.resolved.emit(descriptor);
    });

    effect(() => {
      const traitId = this.activeTraitId();
      if (this.mounted() && this.descriptor()) this.renderer.setTraitFocus(traitId);
    });

    effect(() => {
      const turntable = this.turntable();
      if (this.mounted()) this.renderer.setTurntable(turntable);
    });
  }

  ngAfterViewInit(): void {
    if (!this.renderingAvailable) return;

    this.renderer.mount(this.stageRef.nativeElement, {
      quality: this.quality(),
      theme: this.theme() ?? undefined,
      interactive: this.interactive(),
      transparent: this.transparent(),
      showGroundShadow: true,
      framePadding: 1.18,
      pose: { droopRadians: TAIL_DROOP_RADIANS },
    });

    this.mounted.set(true);
  }

  ngOnDestroy(): void {
    this.renderer.dispose();
  }

  /** Toggles focus: selecting the active trait clears it. */
  onTraitSelected(traitId: string): void {
    const next = this.activeTraitId() === traitId ? null : traitId;
    this.internalFocus.set(next);
    this.traitFocused.emit(next);
  }

  clearFocus(): void {
    this.internalFocus.set(null);
    this.traitFocused.emit(null);
  }

  meterWidth(trait: SpecimenTraitReadout): string {
    return `${Math.round(Math.max(0, Math.min(1, trait.normalized ?? 0)) * 100)}%`;
  }
}

/**
 * Authored blueprints hold hanging chains straight, because in the arena
 * gravity settles them. A viewer has no gravity, so without this a dragon's
 * tail sticks out like a rod.
 */
const TAIL_DROOP_RADIANS = 0.13;
