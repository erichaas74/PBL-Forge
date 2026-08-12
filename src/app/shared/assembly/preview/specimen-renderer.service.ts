import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssemblyPartRole, Vector3Data } from '../domain/assembly.models';
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
import {
  AssemblyAbilityId,
  FIRE_BREATH_TUNING,
  FIRE_BREATH_VISUAL_RADIUS_RATIO,
} from '../combat/assembly-abilities';
import { SpecimenDescriptor, traitFocusRoles } from './specimen.models';
import {
  SpecimenFrame,
  SpecimenPose,
  SpecimenPoseOptions,
  buildSpecimenPose,
  estimateSpecimenFloor,
  estimateSpecimenFrame,
  mergeSpecimenFrames,
} from './specimen-pose';
import { getAbilityDemo, poseSpecimenForAbility, resolveFireOrigin } from './specimen-ability-pose';

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
  /** Direction from the specimen to the camera. Defaults to a three-quarter view. */
  viewDirection?: Vector3Data;
}

export interface ShowSpecimenOptions {
  /**
   * Framing to use instead of this specimen's own. Pass a merged frame when
   * specimens are compared side by side, so real size differences survive.
   */
  frame?: SpecimenFrame | null;
  focusedTraitId?: string | null;
  /** Overrides the mount-time resting pose for this specimen only. */
  pose?: SpecimenPoseOptions;
}

const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(0.86, 0.42, 1).normalize();
/**
 * Slack around the fitted extents. The procedural meshes reach a little past
 * the boxes they are estimated from (wing membranes especially), so a tight fit
 * would clip wingtips.
 */
const DEFAULT_FRAME_PADDING = 1.12;
const MIN_ZOOM_LEVEL = 0.65;
const MAX_ZOOM_LEVEL = 2;

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
  /** Framing for the specimen alone, restored after a wider ability demo. */
  private baseFrame: SpecimenFrame | null = null;
  private pendingFrameId: number | null = null;
  private turntableFrameId: number | null = null;
  private turntableAngle = 0;
  private demoFrameId: number | null = null;
  private fireCone: THREE.Mesh | null = null;
  private viewDirection = DEFAULT_VIEW_DIRECTION.clone();
  /** 1 fits the whole specimen; larger values move the camera closer. */
  private zoomLevel = 1;
  /** Resting pose for the current specimen; a show() override beats the mount default. */
  private activePose: SpecimenPoseOptions | undefined;
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly partRoles = new Map<string, readonly AssemblyPartRole[]>();
  private lastShowOptions: ShowSpecimenOptions = {};

  /**
   * True while the GPU has taken the drawing context away.
   *
   * Browsers drop WebGL contexts under memory pressure, when too many live at
   * once, or when one thrashes allocations — and without handling it the canvas
   * is simply dead forever, which reads to a user as "the preview broke".
   */
  readonly contextLost = signal(false);

  mount(host: HTMLElement, options: SpecimenRendererOptions = {}): void {
    this.dispose();
    this.host = host;
    this.options = options;
    this.setViewDirectionVector(options.viewDirection);

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

    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.contextLost.set(false);

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
      controls.addEventListener('change', () => {
        const orbitDirection = camera.position.clone().sub(controls.target);
        if (orbitDirection.lengthSq() >= 1e-8) this.viewDirection.copy(orbitDirection.normalize());
        this.requestRender();
      });
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
    this.lastShowOptions = options;
    this.activePose = options.pose ?? this.options.pose;

    const pose = buildSpecimenPose(descriptor.blueprint, this.activePose);
    const frame = options.frame ?? estimateSpecimenFrame(descriptor.blueprint, pose);

    // Two nested groups so the turntable spins around the framing centre rather
    // than the world origin. Parts are posed in world coordinates and a
    // specimen's centre is rarely at the origin — a dragon's tail drags it back
    // along -x — so rotating the outer group directly would swing the specimen
    // out of shot.
    const pivot = new THREE.Group();
    pivot.position.set(frame.center.x, frame.center.y, frame.center.z);
    const content = new THREE.Group();
    content.position.set(-frame.center.x, -frame.center.y, -frame.center.z);
    pivot.add(content);

    for (const part of descriptor.blueprint.parts) {
      const posed = pose.parts.find(entry => entry.partId === part.id);
      const object = createAssemblyObject(part, { proceduralOnly: true });
      const position = posed?.position ?? part.position;
      const rotation = posed?.rotation ?? part.rotation;

      object.position.set(position.x, position.y, position.z);
      if (rotation) object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      content.add(object);
      this.partObjects.set(part.id, object);
      this.partRoles.set(part.id, part.roles ?? []);
    }

    this.scene.add(pivot);
    this.specimenGroup = pivot;
    pivot.rotation.y = this.turntableAngle;

    this.activeFrame = frame;
    this.baseFrame = frame;
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
   * Plays one attack as a scripted pose sequence, resolving when it finishes.
   *
   * No physics and no opponent: this shows a student *that they have the move
   * and what it looks like*, which is the question the bench answers. The
   * damage numbers beside it come from the arena's real tuning.
   *
   * Under `prefers-reduced-motion` the demo jumps to the strike pose and holds
   * it, so the information still arrives without the movement.
   */
  playAbility(ability: AssemblyAbilityId): Promise<void> {
    const descriptor = this.descriptor;
    if (!descriptor) return Promise.resolve();

    this.stopAbility();
    const demo = getAbilityDemo(ability);

    // Fire reaches well past the body, so the camera pulls back for the demo.
    // Seeing how far the breath actually carries relative to the dragon is the
    // point of showing it here at all.
    this.applyAbilityFraming(ability);

    if (prefersReducedMotion()) {
      this.applyAbilityPhase(ability, demo.strikeAt);
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      const startedAt = performance.now();
      const step = (): void => {
        const elapsed = (performance.now() - startedAt) / 1000;
        const phase = Math.min(elapsed / demo.durationSeconds, 1);
        this.applyAbilityPhase(ability, phase);

        if (phase >= 1) {
          this.demoFrameId = null;
          this.restPose();
          resolve();
          return;
        }
        this.demoFrameId = requestAnimationFrame(step);
      };
      this.demoFrameId = requestAnimationFrame(step);
    });
  }

  /** Widens the frame for abilities that reach beyond the body. */
  private applyAbilityFraming(ability: AssemblyAbilityId): void {
    const descriptor = this.descriptor;
    if (!descriptor || !this.baseFrame) return;

    if (ability !== 'fire-breath') {
      this.activeFrame = this.baseFrame;
      this.applyFrame();
      return;
    }

    const pose = buildSpecimenPose(descriptor.blueprint, this.activePose);
    const aim = resolveFireOrigin(descriptor.blueprint, pose);
    if (!aim) return;

    const range = FIRE_BREATH_TUNING.range;
    const coneRadius = range * FIRE_BREATH_VISUAL_RADIUS_RATIO;
    this.activeFrame = mergeSpecimenFrames([
      this.baseFrame,
      {
        center: {
          x: aim.origin.x + aim.direction.x * range * 0.5,
          y: aim.origin.y + aim.direction.y * range * 0.5,
          z: aim.origin.z + aim.direction.z * range * 0.5,
        },
        radius: Math.max(range * 0.5, coneRadius),
        halfHeight: coneRadius,
      },
    ]);
    this.applyFrame();
  }

  /** Stops any running demonstration and returns to the resting pose. */
  stopAbility(): void {
    if (this.demoFrameId !== null) {
      cancelAnimationFrame(this.demoFrameId);
      this.demoFrameId = null;
    }
    this.restPose();
  }

  private applyAbilityPhase(ability: AssemblyAbilityId, phase: number): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;

    const demo = getAbilityDemo(ability);
    const pose = poseSpecimenForAbility(
      descriptor.blueprint,
      ability,
      phase,
      this.activePose?.droopRadians ?? 0,
    );

    this.applyPose(pose);
    this.syncFireCone(demo.fireConeAt?.(phase) ? pose : null);
    this.renderNow();
  }

  private restPose(): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;
    this.applyPose(buildSpecimenPose(descriptor.blueprint, this.activePose));
    this.syncFireCone(null);

    if (this.baseFrame && this.activeFrame !== this.baseFrame) {
      this.activeFrame = this.baseFrame;
      this.applyFrame();
    }

    this.requestRender();
  }

  /** Moves the existing part objects; never rebuilds geometry. */
  private applyPose(pose: SpecimenPose): void {
    for (const posed of pose.parts) {
      const object = this.partObjects.get(posed.partId);
      if (!object) continue;
      object.position.set(posed.position.x, posed.position.y, posed.position.z);
      object.quaternion.set(
        posed.rotation.x,
        posed.rotation.y,
        posed.rotation.z,
        posed.rotation.w,
      );
    }
  }

  /**
   * The fire cone, drawn from the mouth with the arena's real range and angle —
   * so a student can see how far the breath actually reaches, which is the part
   * that is invisible in a battle.
   */
  private syncFireCone(pose: SpecimenPose | null): void {
    const descriptor = this.descriptor;
    const content = this.specimenGroup?.children[0];

    if (!pose || !descriptor || !content) {
      if (this.fireCone) this.fireCone.visible = false;
      return;
    }

    const aim = resolveFireOrigin(descriptor.blueprint, pose);
    if (!aim) return;

    if (!this.fireCone) {
      const radius = FIRE_BREATH_TUNING.range * FIRE_BREATH_VISUAL_RADIUS_RATIO;
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, FIRE_BREATH_TUNING.range, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff6a1a,
          transparent: true,
          opacity: 0.55,
          // Normal blending, unlike the arena's additive cone: this stage is
          // near-white, and additive orange on white saturates to invisible.
          blending: THREE.NormalBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      // Sits with the specimen so it follows the turntable.
      content.add(mesh);
      this.fireCone = mesh;
    }

    const direction = new THREE.Vector3(aim.direction.x, aim.direction.y, aim.direction.z).normalize();
    // Cone tip (+y in local space) points back at the mouth; the base flares away.
    this.fireCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().negate());
    this.fireCone.position.set(
      aim.origin.x + direction.x * FIRE_BREATH_TUNING.range * 0.5,
      aim.origin.y + direction.y * FIRE_BREATH_TUNING.range * 0.5,
      aim.origin.z + direction.z * FIRE_BREATH_TUNING.range * 0.5,
    );
    const flicker = 0.9 + Math.random() * 0.2;
    this.fireCone.scale.set(flicker, 1, flicker);
    this.fireCone.visible = true;
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

  /**
   * Rebuilds after a lost context. Called automatically on
   * `webglcontextrestored`, and available as a manual retry for the case where
   * the browser never fires it.
   */
  recover(): void {
    const host = this.host;
    if (!host) return;

    const options = this.options;
    const descriptor = this.descriptor;
    const showOptions = this.lastShowOptions;
    const view = { x: this.viewDirection.x, y: this.viewDirection.y, z: this.viewDirection.z };

    this.dispose();
    this.mount(host, { ...options, viewDirection: view });
    if (descriptor) this.show(descriptor, showOptions);
  }

  private readonly handleContextLost = (event: Event): void => {
    // Without preventDefault the browser will not attempt restoration at all.
    event.preventDefault();
    this.contextLost.set(true);

    if (this.pendingFrameId !== null) cancelAnimationFrame(this.pendingFrameId);
    if (this.turntableFrameId !== null) cancelAnimationFrame(this.turntableFrameId);
    if (this.demoFrameId !== null) cancelAnimationFrame(this.demoFrameId);
    this.pendingFrameId = null;
    this.turntableFrameId = null;
    this.demoFrameId = null;
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost.set(false);
    // A restored context has no GPU-side resources left, so rebuilding from
    // scratch is both simpler and more reliable than re-uploading in place.
    this.recover();
  };

  /** Coalesces repeated calls in one task into a single frame. */
  requestRender(): void {
    // A running loop already renders every frame; scheduling another is waste.
    if (this.pendingFrameId !== null || this.turntableFrameId !== null || this.demoFrameId !== null) {
      return;
    }
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

  /**
   * Moves the camera to a new angle around the specimen. Used by the parts lab
   * to show one part from several sides through a single WebGL context.
   */
  setViewDirection(direction: Vector3Data | undefined): void {
    this.setViewDirectionVector(direction);
    this.applyFrame();
    this.requestRender();
  }

  /**
   * Changes camera magnification without rebuilding or scaling the specimen.
   * Returns the clamped level so view controls can display the real value.
   */
  setZoomLevel(level: number): number {
    this.zoomLevel = THREE.MathUtils.clamp(level, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
    this.applyFrame();
    this.requestRender();
    return this.zoomLevel;
  }

  resetZoom(): number {
    return this.setZoomLevel(1);
  }

  /** Removes the current specimen while keeping the WebGL context and camera available. */
  clear(): void {
    this.clearSpecimen();
    this.descriptor = null;
    this.activeFrame = null;
    this.baseFrame = null;
    if (this.groundShadow) this.groundShadow.visible = false;
    this.requestRender();
  }

  private setViewDirectionVector(direction: Vector3Data | undefined): void {
    if (!direction) {
      this.viewDirection = DEFAULT_VIEW_DIRECTION.clone();
      return;
    }
    const next = new THREE.Vector3(direction.x, direction.y, direction.z);
    this.viewDirection = next.lengthSq() < 1e-8
      ? DEFAULT_VIEW_DIRECTION.clone()
      : next.normalize();
  }

  /** Explicit size for offscreen use, where there is no layout to observe. */
  setSize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    // `updateStyle` left on so three.js writes the canvas CSS size itself.
    // Passing false relies on a stylesheet rule sizing the canvas, and Angular
    // scopes component CSS by `_ngcontent` attributes that a canvas created in
    // JS never carries — so at devicePixelRatio 2 the element laid out at twice
    // its container and only the top-left quadrant was visible.
    this.renderer.setSize(Math.max(width, 1), Math.max(height, 1));
    this.applyFrame();
  }

  dispose(): void {
    if (this.pendingFrameId !== null) cancelAnimationFrame(this.pendingFrameId);
    if (this.turntableFrameId !== null) cancelAnimationFrame(this.turntableFrameId);
    if (this.demoFrameId !== null) cancelAnimationFrame(this.demoFrameId);
    this.pendingFrameId = null;
    this.turntableFrameId = null;
    this.demoFrameId = null;

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
      this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.host = null;
    this.descriptor = null;
    this.activeFrame = null;
    this.zoomLevel = 1;
  }

  private clearSpecimen(): void {
    if (this.demoFrameId !== null) {
      cancelAnimationFrame(this.demoFrameId);
      this.demoFrameId = null;
    }
    if (this.specimenGroup) {
      this.scene?.remove(this.specimenGroup);
      // The fire cone is parented to the specimen, so it is disposed with it.
      disposeAssemblyObject(this.specimenGroup);
      this.specimenGroup = null;
      this.fireCone = null;
    }
    this.partObjects.clear();
    this.partRoles.clear();
  }

  /**
   * Fits the camera to the framing cylinder. Fitting is not cosmetic: body
   * scale spans 0.78-1.33 and wing span 0.72-1.57 across genomes, so a fixed
   * camera would crop large specimens and strand small ones in empty space.
   */
  private applyFrame(): void {
    const camera = this.camera;
    const frame = this.activeFrame;
    if (!camera || !frame) return;

    const halfFovY = (camera.fov * Math.PI) / 360;
    const tanY = Math.tan(halfFovY);
    const tanX = tanY * Math.max(camera.aspect, 0.0001);

    // Viewing from above tips part of the specimen's depth into its on-screen
    // height, so the vertical requirement mixes both extents by the elevation.
    const elevationSin = this.viewDirection.y;
    const elevationCos = Math.sqrt(Math.max(1 - elevationSin * elevationSin, 0));
    const projectedHalfHeight = frame.halfHeight * elevationCos + frame.radius * elevationSin;

    const fittedDistance = Math.max(projectedHalfHeight / tanY, frame.radius / tanX)
      * (this.options.framePadding ?? DEFAULT_FRAME_PADDING);
    const distance = fittedDistance / this.zoomLevel;

    const target = new THREE.Vector3(frame.center.x, frame.center.y, frame.center.z);
    camera.position.copy(target).addScaledVector(this.viewDirection, distance);
    const extent = Math.max(frame.radius, frame.halfHeight);
    camera.near = Math.max(distance - extent * 3, 0.05);
    camera.far = distance + extent * 6;
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    if (this.controls) {
      this.controls.target.copy(target);
      this.controls.update();
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

    this.groundShadow.visible = true;

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
