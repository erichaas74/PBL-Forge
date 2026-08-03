import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
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
  ARENA_STAGE_THEME,
  StagePostPipeline,
  configureStageRenderer,
  createGradientSkyTexture,
  createGroundTexture,
  createStageLighting,
  createStagePostPipeline,
  installStageEnvironment,
} from '../../assembly/rendering/scene-environment';
import {
  ArenaSetupStyleId,
  ArenaSetupConfig,
  BattleArenaState,
  BattleBodySnapshot,
  BattlePartStatus,
  BattleTeam,
  FireConeSnapshot,
} from '../models/arena.models';
import { getBodyKey } from '../utils/battle-assembly';

const TEAM_TINTS: Record<BattleTeam, { emissive: number; intensity: number }> = {
  red: { emissive: 0x4a0d12, intensity: 0.22 },
  blue: { emissive: 0x0c1f4a, intensity: 0.22 },
};

@Injectable()
export class AssemblyArenaRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private environmentGroup: THREE.Group | null = null;
  private currentSetupStyleId: ArenaSetupStyleId | null = null;
  private quality: RenderQuality = 'high';
  private postPipeline: StagePostPipeline | null = null;
  private skyTexture: THREE.CanvasTexture | null = null;
  private disposeEnvironmentMap: (() => void) | null = null;
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly lastHealthByBodyKey = new Map<string, number>();
  private readonly flashUntilByBodyKey = new Map<string, number>();
  private readonly fireConeMeshes = new Map<string, THREE.Mesh>();

  mount(host: HTMLElement): void {
    this.dispose();
    this.host = host;
    this.quality = resolveRenderQuality();

    const scene = new THREE.Scene();
    this.skyTexture = createGradientSkyTexture(ARENA_STAGE_THEME);
    scene.background = this.skyTexture ?? new THREE.Color(ARENA_STAGE_THEME.skyBottom);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 250);
    camera.position.set(6.7, 5.4, 7.2);
    camera.lookAt(0, 1, 0);
    this.camera = camera;

    // MSAA only when the post chain (which brings SMAA) is off.
    const renderer = new THREE.WebGLRenderer({ antialias: this.quality === 'low' });
    configureStageRenderer(renderer, this.quality);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.disposeEnvironmentMap = installStageEnvironment(scene, renderer, ARENA_STAGE_THEME);
    this.postPipeline = createStagePostPipeline(renderer, scene, camera, this.quality);

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

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

    this.syncArenaEnvironment(state.setup);
    const nextBodyKeys = new Set<string>();

    for (const combatant of state.combatants) {
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
  ): void {
    this.syncFireCones(fireCones);

    for (const snapshot of snapshots) {
      const object = this.partObjects.get(snapshot.bodyKey);

      if (!object) {
        continue;
      }

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

    this.render();
  }

  render(): void {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.controls?.update();

    if (this.postPipeline) {
      this.postPipeline.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const object of this.partObjects.values()) {
      disposeAssemblyObject(object);
    }

    this.partObjects.clear();
    this.lastHealthByBodyKey.clear();
    this.flashUntilByBodyKey.clear();
    this.syncFireCones([]);
    this.removeEnvironment();
    this.postPipeline?.dispose();
    this.postPipeline = null;
    this.disposeEnvironmentMap?.();
    this.disposeEnvironmentMap = null;
    this.skyTexture?.dispose();
    this.skyTexture = null;
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

  private updateDamageAppearance(object: THREE.Object3D, status: BattlePartStatus | undefined): void {
    if (!status) {
      return;
    }

    applyAssemblyDamageAppearance(object, {
      healthRatio: status.maxHealth > 0 ? status.health / status.maxHealth : 0,
      destroyed: status.destroyed,
    });
  }

  /** Additive flame cone shown while a dragon breathes fire; bloom does the rest. */
  private syncFireCones(cones: FireConeSnapshot[]): void {
    if (!this.scene) {
      return;
    }

    const seen = new Set<string>();
    const up = new THREE.Vector3(0, 1, 0);

    for (const cone of cones) {
      seen.add(cone.combatantId);
      let mesh = this.fireConeMeshes.get(cone.combatantId);

      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(1.0, 3.2, 14, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xff8c2e,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        this.fireConeMeshes.set(cone.combatantId, mesh);
        this.scene.add(mesh);
      }

      const direction = new THREE.Vector3(cone.direction.x, cone.direction.y, cone.direction.z);
      if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
      direction.normalize();

      // Cone tip (+y) points back at the mouth; the base flares away from it.
      mesh.quaternion.setFromUnitVectors(up, direction.clone().negate());
      mesh.position.set(
        cone.origin.x + direction.x * 1.6,
        cone.origin.y + direction.y * 1.6,
        cone.origin.z + direction.z * 1.6,
      );
      const flicker = 0.9 + Math.random() * 0.2;
      mesh.scale.set(flicker, 1, flicker);
    }

    for (const [combatantId, mesh] of Array.from(this.fireConeMeshes.entries())) {
      if (!seen.has(combatantId)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (!Array.isArray(mesh.material)) mesh.material.dispose();
        this.fireConeMeshes.delete(combatantId);
      }
    }
  }

  /** Pulse a part's emissive briefly whenever its health drops. */
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
    if (previousHealth !== undefined && status.health < previousHealth - 0.01 && !status.destroyed) {
      this.flashUntilByBodyKey.set(bodyKey, now + 240);
    }
    this.lastHealthByBodyKey.set(bodyKey, status.health);

    applyAssemblyHitFlash(object, now < (this.flashUntilByBodyKey.get(bodyKey) ?? 0));
  }

  private syncArenaEnvironment(setup: ArenaSetupConfig): void {
    if (!this.scene || this.currentSetupStyleId === setup.id) {
      return;
    }

    this.removeEnvironment();
    this.currentSetupStyleId = setup.id;
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);
    this.addArena(this.environmentGroup, setup);
  }

  private removeEnvironment(): void {
    if (!this.scene || !this.environmentGroup) {
      return;
    }

    this.scene.remove(this.environmentGroup);
    disposeAssemblyObject(this.environmentGroup);
    this.environmentGroup = null;
    this.currentSetupStyleId = null;
  }

  private addArena(group: THREE.Group, setup: ArenaSetupConfig): void {
    const radius = Math.max(setup.floorSize.x, setup.floorSize.z);

    group.add(createStageLighting(
      ARENA_STAGE_THEME,
      { width: setup.floorSize.x, depth: setup.floorSize.z },
      this.quality,
    ));

    if (this.scene) {
      this.scene.fog = new THREE.Fog(ARENA_STAGE_THEME.fogColor, radius * 1.6, radius * 5);
    }

    const groundTexture = createGroundTexture('#232c3d', '#8fa7c9');
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(setup.floorSize.x, setup.floorSize.y, setup.floorSize.z),
      new THREE.MeshStandardMaterial({
        color: groundTexture ? 0xffffff : 0x232c3d,
        map: groundTexture,
        roughness: 0.88,
        metalness: 0.05,
      }),
    );
    floor.position.y = -setup.floorSize.y / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Wide apron under the arena so the fog has something to fade over.
    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 3.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 1, metalness: 0 }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -setup.floorSize.y - 0.01;
    apron.receiveShadow = true;
    group.add(apron);

    const wallThickness = 0.24;
    const wallY = setup.wallHeight / 2;
    this.addWallMesh(group, { x: 0, y: wallY, z: -setup.floorSize.z / 2 - wallThickness / 2 }, { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness });
    this.addWallMesh(group, { x: 0, y: wallY, z: setup.floorSize.z / 2 + wallThickness / 2 }, { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness });
    this.addWallMesh(group, { x: -setup.floorSize.x / 2 - wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z });
    this.addWallMesh(group, { x: setup.floorSize.x / 2 + wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z });

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

  private addWallMesh(group: THREE.Group, position: Vector3Data, size: Vector3Data): void {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color: 0x3b4a63, roughness: 0.5, metalness: 0.3 }),
    );
    wall.position.set(position.x, position.y, position.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Emissive trim along the top edge: the bloom pass turns it into arena glow.
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(size.x + 0.02, 0.05, size.z + 0.02),
      new THREE.MeshStandardMaterial({
        color: 0x06202a,
        emissive: 0x22d3ee,
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
    );
    trim.position.set(position.x, position.y + size.y / 2 + 0.025, position.z);
    group.add(trim);
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
    this.render();
  }
}
