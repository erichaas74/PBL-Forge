import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AssemblyState,
  PartMoveEvent,
  SnapPointSelectionEvent,
} from '@pbl/assembly/domain/assembly.models';
import { AssemblyPhysicsService } from '@pbl/assembly/assembly-physics.service';
import { AssemblyRendererService } from '@pbl/assembly/assembly-renderer.service';

@Component({
  selector: 'app-garage-viewport',
  templateUrl: './garage-viewport.component.html',
  styleUrl: './garage-viewport.component.css',
})
export class GarageViewportComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<AssemblyState>();
  readonly frameRequest = input(0);
  readonly selectedPartId = input<string | null>(null);
  readonly partSelected = output<string>();
  readonly partMoved = output<PartMoveEvent>();
  readonly partDragFinished = output<string>();
  readonly snapPointSelected = output<SnapPointSelectionEvent>();

  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLElement>;

  private frameId: number | null = null;
  private lastFrameTime = 0;
  private hasMounted = false;
  private physicsDirty = true;
  private blueprintSignature = '';
  private lastFrameRequest = -1;
  private readonly renderer = inject(AssemblyRendererService);
  private readonly physics = inject(AssemblyPhysicsService);
  private dragState: {
    partId: string;
    pointerId: number;
    planeY: number;
    startX: number;
    startY: number;
    didMove: boolean;
  } | null = null;
  private readonly stateSync = effect(() => {
    const state = this.state();
    const frameRequest = this.frameRequest();
    const signature = physicsSignature(state);
    if (signature !== this.blueprintSignature) {
      this.blueprintSignature = signature;
      this.physicsDirty = true;
    }

    if (this.hasMounted) {
      this.renderer.syncAssembly(state, true, this.selectedPartId());
      this.renderer.syncSelection(this.selectedPartId());
      if (frameRequest !== this.lastFrameRequest) {
        this.lastFrameRequest = frameRequest;
        this.renderer.frameAssembly();
      }
      if (state.isSimulating) {
        this.ensurePhysicsReady();
        this.startLoop();
      } else {
        this.stopLoop();
      }
    }
  });
  private readonly selectionSync = effect(() => {
    const selectedPartId = this.selectedPartId();

    if (this.hasMounted) {
      this.renderer.syncAssembly(this.state(), true, selectedPartId);
      this.renderer.syncSelection(selectedPartId);
    }
  });

  ngAfterViewInit(): void {
    this.hasMounted = true;
    this.renderer.mount(this.viewportRef.nativeElement);
    this.renderer.syncAssembly(this.state(), true, this.selectedPartId());
    this.renderer.syncSelection(this.selectedPartId());
    this.lastFrameRequest = this.frameRequest();
    this.renderer.frameAssembly();
    if (this.state().isSimulating) {
      this.ensurePhysicsReady();
      this.startLoop();
    }
  }

  ngOnDestroy(): void {
    this.stopLoop();

    this.stateSync.destroy();
    this.selectionSync.destroy();
    this.renderer.dispose();
    this.physics.clear();
  }

  onPointerDown(event: PointerEvent): void {
    if (this.state().isSimulating) {
      return;
    }

    const snapPoint = this.renderer.pickSnapPoint(event.clientX, event.clientY);

    if (snapPoint) {
      this.snapPointSelected.emit({
        partId: snapPoint.partId,
        snapPointId: snapPoint.id,
      });
      return;
    }

    const partId = this.renderer.pickPart(event.clientX, event.clientY);

    if (!partId) {
      return;
    }

    const part = this.state().parts.find(item => item.id === partId);

    if (!part) {
      return;
    }

    this.partSelected.emit(partId);
    this.dragState = {
      partId,
      pointerId: event.pointerId,
      planeY: part.position.y,
      startX: event.clientX,
      startY: event.clientY,
      didMove: false,
    };
    this.viewportRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    const dragState = this.dragState;

    if (!dragState || dragState.pointerId !== event.pointerId || this.state().isSimulating) {
      return;
    }

    const pointerDistance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);

    if (pointerDistance < 3 && !dragState.didMove) {
      return;
    }

    const position = this.renderer.projectPointerToPlane(event.clientX, event.clientY, dragState.planeY);

    if (!position) {
      return;
    }

    dragState.didMove = true;
    this.partMoved.emit({ partId: dragState.partId, position });
  }

  onPointerUp(event: PointerEvent): void {
    const dragState = this.dragState;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.didMove) {
      this.partDragFinished.emit(dragState.partId);
    }

    this.viewportRef.nativeElement.releasePointerCapture(event.pointerId);
    this.dragState = null;
  }

  private readonly tick = (time: number): void => {
    this.frameId = null;
    const deltaSeconds = this.lastFrameTime === 0
      ? 0
      : Math.min((time - this.lastFrameTime) / 1000, 0.05);

    this.lastFrameTime = time;

    if (this.state().isSimulating) {
      this.renderer.applySnapshot(this.physics.step(deltaSeconds));
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
    if (this.frameId === null && this.state().isSimulating) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private stopLoop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastFrameTime = 0;
  }
}

function physicsSignature(state: AssemblyState): string {
  return JSON.stringify({ parts: state.parts, joints: state.joints });
}
