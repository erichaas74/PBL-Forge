import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssemblySnapPoint, Vector3Data } from '@pbl/assembly/domain/assembly.models';
import { AssemblyRendererService } from '@pbl/assembly/assembly-renderer.service';
import { SnapWorkshopPage } from './snap-workshop.page';
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';
import { ASSEMBLY_PART_DEFINITIONS } from '../assembly-garage/data/assembly-part-definitions';

const STORAGE_KEY = 'dragon-designer.draft.v1';

/** The part sits here, so a world point minus this is the part-local one. */
const PART_ORIGIN: Vector3Data = { x: 0, y: 1, z: 0 };

/**
 * Stands in for the WebGL renderer. The page's own logic is the drag maths and
 * what it writes to the draft; mounting a real context would test three.js.
 */
class RendererStub {
  snapPointHit: AssemblySnapPoint | null = null;
  /** Successive plane intersections: grab first, then each move. */
  planeHits: (Vector3Data | null)[] = [];
  controlsEnabled = true;
  highlighted: string | null = null;

  mount(): void { /* no context to make */ }
  dispose(): void { /* nothing to release */ }
  render(): void { /* no frame to draw */ }
  syncAssembly(): void { /* no scene to sync */ }

  highlightSnapPoint(partId: string | null, snapPointId: string | null): void {
    this.highlighted = partId && snapPointId ? `${partId}:${snapPointId}` : null;
  }

  setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
  }

  pickSnapPoint(): AssemblySnapPoint | null {
    return this.snapPointHit;
  }

  projectPointerToCameraPlane(): Vector3Data | null {
    return this.planeHits.shift() ?? null;
  }
}

describe('SnapWorkshopPage', () => {
  let fixture: ComponentFixture<SnapWorkshopPage>;
  let page: SnapWorkshopPage;
  let renderer: RendererStub;
  let draft: DesignerDragonDraftStore;

  const definition = ASSEMBLY_PART_DEFINITIONS.find(item =>
    item.family === 'dragon' && item.snapPoints.length > 1);

  function stage(): HTMLElement {
    return fixture.nativeElement.querySelector('.shop__stage');
  }

  /** A pointer event whose capture calls are inert — no real pointer exists here. */
  function pointer(id = 1): PointerEvent {
    return { pointerId: id, clientX: 10, clientY: 10 } as PointerEvent;
  }

  function snapHit(snapPointId: string, local: Vector3Data): AssemblySnapPoint {
    return {
      id: snapPointId,
      label: snapPointId,
      partId: definition!.id,
      localPosition: { ...local },
      worldPosition: {
        x: PART_ORIGIN.x + local.x,
        y: PART_ORIGIN.y + local.y,
        z: PART_ORIGIN.z + local.z,
      },
      worldRotation: { x: 0, y: 0, z: 0, w: 1 },
      mateIds: [],
      singleUse: true,
    };
  }

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [SnapWorkshopPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(SnapWorkshopPage, {
        set: { providers: [{ provide: AssemblyRendererService, useClass: RendererStub }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SnapWorkshopPage);
    page = fixture.componentInstance;
    renderer = fixture.debugElement.injector.get(
      AssemblyRendererService,
    ) as unknown as RendererStub;
    draft = TestBed.inject(DesignerDragonDraftStore);
    fixture.detectChanges();

    spyOn(stage(), 'setPointerCapture');
    spyOn(stage(), 'releasePointerCapture');
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('offers only parts that author their own sockets', () => {
    expect(page.definitions().length).toBeGreaterThan(0);
    expect(page.definitions().every(item => item.snapPoints.length > 0)).toBeTrue();
    expect(page.definitions().some(item => item.family !== 'dragon')).toBeFalse();
  });

  it('lists the selected part sockets, none of them moved yet', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    expect(page.sockets().length).toBe(definition!.snapPoints.length);
    expect(page.movedCount()).toBe(0);
    expect(page.sockets()[0].position).toEqual(definition!.snapPoints[0].localPosition);
  });

  it('moves a socket by the pointer delta, not to the pointer', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    const socketId = definition!.snapPoints[0].id;
    const local = { x: 0.2, y: 0.4, z: -0.1 };
    renderer.snapPointHit = snapHit(socketId, local);
    // Grabbed off-centre: the ray meets the plane 0.08 from the socket. The
    // socket must not jump that gap — it is a marker radius of error, which on
    // a part this size is a visible chunk of it.
    renderer.planeHits = [
      { x: 1.08, y: 1.4, z: 0.5 },
      { x: 1.28, y: 1.5, z: 0.4 },
    ];

    page.onPointerDown(pointer());
    page.onPointerMove(pointer());
    fixture.detectChanges();

    expect(draft.snapOffsetsFor(definition!.id)[socketId])
      .toEqual({ x: 0.4, y: 0.5, z: -0.2 });
    expect(page.movedCount()).toBe(1);
  });

  it('holds a socket still when the pointer has not moved off the grab point', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    const socketId = definition!.snapPoints[0].id;
    const local = { x: 0.2, y: 0.4, z: -0.1 };
    renderer.snapPointHit = snapHit(socketId, local);
    renderer.planeHits = [{ x: 1.08, y: 1.4, z: 0.5 }, { x: 1.08, y: 1.4, z: 0.5 }];

    page.onPointerDown(pointer());
    page.onPointerMove(pointer());
    fixture.detectChanges();

    expect(draft.snapOffsetsFor(definition!.id)[socketId]).toEqual(local);
  });

  it('pins the other two axes when a drag is constrained', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    const socketId = definition!.snapPoints[0].id;
    const local = { x: 0.2, y: 0.4, z: -0.1 };
    renderer.snapPointHit = snapHit(socketId, local);
    renderer.planeHits = [{ x: 1, y: 1, z: 1 }, { x: 1.5, y: 1.5, z: 1.5 }];
    page.setDragAxis('y');

    page.onPointerDown(pointer());
    page.onPointerMove(pointer());
    fixture.detectChanges();

    expect(draft.snapOffsetsFor(definition!.id)[socketId])
      .toEqual({ x: 0.2, y: 0.9, z: -0.1 });
  });

  it('claims the gesture from the orbit controls for the length of the drag', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    renderer.snapPointHit = snapHit(definition!.snapPoints[0].id, { x: 0, y: 0, z: 0 });
    renderer.planeHits = [{ x: 0, y: 1, z: 0 }];

    page.onPointerDown(pointer());
    expect(renderer.controlsEnabled).toBeFalse();

    page.onPointerUp(pointer());
    expect(renderer.controlsEnabled).toBeTrue();
  });

  it('ignores a drag that started on empty space', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    renderer.snapPointHit = null;
    page.onPointerDown(pointer());
    renderer.planeHits = [{ x: 5, y: 1, z: 5 }];
    page.onPointerMove(pointer());

    expect(page.movedCount()).toBe(0);
    expect(renderer.controlsEnabled).toBeTrue();
  });

  it('writes one axis at a time from the number controls', () => {
    page.selectPart(definition!);
    page.selectSocket(definition!.snapPoints[0].id);
    fixture.detectChanges();

    const authored = definition!.snapPoints[0].localPosition;
    page.setAxis('y', { target: { value: '0.42' } } as unknown as Event);
    fixture.detectChanges();

    const socket = page.selectedSocket();
    expect(socket?.position.y).toBe(0.42);
    expect(socket?.position.x).toBeCloseTo(authored.x, 6);
    expect(socket?.position.z).toBeCloseTo(authored.z, 6);
  });

  it('nudges by a hundredth of a metre', () => {
    page.selectPart(definition!);
    page.selectSocket(definition!.snapPoints[0].id);
    fixture.detectChanges();

    const before = page.selectedSocket()!.position.x;
    page.nudge('x', 1);
    fixture.detectChanges();

    expect(page.selectedSocket()?.position.x).toBeCloseTo(before + 0.01, 6);
  });

  it('resets one socket back to the authored position', () => {
    page.selectPart(definition!);
    page.selectSocket(definition!.snapPoints[0].id);
    fixture.detectChanges();

    page.setAxis('y', { target: { value: '0.42' } } as unknown as Event);
    fixture.detectChanges();
    page.resetSocket();
    fixture.detectChanges();

    expect(page.selectedSocket()?.position).toEqual(definition!.snapPoints[0].localPosition);
    expect(page.movedCount()).toBe(0);
  });

  it('resets every moved socket on the part', () => {
    page.selectPart(definition!);
    fixture.detectChanges();

    draft.setSnapOffset(definition!.id, definition!.snapPoints[0].id, { x: 1, y: 1, z: 1 });
    draft.setSnapOffset(definition!.id, definition!.snapPoints[1].id, { x: 2, y: 2, z: 2 });
    fixture.detectChanges();
    expect(page.movedCount()).toBe(2);

    page.resetAll();
    fixture.detectChanges();

    expect(page.movedCount()).toBe(0);
  });

  it('highlights the socket the controls are pointed at', () => {
    page.selectPart(definition!);
    page.selectSocket(definition!.snapPoints[1].id);
    fixture.detectChanges();

    expect(renderer.highlighted).toBe(`${definition!.id}:${definition!.snapPoints[1].id}`);
  });

  it('writes a paste-ready snapPoints block carrying the edit', () => {
    page.selectPart(definition!);
    page.selectSocket(definition!.snapPoints[0].id);
    fixture.detectChanges();

    page.setAxis('y', { target: { value: '0.42' } } as unknown as Event);
    fixture.detectChanges();

    const snippet = page.snippet();
    expect(snippet).toContain('snapPoints: [');
    expect(snippet).toContain(definition!.snapPoints[0].id);
    expect(snippet).toContain('y: 0.42');
  });
});
