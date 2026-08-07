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
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { AlleleLocusView } from './allele-switchboard.view-model';

@Component({
  selector: 'app-chromosome-spatial-view',
  template: `
    <section class="spatial-instrument" [class.disabled]="disabled()">
      <div
        #viewport
        class="viewport"
        role="application"
        tabindex="0"
        aria-label="Interactive 3D homologous chromosome pair. Drag to rotate, use the mouse wheel to zoom, and select a glowing gene band to move the reticle."
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (wheel)="onWheel($event)"
        (keydown)="onKeyDown($event)">
        @if (!webglAvailable()) {
          <div class="fallback" role="img" aria-label="Homologous chromosome pair">
            <i></i><i></i>
            <span>3D view unavailable · use locus controls below</span>
          </div>
        }
        <div class="scan-lines" aria-hidden="true"></div>
        <div class="hud hud-top" aria-hidden="true">
          <span>SPATIAL LOCUS SCAN</span><b>CHR {{ chromosomeNumber() }}</b>
        </div>
        <div class="hud hud-bottom">
          <span><i class="drag-icon" aria-hidden="true"></i>DRAG TO ORBIT</span>
          <span>SCROLL TO ZOOM</span>
          <button type="button" (click)="resetView($event)">RESET VIEW</button>
        </div>
      </div>

      <div class="locus-controls" aria-label="Select a chromosome locus">
        @for (locus of loci(); track locus.geneId; let index = $index) {
          <button
            type="button"
            [class.centered]="locus.centered"
            [class.target]="locus.targetVisible"
            [class.locked]="locus.locked"
            [disabled]="disabled() || locus.locked"
            [attr.aria-pressed]="locus.centered"
            (click)="chooseLocus(index)">
            <i aria-hidden="true"></i><span>{{ locus.geneId }}</span>
          </button>
        }
        <button
          type="button"
          class="lock-control"
          [disabled]="disabled() || locked()"
          (click)="requestLock()">
          {{ locked() ? 'LOCUS LOCKED' : 'LOCK RETICLE' }}
        </button>
      </div>
    </section>
  `,
  styleUrl: './chromosome-spatial-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChromosomeSpatialViewComponent implements AfterViewInit, OnDestroy {
  readonly chromosomeNumber = input<number | null>(null);
  readonly loci = input<readonly AlleleLocusView[]>([]);
  readonly banding = input(false);
  readonly fluorescence = input(false);
  readonly compareCopies = input(true);
  readonly disabled = input(false);
  readonly locked = input(false);
  readonly reducedMotion = input(false);

  readonly locusSelected = output<number>();
  readonly lockRequested = output<void>();
  readonly webglAvailable = signal(true);

  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLElement>;

  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  private readonly specimen = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly locusMeshes: THREE.Mesh[] = [];
  private readonly disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private frameId: number | null = null;
  private dragging = false;
  private moved = false;
  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private targetRotation = { x: -0.08, y: 0.18 };
  private zoom = 10.5;

  private readonly sceneSync = effect(() => {
    const loci = this.loci();
    const banding = this.banding();
    const fluorescence = this.fluorescence();
    const compareCopies = this.compareCopies();
    if (!this.renderer) return;
    this.rebuildSpecimen(loci, banding, fluorescence, compareCopies);
  });

  ngAfterViewInit(): void {
    const host = this.viewportRef.nativeElement;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.18;
      this.renderer.domElement.setAttribute('aria-hidden', 'true');
      host.prepend(this.renderer.domElement);
    } catch {
      this.webglAvailable.set(false);
      return;
    }

    this.camera.position.set(0, 0.15, this.zoom);
    this.scene.add(this.specimen);
    this.scene.add(new THREE.HemisphereLight('#9feaff', '#07111c', 2.2));
    const key = new THREE.DirectionalLight('#fff1cf', 3.5);
    key.position.set(4, 6, 7);
    this.scene.add(key);
    const rim = new THREE.PointLight('#65f5dc', 24, 18);
    rim.position.set(-4, 2, 3);
    this.scene.add(rim);

    this.rebuildSpecimen(this.loci(), this.banding(), this.fluorescence(), this.compareCopies());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frameId = requestAnimationFrame(this.renderFrame);
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.sceneSync.destroy();
    this.disposeSpecimen();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  chooseLocus(index: number): void {
    if (!this.disabled()) this.locusSelected.emit(index);
  }

  requestLock(): void {
    if (!this.disabled() && !this.locked()) this.lockRequested.emit();
  }

  resetView(event?: Event): void {
    event?.stopPropagation();
    this.targetRotation = { x: -0.08, y: 0.18 };
    this.zoom = 10.5;
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.dragging = true;
    this.moved = false;
    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
    this.targetRotation.y += dx * 0.009;
    this.targetRotation.x = THREE.MathUtils.clamp(this.targetRotation.x + dy * 0.006, -0.65, 0.65);
    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    if (!this.moved) this.pickLocus(event);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoom = THREE.MathUtils.clamp(this.zoom + event.deltaY * 0.006, 7.2, 14);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.targetRotation.y -= 0.18;
    else if (event.key === 'ArrowRight') this.targetRotation.y += 0.18;
    else if (event.key === 'ArrowUp') this.zoom = Math.max(7.2, this.zoom - 0.45);
    else if (event.key === 'ArrowDown') this.zoom = Math.min(14, this.zoom + 0.45);
    else if (event.key.toLowerCase() === 'r') this.resetView();
    else return;
    event.preventDefault();
  }

  private pickLocus(event: PointerEvent): void {
    if (!this.renderer || this.disabled()) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.locusMeshes, false)[0];
    const index = hit?.object.userData['locusIndex'];
    if (typeof index === 'number') this.chooseLocus(index);
  }

  private rebuildSpecimen(
    loci: readonly AlleleLocusView[],
    banding: boolean,
    fluorescence: boolean,
    compareCopies: boolean,
  ): void {
    this.disposeSpecimen();
    this.specimen.clear();
    this.locusMeshes.length = 0;

    const chromosomeMaterial = this.material('#588ba3', '#1b3b4d', 0.55, 0.35);
    const secondMaterial = this.material('#7b8eb8', '#253550', 0.5, 0.32);
    const xPositions = compareCopies ? [-1.55, 1.55] : [-0.62, 0.62];

    xPositions.forEach((x, copyIndex) => {
      const homolog = new THREE.Group();
      homolog.position.x = x;
      homolog.scale.setScalar(compareCopies ? 1 : 1.08);
      this.addChromatid(homolog, -0.32, chromosomeMaterial);
      this.addChromatid(homolog, 0.32, copyIndex === 0 ? chromosomeMaterial : secondMaterial);

      loci.forEach((locus, index) => {
        const y = loci.length <= 1 ? 0 : 2.55 - index * (5.1 / (loci.length - 1));
        const color = locus.locked
          ? '#ffd36d'
          : locus.centered
            ? '#67f4df'
            : locus.targetVisible
              ? '#ffac66'
              : banding
                ? (index % 2 === 0 ? '#a8d2df' : '#44697b')
                : '#7297a8';
        const geometry = new THREE.TorusGeometry(0.7, locus.centered ? 0.105 : 0.065, 12, 40);
        const material = this.material(color, fluorescence || locus.centered ? color : '#132934', 0.32, 0.1);
        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(0, y, 0);
        ring.rotation.x = Math.PI / 2;
        ring.userData['locusIndex'] = index;
        homolog.add(ring);
        this.locusMeshes.push(ring);
      });

      this.specimen.add(homolog);
    });

    const centerGeometry = new THREE.TorusGeometry(3.55, 0.018, 8, 96);
    const centerMaterial = this.material('#66eed8', '#66eed8', 0.2, 0);
    const reticle = new THREE.Mesh(centerGeometry, centerMaterial);
    reticle.rotation.x = Math.PI / 2;
    const centeredIndex = Math.max(0, loci.findIndex(locus => locus.centered));
    reticle.position.y = loci.length <= 1 ? 0 : 2.55 - centeredIndex * (5.1 / (loci.length - 1));
    this.specimen.add(reticle);
  }

  private addChromatid(group: THREE.Group, offset: number, material: THREE.Material): void {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-offset, 3.2, 0),
      new THREE.Vector3(offset * 0.55, 1.35, 0.08),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-offset * 0.55, -1.35, -0.08),
      new THREE.Vector3(offset, -3.2, 0),
    ]);
    const geometry = new THREE.TubeGeometry(curve, 48, 0.23, 12, false);
    this.disposables.push(geometry);
    group.add(new THREE.Mesh(geometry, material));
  }

  private material(color: string, emissive: string, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: emissive === color ? 1.8 : 0.28,
      roughness,
      metalness,
    });
    this.disposables.push(material);
    return material;
  }

  private disposeSpecimen(): void {
    for (const disposable of this.disposables) disposable.dispose();
    this.disposables.length = 0;
  }

  private resize(): void {
    if (!this.renderer) return;
    const host = this.viewportRef.nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly renderFrame = (): void => {
    if (!this.renderer) return;
    const damping = this.reducedMotion() ? 1 : 0.12;
    this.specimen.rotation.x += (this.targetRotation.x - this.specimen.rotation.x) * damping;
    this.specimen.rotation.y += (this.targetRotation.y - this.specimen.rotation.y) * damping;
    this.camera.position.z += (this.zoom - this.camera.position.z) * damping;
    if (!this.dragging && !this.reducedMotion()) this.targetRotation.y += 0.0008;
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.renderFrame);
  };
}
