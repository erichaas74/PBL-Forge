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
} from '../../assembly/domain/vector-data';
import {
  createAssemblyGeometry,
  createAssemblyMaterial,
  getAssemblyRenderSignature,
} from '../../assembly/rendering/three-assembly-mesh.factory';
import {
  ArenaSetupStyleId,
  ArenaSetupConfig,
  BattleArenaState,
  BattleBodySnapshot,
  BattlePartStatus,
  BattleTeam,
} from '../models/arena.models';
import { getBodyKey } from '../utils/battle-assembly';

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
  private readonly meshes = new Map<string, THREE.Mesh>();

  mount(host: HTMLElement): void {
    this.dispose();
    this.host = host;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f6fb);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 250);
    camera.position.set(6.7, 5.4, 7.2);
    camera.lookAt(0, 1, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

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

    this.syncArenaEnvironment(state.setup);
    const nextBodyKeys = new Set<string>();

    for (const combatant of state.combatants) {
      for (const part of combatant.assembly.parts) {
        const bodyKey = getBodyKey(combatant.id, part.id);
        nextBodyKeys.add(bodyKey);
        this.syncPartMesh(bodyKey, combatant.team, part);

        const mesh = this.meshes.get(bodyKey);
        if (mesh) {
          mesh.position.set(
            part.position.x + combatant.spawnPosition.x,
            part.position.y + combatant.spawnPosition.y,
            part.position.z + combatant.spawnPosition.z,
          );
          const rotation = multiplyQuaternions(
            quaternionFromEuler(combatant.initialRotation),
            part.rotation ?? identityQuaternion(),
          );
          mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
      }
    }

    for (const [bodyKey, mesh] of Array.from(this.meshes.entries())) {
      if (!nextBodyKeys.has(bodyKey)) {
        this.scene.remove(mesh);
        disposeMesh(mesh);
        this.meshes.delete(bodyKey);
      }
    }

    this.render();
  }

  applyFrame(
    snapshots: BattleBodySnapshot[],
    statuses: Record<string, BattlePartStatus>,
  ): void {
    for (const snapshot of snapshots) {
      const mesh = this.meshes.get(snapshot.bodyKey);

      if (!mesh) {
        continue;
      }

      mesh.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      mesh.quaternion.set(
        snapshot.quaternion.x,
        snapshot.quaternion.y,
        snapshot.quaternion.z,
        snapshot.quaternion.w,
      );

      this.updateDamageMaterial(mesh, statuses[snapshot.bodyKey]);
    }

    this.render();
  }

  render(): void {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const mesh of this.meshes.values()) {
      disposeMesh(mesh);
    }

    this.meshes.clear();
    this.removeEnvironment();
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

  private syncPartMesh(bodyKey: string, team: BattleTeam, part: AssemblyPart): void {
    if (!this.scene) {
      return;
    }

    const signature = getAssemblyRenderSignature(part);
    const current = this.meshes.get(bodyKey);

    if (current && current.userData['signature'] === signature) {
      return;
    }

    if (current) {
      this.scene.remove(current);
      disposeMesh(current);
    }

    const material = createAssemblyMaterial(part, {
      emissive: team === 'red' ? 0x330000 : 0x001a33,
      emissiveIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(createAssemblyGeometry(part), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData['signature'] = signature;
    mesh.userData['baseColor'] = part.color;
    this.meshes.set(bodyKey, mesh);
    this.scene.add(mesh);
  }

  private updateDamageMaterial(mesh: THREE.Mesh, status: BattlePartStatus | undefined): void {
    if (!(mesh.material instanceof THREE.MeshStandardMaterial) || !status) {
      return;
    }

    if (status.destroyed) {
      mesh.material.color.set('#1f2937');
      mesh.material.opacity = 0.38;
      mesh.material.transparent = true;
      return;
    }

    const healthRatio = Math.max(0, status.health / status.maxHealth);
    const baseColor = new THREE.Color(String(mesh.userData['baseColor']));
    const damageColor = new THREE.Color('#7f1d1d');
    mesh.material.color.copy(baseColor.lerp(damageColor, 1 - healthRatio));
    mesh.material.opacity = 1;
    mesh.material.transparent = false;
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
    this.environmentGroup.traverse(object => {
      if (object instanceof THREE.Mesh) {
        disposeMesh(object);
      }
    });
    this.environmentGroup = null;
    this.currentSetupStyleId = null;
  }

  private addArena(scene: THREE.Group, setup: ArenaSetupConfig): void {
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(setup.floorSize.x, setup.floorSize.y, setup.floorSize.z),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }),
    );
    floor.position.y = -setup.floorSize.y / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(setup.floorSize.x, setup.floorSize.z), 24, 0x64748b, 0xcbd5e1);
    grid.position.y = 0.004;
    scene.add(grid);

    const wallThickness = 0.24;
    const wallY = setup.wallHeight / 2;
    this.addWallMesh(scene, { x: 0, y: wallY, z: -setup.floorSize.z / 2 - wallThickness / 2 }, { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness }, 0x94a3b8);
    this.addWallMesh(scene, { x: 0, y: wallY, z: setup.floorSize.z / 2 + wallThickness / 2 }, { x: setup.floorSize.x, y: setup.wallHeight, z: wallThickness }, 0x94a3b8);
    this.addWallMesh(scene, { x: -setup.floorSize.x / 2 - wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z }, 0x94a3b8);
    this.addWallMesh(scene, { x: setup.floorSize.x / 2 + wallThickness / 2, y: wallY, z: 0 }, { x: wallThickness, y: setup.wallHeight, z: setup.floorSize.z }, 0x94a3b8);

    for (const obstacle of setup.obstacles) {
      this.addWallMesh(
        scene,
        obstacle.position,
        obstacle.size,
        Number.parseInt(obstacle.color.replace('#', ''), 16),
        obstacle.rotation,
      );
    }
  }

  private addWallMesh(
    scene: THREE.Group,
    position: Vector3Data,
    size: Vector3Data,
    color: number,
    rotation?: Vector3Data,
  ): void {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    wall.position.set(position.x, position.y, position.z);
    if (rotation) {
      wall.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  private resize(): void {
    if (!this.host || !this.renderer || !this.camera) {
      return;
    }

    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    for (const material of mesh.material) {
      material.dispose();
    }
    return;
  }

  mesh.material.dispose();
}
