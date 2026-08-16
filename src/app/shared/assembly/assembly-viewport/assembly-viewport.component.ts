import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { AssemblyBlueprint, AssemblyPhysicsSnapshot } from '../domain/assembly.models';
import { AssemblyPhysicsService } from '../assembly-physics.service';
import { AssemblyRendererService } from '../assembly-renderer.service';

export interface AssemblyFrameMetrics {
  snapshots: AssemblyPhysicsSnapshot[];
  elapsedSeconds: number;
  deltaSeconds: number;
  peakVelocityMs: number;
}

/**
 * Shared physics test viewport for embedding in games.
 * Provides its own physics + renderer instances — no parent setup required.
 * Use GarageViewportComponent for the interactive editor experience.
 */
@Component({
  selector: 'app-assembly-viewport',
  templateUrl: './assembly-viewport.component.html',
  styleUrl: './assembly-viewport.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssemblyPhysicsService, AssemblyRendererService],
})
export class AssemblyViewportComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<AssemblyBlueprint>();
  readonly running = input(false);

  readonly frameReady = output<AssemblyFrameMetrics>();

  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLElement>;

  private frameId: number | null = null;
  private lastFrameTime = 0;
  private elapsedSeconds = 0;
  private peakVelocityMs = 0;
  private hasMounted = false;
  private physicsDirty = true;
  private blueprintSignature = '';
  private readonly physics = inject(AssemblyPhysicsService);
  private readonly renderer = inject(AssemblyRendererService);

  private readonly stateSync = effect(() => {
    const state = this.state();
    const signature = physicsSignature(state);
    if (signature !== this.blueprintSignature) {
      this.blueprintSignature = signature;
      this.physicsDirty = true;
    }

    if (this.hasMounted) {
      this.renderer.syncAssembly(state);
      if (this.running()) {
        this.ensurePhysicsReady();
        this.startLoop();
      }
    }
  });

  private readonly runningSync = effect(() => {
    const running = this.running();
    if (!running) {
      this.elapsedSeconds = 0;
      this.peakVelocityMs = 0;
      this.stopLoop();
      this.renderer.render();
    } else if (this.hasMounted) {
      this.ensurePhysicsReady();
      this.startLoop();
    }
  });

  ngAfterViewInit(): void {
    this.hasMounted = true;
    this.renderer.mount(this.viewportRef.nativeElement);
    this.renderer.syncAssembly(this.state());
    if (this.running()) {
      this.ensurePhysicsReady();
      this.startLoop();
    }
  }

  ngOnDestroy(): void {
    this.stopLoop();

    this.stateSync.destroy();
    this.runningSync.destroy();
    this.renderer.dispose();
    this.physics.clear();
  }

  private readonly tick = (time: number): void => {
    this.frameId = null;
    const deltaSeconds = this.lastFrameTime === 0
      ? 0
      : Math.min((time - this.lastFrameTime) / 1000, 0.05);

    this.lastFrameTime = time;

    if (this.running()) {
      const snapshots = this.physics.step(deltaSeconds);
      this.renderer.applySnapshot(snapshots);

      this.elapsedSeconds += deltaSeconds;

      for (const s of snapshots) {
        if (s.velocity) {
          const speed = Math.sqrt(s.velocity.x ** 2 + s.velocity.y ** 2 + s.velocity.z ** 2);
          if (speed > this.peakVelocityMs) {
            this.peakVelocityMs = speed;
          }
        }
      }

      this.frameReady.emit({
        snapshots,
        elapsedSeconds: this.elapsedSeconds,
        deltaSeconds,
        peakVelocityMs: this.peakVelocityMs,
      });
      this.startLoop();
    }
  };

  private ensurePhysicsReady(): void {
    if (!this.physicsDirty) return;
    this.physics.rebuild(this.state());
    this.physicsDirty = false;
    this.lastFrameTime = 0;
  }

  private startLoop(): void {
    if (this.frameId === null && this.running()) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private stopLoop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastFrameTime = 0;
  }
}

function physicsSignature(state: AssemblyBlueprint): string {
  return JSON.stringify({ parts: state.parts, joints: state.joints });
}
