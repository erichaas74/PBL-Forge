import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import {
  AssemblyState,
  PartMoveEvent,
  SnapPointSelectionEvent,
} from '../../models/assembly.models';
import { AssemblyPhysicsService } from '../../../shared/assembly/assembly-physics.service';
import { AssemblyRendererService } from '../../../shared/assembly/assembly-renderer.service';

@Component({
  selector: 'app-garage-viewport',
  templateUrl: './garage-viewport.component.html',
  styleUrl: './garage-viewport.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarageViewportComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<AssemblyState>();
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
    this.physics.rebuild(state);

    if (this.hasMounted) {
      this.renderer.syncAssembly(state, true);
      this.renderer.syncSelection(this.selectedPartId());
    }
  });
  private readonly selectionSync = effect(() => {
    const selectedPartId = this.selectedPartId();

    if (this.hasMounted) {
      this.renderer.syncSelection(selectedPartId);
    }
  });

  constructor(
    private readonly renderer: AssemblyRendererService,
    private readonly physics: AssemblyPhysicsService,
  ) {}

  ngAfterViewInit(): void {
    this.hasMounted = true;
    this.renderer.mount(this.viewportRef.nativeElement);
    this.renderer.syncAssembly(this.state());
    this.renderer.syncSelection(this.selectedPartId());
    this.physics.rebuild(this.state());
    this.frameId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }

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
    const deltaSeconds = this.lastFrameTime === 0
      ? 0
      : Math.min((time - this.lastFrameTime) / 1000, 0.05);

    this.lastFrameTime = time;

    if (this.state().isSimulating) {
      this.renderer.applySnapshot(this.physics.step(deltaSeconds));
    } else {
      this.renderer.render();
    }

    this.frameId = requestAnimationFrame(this.tick);
  };
}
