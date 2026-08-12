import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AssemblyBlueprint,
  AssemblySnapDefinition,
  Vector3Data,
} from '@pbl/assembly/domain/assembly.models';
import { AssemblyRendererService } from '@pbl/assembly/assembly-renderer.service';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
  createPartFromDefinition,
  resizePartDefinition,
} from '../assembly-garage/data/assembly-part-definitions';
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';
import { applyDesignerDraft } from '../designer-part-overrides';

/**
 * A workbench for where parts connect, rather than what they look like.
 *
 * The Parts Lab tunes the mesh and the overall dimensions. Neither touches the
 * sockets — the authored `snapPoints` in `assembly-part-definitions.ts` that
 * decide where a jaw meets a skull or a claw meets a wing. Those were only
 * editable by hand-computing offsets in source and reloading the Garage to see
 * whether they landed.
 *
 * This page shows one part with its sockets live, lets you drag them on the
 * ground plane or dial them in per axis, and saves them to the designer draft
 * so the Garage stamps and rebuilds with them.
 */

const FAMILIES: readonly AssemblyPartFamily[] = ['dragon', 'robot', 'car'];

/** Where the part stands. Matches the renderer's default camera target. */
const PART_ORIGIN: Vector3Data = { x: 0, y: 1, z: 0 };

const AXES: readonly VectorAxis[] = ['x', 'y', 'z'];

type VectorAxis = keyof Vector3Data;

/** What a drag is allowed to change. */
type DragAxis = 'free' | VectorAxis;

interface SocketRow {
  definition: AssemblySnapDefinition;
  position: Vector3Data;
  authored: Vector3Data;
  moved: boolean;
}

@Component({
  selector: 'app-snap-workshop-page',
  imports: [RouterLink],
  templateUrl: './snap-workshop.page.html',
  styleUrl: './snap-workshop.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssemblyRendererService],
})
export class SnapWorkshopPage implements AfterViewInit, OnDestroy {
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly renderer = inject(AssemblyRendererService);
  private readonly draft = inject(DesignerDragonDraftStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly mounted = signal(false);
  private frameId: number | null = null;

  /**
   * `anchor` is where the pointer met the drag plane when the socket was
   * grabbed, and `origin` is where the socket was. Moving by the delta between
   * them keeps the socket under the same point of the cursor: without it, the
   * socket jumps to wherever the ray crosses the plane, which is a marker
   * radius away from where it was clicked even on a dead-centre grab.
   */
  private drag: {
    snapPointId: string;
    pointerId: number;
    anchor: Vector3Data;
    origin: Vector3Data;
  } | null = null;

  readonly families = FAMILIES;
  readonly axes = AXES;
  readonly dragAxes: readonly DragAxis[] = ['free', 'x', 'y', 'z'];
  readonly family = signal<AssemblyPartFamily>('dragon');
  readonly selectedId = signal<string | null>(null);
  readonly selectedSnapId = signal<string | null>(null);
  readonly copied = signal(false);

  /** Free drags in the screen plane; an axis pins the other two. */
  readonly dragAxis = signal<DragAxis>('free');

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: null });

  /** Only parts that author sockets. Primitives derive theirs from dimensions. */
  readonly definitions = computed(() => ASSEMBLY_PART_DEFINITIONS.filter(definition =>
    definition.family === this.family() && definition.snapPoints.length));

  readonly authored = computed<AssemblyPartDefinition | null>(() => {
    const list = this.definitions();
    return list.find(definition => definition.id === this.selectedId()) ?? list[0] ?? null;
  });

  /** The part as the Garage builds it, sockets included. */
  readonly tuned = computed<AssemblyPartDefinition | null>(() => {
    const definition = this.authored();
    return definition ? applyDesignerDraft(definition, this.draft) : null;
  });

  /**
   * The same part with no socket overrides. This is what Reset returns to —
   * the authored socket carried to whatever size the Parts Lab left the part.
   */
  private readonly baseline = computed<AssemblyPartDefinition | null>(() => {
    const definition = this.authored();

    return definition
      ? resizePartDefinition(
          definition,
          this.draft.dimensionsFor(definition.id, definition.dimensions),
        )
      : null;
  });

  readonly sockets = computed<SocketRow[]>(() => {
    const tuned = this.tuned();
    const baseline = this.baseline();

    if (!tuned || !baseline) {
      return [];
    }

    return tuned.snapPoints.map(snapPoint => {
      const authored = baseline.snapPoints.find(item => item.id === snapPoint.id)?.localPosition
        ?? snapPoint.localPosition;

      return {
        definition: snapPoint,
        position: snapPoint.localPosition,
        authored,
        moved: !sameVector(snapPoint.localPosition, authored),
      };
    });
  });

  readonly selectedSocket = computed<SocketRow | null>(() => {
    const rows = this.sockets();
    return rows.find(row => row.definition.id === this.selectedSnapId()) ?? rows[0] ?? null;
  });

  readonly movedCount = computed(() => this.sockets().filter(row => row.moved).length);

  /**
   * Slider reach, shared by all three axes so they stay comparable. Generous
   * against the part's own size, because sockets like a wing claw sit well
   * outside the box the collider uses.
   */
  readonly axisLimit = computed(() => {
    const dimensions = this.tuned()?.dimensions;
    if (!dimensions) return 1;
    return round(Math.max(0.5, Math.max(dimensions.x, dimensions.y, dimensions.z) * 1.5), 3);
  });

  readonly snippet = computed(() => {
    const tuned = this.tuned();
    if (!tuned) return '';

    const rows = tuned.snapPoints.map(snapPoint =>
      `  { id: '${snapPoint.id}', label: '${snapPoint.label}', `
      + `localPosition: ${formatVector(snapPoint.localPosition)} },`);

    return `// ${tuned.label} (${tuned.id}) — assembly-part-definitions.ts\n`
      + `snapPoints: [\n${rows.join('\n')}\n],`;
  });

  constructor() {
    effect(() => {
      const params = this.params();
      if (!params) return;

      const family = params.get('family') as AssemblyPartFamily | null;
      if (family && FAMILIES.includes(family)) this.family.set(family);

      const part = params.get('part');
      if (part) this.selectedId.set(part);
    });

    /*
     * Keep the scene showing whatever the controls last wrote. This runs on
     * every pointermove of a drag, which is only affordable because the
     * renderer's part signature covers shape, dimensions, colour and profile
     * but not sockets: a moved socket repositions a marker and rebuilds no
     * geometry. Adding snap points to that signature would turn a drag into the
     * 60-rebuilds-a-second churn that costs the Parts Lab its WebGL context.
     */
    effect(() => {
      const tuned = this.tuned();
      if (!this.mounted() || !tuned) return;

      this.renderer.syncAssembly(blueprintFor(tuned), true);
      this.renderer.highlightSnapPoint(tuned.id, this.selectedSocket()?.definition.id ?? null);
    });
  }

  ngAfterViewInit(): void {
    const stage = this.stageRef();
    if (!stage) return;

    this.renderer.mount(stage.nativeElement);
    this.mounted.set(true);
    this.frameId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }

  selectPart(definition: AssemblyPartDefinition): void {
    this.selectedId.set(definition.id);
    this.selectedSnapId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { part: definition.id, family: this.family() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setFamily(family: AssemblyPartFamily): void {
    this.family.set(family);
    this.selectedId.set(null);
    this.selectedSnapId.set(null);
  }

  selectSocket(snapPointId: string): void {
    this.selectedSnapId.set(snapPointId);
  }

  setDragAxis(axis: DragAxis): void {
    this.dragAxis.set(axis);
  }

  // ---------------------------------------------------------------------------
  // Dragging a socket in the scene
  // ---------------------------------------------------------------------------

  onPointerDown(event: PointerEvent): void {
    const stage = this.stageRef();
    const tuned = this.tuned();
    const hit = this.renderer.pickSnapPoint(event.clientX, event.clientY);

    if (!stage || !tuned || !hit) {
      return;
    }

    const anchor = this.renderer.projectPointerToCameraPlane(
      event.clientX,
      event.clientY,
      hit.worldPosition,
    );

    if (!anchor) {
      return;
    }

    this.selectSocket(hit.id);
    // Orbiting and dragging are the same gesture; the drag claims it.
    this.renderer.setControlsEnabled(false);
    this.drag = {
      snapPointId: hit.id,
      pointerId: event.pointerId,
      anchor,
      origin: { ...hit.localPosition },
    };
    stage.nativeElement.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    // Coplanar through the anchor, so the plane stays put for the whole drag.
    const point = this.renderer.projectPointerToCameraPlane(
      event.clientX,
      event.clientY,
      drag.anchor,
    );

    if (!point) return;

    // The part is unrotated, so a world delta is a local delta. A drag is only
    // ever pixel-accurate, so a millimetre is the honest precision.
    const moved: Vector3Data = {
      x: round(drag.origin.x + point.x - drag.anchor.x, 3),
      y: round(drag.origin.y + point.y - drag.anchor.y, 3),
      z: round(drag.origin.z + point.z - drag.anchor.z, 3),
    };

    this.writeSocket(drag.snapPointId, lockToAxis(moved, drag.origin, this.dragAxis()));
  }

  onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    this.stageRef()?.nativeElement.releasePointerCapture(event.pointerId);
    this.renderer.setControlsEnabled(true);
    this.drag = null;
  }

  // ---------------------------------------------------------------------------
  // Precise editing
  // ---------------------------------------------------------------------------

  setAxis(axis: VectorAxis, event: Event): void {
    const socket = this.selectedSocket();
    const value = Number((event.target as HTMLInputElement).value);

    if (!socket || !Number.isFinite(value)) {
      return;
    }

    this.writeSocket(socket.definition.id, { ...socket.position, [axis]: value });
  }

  nudge(axis: VectorAxis, direction: 1 | -1): void {
    const socket = this.selectedSocket();
    if (!socket) return;

    this.writeSocket(socket.definition.id, {
      ...socket.position,
      // Rounded only far enough to keep float noise out of a repeated nudge.
      [axis]: round(socket.position[axis] + direction * 0.01, 5),
    });
  }

  resetSocket(): void {
    const definition = this.authored();
    const socket = this.selectedSocket();

    if (definition && socket) {
      this.draft.clearSnapOffset(definition.id, socket.definition.id);
    }
  }

  resetAll(): void {
    const definition = this.authored();

    if (definition) {
      this.draft.clearSnapOffsets(definition.id);
    }
  }

  async copySnippet(): Promise<void> {
    const snippet = this.snippet();
    if (!snippet) return;

    try {
      await navigator.clipboard.writeText(snippet);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard is blocked outside a secure context; the snippet stays on
      // screen to select by hand.
      this.copied.set(false);
    }
  }

  axisValue(axis: VectorAxis): number {
    return round(this.selectedSocket()?.position[axis] ?? 0, 3);
  }

  mateLabel(socket: SocketRow): string {
    const mates = socket.definition.mateIds ?? [];
    return mates.length ? mates.join(', ') : 'any';
  }

  /**
   * Stores verbatim. Rounding here would quantize the two axes an edit did not
   * touch, which drifts them off the authored value and leaves the socket
   * reading as moved forever. Callers round what they compute.
   */
  private writeSocket(snapPointId: string, localPosition: Vector3Data): void {
    const definition = this.authored();

    if (definition) {
      this.draft.setSnapOffset(definition.id, snapPointId, localPosition);
    }
  }

  private readonly tick = (): void => {
    this.renderer.render();
    this.frameId = requestAnimationFrame(this.tick);
  };
}

/** One part, standing at the origin, as a one-part blueprint. */
function blueprintFor(definition: AssemblyPartDefinition): AssemblyBlueprint {
  return {
    parts: [createPartFromDefinition(definition, PART_ORIGIN, definition.id)],
    joints: [],
  };
}

/** Keeps a constrained drag on its one axis, measured from where it started. */
function lockToAxis(moved: Vector3Data, origin: Vector3Data, axis: DragAxis): Vector3Data {
  return axis === 'free' ? moved : { ...origin, [axis]: moved[axis] };
}

function formatVector(vector: Vector3Data): string {
  const trim = (value: number) => round(value, 4);
  return `{ x: ${trim(vector.x)}, y: ${trim(vector.y)}, z: ${trim(vector.z)} }`;
}

function sameVector(a: Vector3Data, b: Vector3Data): boolean {
  return Math.abs(a.x - b.x) < 0.0005
    && Math.abs(a.y - b.y) < 0.0005
    && Math.abs(a.z - b.z) < 0.0005;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
