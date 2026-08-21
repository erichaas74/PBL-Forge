import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { BattleBodySnapshot, ControlFrameByCombatant } from '../../models/arena.models';
import { AssemblyArenaPhysicsService } from '../../physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from '../../rendering/assembly-arena-renderer.service';
import { AssemblyArenaStore } from '../../state/assembly-arena.store';

/**
 * How far time slows during hit-stop. Low enough to read as a jolt, high enough
 * that the fight never looks frozen — at 0 the duel appears to have crashed.
 */
const HIT_STOP_TIME_SCALE = 0.22;

/** Redraw interval while the match is paused. 10fps: enough for firelight. */
const IDLE_FRAME_INTERVAL_MS = 100;

export type ArenaViewportAppearance = 'standard' | 'dragon-pit';

@Component({
  selector: 'app-arena-viewport',
  templateUrl: './arena-viewport.component.html',
  styleUrl: './arena-viewport.component.css',
})
export class ArenaViewportComponent implements AfterViewInit, OnDestroy {
  readonly controlFrameFactory =
    input.required<(snapshots: BattleBodySnapshot[]) => ControlFrameByCombatant>();
  readonly appearance = input<ArenaViewportAppearance>('standard');
  readonly ariaLabel = input('Assembly battle arena viewport');

  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLElement>;

  private frameId: number | null = null;
  private lastFrameTime = 0;
  private hasMounted = false;
  private hitStopRemaining = 0;
  private visibility: IntersectionObserver | null = null;
  private onScreen = true;
  private lastIdleRenderMs = 0;
  private readonly store = inject(AssemblyArenaStore);
  private readonly physics = inject(AssemblyArenaPhysicsService);
  private readonly renderer = inject(AssemblyArenaRendererService);
  private readonly setupSync = effect(() => {
    this.store.matchRevision();

    if (!this.hasMounted) {
      return;
    }

    const state = untracked(() => this.store.state());
    this.physics.rebuild(state);
    this.renderer.syncSetup(state);
  });

  ngAfterViewInit(): void {
    this.hasMounted = true;
    this.renderer.mount(this.viewportRef.nativeElement);
    this.physics.rebuild(this.store.state());
    this.renderer.syncSetup(this.store.state());

    /*
     * A canvas that has been scrolled off the page keeps its rAF callbacks — the
     * browser only stops them for a hidden *tab*. On the lesson pages the arena
     * sits below several stations, so without this the full post chain runs at
     * 60fps behind a student reading a Punnett square.
     */
    this.visibility = new IntersectionObserver(
      (entries) => (this.onScreen = entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.01 },
    );
    this.visibility.observe(this.viewportRef.nativeElement);

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.frameId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }

    this.visibility?.disconnect();
    this.visibility = null;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.setupSync.destroy();
    this.renderer.dispose();
    this.physics.clear();
  }

  /**
   * A hidden tab already throttles rAF, but it does not reset our clock — on
   * return the first delta would be however long the student was away, which
   * the physics would try to integrate in one step. Dropping the timestamp
   * makes the next frame a zero-delta frame instead.
   */
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.lastFrameTime = 0;
  };

  private readonly tick = (time: number): void => {
    const deltaSeconds =
      this.lastFrameTime === 0 ? 0 : Math.min((time - this.lastFrameTime) / 1000, 0.05);

    this.lastFrameTime = time;

    // Offscreen or hidden: keep the loop alive so we notice coming back, but
    // draw nothing. This is the cheapest frame in the file.
    if (!this.onScreen || document.hidden) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    const state = this.store.state();

    if (state.isRunning) {
      /*
       * Hit-stop: a heavy blow buys a few frames of slowed time.
       *
       * The step is *scaled*, never skipped. Skipping would let bodies travel a
       * full frame with no collision pass between them, which at duel speeds is
       * enough for a head to pass through a wing — the exact tunnelling the
       * fixed-step integrator exists to prevent. Slowing keeps every contact.
       */
      const hitStop = this.renderer.takeHitStopSeconds();
      if (hitStop > 0) {
        this.hitStopRemaining = hitStop;
      }

      let stepSeconds = deltaSeconds;
      if (this.hitStopRemaining > 0) {
        this.hitStopRemaining = Math.max(0, this.hitStopRemaining - deltaSeconds);
        stepSeconds *= HIT_STOP_TIME_SCALE;
      }

      const controlFrames = this.controlFrameFactory()(this.physics.getSnapshots());
      const frame = this.physics.step(state, stepSeconds, controlFrames);
      // The store advances on the same scaled clock, so the match timer and the
      // physics never disagree about how long the fight has lasted.
      this.store.applyPhysicsFrame(frame, stepSeconds);
      this.renderer.applyFrame(
        frame.snapshots,
        this.store.state().partStatuses,
        frame.fireCones,
        frame.attackPoses,
      );
    } else {
      /*
       * Paused, but not static: the braziers still flicker and the student can
       * still orbit. Both want redraws — neither wants sixty a second through
       * GTAO, bloom and SMAA. Ten is enough for a fire to look alive, and it
       * takes an idle arena from a pinned GPU to nearly nothing.
       *
       * Orbiting bypasses the throttle, because a dragged view that updates at
       * 10fps feels broken in a way a flickering fire does not.
       */
      const orbiting = this.renderer.isUserAdjustingView();
      if (orbiting || time - this.lastIdleRenderMs >= IDLE_FRAME_INTERVAL_MS) {
        this.lastIdleRenderMs = time;
        this.renderer.render();
      }
    }

    this.frameId = requestAnimationFrame(this.tick);
  };
}
