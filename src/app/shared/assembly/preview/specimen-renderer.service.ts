import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssemblyPartRole } from '../domain/assembly.models';
import {
  applyAssemblyTraitFocus,
  createAssemblyObject,
  disposeAssemblyObject,
} from '../rendering/three-assembly-mesh.factory';
import { RenderQuality } from '../rendering/render-quality';
import {
  SPECIMEN_STAGE_THEME,
  StageTheme,
  configureStageRenderer,
  createStageLighting,
  installStageEnvironment,
} from '../rendering/scene-environment';
import { SpecimenDescriptor, traitFocusRoles } from './specimen.models';
import {
  SpecimenFrame,
  SpecimenPoseOptions,
  buildSpecimenPose,
  estimateSpecimenFloor,
  estimateSpecimenFrame,
} from './specimen-pose';

/**
 * A specimen viewer: one assembly, posed statically, drawn on demand.
 *
 * Deliberately *not* the arena or the garage renderer. There is no physics
 * world, no joint overlay, no snap points, no picking, and no permanent
 * animation loop — a still specimen costs exactly one frame. That is what makes
 * it affordable to put next to a Punnett square, and to run several of them on
 * one page.
 */

export interface SpecimenRendererOptions {
  quality?: RenderQuality;
  theme?: StageTheme;
  /** Orbit with the pointer. Off for thumbnails and decorative embeds. */
  interactive?: boolean;
  /** Transparent canvas, so the host panel's background shows through. */
  transparent?: boolean;
  /** Required to read pixels back out of the canvas (thumbnail baking). */
  preserveDrawingBuffer?: boolean;
  /** Ground shadow catcher under the specimen. */
  showGroundShadow?: boolean;
  pose?: SpecimenPoseOptions;
  /** Camera padding around the framing sphere. 1 is tight. */
  framePadding?: number;
}

export interface ShowSpecimenOptions {
  /**
   * Framing to use instead of this specimen's own. Pass a merged frame when
   * specimens are compared side by side, so real size differences survive.
   */
  frame?: SpecimenFrame | null;
  focusedTraitId?: string | null;
}

const VIEW_DIRECTION = new THREE.Vector3(0.86, 0.42, 1).normalize();
const DEFAULT_FRAME_PADDING = 1.18;

@Injectable()
export class SpecimenRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private specimenGroup: THREE.Group | null = null;
  private groundShadow: THREE.Mesh | null = null;
  private disposeEnvironmentMap: (() => void) | null = null;
  private options: SpecimenRendererOptions = {};
  private descriptor: SpecimenDescriptor | null = null;
  private activeFrame: SpecimenFrame | null = null;
  private pendingFrameId: number | null = null;
  private turntableFrameId: number | null = null;
  private turntableAngle = 0;
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly partRoles = new Map<string, readonly AssemblyPartRole[]>();

  mount(host: HTMLElement, options: SpecimenRendererOptions = {}): void {
    this.dispose();
    this.host = host;
    this.options = options;

    const theme = options.theme ?? SPECIMEN_STAGE_THEME;
    // Small viewports never earn the post chain, so the quality tier is a floor
    // rather than a device probe: 'low' skips GTAO, bloom, and SMAA entirely.
    const quality: RenderQuality = options.quality ?? 'low';

    const scene = new THREE.Scene();
    if (!options.transparent) {
      scene.background = new THREE.Color(theme.skyBottom);
    }
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: Boolean(options.transparent),
      preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer),
    });
    configureStageRenderer(renderer, quality);
    if (options.transparent) renderer.setClearAlpha(0);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Image-based lighting is what makes the scale/horn/membrane materials read
    // as materials rather than flat colour. It is a one-off bake, and the
    // single biggest quality-per-millisecond win at this size.
    this.disposeEnvironmentMap = installStageEnvironment(scene, renderer, theme);
    scene.add(createStageLighting(theme, { width: 6, depth: 6 }, quality));

    if (options.interactive) {
      const controls = new OrbitControls(camera, renderer.domElement);
      // Damping needs a frame loop to settle; render-on-demand has none, so the
      // motion would stall mid-glide. Straight tracking is correct here.
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.addEventListener('change', () => this.requestRender());
      this.controls = controls;
    }

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  show(descriptor: SpecimenDescriptor, options: ShowSpecimenOptions = {}): void {
    if (!this.scene) return;

    this.clearSpecimen();
    this.descriptor = descriptor;

    const pose = buildSpecimenPose(descriptor.blueprint, this.options.pose);
    const group = new THREE.Group();

    for (const part of descriptor.blueprint.parts) {
      const posed = pose.parts.find(entry => entry.partId === part.id);
      const object = createAssemblyObject(part, { proceduralOnly: true });
      const position = posed?.position ?? part.position;
      const rotation = posed?.rotation ?? part.rotation;

      object.position.set(position.x, position.y, position.z);
      if (rotation) object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      group.add(object);
      this.partObjects.set(part.id, object);
      this.partRoles.set(part.id, part.roles ?? []);
    }

    this.scene.add(group);
    this.specimenGroup = group;
    group.rotation.y = this.turntableAngle;

    this.activeFrame = options.frame ?? estimateSpecimenFrame(descriptor.blueprint, pose);
    this.syncGroundShadow(estimateSpecimenFloor(descriptor.blueprint, pose));
    this.applyFrame();
    this.setTraitFocus(options.focusedTraitId ?? null);
    this.requestRender();
  }

  /** Highlights the parts one trait shaped; `null` restores every part. */
  setTraitFocus(traitId: string | null): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;

    const roles = traitFocusRoles(descriptor, traitId);

    for (const [partId, object] of this.partObjects) {
      if (roles === null) {
        applyAssemblyTraitFocus(object, null);
        continue;
      }
      const partRoles = this.partRoles.get(partId) ?? [];
      applyAssemblyTraitFocus(object, partRoles.some(role => roles.includes(role)));
    }

    this.requestRender();
  }

  /**
   * Slow rotation. Off by default and refused under `prefers-reduced-motion`,
   * because it is decoration — every trait it reveals is also readable from the
   * static three-quarter view.
   */
  setTurntable(enabled: boolean): void {
    if (enabled && prefersReducedMotion()) enabled = false;

    if (!enabled) {
      if (this.turntableFrameId !== null) cancelAnimationFrame(this.turntableFrameId);
      this.turntableFrameId = null;
      return;
    }

    if (this.turntableFrameId !== null) return;

    let previous = 0;
    const step = (time: number): void => {
      const delta = previous === 0 ? 0 : Math.min((time - previous) / 1000, 0.05);
      previous = time;
      this.turntableAngle = (this.turntableAngle + delta * 0.45) % (Math.PI * 2);
      if (this.specimenGroup) this.specimenGroup.rotation.y = this.turntableAngle;
      this.renderNow();
      this.turntableFrameId = requestAnimationFrame(step);
    };

    this.turntableFrameId = requestAnimationFrame(step);
  }

  /** Coalesces repeated calls in one task into a single frame. */
  requestRender(): void {
    if (this.pendingFrameId !== null || this.turntableFrameId !== null) return;
    this.pendingFrameId = requestAnimationFrame(() => {
      this.pendingFrameId = null;
      this.renderNow();
    });
  }

  /** Renders synchronously. Needed before reading pixels back off the canvas. */
  renderNow(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  /** PNG data URL of the current frame. Requires `preserveDrawingBuffer`. */
  toDataUrl(): string | null {
    if (!this.renderer) return null;
    this.renderNow();
    return this.renderer.domElement.toDataURL('image/png');
  }

  /** Explicit size for offscreen use, where there is no layout to observe. */
  setSize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    this.applyFrame();
  }

  dispose(): void {
    if (this.pendingFrameId !== null) cancelAnimationFrame(this.pendingFrameId);
    if (this.turntableFrameId !== null) cancelAnimationFrame(this.turntableFrameId);
    this.pendingFrameId = null;
    this.turntableFrameId = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.clearSpecimen();

    if (this.groundShadow) {
      this.scene?.remove(this.groundShadow);
      this.groundShadow.geometry.dispose();
      if (!Array.isArray(this.groundShadow.material)) this.groundShadow.material.dispose();
      this.groundShadow = null;
    }

    this.disposeEnvironmentMap?.();
    this.disposeEnvironmentMap = null;
    this.controls?.dispose();
    this.controls = null;

    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.host = null;
    this.descriptor = null;
    this.activeFrame = null;
  }

  private clearSpecimen(): void {
    if (this.specimenGroup) {
      this.scene?.remove(this.specimenGroup);
      disposeAssemblyObject(this.specimenGroup);
      this.specimenGroup = null;
    }
    this.partObjects.clear();
    this.partRoles.clear();
  }

  /**
   * Fits the camera to the framing sphere. Fitting is not cosmetic: body scale
   * spans 0.78-1.33 and wing span 0.72-1.57 across genomes, so a fixed camera
   * would crop large specimens and strand small ones in empty space.
   */
  private applyFrame(): void {
    const camera = this.camera;
    const frame = this.activeFrame;
    if (!camera || !frame) return;

    const fov = (camera.fov * Math.PI) / 180;
    const vertical = frame.radius / Math.sin(fov / 2);
    const horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * Math.max(camera.aspect, 0.0001));
    const horizontal = frame.radius / Math.sin(horizontalFov / 2);
    const distance = Math.max(vertical, horizontal)
      * (this.options.framePadding ?? DEFAULT_FRAME_PADDING);

    const target = new THREE.Vector3(frame.center.x, frame.center.y, frame.center.z);
    camera.position.copy(target).addScaledVector(VIEW_DIRECTION, distance);
    camera.near = Math.max(distance - frame.radius * 3, 0.05);
    camera.far = distance + frame.radius * 6;
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    if (this.controls) {
      this.controls.target.copy(target);
      this.controls.update();
    }

    // The turntable spins the specimen, so its pivot has to be the frame centre
    // or the specimen would orbit out of shot.
    if (this.specimenGroup) {
      this.specimenGroup.position.set(0, 0, 0);
    }
  }

  private syncGroundShadow(floorY: number): void {
    if (!this.scene || !this.options.showGroundShadow) return;

    if (!this.groundShadow) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1, 32),
        new THREE.ShadowMaterial({ color: 0x1f2937, opacity: 0.2 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.groundShadow = mesh;
    }

    const radius = this.activeFrame?.radius ?? 1;
    this.groundShadow.scale.setScalar(radius * 1.4);
    this.groundShadow.position.set(
      this.activeFrame?.center.x ?? 0,
      floorY - 0.01,
      this.activeFrame?.center.z ?? 0,
    );
  }

  private resize(): void {
    if (!this.host) return;
    this.setSize(this.host.clientWidth, this.host.clientHeight);
    this.requestRender();
  }
}

/** WebGL2 probe, so hosts can fall back before mounting anything. */
export function isSpecimenRenderingAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return Boolean(globalThis.WebGL2RenderingContext)
      && Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
