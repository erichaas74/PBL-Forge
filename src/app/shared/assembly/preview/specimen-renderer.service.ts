import { Service, signal } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssemblyPartRole, Vector3Data } from '../domain/assembly.models';
import {
  applyAssemblyTraitFocus,
  createAssemblyObject,
  disposeAssemblyObject,
} from '../rendering/three-assembly-mesh.factory';
import { RenderQuality, resolveRenderQuality } from '../rendering/render-quality';
import {
  OPEN_SPECIMEN_EXPRESSION,
  SpecimenFacialAnimation,
  applySpecimenFacialExpression,
  collectSpecimenFacialAnimation,
} from '../rendering/specimen-facial-animation';
import {
  SPECIMEN_STAGE_THEME,
  StagePostPipeline,
  StageTheme,
  configureStageRenderer,
  createStageLighting,
  createStagePostPipeline,
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
import { SpecimenIdleMotion, SpecimenMotionDefinition } from './specimen-motion';

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
  /** Called after a short pointer press lands on one rendered assembly part. */
  partSelected?: (partId: string) => void;
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
/**
 * Idle redraw interval. ~16fps: a five-second breath cycle has no detail that
 * a faster loop would reveal, and this is a permanent cost on every mounted
 * viewport.
 */
const IDLE_FRAME_INTERVAL_MS = 60;
const MIN_ZOOM_LEVEL = 0.65;
const MAX_ZOOM_LEVEL = 2;

/** Screen-space half extents of an axis-aligned specimen frame for one view. */
export function projectSpecimenFrame(
  frame: SpecimenFrame,
  viewDirection: Vector3Data,
): { halfWidth: number; halfHeight: number } {
  const view = new THREE.Vector3(
    viewDirection.x,
    viewDirection.y,
    viewDirection.z,
  ).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), view);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  else right.normalize();
  const up = new THREE.Vector3().crossVectors(view, right).normalize();
  const half = frame.halfExtents;

  if (frame.points?.length) {
    let halfWidth = 0;
    let halfHeight = 0;
    for (const point of frame.points) {
      const offset = new THREE.Vector3(
        point.x - frame.center.x,
        point.y - frame.center.y,
        point.z - frame.center.z,
      );
      halfWidth = Math.max(halfWidth, Math.abs(offset.dot(right)));
      halfHeight = Math.max(halfHeight, Math.abs(offset.dot(up)));
    }
    return { halfWidth, halfHeight };
  }

  return {
    halfWidth: Math.abs(right.x) * half.x
      + Math.abs(right.y) * half.y
      + Math.abs(right.z) * half.z,
    halfHeight: Math.abs(up.x) * half.x
      + Math.abs(up.y) * half.y
      + Math.abs(up.z) * half.z,
  };
}

/**
 * Layered, closed flame plumes. Each lobe swells and then narrows to a point,
 * so the breath communicates its real range without the flat circular end of a
 * debug cone.
 */
export function createFireBreathEffect(range: number, radius: number): THREE.Group {
  const effect = new THREE.Group();
  effect.name = 'dragon-fire-breath';

  const layers = [
    { length: 1, width: 1, color: 0xe84512, opacity: 0.28, phase: 0.2 },
    { length: 0.78, width: 0.58, color: 0xff8a18, opacity: 0.5, phase: 1.7 },
    { length: 0.5, width: 0.3, color: 0xffe27a, opacity: 0.72, phase: 3.1 },
  ] as const;

  for (const [index, layer] of layers.entries()) {
    const flame = new THREE.Mesh(
      createFlamePlumeGeometry(range * layer.length, radius * layer.width, layer.phase),
      new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    flame.name = `dragon-fire-layer-${index + 1}`;
    flame.renderOrder = 20 + index;
    effect.add(flame);
  }

  const glow = new THREE.PointLight(0xff6a1a, 1.2, Math.max(range * 0.55, 0.1), 2);
  glow.name = 'dragon-fire-glow';
  glow.position.y = range * 0.12;
  effect.add(glow);
  return effect;
}

/** Local +Y plume with tapered ends and a gentle deterministic lick. */
function createFlamePlumeGeometry(length: number, radius: number, phase: number): THREE.BufferGeometry {
  const ringCount = 11;
  const radialSegments = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= ringCount; ring += 1) {
    const t = ring / ringCount;
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.72) * (1 - t * 0.16);
    const centreX = Math.sin(t * Math.PI * 2.4 + phase) * radius * 0.13 * t;
    const centreZ = Math.cos(t * Math.PI * 1.8 + phase) * radius * 0.1 * t;
    const ringRadius = radius * envelope;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const lick = 1 + 0.09 * Math.sin(angle * 3 + phase + t * Math.PI * 5);
      positions.push(
        centreX + Math.cos(angle) * ringRadius * lick,
        length * t,
        centreZ + Math.sin(angle) * ringRadius * lick,
      );
      uvs.push(segment / radialSegments, t);
    }
  }

  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + segment;
      const d = (ring + 1) * radialSegments + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

@Service({ autoProvided: false })
export class SpecimenRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  /** Null on the low tier, where `createStagePostPipeline` declines to build one. */
  private postPipeline: StagePostPipeline | null = null;
  private quality: RenderQuality = 'low';
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
  private idleFrameId: number | null = null;
  private idleMotion: SpecimenIdleMotion | null = null;
  private pointerStart: { x: number; y: number; pointerId: number } | null = null;
  private fireEffect: THREE.Group | null = null;
  private viewDirection = DEFAULT_VIEW_DIRECTION.clone();
  /** 1 fits the whole specimen; larger values move the camera closer. */
  private zoomLevel = 1;
  /** Resting pose for the current specimen; a show() override beats the mount default. */
  private activePose: SpecimenPoseOptions | undefined;
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly partRoles = new Map<string, readonly AssemblyPartRole[]>();
  private facialAnimation: SpecimenFacialAnimation = { eyelids: [] };
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
    // This was pinned to 'low', which meant the specimen viewers — the surface a
    // student actually inspects a dragon in — ran at pixelRatio 1 with half-size
    // texture maps and no post chain at all. A 300px viewport is exactly where
    // edge aliasing and a flat, unoccluded silhouette are most obvious, so the
    // small size is an argument for the chain rather than against it.
    const quality: RenderQuality = options.quality ?? resolveRenderQuality();
    this.quality = quality;

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
    renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel);
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
      // Refitting on every pointer move fights OrbitControls. Refitting once the
      // orbit ends preserves the chosen angle while using that angle's projected
      // silhouette instead of the dragon's full nose-to-tail radius.
      controls.addEventListener('end', () => {
        const orbitDirection = camera.position.clone().sub(controls.target);
        if (orbitDirection.lengthSq() >= 1e-8) this.viewDirection.copy(orbitDirection.normalize());
        this.applyFrame();
        this.requestRender();
      });
      this.controls = controls;
    }

    // Sized before the post chain is built, and that order matters — see
    // `ensurePostPipeline`.
    this.resize();
    this.ensurePostPipeline();

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
      const posed = pose.parts.find((entry) => entry.partId === part.id);
      const object = createAssemblyObject(part, { proceduralOnly: true });
      const position = posed?.position ?? part.position;
      const rotation = posed?.rotation ?? part.rotation;

      object.position.set(position.x, position.y, position.z);
      if (rotation) object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      content.add(object);
      this.partObjects.set(part.id, object);
      this.partRoles.set(part.id, part.roles ?? []);
    }

    this.facialAnimation = collectSpecimenFacialAnimation(content);
    applySpecimenFacialExpression(this.facialAnimation, OPEN_SPECIMEN_EXPRESSION);

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
      applyAssemblyTraitFocus(
        object,
        partRoles.some((role) => roles.includes(role)),
      );
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

    return new Promise<void>((resolve) => {
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

  /** Plays a non-combat specimen motion without changing the assembly or genome. */
  playMotion(motion: SpecimenMotionDefinition): Promise<void> {
    if (!this.descriptor) return Promise.resolve();

    this.stopAbility();
    this.activeFrame = this.baseFrame;
    this.applyFrame();

    if (prefersReducedMotion()) {
      this.applyMotionPhase(motion, motion.reducedMotionPhase ?? 0.6);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const step = (): void => {
        const elapsed = (performance.now() - startedAt) / 1000;
        const phase = Math.min(elapsed / motion.durationSeconds, 1);
        this.applyMotionPhase(motion, phase);

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
        halfExtents: {
          x: Math.abs(aim.direction.x) * range * 0.5 + coneRadius,
          y: Math.abs(aim.direction.y) * range * 0.5 + coneRadius,
          z: Math.abs(aim.direction.z) * range * 0.5 + coneRadius,
        },
        radius: Math.hypot(
          Math.abs(aim.direction.x) * range * 0.5 + coneRadius,
          Math.abs(aim.direction.z) * range * 0.5 + coneRadius,
        ),
        halfHeight: Math.abs(aim.direction.y) * range * 0.5 + coneRadius,
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
    this.syncFireEffect(demo.fireConeAt?.(phase) ? pose : null);
    this.renderNow();
  }

  private applyMotionPhase(motion: SpecimenMotionDefinition, phase: number): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;
    this.applyPose(motion.poseAt(descriptor.blueprint, phase, this.activePose?.droopRadians ?? 0));
    applySpecimenFacialExpression(
      this.facialAnimation,
      motion.expressionAt?.(phase) ?? OPEN_SPECIMEN_EXPRESSION,
    );
    this.syncFireEffect(null);
    this.renderNow();
  }

  /**
   * Starts or stops the ambient idle.
   *
   * Refused under `prefers-reduced-motion`: a permanent loop is exactly what
   * that setting exists to turn off, and unlike the turntable there is no
   * information in it to lose.
   *
   * The loop is throttled rather than run at display rate. A breath cycle is
   * five seconds long, so a frame every 60ms is indistinguishable from one
   * every 16ms and costs a third as much — which matters because several of
   * these can be mounted on one workstation page, on hardware this app is
   * expected to run on. Callers should also stop it when the viewport leaves
   * the screen; {@link SpecimenViewportComponent} does that with an
   * `IntersectionObserver`.
   */
  setIdleMotion(motion: SpecimenIdleMotion | null): void {
    this.idleMotion = prefersReducedMotion() ? null : motion;

    if (!this.idleMotion) {
      if (this.idleFrameId !== null) cancelAnimationFrame(this.idleFrameId);
      this.idleFrameId = null;
      // Back to the stance the animal rests in, rather than wherever in the
      // breath it happened to be when this was switched off.
      if (this.descriptor) this.restPose();
      return;
    }

    if (this.idleFrameId !== null) return;

    const startedAt = performance.now();
    let lastDrawn = 0;

    const step = (now: number): void => {
      this.idleFrameId = requestAnimationFrame(step);
      const active = this.idleMotion;
      // A scripted ability or motion owns the rig while it plays; the idle
      // would fight it for the same part transforms.
      if (!active || !this.descriptor || this.demoFrameId !== null) return;
      if (now - lastDrawn < IDLE_FRAME_INTERVAL_MS) return;
      lastDrawn = now;

      const elapsed = (now - startedAt) / 1000;
      const phase = (elapsed / active.periodSeconds) % 1;
      this.applyPose(
        buildSpecimenPose(this.descriptor.blueprint, {
          ...this.activePose,
          bends: [...(this.activePose?.bends ?? []), ...active.bendsAt(phase)],
        }),
      );
      applySpecimenFacialExpression(
        this.facialAnimation,
        active.expressionAt?.(phase) ?? OPEN_SPECIMEN_EXPRESSION,
      );
      this.renderNow();
    };

    this.idleFrameId = requestAnimationFrame(step);
  }

  private restPose(): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;
    this.applyPose(buildSpecimenPose(descriptor.blueprint, this.activePose));
    applySpecimenFacialExpression(this.facialAnimation, OPEN_SPECIMEN_EXPRESSION);
    this.syncFireEffect(null);

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
      object.quaternion.set(posed.rotation.x, posed.rotation.y, posed.rotation.z, posed.rotation.w);
    }
  }

  /**
   * Fire breath, drawn from the mouth with the arena's real range and angle —
   * so a student can see how far the breath actually reaches, which is the part
   * that is invisible in a battle.
   */
  private syncFireEffect(pose: SpecimenPose | null): void {
    const descriptor = this.descriptor;
    const content = this.specimenGroup?.children[0];

    if (!pose || !descriptor || !content) {
      if (this.fireEffect) this.fireEffect.visible = false;
      return;
    }

    const aim = resolveFireOrigin(descriptor.blueprint, pose);
    if (!aim) return;

    if (!this.fireEffect) {
      const radius = FIRE_BREATH_TUNING.range * FIRE_BREATH_VISUAL_RADIUS_RATIO;
      const effect = createFireBreathEffect(FIRE_BREATH_TUNING.range, radius);
      // Sits with the specimen so it follows the turntable.
      content.add(effect);
      this.fireEffect = effect;
    }

    const direction = new THREE.Vector3(
      aim.direction.x,
      aim.direction.y,
      aim.direction.z,
    ).normalize();
    this.fireEffect.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction,
    );
    this.fireEffect.position.set(aim.origin.x, aim.origin.y, aim.origin.z);
    const flicker = 0.9 + Math.random() * 0.2;
    this.fireEffect.scale.set(flicker, 1, flicker);
    this.fireEffect.visible = true;
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
    if (this.idleFrameId !== null) cancelAnimationFrame(this.idleFrameId);
    this.idleFrameId = null;
    this.idleMotion = null;
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
    if (
      this.pendingFrameId !== null ||
      this.turntableFrameId !== null ||
      this.demoFrameId !== null
    ) {
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
    // The composer writes to the same canvas, so `toDataUrl` still reads back a
    // fully post-processed frame.
    if (this.postPipeline) {
      this.postPipeline.render();
      return;
    }
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
    this.viewDirection = next.lengthSq() < 1e-8 ? DEFAULT_VIEW_DIRECTION.clone() : next.normalize();
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
    this.postPipeline?.setSize(Math.max(width, 1), Math.max(height, 1));
    // A viewport that mounted hidden had no size to build the chain against;
    // this is the point at which it finally gets one.
    this.ensurePostPipeline();
    this.applyFrame();
  }

  /**
   * Builds the post chain once the canvas has a real size, and not before.
   *
   * GTAOPass takes width and height as *constructor* arguments and allocates its
   * depth and normal targets there and then. A later `setSize` resizes those
   * targets but does not fully re-establish what the pass derived from the
   * original dimensions, so a pass built against a placeholder size goes on
   * sampling depth that does not correspond to the canvas. It does not throw —
   * it returns garbage occlusion, which composites as a near-white wash over the
   * entire frame and looks like a lighting bug rather than a post-processing one.
   *
   * Mounting is not a safe moment to build it: the renderer still reports its
   * default 300x150, and a viewport inside a hidden tab reports 0. So this waits
   * for a genuine size and is idempotent, and callers invoke it from both mount
   * and resize.
   */
  private ensurePostPipeline(): void {
    if (this.postPipeline || !this.renderer || !this.scene || !this.camera) return;

    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x < 2 || size.y < 2) return;

    // No bloom: the specimen bench is a bright near-white stage, and bloom
    // selects pixels above a luminance threshold — on this stage that is nearly
    // all of them, so it washes the frame instead of picking out the eyes. GTAO
    // and SMAA are the passes that earn their place here, one grounding the
    // parts into a single animal, the other cleaning the edges.
    this.postPipeline = createStagePostPipeline(
      this.renderer,
      this.scene,
      this.camera,
      this.quality,
      { bloom: false },
    );
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
    // GTAO and SMAA both hold render targets, and these viewports mount and
    // unmount every time a student moves between workstations.
    this.postPipeline?.dispose();
    this.postPipeline = null;
    this.controls?.dispose();
    this.controls = null;

    if (this.renderer) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
      this.renderer.domElement.removeEventListener(
        'webglcontextrestored',
        this.handleContextRestored,
      );
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
      this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
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
    this.pointerStart = null;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };

  private readonly handlePointerCancel = (): void => {
    this.pointerStart = null;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || start.pointerId !== event.pointerId || !this.options.partSelected) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
    if (!this.renderer || !this.camera || !this.specimenGroup) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const hit = raycaster.intersectObject(this.specimenGroup, true)[0]?.object ?? null;
    let candidate: THREE.Object3D | null = hit;
    while (candidate && candidate !== this.specimenGroup) {
      const partId = candidate.userData['partId'];
      if (typeof partId === 'string') {
        this.options.partSelected(partId);
        return;
      }
      candidate = candidate.parent;
    }
  };

  private clearSpecimen(): void {
    if (this.demoFrameId !== null) {
      cancelAnimationFrame(this.demoFrameId);
      this.demoFrameId = null;
    }
    if (this.specimenGroup) {
      this.scene?.remove(this.specimenGroup);
      // Fire breath is parented to the specimen, so it is disposed with it.
      disposeAssemblyObject(this.specimenGroup);
      this.specimenGroup = null;
      this.fireEffect = null;
    }
    this.partObjects.clear();
    this.partRoles.clear();
    this.facialAnimation = { eyelids: [] };
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

    const projected = this.turntableFrameId === null
      ? projectSpecimenFrame(frame, this.viewDirection)
      : { halfWidth: frame.radius, halfHeight: frame.halfHeight + frame.radius * Math.abs(this.viewDirection.y) };

    const fittedDistance =
      Math.max(projected.halfHeight / tanY, projected.halfWidth / tanX) *
      (this.options.framePadding ?? DEFAULT_FRAME_PADDING);
    const distance = fittedDistance / this.zoomLevel;

    const target = new THREE.Vector3(frame.center.x, frame.center.y, frame.center.z);
    camera.position.copy(target).addScaledVector(this.viewDirection, distance);
    const extent = Math.max(frame.halfExtents.x, frame.halfExtents.y, frame.halfExtents.z);
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
        new THREE.ShadowMaterial({ color: 0x1f2937, opacity: 0.32 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.groundShadow = mesh;
    }

    this.groundShadow.visible = true;

    const half = this.activeFrame?.halfExtents ?? { x: 1, y: 1, z: 1 };
    this.groundShadow.scale.set(half.x * 1.12, half.z * 1.12, 1);
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
    return (
      Boolean(globalThis.WebGL2RenderingContext) &&
      Boolean(document.createElement('canvas').getContext('webgl2'))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
