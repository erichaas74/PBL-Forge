import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AssemblyBlueprint,
  AssemblyPart,
  Vector3Data,
} from '../../assembly/domain/assembly.models';
import {
  identityQuaternion,
  multiplyQuaternions,
  quaternionFromEuler,
  rotateVectorByQuaternion,
} from '../../assembly/domain/vector-data';
import {
  applyAssemblyDamageAppearance,
  applyAssemblyHitFlash,
  applyAssemblyTeamTint,
  createAssemblyObject,
  disposeAssemblyObject,
  getAssemblyRenderSignature,
} from '../../assembly/rendering/three-assembly-mesh.factory';
import { RenderQuality, resolveRenderQuality } from '../../assembly/rendering/render-quality';
import {
  BERK_STAGE_THEME,
  StagePostPipeline,
  configureStageRenderer,
  createGradientSkyTexture,
  createGroundTexture,
  createStageLighting,
  createStagePostPipeline,
  installStageEnvironment,
} from '../../assembly/rendering/scene-environment';
import {
  ArenaSetupConfig,
  BattleAttackPoseSnapshot,
  BattleArenaState,
  BattleBodySnapshot,
  BattlePartStatus,
  BattleTeam,
  FireConeSnapshot,
} from '../models/arena.models';
import { getAbilityDemo } from '../../assembly/preview/specimen-ability-pose';
import { getBodyKey } from '../utils/battle-assembly';
import { ArenaHudLayer, HudCombatant } from './arena-hud-layer';
import { ArenaImpactEffects } from './arena-impact-effects';
import { buildDragonArenaPose } from './dragon-arena-pose';

const TEAM_TINTS: Record<BattleTeam, { emissive: number; intensity: number }> = {
  red: { emissive: 0x4a0d12, intensity: 0.22 },
  blue: { emissive: 0x0c1f4a, intensity: 0.22 },
};

/** Weathered timber, wet stone, rope, iron. Nothing here glows on its own. */
const BERK_MATERIALS = {
  timber: 0x6b563c,
  timberDark: 0x4e3f2c,
  sandBase: '#c2a878',
  sandSpeckle: '#8a7350',
  sandWear: 0x766044,
  apron: 0x5c6552,
  stone: 0x7d8288,
  stoneDark: 0x484641,
  chain: 0x2f2a24,
  iron: 0x292d2d,
  bone: 0xc0aa7c,
  emberCore: 0xff7a2b,
  emberGlow: 0xffb347,
  seaStack: 0x6d726d,
} as const;

/**
 * Shield facings hung on the palisade.
 *
 * Four dyes a village could actually make — ochre, woad, oxblood, and bare
 * limewash — rather than four hues off a colour wheel. Muted enough that the
 * braziers stay the only saturated thing in frame.
 */
const SHIELD_FACINGS = [0x8a6a34, 0x3f5568, 0x7a3a2c, 0xa39a86] as const;

/**
 * Camera framing.
 *
 * A narrow field of view is doing real work here: perspective flattens as it
 * drops, and flat perspective is what makes animation read as staged rather
 * than as a first-person game. The rest tracks the fight so a rear-up fills
 * frame instead of happening in a corner.
 */
const CAMERA_FRAMING = {
  fieldOfView: 35,
  /** Distance when the combatants are on top of each other. */
  baseDistance: 12.5,
  /** Extra distance per unit of separation between the furthest pair. */
  dollyPerUnit: 1.35,
  minDistance: 10,
  maxDistance: 26,
  /** Height the camera aims at, above the midpoint's ground position. */
  targetLift: 1.2,
  /** Per-frame follow rate. Low enough that a knockback does not whip the view. */
  smoothing: 0.06,
} as const;

/** Brazier flicker, in Hz per light, so no two pulse together. */
const BRAZIER_FLICKER_RATES = [1.7, 2.3, 3.1, 2.7] as const;

interface DragonRenderRig {
  blueprint: AssemblyBlueprint;
  corePartId: string;
}

interface Brazier {
  light: THREE.PointLight;
  ember: THREE.Mesh;
  baseIntensity: number;
  rate: number;
  phase: number;
}

interface CoreRef {
  bodyKey: string;
  /** Shown on the in-world plate. */
  name: string;
  team: BattleTeam;
  /**
   * Every body this combatant owns.
   *
   * Held explicitly rather than recovered by prefix-matching `combatantId:` off
   * the status keys — combatant ids are free-form, so one that happens to
   * prefix another ("red" and "red-2") would silently pool their health.
   */
  bodyKeys: string[];
  /**
   * Authored standing height of the torso. The blob shadow measures against
   * this rather than against the floor, because a dragon on its feet is
   * already more than a metre up and would otherwise render permanently faded.
   */
  standingHeight: number;
}

/** Flame cone plus the light it casts, kept together so both die at once. */
interface FireEffect {
  group: THREE.Group;
  inner: THREE.Mesh;
  outer: THREE.Mesh;
  light: THREE.PointLight;
}

@Injectable()
export class AssemblyArenaRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private environmentGroup: THREE.Group | null = null;
  private currentEnvironmentKey: string | null = null;
  private quality: RenderQuality = 'high';
  private postPipeline: StagePostPipeline | null = null;
  private skyTexture: THREE.CanvasTexture | null = null;
  private disposeEnvironmentMap: (() => void) | null = null;
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly lastHealthByBodyKey = new Map<string, number>();
  private readonly flashUntilByBodyKey = new Map<string, number>();
  private readonly fireEffects = new Map<string, FireEffect>();
  private readonly dragonRigs = new Map<string, DragonRenderRig>();
  private readonly braziers: Brazier[] = [];
  private readonly contactShadows = new Map<string, THREE.Mesh>();
  private contactShadowTexture: THREE.CanvasTexture | null = null;
  /** Core reference per combatant, for camera framing and contact shadows. */
  private readonly coreRefs = new Map<string, CoreRef>();
  private impacts: ArenaImpactEffects | null = null;
  private hud: ArenaHudLayer | null = null;
  private lastRenderMs = 0;
  /** Set while the pointer is down on the canvas, cleared when the glide stops. */
  private viewSettlingUntilMs = 0;
  private viewDragging = false;

  mount(host: HTMLElement): void {
    this.dispose();
    this.host = host;
    this.quality = resolveRenderQuality();

    const scene = new THREE.Scene();
    this.skyTexture = createGradientSkyTexture(BERK_STAGE_THEME);
    scene.background = this.skyTexture ?? new THREE.Color(BERK_STAGE_THEME.skyBottom);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(CAMERA_FRAMING.fieldOfView, 1, 0.1, 250);
    camera.position.set(9.5, 7.6, 10.2);
    camera.lookAt(0, CAMERA_FRAMING.targetLift, 0);
    this.camera = camera;

    // MSAA only when the post chain (which brings SMAA) is off.
    const renderer = new THREE.WebGLRenderer({ antialias: this.quality === 'low' });
    configureStageRenderer(renderer, this.quality);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.disposeEnvironmentMap = installStageEnvironment(scene, renderer, BERK_STAGE_THEME);
    this.postPipeline = createStagePostPipeline(renderer, scene, camera, this.quality);

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, CAMERA_FRAMING.targetLift, 0);
    // Damping keeps the view gliding after the pointer lifts, so the idle
    // throttle has to know about the glide as well as the drag itself.
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.addEventListener('end', this.onControlsEnd);

    this.impacts = new ArenaImpactEffects(scene, this.quality, prefersReducedMotion());
    // The host must establish a containing block, or the absolutely-positioned
    // CSS2D layer escapes to the viewport.
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    this.hud = new ArenaHudLayer(scene, host);

    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  syncSetup(state: BattleArenaState): void {
    if (!this.scene) {
      return;
    }

    // Fresh match: forget health/flash tracking and effects from the previous one.
    this.lastHealthByBodyKey.clear();
    this.flashUntilByBodyKey.clear();
    this.syncFireCones([]);

    // Match loading may override a setup's default control modes. The live
    // combatants are therefore the source of truth for dragon-only scenery.
    this.syncArenaEnvironment(
      state.setup,
      state.combatants.some((combatant) => combatant.controlMode === 'dragon-attack'),
    );
    const nextBodyKeys = new Set<string>();
    this.dragonRigs.clear();
    this.coreRefs.clear();

    for (const combatant of state.combatants) {
      const corePart = combatant.assembly.parts.find((part) => part.id === combatant.corePartId);
      this.coreRefs.set(combatant.id, {
        bodyKey: getBodyKey(combatant.id, combatant.corePartId),
        name: combatant.name,
        team: combatant.team,
        bodyKeys: combatant.assembly.parts.map((part) => getBodyKey(combatant.id, part.id)),
        standingHeight: corePart?.position.y ?? 0,
      });
      if (combatant.controlMode === 'dragon-attack') {
        this.dragonRigs.set(combatant.id, {
          blueprint: combatant.assembly,
          corePartId: combatant.corePartId,
        });
      }
      // Mirror the physics spawn exactly: part offsets rotate rigidly around the
      // spawn point along with their orientations.
      const spawnQuaternion = quaternionFromEuler(combatant.initialRotation);

      for (const part of combatant.assembly.parts) {
        const bodyKey = getBodyKey(combatant.id, part.id);
        nextBodyKeys.add(bodyKey);
        this.syncPartObject(bodyKey, combatant.team, part);

        const object = this.partObjects.get(bodyKey);
        if (object) {
          const localPosition = rotateVectorByQuaternion(part.position, spawnQuaternion);
          object.position.set(
            localPosition.x + combatant.spawnPosition.x,
            localPosition.y + combatant.spawnPosition.y,
            localPosition.z + combatant.spawnPosition.z,
          );
          const rotation = multiplyQuaternions(
            spawnQuaternion,
            part.rotation ?? identityQuaternion(),
          );
          object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
      }
    }

    for (const [bodyKey, object] of Array.from(this.partObjects.entries())) {
      if (!nextBodyKeys.has(bodyKey)) {
        this.scene.remove(object);
        disposeAssemblyObject(object);
        this.partObjects.delete(bodyKey);
      }
    }

    this.render();
  }

  applyFrame(
    snapshots: BattleBodySnapshot[],
    statuses: Record<string, BattlePartStatus>,
    fireCones: FireConeSnapshot[] = [],
    attackPoses: BattleAttackPoseSnapshot[] = [],
  ): void {
    this.syncFireCones(fireCones);
    const snapshotsByBodyKey = new Map(snapshots.map((snapshot) => [snapshot.bodyKey, snapshot]));
    const attacksByCombatant = new Map(attackPoses.map((attack) => [attack.combatantId, attack]));
    const scriptedBodyKeys = new Set<string>();

    for (const [combatantId, rig] of this.dragonRigs) {
      const core = snapshotsByBodyKey.get(getBodyKey(combatantId, rig.corePartId));
      if (!core) continue;

      this.impacts?.setTelegraph(
        combatantId,
        core.position,
        telegraphIntensity(attacksByCombatant.get(combatantId)),
      );

      for (const snapshot of buildDragonArenaPose(
        combatantId,
        rig.blueprint,
        rig.corePartId,
        core,
        attacksByCombatant.get(combatantId),
      )) {
        scriptedBodyKeys.add(snapshot.bodyKey);
        this.applyBodySnapshot(snapshot, statuses);
      }
    }

    for (const snapshot of snapshots) {
      if (!scriptedBodyKeys.has(snapshot.bodyKey)) this.applyBodySnapshot(snapshot, statuses);
    }

    const cores: THREE.Vector3[] = [];
    const hudCombatants: HudCombatant[] = [];
    for (const [combatantId, ref] of this.coreRefs) {
      const core = snapshotsByBodyKey.get(ref.bodyKey);
      if (!core) continue;
      this.updateContactShadow(combatantId, core.position, ref.standingHeight);
      cores.push(new THREE.Vector3(core.position.x, core.position.y, core.position.z));

      /*
       * The plate reports *whole-combatant* health, not the torso's.
       * A dragon whose wings have been torn off but whose core is untouched is
       * not at full strength, and a bar that says otherwise is worse than no
       * bar — it is the scoreboard's `totalHealth`, put where the student is
       * already looking.
       */
      const totals = combatantHealth(ref.bodyKeys, statuses);
      hudCombatants.push({
        id: combatantId,
        name: ref.name,
        team: ref.team,
        healthRatio: totals.max > 0 ? totals.current / totals.max : 0,
        position: core.position,
        standingHeight: ref.standingHeight,
      });
    }
    this.updateCameraFraming(cores);
    this.hud?.sync(hudCombatants);

    this.render();
  }

  render(): void {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    const now = performance.now();
    const delta = this.lastRenderMs === 0 ? 0 : (now - this.lastRenderMs) / 1000;
    this.lastRenderMs = now;

    this.updateBraziers();
    this.controls?.update();
    this.impacts?.update(delta);
    this.hud?.update(delta);

    /*
     * Shake is applied to the camera *after* the controls have settled and
     * removed again immediately after the draw.
     *
     * OrbitControls derives its state from `camera.position`, so leaving the
     * offset in place would feed the shake back in as a real orbit change: the
     * view would drift a little further from where the student put it on every
     * hit and never return. Displacing only for the duration of the draw keeps
     * the jolt purely visual.
     */
    const shake = this.impacts?.shakeOffset;
    const shaking = shake !== undefined && shake.lengthSq() > 1e-8;
    if (shaking) this.camera.position.add(shake);

    if (this.postPipeline) {
      this.postPipeline.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Drawn from the un-shaken camera: DOM labels jittering in sympathy with a
    // camera jolt reads as a rendering fault, not as an impact.
    if (shaking) this.camera.position.sub(shake);
    this.hud?.render(this.camera);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const object of this.partObjects.values()) {
      disposeAssemblyObject(object);
    }

    this.partObjects.clear();
    this.dragonRigs.clear();
    this.coreRefs.clear();
    this.lastHealthByBodyKey.clear();
    this.flashUntilByBodyKey.clear();
    this.syncFireCones([]);
    this.disposeContactShadows();
    this.impacts?.dispose();
    this.impacts = null;
    this.hud?.dispose();
    this.hud = null;
    this.lastRenderMs = 0;
    this.removeEnvironment();
    this.postPipeline?.dispose();
    this.postPipeline = null;
    this.disposeEnvironmentMap?.();
    this.disposeEnvironmentMap = null;
    this.skyTexture?.dispose();
    this.skyTexture = null;
    this.controls?.removeEventListener('start', this.onControlsStart);
    this.controls?.removeEventListener('change', this.onControlsChange);
    this.controls?.removeEventListener('end', this.onControlsEnd);
    this.controls?.dispose();
    this.controls = null;
    this.viewDragging = false;
    this.viewSettlingUntilMs = 0;

    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.host = null;
  }

  /**
   * Blob shadows share one texture, so it is freed here rather than by the
   * per-mesh disposal that would kill it for every other blob.
   */
  private disposeContactShadows(): void {
    for (const blob of this.contactShadows.values()) {
      this.scene?.remove(blob);
      blob.geometry.dispose();
      if (!Array.isArray(blob.material)) blob.material.dispose();
    }
    this.contactShadows.clear();
    this.contactShadowTexture?.dispose();
    this.contactShadowTexture = null;
  }

  private syncPartObject(bodyKey: string, team: BattleTeam, part: AssemblyPart): void {
    if (!this.scene) {
      return;
    }

    const signature = getAssemblyRenderSignature(part);
    const current = this.partObjects.get(bodyKey);

    if (current && current.userData['signature'] === signature) {
      return;
    }

    if (current) {
      this.scene.remove(current);
      disposeAssemblyObject(current);
    }

    const object = createAssemblyObject(part);
    const tint = TEAM_TINTS[team];
    applyAssemblyTeamTint(object, tint.emissive, tint.intensity);
    object.userData['signature'] = signature;
    this.partObjects.set(bodyKey, object);
    this.scene.add(object);
  }

  private applyBodySnapshot(
    snapshot: BattleBodySnapshot,
    statuses: Record<string, BattlePartStatus>,
  ): void {
    const object = this.partObjects.get(snapshot.bodyKey);
    if (!object) return;
    object.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    object.quaternion.set(
      snapshot.quaternion.x,
      snapshot.quaternion.y,
      snapshot.quaternion.z,
      snapshot.quaternion.w,
    );
    this.updateDamageAppearance(object, statuses[snapshot.bodyKey]);
    this.updateHitFlash(object, snapshot.bodyKey, statuses[snapshot.bodyKey]);
  }

  private updateDamageAppearance(
    object: THREE.Object3D,
    status: BattlePartStatus | undefined,
  ): void {
    if (!status) {
      return;
    }

    applyAssemblyDamageAppearance(object, {
      healthRatio: status.maxHealth > 0 ? status.health / status.maxHealth : 0,
      destroyed: status.destroyed,
    });
  }

  /**
   * Flame cone shown while a dragon breathes fire.
   *
   * Two nested additive cones — a tight white-hot core inside a wider orange
   * envelope — plus a point light at the muzzle. The light is the part that
   * matters: having the attack illuminate the sand and the dragon it is aimed
   * at does more for the shot than any amount of detail in the cone itself,
   * and on an overcast palette it is the one moment the arena goes warm.
   */
  private syncFireCones(cones: FireConeSnapshot[]): void {
    if (!this.scene) {
      return;
    }

    const seen = new Set<string>();
    const up = new THREE.Vector3(0, 1, 0);
    const seconds = performance.now() / 1000;

    for (const cone of cones) {
      seen.add(cone.combatantId);
      let effect = this.fireEffects.get(cone.combatantId);

      if (!effect) {
        effect = this.createFireEffect();
        this.fireEffects.set(cone.combatantId, effect);
        this.scene.add(effect.group);
      }

      const direction = new THREE.Vector3(cone.direction.x, cone.direction.y, cone.direction.z);
      if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
      direction.normalize();

      // Cone tip (+y) points back at the mouth; the base flares away from it.
      effect.group.quaternion.setFromUnitVectors(up, direction.clone().negate());
      effect.group.position.set(
        cone.origin.x + direction.x * 1.6,
        cone.origin.y + direction.y * 1.6,
        cone.origin.z + direction.z * 1.6,
      );

      // Two rates beating against each other: a single sine reads as a pulse,
      // which looks mechanical. The core breathes faster than the envelope.
      const envelope = 0.88 + Math.sin(seconds * 21) * 0.07 + Math.sin(seconds * 13.3) * 0.05;
      const core = 0.8 + Math.sin(seconds * 31) * 0.12;
      effect.outer.scale.set(envelope, 1, envelope);
      effect.inner.scale.set(core, 0.92, core);
      effect.light.intensity = 26 + Math.sin(seconds * 24) * 8;
    }

    for (const [combatantId, effect] of Array.from(this.fireEffects.entries())) {
      if (!seen.has(combatantId)) {
        this.scene.remove(effect.group);
        disposeAssemblyObject(effect.group);
        this.fireEffects.delete(combatantId);
      }
    }
  }

  private createFireEffect(): FireEffect {
    const group = new THREE.Group();

    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 3.2, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff6a1a,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    group.add(outer);

    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 2.6, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    group.add(inner);

    // The group is oriented so local +y is the cone tip, which sits on the
    // muzzle — so the light belongs there, in local space, and never has to be
    // repositioned as the dragon turns.
    const light = new THREE.PointLight(0xff8c3a, 26, 9, 2);
    light.position.set(0, 1.4, 0);
    group.add(light);

    return { group, inner, outer, light };
  }

  /**
   * Soft blob under each combatant.
   *
   * The shadow map already casts a real shadow, but at this scale it is thin
   * and its contact point is ambiguous — and knowing exactly where a dragon
   * meets the sand is what sells its weight in stylised animation. The blob
   * shrinks and fades with height, so a leap reads as a leap.
   */
  private updateContactShadow(
    combatantId: string,
    position: Vector3Data,
    standingHeight: number,
  ): void {
    if (!this.scene) return;

    let blob = this.contactShadows.get(combatantId);
    if (!blob) {
      this.contactShadowTexture ??= createContactShadowTexture();
      // No canvas, no blob — a flat white quad would be far worse than none.
      if (!this.contactShadowTexture) return;
      blob = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: 0x2a2416,
          map: this.contactShadowTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.42,
        }),
      );
      blob.rotation.x = -Math.PI / 2;
      blob.renderOrder = -1;
      this.contactShadows.set(combatantId, blob);
      this.scene.add(blob);
    }

    // Height above the stance, not above the sand: on its feet the blob is
    // tight and dark, and a leap spreads and fades it.
    const lift = Math.max(0, position.y - standingHeight);
    const fade = Math.max(0, 1 - lift / 4);
    blob.position.set(position.x, 0.02, position.z);
    const spread = 3.4 + lift * 0.55;
    blob.scale.set(spread, spread, 1);
    const material = blob.material as THREE.MeshBasicMaterial;
    material.opacity = 0.45 * fade * fade;
    blob.visible = fade > 0.02;
  }

  /**
   * Keeps both combatants in frame without taking the camera away from the
   * viewer: only the orbit *target* and the distance follow the fight, so the
   * direction someone has dragged the view to is preserved.
   */
  private updateCameraFraming(points: THREE.Vector3[]): void {
    if (!this.camera || !this.controls || points.length === 0) return;

    const center = new THREE.Vector3();
    for (const point of points) center.add(point);
    center.divideScalar(points.length);
    center.y = CAMERA_FRAMING.targetLift;

    let spread = 0;
    for (const point of points) {
      spread = Math.max(spread, Math.hypot(point.x - center.x, point.z - center.z));
    }

    const desired = THREE.MathUtils.clamp(
      CAMERA_FRAMING.baseDistance + spread * CAMERA_FRAMING.dollyPerUnit,
      CAMERA_FRAMING.minDistance,
      CAMERA_FRAMING.maxDistance,
    );

    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    if (distance < 1e-4) return;

    offset.multiplyScalar(
      THREE.MathUtils.lerp(distance, desired, CAMERA_FRAMING.smoothing) / distance,
    );
    this.controls.target.lerp(center, CAMERA_FRAMING.smoothing);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  /**
   * Pulse a part's emissive briefly whenever its health drops, and report the
   * blow to the impact layer.
   *
   * A health drop is the only honest impact signal available here: the physics
   * has already resolved contacts, ability windows, and rate limits by the time
   * a frame arrives, so anything derived from raw collisions would fire on
   * grazes the damage model deliberately ignored.
   */
  private updateHitFlash(
    object: THREE.Object3D,
    bodyKey: string,
    status: BattlePartStatus | undefined,
  ): void {
    if (!status) {
      return;
    }

    const now = performance.now();
    const previousHealth = this.lastHealthByBodyKey.get(bodyKey);
    if (
      previousHealth !== undefined &&
      status.health < previousHealth - 0.01 &&
      !status.destroyed
    ) {
      this.flashUntilByBodyKey.set(bodyKey, now + 240);
      const dealt = previousHealth - status.health;
      // Severity relative to the part's own maximum, so a chipped claw and a
      // cracked skull are scaled by what each can actually take.
      this.impacts?.report({
        position: object.position,
        severity: status.maxHealth > 0 ? dealt / status.maxHealth : 0,
      });
      this.hud?.reportDamage(object.position, dealt);
    }
    this.lastHealthByBodyKey.set(bodyKey, status.health);

    applyAssemblyHitFlash(object, now < (this.flashUntilByBodyKey.get(bodyKey) ?? 0));
  }

  /**
   * Whether the student is moving the camera, or it is still gliding to a stop.
   *
   * The paused-frame throttle asks this so a dragged view stays at full rate
   * while a merely idle one drops to a trickle.
   */
  isUserAdjustingView(): boolean {
    return this.viewDragging || performance.now() < this.viewSettlingUntilMs;
  }

  private readonly onControlsStart = (): void => {
    this.viewDragging = true;
  };

  private readonly onControlsEnd = (): void => {
    this.viewDragging = false;
  };

  /**
   * Damping emits `change` for as long as the view keeps gliding, so each one
   * extends a short grace window. When they stop arriving the window lapses on
   * its own and the throttle takes over again.
   */
  private readonly onControlsChange = (): void => {
    this.viewSettlingUntilMs = performance.now() + 220;
  };

  /**
   * Seconds of hit-stop the next physics step should absorb.
   *
   * Owned by the impact layer but consumed by the viewport, which is the only
   * place that drives the integrator. Consumed on read.
   */
  takeHitStopSeconds(): number {
    return this.impacts?.takeHitStopSeconds() ?? 0;
  }

  /**
   * Brazier flicker.
   *
   * Each fire runs at its own rate with its own phase offset, because four
   * lights pulsing in step read as one light with a fault rather than as four
   * fires. The emissive tracks the light so the bloom bloomed by the post chain
   * breathes with the pool it casts.
   */
  private updateBraziers(): void {
    if (!this.braziers.length) return;
    const seconds = performance.now() / 1000;

    for (const brazier of this.braziers) {
      const flicker =
        0.82 +
        Math.sin(seconds * brazier.rate + brazier.phase) * 0.12 +
        Math.sin(seconds * brazier.rate * 2.7 + brazier.phase) * 0.06;
      brazier.light.intensity = brazier.baseIntensity * flicker;
      const material = brazier.ember.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 3.2 * flicker;
    }
  }

  private syncArenaEnvironment(setup: ArenaSetupConfig, dragonPit: boolean): void {
    const environmentKey = `${setup.id}:${dragonPit ? 'dragon-pit' : 'standard'}`;
    if (!this.scene || this.currentEnvironmentKey === environmentKey) {
      return;
    }

    this.removeEnvironment();
    this.currentEnvironmentKey = environmentKey;
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);
    this.addArena(this.environmentGroup, setup, dragonPit);
  }

  private removeEnvironment(): void {
    if (!this.scene || !this.environmentGroup) {
      return;
    }

    this.scene.remove(this.environmentGroup);
    disposeAssemblyObject(this.environmentGroup);
    this.environmentGroup = null;
    this.currentEnvironmentKey = null;
    // The braziers live inside the environment group, so their handles go with it.
    this.braziers.length = 0;
  }

  private addArena(group: THREE.Group, setup: ArenaSetupConfig, dragonPit: boolean): void {
    const radius = Math.max(setup.floorSize.x, setup.floorSize.z);
    // The pit is drawn round while physics keeps its rectangular walls. The
    // ring is inscribed in the floor so a dragon can never reach a stretch of
    // sand that has no palisade drawn behind it.
    const pitRadius = Math.min(setup.floorSize.x, setup.floorSize.z) / 2;

    group.add(
      createStageLighting(
        BERK_STAGE_THEME,
        { width: setup.floorSize.x, depth: setup.floorSize.z },
        this.quality,
      ),
    );

    if (this.scene) {
      this.scene.fog = new THREE.Fog(BERK_STAGE_THEME.fogColor, radius * 1.8, radius * 6);
    }

    const groundTexture = createGroundTexture(BERK_MATERIALS.sandBase, BERK_MATERIALS.sandSpeckle);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(setup.floorSize.x, setup.floorSize.y, setup.floorSize.z),
      new THREE.MeshStandardMaterial({
        color: groundTexture ? 0xffffff : 0xc2a878,
        map: groundTexture,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    floor.position.y = -setup.floorSize.y / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Wide apron of turf under the arena so the fog has something to fade over.
    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 3.2, 48),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.apron,
        roughness: 1,
        metalness: 0,
      }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -setup.floorSize.y - 0.01;
    apron.receiveShadow = true;
    group.add(apron);

    if (dragonPit) {
      this.addFightingRing(group, pitRadius);
      this.addPalisade(group, pitRadius, setup.wallHeight);
      this.addKillRingGallery(group, pitRadius, setup.wallHeight);
      this.addGatehouses(group, pitRadius, setup.wallHeight);
      this.addPalisadeShields(group, pitRadius, setup.wallHeight);
      this.addClanBanners(group, pitRadius, setup.wallHeight);
      this.addChainDome(group, pitRadius, setup.wallHeight);
      this.addBraziers(group, pitRadius, setup.wallHeight);
      this.addSeaStacks(group, radius);
    }

    const wallThickness = 0.24;
    const wallY = setup.wallHeight / 2;
    this.addWallMesh(
      group,
      { x: 0, y: wallY, z: -setup.floorSize.z / 2 - wallThickness / 2 },
      { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness },
    );
    this.addWallMesh(
      group,
      { x: 0, y: wallY, z: setup.floorSize.z / 2 + wallThickness / 2 },
      { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness },
    );
    this.addWallMesh(
      group,
      { x: -setup.floorSize.x / 2 - wallThickness / 2, y: wallY, z: 0 },
      { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z },
    );
    this.addWallMesh(
      group,
      { x: setup.floorSize.x / 2 + wallThickness / 2, y: wallY, z: 0 },
      { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z },
    );

    for (const obstacle of setup.obstacles) {
      this.addObstacleMesh(
        group,
        obstacle.position,
        obstacle.size,
        Number.parseInt(obstacle.color.replace('#', ''), 16),
        obstacle.rotation,
      );
    }
  }

  /**
   * A visual fighting ring layered over the rectangular physics floor.
   *
   * The curb and carved mark do not participate in collisions. Keeping the
   * authoritative boundary in the physics setup avoids an invisible mismatch
   * between scenery and combat while still making the dragon pit read as a
   * deliberate Viking training ground.
   */
  private addFightingRing(group: THREE.Group, pitRadius: number): void {
    const wear = new THREE.Mesh(
      new THREE.RingGeometry(pitRadius * 0.7, pitRadius * 0.965, 64),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.sandWear,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    wear.rotation.x = -Math.PI / 2;
    wear.position.y = 0.014;
    group.add(wear);

    const curb = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius - 0.08, 0.2, 7, 64),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.stone,
        roughness: 0.94,
        metalness: 0.03,
        flatShading: true,
      }),
    );
    curb.rotation.x = Math.PI / 2;
    curb.position.y = 0.14;
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);

    const markMaterial = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.sandWear,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.52,
    });
    const mark = new THREE.Group();
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius * 0.18, 0.035, 5, 32),
      markMaterial,
    );
    innerRing.rotation.x = Math.PI / 2;
    mark.add(innerRing);

    const barGeometry = new THREE.BoxGeometry(pitRadius * 0.42, 0.018, 0.06);
    for (let index = 0; index < 6; index += 1) {
      const bar = new THREE.Mesh(barGeometry, markMaterial);
      bar.rotation.y = (index / 6) * Math.PI;
      mark.add(bar);
    }
    mark.position.y = 0.028;
    group.add(mark);
  }

  /** North and south timber gatehouses establish the arena's main axis. */
  private addGatehouses(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const timber = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.timberDark,
      roughness: 0.95,
      metalness: 0,
    });
    const iron = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.iron,
      roughness: 0.68,
      metalness: 0.58,
    });
    const bone = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.bone,
      roughness: 0.88,
      metalness: 0,
    });
    const gateWidth = 2.6;
    const gateHeight = wallHeight * 1.55;

    for (const side of [-1, 1]) {
      const gate = new THREE.Group();
      gate.position.set(0, 0, side * (pitRadius + 0.44));
      gate.rotation.y = side > 0 ? Math.PI : 0;

      for (const x of [-gateWidth / 2, gateWidth / 2]) {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.34, gateHeight, 0.44), timber);
        upright.position.set(x, gateHeight / 2, 0);
        upright.castShadow = true;
        gate.add(upright);
      }

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(gateWidth + 0.8, 0.42, 0.54), timber);
      lintel.position.y = gateHeight;
      lintel.castShadow = true;
      gate.add(lintel);

      for (let index = -2; index <= 2; index += 1) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.052, 0.052, gateHeight * 0.82, 6),
          iron,
        );
        bar.position.set(index * 0.43, gateHeight * 0.41, 0.08);
        gate.add(bar);
      }

      for (const hornSide of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.76, 7), bone);
        horn.position.set(hornSide * gateWidth * 0.32, gateHeight + 0.45, 0);
        horn.rotation.z = hornSide * 0.36;
        gate.add(horn);
      }

      group.add(gate);
    }
  }

  /** Muted clan cloth breaks up the gallery without competing with team colour. */
  private addClanBanners(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const colours = [0x74372c, 0x3f5663, 0x8d6d32, 0x65664a] as const;
    const radius = pitRadius + 0.49;
    const bannerY = wallHeight * 1.23;

    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(0.52, 0.94),
        new THREE.MeshStandardMaterial({
          color: colours[index % colours.length],
          roughness: 0.94,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
      );
      banner.position.set(Math.cos(angle) * radius, bannerY, Math.sin(angle) * radius);
      banner.rotation.y = -angle + Math.PI / 2;
      banner.rotation.z = Math.sin(index * 1.71) * 0.045;
      group.add(banner);
    }
  }

  /**
   * Ring of upright timber around the pit.
   *
   * One `InstancedMesh` for the whole palisade: 64 individually-transformed
   * posts would otherwise be 64 draw calls for scenery nobody looks at
   * directly. The per-post jitter is what stops it reading as a fence extruded
   * by a machine — real posts are cut by hand and driven to uneven depths.
   */
  private addPalisade(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const postCount = 64;
    const postHeight = wallHeight * 1.7;
    const posts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.16, 0.19, postHeight, 7),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.timber,
        roughness: 0.92,
        metalness: 0,
      }),
      postCount,
    );
    posts.castShadow = true;
    posts.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();

    for (let index = 0; index < postCount; index += 1) {
      const angle = (index / postCount) * Math.PI * 2;
      // Deterministic jitter: a seeded wobble rather than Math.random, so the
      // arena looks the same every time a match is rebuilt.
      const wobble = Math.sin(index * 12.9898) * 0.5 + Math.sin(index * 4.1414) * 0.5;
      const heightScale = 0.82 + Math.abs(wobble) * 0.34;
      position.set(
        Math.cos(angle) * (pitRadius + 0.22 + wobble * 0.05),
        (postHeight * heightScale) / 2 - 0.25,
        Math.sin(angle) * (pitRadius + 0.22 + wobble * 0.05),
      );
      euler.set(wobble * 0.05, -angle, wobble * 0.045);
      quaternion.setFromEuler(euler);
      scale.set(1, heightScale, 1);
      posts.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    }

    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    // Rope banding at two heights, tying the posts into one wall.
    for (const height of [wallHeight * 0.45, wallHeight * 1.15]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(pitRadius + 0.24, 0.05, 6, 64),
        new THREE.MeshStandardMaterial({
          color: BERK_MATERIALS.timberDark,
          roughness: 1,
          metalness: 0,
        }),
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = height;
      group.add(band);
    }
  }

  /**
   * The viewing gallery ringing the pit.
   *
   * Deliberately thin. A solid grandstand at this camera height would wall the
   * fight off on any low orbit, and what actually reads as a dragon-training
   * ring from outside is the band of uprights against the sky, not the seating
   * behind them. A narrow deck, a fascia so it is not a floating disc when the
   * camera drops below it, and sparse rail posts buy that silhouette in four
   * draw calls.
   */
  private addKillRingGallery(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const deckY = wallHeight * 1.7;
    const innerRadius = pitRadius + 0.55;
    const outerRadius = pitRadius + 2.1;
    const railHeight = 0.62;

    const timber = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.timber,
      roughness: 0.94,
      metalness: 0,
    });
    const timberDark = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.timberDark,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const deck = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 44), timber);
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = deckY;
    deck.receiveShadow = true;
    group.add(deck);

    const fascia = new THREE.Mesh(
      new THREE.CylinderGeometry(outerRadius, outerRadius, 0.36, 44, 1, true),
      timberDark,
    );
    fascia.position.y = deckY - 0.18;
    group.add(fascia);

    const postCount = 30;
    const posts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.08, railHeight, 5),
      timber,
      postCount,
    );
    posts.castShadow = true;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    const identity = new THREE.Quaternion();

    for (let index = 0; index < postCount; index += 1) {
      const angle = (index / postCount) * Math.PI * 2;
      position.set(
        Math.cos(angle) * innerRadius,
        deckY + railHeight / 2,
        Math.sin(angle) * innerRadius,
      );
      posts.setMatrixAt(index, matrix.compose(position, identity, scale));
    }

    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(innerRadius, 0.055, 6, 44), timberDark);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = deckY + railHeight;
    group.add(rail);
  }

  /**
   * Round shields hung on the inner face of the palisade.
   *
   * The cheapest thing in the scene that says people live here rather than that
   * the pit was extruded by a machine. Instanced with a per-shield facing from
   * {@link SHIELD_FACINGS}, hung at uneven heights, and turned to face the
   * centre of the pit — which is where the camera always is.
   */
  private addPalisadeShields(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const shieldCount = 9;
    const shields = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.07, 12),
      new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.06 }),
      shieldCount,
    );
    shields.castShadow = true;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const facing = new THREE.Vector3();
    const colour = new THREE.Color();

    for (let index = 0; index < shieldCount; index += 1) {
      const wobble = Math.sin(index * 12.9898) * 0.5 + Math.sin(index * 4.1414) * 0.5;
      // Even spacing nudged off the ring, so the shields do not line up with
      // the 64 palisade posts behind them at a regular interval.
      const angle = (index / shieldCount) * Math.PI * 2 + 0.31 + wobble * 0.12;
      position.set(
        Math.cos(angle) * (pitRadius + 0.02),
        wallHeight * (0.75 + wobble * 0.28),
        Math.sin(angle) * (pitRadius + 0.02),
      );
      // The disc's local +y becomes the inward normal, so the face looks at the
      // middle of the pit rather than at the sky.
      facing.set(-Math.cos(angle), 0, -Math.sin(angle));
      quaternion.setFromUnitVectors(up, facing);
      shields.setMatrixAt(index, matrix.compose(position, quaternion, scale));
      shields.setColorAt(index, colour.setHex(SHIELD_FACINGS[index % SHIELD_FACINGS.length]));
    }

    shields.instanceMatrix.needsUpdate = true;
    if (shields.instanceColor) shields.instanceColor.needsUpdate = true;
    group.add(shields);
  }

  /**
   * Sea stacks on the horizon.
   *
   * The pit sits on an island, and without anything past the palisade the sky
   * meets the turf on a hard line that reads as a studio backdrop rather than
   * as weather. These are deliberately crude — six-sided flat-shaded cones, no
   * texture, no shadows — because they stand far enough out that the fog has
   * eaten everything but the silhouette by the time they reach the camera.
   */
  private addSeaStacks(group: THREE.Group, radius: number): void {
    const stackCount = 15;
    const stacks = new THREE.InstancedMesh(
      // Unit height: each instance scales this to its own.
      new THREE.CylinderGeometry(0.22, 1, 1, 6, 1),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.seaStack,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
      stackCount,
    );

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();

    for (let index = 0; index < stackCount; index += 1) {
      // Same seeded wobble as the palisade: the horizon must not reshuffle
      // itself every time a match is rebuilt.
      const wobble = Math.sin(index * 12.9898) * 0.5 + Math.sin(index * 4.1414) * 0.5;
      const angle = (index / stackCount) * Math.PI * 2 + wobble * 0.16;
      const distance = radius * (1.85 + Math.abs(wobble) * 0.6);
      const height = radius * (0.5 + Math.abs(wobble) * 0.72);
      const width = radius * (0.16 + Math.abs(wobble) * 0.1);

      position.set(
        Math.cos(angle) * distance,
        height / 2 - radius * 0.08,
        Math.sin(angle) * distance,
      );
      euler.set(wobble * 0.04, angle, wobble * 0.03);
      quaternion.setFromEuler(euler);
      scale.set(width, height, width);
      stacks.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    }

    stacks.instanceMatrix.needsUpdate = true;
    group.add(stacks);
  }

  /**
   * The chain net over the pit — the training arena's signature silhouette.
   *
   * Drawn as a wireframe hemisphere rather than `LineSegments` so that
   * `disposeAssemblyObject`, which only walks meshes, still frees it. The
   * triangulated wireframe happens to read as chain link, which is the look
   * this wants anyway.
   */
  private addChainDome(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(pitRadius + 0.3, 20, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.chain,
        wireframe: true,
        roughness: 0.6,
        metalness: 0.5,
        transparent: true,
        opacity: 0.55,
      }),
    );
    dome.position.y = wallHeight * 0.9;
    group.add(dome);
  }

  /**
   * Corner braziers: the only saturated light in the arena.
   *
   * Warm pools on an otherwise cool overcast field is the whole point of the
   * palette — without a fire source the theme reads as a flat grey day rather
   * than as Berk. Registered on `this.braziers` so `render` can flicker them.
   */
  private addBraziers(group: THREE.Group, pitRadius: number, wallHeight: number): void {
    const postMaterial = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.timberDark,
      roughness: 0.9,
      metalness: 0.05,
    });
    const emberMaterial = new THREE.MeshStandardMaterial({
      color: BERK_MATERIALS.emberCore,
      emissive: BERK_MATERIALS.emberGlow,
      emissiveIntensity: 3.2,
      roughness: 0.4,
    });
    const bowlHeight = wallHeight * 1.5;

    for (let index = 0; index < 4; index += 1) {
      const angle = Math.PI / 4 + (index / 4) * Math.PI * 2;
      const x = Math.cos(angle) * (pitRadius + 0.75);
      const z = Math.sin(angle) * (pitRadius + 0.75);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.15, bowlHeight, 6),
        postMaterial,
      );
      post.position.set(x, bowlHeight / 2, z);
      post.castShadow = true;
      group.add(post);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.26, 8), postMaterial);
      bowl.position.set(x, bowlHeight + 0.1, z);
      bowl.castShadow = true;
      group.add(bowl);

      // Bloom is already in the post chain, so an emissive lump is all the
      // flame this needs at arena distance.
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), emberMaterial.clone());
      ember.position.set(x, bowlHeight + 0.28, z);
      group.add(ember);

      const light = new THREE.PointLight(BERK_MATERIALS.emberGlow, 14, pitRadius * 2.4, 2);
      light.position.set(x, bowlHeight + 0.45, z);
      group.add(light);

      this.braziers.push({
        light,
        ember,
        baseIntensity: 14,
        rate: BRAZIER_FLICKER_RATES[index % BRAZIER_FLICKER_RATES.length],
        phase: index * 1.7,
      });
    }
  }

  /**
   * The physics boundary, as mortared stone.
   *
   * In the pit the palisade is what the player actually reads as the edge and
   * this stands behind it; in a car or robot scenario it is the edge on its
   * own. Either way it is the same wall — the emissive trim that used to run
   * along the top went with the old theme.
   */
  private addWallMesh(group: THREE.Group, position: Vector3Data, size: Vector3Data): void {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({
        color: BERK_MATERIALS.stone,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    wall.position.set(position.x, position.y, position.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }

  private addObstacleMesh(
    group: THREE.Group,
    position: Vector3Data,
    size: Vector3Data,
    color: number,
    rotation?: Vector3Data,
  ): void {
    const obstacle = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 }),
    );
    obstacle.position.set(position.x, position.y, position.z);
    if (rotation) {
      obstacle.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    group.add(obstacle);
  }

  private resize(): void {
    if (!this.host || !this.renderer || !this.camera) {
      return;
    }

    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // `updateStyle` on: nothing else sizes this canvas. Suppressing it left the
    // element laid out at devicePixelRatio times its container on HiDPI screens,
    // so only the top-left quadrant was visible.
    this.renderer.setSize(width, height);
    this.postPipeline?.setSize(width, height);
    this.hud?.setSize(width, height);
    this.render();
  }
}

/**
 * How bright the wind-up ring is for an attack in progress.
 *
 * Rises from nothing at the start of the move to full at the instant the blow
 * lands, then goes out. `strikeAt` is authored per ability alongside the pose
 * curves, so the ring peaks exactly when the jaws close — a fixed fraction
 * would drift out of sync the moment a move's timing was retuned.
 */
function telegraphIntensity(attack: BattleAttackPoseSnapshot | undefined): number {
  if (!attack) return 0;

  const strikeAt = getAbilityDemo(attack.ability)?.strikeAt ?? 0.5;
  if (strikeAt <= 0 || attack.phase > strikeAt) return 0;

  return Math.max(0, Math.min(1, attack.phase / strikeAt));
}

/** Summed health across every part a combatant owns. */
function combatantHealth(
  bodyKeys: readonly string[],
  statuses: Record<string, BattlePartStatus>,
): { current: number; max: number } {
  let current = 0;
  let max = 0;

  for (const bodyKey of bodyKeys) {
    const status = statuses[bodyKey];
    if (!status) continue;
    current += status.destroyed ? 0 : status.health;
    max += status.maxHealth;
  }

  return { current, max };
}

/**
 * Whether the viewer has asked for reduced motion.
 *
 * The 2D stations have honoured this for a while; the arena did not, which
 * meant the one screen in the app with continuous camera movement was also the
 * one screen ignoring the request. Read once at mount — a duel is short enough
 * that watching for changes mid-match is not worth the listener.
 */
function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Radial falloff for the contact blobs.
 *
 * Squared falloff rather than linear: a linear gradient has a visible edge
 * where it reaches zero, which reads as a disc lying on the sand instead of as
 * a shadow. Returns null outside a DOM, where the renderer is not running
 * anyway.
 */
function createContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (let stop = 0; stop <= 10; stop += 1) {
    const t = stop / 10;
    gradient.addColorStop(t, `rgba(255,255,255,${(1 - t) * (1 - t)})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
