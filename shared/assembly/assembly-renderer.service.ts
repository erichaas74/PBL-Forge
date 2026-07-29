import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AssemblyPhysicsSnapshot,
  AssemblyBlueprint,
  AssemblyJoint,
  AssemblyPart,
  AssemblySnapPoint,
  Vector3Data,
} from './domain/assembly.models';
import { identityQuaternion, rotateVectorByQuaternion } from './domain/vector-data';
import { getAssemblySnapPoints } from './domain/snap-points';
import {
  createAssemblyGeometry,
  createAssemblyMaterial,
  getAssemblyRenderSignature,
} from './rendering/three-assembly-mesh.factory';

@Injectable()
export class AssemblyRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private selectionBox: THREE.BoxHelper | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly jointLines = new Map<string, THREE.Line>();
  private readonly snapPointMeshes = new Map<string, THREE.Mesh>();
  private currentJoints: AssemblyJoint[] = [];

  mount(host: HTMLElement): void {
    this.dispose();
    this.host = host;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f7fb);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(5.5, 4.5, 6.5);
    camera.lookAt(0, 1, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    this.addSceneHelpers(scene);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  syncAssembly(state: AssemblyBlueprint, showSnapPoints = false): void {
    if (!this.scene) {
      return;
    }

    const partIds = new Set(state.parts.map(part => part.id));
    const jointIds = new Set(state.joints.map(joint => joint.id));
    this.currentJoints = state.joints.map(joint => ({ ...joint }));

    for (const [partId, mesh] of Array.from(this.meshes.entries())) {
      if (!partIds.has(partId)) {
        this.scene.remove(mesh);
        disposeRenderable(mesh);
        this.meshes.delete(partId);
      }
    }

    for (const [jointId, line] of Array.from(this.jointLines.entries())) {
      if (!jointIds.has(jointId)) {
        this.scene.remove(line);
        disposeRenderable(line);
        this.jointLines.delete(jointId);
      }
    }

    for (const part of state.parts) {
      this.syncPart(part);
    }

    for (const joint of state.joints) {
      this.syncJoint(joint, state.parts);
    }

    if (showSnapPoints) {
      this.syncSnapPoints(state);
    }

    this.render();
  }

  syncSelection(partId: string | null): void {
    if (!this.scene) {
      return;
    }

    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.dispose();
      this.selectionBox = null;
    }

    if (!partId) {
      this.render();
      return;
    }

    const mesh = this.meshes.get(partId);

    if (!mesh) {
      this.render();
      return;
    }

    this.selectionBox = new THREE.BoxHelper(mesh, 0x0f62fe);
    this.scene.add(this.selectionBox);
    this.render();
  }

  applySnapshot(snapshots: AssemblyPhysicsSnapshot[]): void {
    for (const snapshot of snapshots) {
      const mesh = this.meshes.get(snapshot.partId);

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
    }

    this.syncJointLinesFromMeshes();
    this.render();
  }

  pickPart(clientX: number, clientY: number): string | null {
    this.prepareRay(clientX, clientY);
    const intersections = this.raycaster.intersectObjects(Array.from(this.meshes.values()), false);
    const hit = intersections[0]?.object;

    if (!hit) {
      return null;
    }

    return typeof hit.userData['partId'] === 'string' ? hit.userData['partId'] : null;
  }

  pickSnapPoint(clientX: number, clientY: number): AssemblySnapPoint | null {
    this.prepareRay(clientX, clientY);
    const intersections = this.raycaster.intersectObjects(Array.from(this.snapPointMeshes.values()), false);
    const hit = intersections[0]?.object;

    if (!hit) {
      return null;
    }

    const snapPoint = hit.userData['snapPoint'];
    return isSnapPoint(snapPoint) ? snapPoint : null;
  }

  projectPointerToPlane(clientX: number, clientY: number, planeY: number): Vector3Data | null {
    this.prepareRay(clientX, clientY);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const hit = new THREE.Vector3();

    if (!this.raycaster.ray.intersectPlane(plane, hit)) {
      return null;
    }

    return { x: hit.x, y: planeY, z: hit.z };
  }

  render(): void {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.controls?.update();
    this.selectionBox?.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const mesh of this.meshes.values()) {
      disposeRenderable(mesh);
    }

    for (const line of this.jointLines.values()) {
      disposeRenderable(line);
    }

    for (const marker of this.snapPointMeshes.values()) {
      disposeRenderable(marker);
    }

    this.meshes.clear();
    this.jointLines.clear();
    this.snapPointMeshes.clear();

    if (this.selectionBox) {
      this.selectionBox.dispose();
      this.selectionBox = null;
    }

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
    this.currentJoints = [];
  }

  private syncPart(part: AssemblyPart): void {
    if (!this.scene) {
      return;
    }

    const signature = getAssemblyRenderSignature(part);
    const existing = this.meshes.get(part.id);
    let mesh = existing;

    if (!mesh || mesh.userData['geometrySignature'] !== signature) {
      if (mesh) {
        this.scene.remove(mesh);
        disposeRenderable(mesh);
      }

      mesh = this.createPartMesh(part, signature);
      this.meshes.set(part.id, mesh);
      this.scene.add(mesh);
    }

    mesh.position.set(part.position.x, part.position.y, part.position.z);

    if (part.rotation) {
      mesh.quaternion.set(part.rotation.x, part.rotation.y, part.rotation.z, part.rotation.w);
    } else {
      mesh.quaternion.identity();
    }

    const material = mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.set(part.color);
    }
  }

  private syncJoint(joint: AssemblyJoint, parts: AssemblyPart[]): void {
    if (!this.scene) {
      return;
    }

    const parent = parts.find(part => part.id === joint.parentPartId);
    const child = parts.find(part => part.id === joint.childPartId);

    if (!parent || !child) {
      return;
    }

    const points = [
      toThreeVector(addVector(
        parent.position,
        rotateVectorByQuaternion(joint.pivotOnParent, parent.rotation ?? identityQuaternion()),
      )),
      toThreeVector(addVector(
        child.position,
        rotateVectorByQuaternion(joint.pivotOnChild, child.rotation ?? identityQuaternion()),
      )),
    ];

    let line = this.jointLines.get(joint.id);

    if (!line) {
      line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x243447 }),
      );
      this.jointLines.set(joint.id, line);
      this.scene.add(line);
      return;
    }

    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  private syncJointLinesFromMeshes(): void {
    for (const joint of this.currentJoints) {
      const parent = this.meshes.get(joint.parentPartId);
      const child = this.meshes.get(joint.childPartId);
      const line = this.jointLines.get(joint.id);

      if (!parent || !child || !line) {
        continue;
      }

      const points = [
        localPointToWorld(parent, joint.pivotOnParent),
        localPointToWorld(child, joint.pivotOnChild),
      ];

      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
  }

  private createPartMesh(part: AssemblyPart, signature: string): THREE.Mesh {
    const mesh = new THREE.Mesh(createAssemblyGeometry(part), createAssemblyMaterial(part));

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData['geometrySignature'] = signature;
    mesh.userData['partId'] = part.id;

    return mesh;
  }

  private addSceneHelpers(scene: THREE.Scene): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb9e6ff, 0.45);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(12, 24, 0x8fa3b8, 0xd5dde8);
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ color: 0x1f2937, opacity: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  private syncSnapPoints(state: AssemblyBlueprint): void {
    if (!this.scene) {
      return;
    }

    const snapPoints = getAssemblySnapPoints(state);
    const nextKeys = new Set(snapPoints.map(point => getSnapPointKey(point)));

    for (const [key, marker] of Array.from(this.snapPointMeshes.entries())) {
      if (!nextKeys.has(key)) {
        this.scene.remove(marker);
        disposeRenderable(marker);
        this.snapPointMeshes.delete(key);
      }
    }

    for (const snapPoint of snapPoints) {
      const key = getSnapPointKey(snapPoint);
      let marker = this.snapPointMeshes.get(key);

      if (!marker) {
        marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 12, 8),
          new THREE.MeshBasicMaterial({
            color: 0x0f62fe,
            depthTest: false,
            transparent: true,
            opacity: 0.82,
          }),
        );
        marker.renderOrder = 10;
        this.snapPointMeshes.set(key, marker);
        this.scene.add(marker);
      }

      marker.position.set(
        snapPoint.worldPosition.x,
        snapPoint.worldPosition.y,
        snapPoint.worldPosition.z,
      );
      marker.userData['snapPoint'] = snapPoint;
    }
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

  private prepareRay(clientX: number, clientY: number): void {
    if (!this.renderer || !this.camera) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }
}

function addVector(a: Vector3Data, b: Vector3Data): Vector3Data {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function toThreeVector(vector: Vector3Data): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function localPointToWorld(mesh: THREE.Mesh, vector: Vector3Data): THREE.Vector3 {
  return mesh.localToWorld(toThreeVector(vector));
}

function getSnapPointKey(snapPoint: AssemblySnapPoint): string {
  return `${snapPoint.partId}:${snapPoint.id}`;
}

function isSnapPoint(value: unknown): value is AssemblySnapPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AssemblySnapPoint>;
  return typeof candidate.id === 'string' && typeof candidate.partId === 'string';
}

function disposeRenderable(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
    object.geometry.dispose();
    const material = object.material;

    if (Array.isArray(material)) {
      for (const item of material) {
        item.dispose();
      }
      return;
    }

    material.dispose();
  }
}
