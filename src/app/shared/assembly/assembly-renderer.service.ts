import { Service } from '@angular/core';
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
import { getAssemblySnapPoints, getPartSnapPoints } from './domain/snap-points';
import {
  createAssemblyObject,
  disposeAssemblyObject,
  getAssemblyRenderSignature,
} from './rendering/three-assembly-mesh.factory';
import { RenderQuality, resolveRenderQuality } from './rendering/render-quality';
import {
  STUDIO_STAGE_THEME,
  configureStageRenderer,
  createGradientSkyTexture,
  createStageLighting,
  installStageEnvironment,
} from './rendering/scene-environment';

@Service({ autoProvided: false })
export class AssemblyRendererService {
  private host: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private selectionBox: THREE.BoxHelper | null = null;
  private quality: RenderQuality = 'high';
  private skyTexture: THREE.CanvasTexture | null = null;
  private disposeEnvironmentMap: (() => void) | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly partObjects = new Map<string, THREE.Object3D>();
  private readonly jointLines = new Map<string, THREE.Line>();
  private readonly snapPointMeshes = new Map<string, THREE.Mesh>();
  private highlightedSnapKey: string | null = null;
  private currentJoints: AssemblyJoint[] = [];
  private contextLost = false;

  mount(host: HTMLElement): void {
    this.dispose();
    this.host = host;
    this.quality = resolveRenderQuality();

    const scene = new THREE.Scene();
    this.skyTexture = createGradientSkyTexture(STUDIO_STAGE_THEME);
    scene.background = this.skyTexture ?? new THREE.Color(STUDIO_STAGE_THEME.skyBottom);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(5.5, 4.5, 6.5);
    camera.lookAt(0, 1, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    configureStageRenderer(renderer, this.quality);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.disposeEnvironmentMap = installStageEnvironment(scene, renderer, STUDIO_STAGE_THEME);

    this.controls = new OrbitControls(camera, renderer.domElement);
    // Change-driven controls let authoring viewports sleep when nobody is
    // interacting. Damping requires a permanent animation loop and was keeping
    // every Parts Lab/Garage canvas on the GPU continuously.
    this.controls.enableDamping = false;
    this.controls.target.set(0, 1, 0);
    this.controls.addEventListener('change', this.renderScene);

    this.addSceneHelpers(scene);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  syncAssembly(
    state: AssemblyBlueprint,
    showSnapPoints = false,
    snapPointPartId?: string | null,
  ): void {
    if (!this.scene) {
      return;
    }

    const partIds = new Set(state.parts.map(part => part.id));
    const jointIds = new Set(state.joints.map(joint => joint.id));
    this.currentJoints = state.joints.map(joint => ({ ...joint }));

    for (const [partId, object] of Array.from(this.partObjects.entries())) {
      if (!partIds.has(partId)) {
        this.scene.remove(object);
        disposeAssemblyObject(object);
        this.partObjects.delete(partId);
      }
    }

    for (const [jointId, line] of Array.from(this.jointLines.entries())) {
      if (!jointIds.has(jointId)) {
        this.scene.remove(line);
        disposeLine(line);
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
      this.syncSnapPoints(state, snapPointPartId);
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

    const object = this.partObjects.get(partId);

    if (!object) {
      this.render();
      return;
    }

    this.selectionBox = new THREE.BoxHelper(object, 0x0f62fe);
    this.scene.add(this.selectionBox);
    this.render();
  }

  /** Fits the current authored assembly without changing the user's orbit direction. */
  frameAssembly(padding = 1.18): void {
    if (!this.camera || !this.controls || this.partObjects.size === 0) return;
    const bounds = new THREE.Box3();
    for (const object of this.partObjects.values()) bounds.expandByObject(object, true);
    if (bounds.isEmpty()) return;

    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const distance = Math.max(
      0.8,
      sphere.radius * Math.max(padding, 1) / Math.sin(Math.max(limitingFov / 2, 0.01)),
    );
    const direction = this.camera.position.clone().sub(this.controls.target);
    if (direction.lengthSq() < 1e-6) direction.set(5.5, 3.5, 6.5);
    direction.normalize();

    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(direction, distance);
    this.camera.near = Math.max(0.01, distance - sphere.radius * 2.2);
    this.camera.far = Math.max(200, distance + sphere.radius * 4);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.renderScene();
  }

  applySnapshot(snapshots: AssemblyPhysicsSnapshot[]): void {
    for (const snapshot of snapshots) {
      const object = this.partObjects.get(snapshot.partId);

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
    }

    this.syncJointLinesFromObjects();
    this.render();
  }

  pickPart(clientX: number, clientY: number): string | null {
    this.prepareRay(clientX, clientY);
    const intersections = this.raycaster.intersectObjects(Array.from(this.partObjects.values()), true);
    const hit = intersections[0]?.object;

    if (!hit) {
      return null;
    }

    return findPartId(hit);
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

  /**
   * Suspends orbiting. Dragging something in the scene and orbiting the camera
   * are the same gesture, so whoever handles the drag has to claim it first.
   */
  setControlsEnabled(enabled: boolean): void {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  /**
   * Marks one snap marker as the one being edited. Sockets sit close together
   * on a part, so the Snap Workshop needs the one under the controls to be
   * obvious without hovering each in turn. Null clears it.
   */
  highlightSnapPoint(partId: string | null, snapPointId: string | null): void {
    this.highlightedSnapKey = partId && snapPointId ? `${partId}:${snapPointId}` : null;

    for (const [key, marker] of this.snapPointMeshes) {
      applySnapMarkerHighlight(marker, key === this.highlightedSnapKey);
    }
  }

  /**
   * Projects the pointer onto the plane facing the camera through `through`.
   *
   * A horizontal plane can only ever move two axes, and it shears badly once
   * the camera is anywhere near level with it. Dragging against the screen
   * plane instead keeps whatever is being dragged under the cursor from any
   * orbit angle, which is what a free move is expected to do.
   */
  projectPointerToCameraPlane(
    clientX: number,
    clientY: number,
    through: Vector3Data,
  ): Vector3Data | null {
    if (!this.camera) {
      return null;
    }

    this.prepareRay(clientX, clientY);

    const towardCamera = this.camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      towardCamera,
      toThreeVector(through),
    );
    const hit = new THREE.Vector3();

    if (!this.raycaster.ray.intersectPlane(plane, hit)) {
      return null;
    }

    return { x: hit.x, y: hit.y, z: hit.z };
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
    this.controls?.update();
    this.renderScene();
  }

  private readonly renderScene = (): void => {
    if (!this.scene || !this.camera || !this.renderer || this.contextLost) return;
    this.selectionBox?.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const object of this.partObjects.values()) {
      disposeAssemblyObject(object);
    }

    for (const line of this.jointLines.values()) {
      disposeLine(line);
    }

    for (const marker of this.snapPointMeshes.values()) {
      marker.geometry.dispose();
      if (!Array.isArray(marker.material)) marker.material.dispose();
    }

    this.partObjects.clear();
    this.jointLines.clear();
    this.snapPointMeshes.clear();

    if (this.selectionBox) {
      this.selectionBox.dispose();
      this.selectionBox = null;
    }

    this.disposeEnvironmentMap?.();
    this.disposeEnvironmentMap = null;
    this.skyTexture?.dispose();
    this.skyTexture = null;
    this.controls?.removeEventListener('change', this.renderScene);
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
    this.currentJoints = [];
    this.contextLost = false;
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    this.resize();
    this.render();
  };

  private syncPart(part: AssemblyPart): void {
    if (!this.scene) {
      return;
    }

    // The signature includes color, so recolored parts rebuild with fresh materials.
    const signature = getAssemblyRenderSignature(part);
    const existing = this.partObjects.get(part.id);
    let object = existing;

    if (!object || object.userData['signature'] !== signature) {
      if (object) {
        this.scene.remove(object);
        disposeAssemblyObject(object);
      }

      object = createAssemblyObject(part, { onAsyncReady: this.renderScene });
      object.userData['signature'] = signature;
      this.partObjects.set(part.id, object);
      this.scene.add(object);
    }

    object.position.set(part.position.x, part.position.y, part.position.z);

    if (part.rotation) {
      object.quaternion.set(part.rotation.x, part.rotation.y, part.rotation.z, part.rotation.w);
    } else {
      object.quaternion.identity();
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

  private syncJointLinesFromObjects(): void {
    for (const joint of this.currentJoints) {
      const parent = this.partObjects.get(joint.parentPartId);
      const child = this.partObjects.get(joint.childPartId);
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

  private addSceneHelpers(scene: THREE.Scene): void {
    scene.add(createStageLighting(STUDIO_STAGE_THEME, { width: 12, depth: 12 }, this.quality));

    // The build grid stays: it is a workshop, and students need the spatial reference.
    const grid = new THREE.GridHelper(12, 24, 0xa4b4c8, 0xdbe3ee);
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ color: 0x1f2937, opacity: 0.14 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  private syncSnapPoints(state: AssemblyBlueprint, partId?: string | null): void {
    if (!this.scene) {
      return;
    }

    const snapPoints = partId === undefined
      ? getAssemblySnapPoints(state)
      : state.parts.filter(part => part.id === partId).flatMap(getPartSnapPoints);
    const nextKeys = new Set(snapPoints.map(point => getSnapPointKey(point)));

    for (const [key, marker] of Array.from(this.snapPointMeshes.entries())) {
      if (!nextKeys.has(key)) {
        this.scene.remove(marker);
        marker.geometry.dispose();
        if (!Array.isArray(marker.material)) marker.material.dispose();
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
      applySnapMarkerHighlight(marker, key === this.highlightedSnapKey);
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
    // `updateStyle` on: nothing else sizes this canvas. Suppressing it left the
    // element laid out at devicePixelRatio times its container on HiDPI screens,
    // so only the top-left quadrant was visible.
    this.renderer.setSize(width, height);
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

function localPointToWorld(object: THREE.Object3D, vector: Vector3Data): THREE.Vector3 {
  return object.localToWorld(toThreeVector(vector));
}

/** Walks up from a raycast hit to the part root created by createAssemblyObject. */
function findPartId(hit: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = hit;
  while (current) {
    const partId = current.userData['partId'];
    if (typeof partId === 'string') {
      return partId;
    }
    current = current.parent;
  }
  return null;
}

function getSnapPointKey(snapPoint: AssemblySnapPoint): string {
  return `${snapPoint.partId}:${snapPoint.id}`;
}

/** Amber and larger, so the socket under the editor's controls reads instantly. */
function applySnapMarkerHighlight(marker: THREE.Mesh, highlighted: boolean): void {
  const scale = highlighted ? 1.65 : 1;
  marker.scale.set(scale, scale, scale);

  if (Array.isArray(marker.material)) {
    return;
  }

  const material = marker.material as THREE.MeshBasicMaterial;
  material.color.setHex(highlighted ? 0xf59e0b : 0x0f62fe);
  material.opacity = highlighted ? 1 : 0.82;
}

function isSnapPoint(value: unknown): value is AssemblySnapPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AssemblySnapPoint>;
  return typeof candidate.id === 'string' && typeof candidate.partId === 'string';
}

function disposeLine(line: THREE.Line): void {
  line.geometry.dispose();

  if (Array.isArray(line.material)) {
    for (const material of line.material) {
      material.dispose();
    }
    return;
  }

  line.material.dispose();
}
