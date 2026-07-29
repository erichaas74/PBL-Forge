import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  untracked,
} from '@angular/core';
import {
  BattleBodySnapshot,
  ControlFrameByCombatant,
} from '../../models/arena.models';
import { AssemblyArenaPhysicsService } from '../../physics/assembly-arena-physics.service';
import { AssemblyArenaRendererService } from '../../rendering/assembly-arena-renderer.service';
import { AssemblyArenaStore } from '../../state/assembly-arena.store';

@Component({
  selector: 'app-arena-viewport',
  templateUrl: './arena-viewport.component.html',
  styleUrl: './arena-viewport.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaViewportComponent implements AfterViewInit, OnDestroy {
  readonly controlFrameFactory = input.required<(snapshots: BattleBodySnapshot[]) => ControlFrameByCombatant>();

  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLElement>;

  private frameId: number | null = null;
  private lastFrameTime = 0;
  private hasMounted = false;
  private readonly setupSync = effect(() => {
    this.store.matchRevision();

    if (!this.hasMounted) {
      return;
    }

    const state = untracked(() => this.store.state());
    this.physics.rebuild(state);
    this.renderer.syncSetup(state);
  });

  constructor(
    private readonly store: AssemblyArenaStore,
    private readonly physics: AssemblyArenaPhysicsService,
    private readonly renderer: AssemblyArenaRendererService,
  ) {}

  ngAfterViewInit(): void {
    this.hasMounted = true;
    this.renderer.mount(this.viewportRef.nativeElement);
    this.physics.rebuild(this.store.state());
    this.renderer.syncSetup(this.store.state());
    this.frameId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }

    this.setupSync.destroy();
    this.renderer.dispose();
    this.physics.clear();
  }

  private readonly tick = (time: number): void => {
    const deltaSeconds = this.lastFrameTime === 0
      ? 0
      : Math.min((time - this.lastFrameTime) / 1000, 0.05);

    this.lastFrameTime = time;

    const state = this.store.state();

    if (state.isRunning) {
      const controlFrames = this.controlFrameFactory()(this.physics.getSnapshots());
      const frame = this.physics.step(state, deltaSeconds, controlFrames);
      this.store.applyPhysicsFrame(frame, deltaSeconds);
      this.renderer.applyFrame(frame.snapshots, this.store.state().partStatuses);
    } else {
      this.renderer.render();
    }

    this.frameId = requestAnimationFrame(this.tick);
  };
}
