import { computed, Service, OnDestroy, signal } from '@angular/core';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  AssemblyJointDraft,
  AssemblyBlueprint,
  AssemblyPart,
  AssemblySelection,
  AssemblySnapPoint,
  AssemblyState,
  JointBehaviorProfile,
  JointType,
  ShapeType,
  Vector3Data,
} from '@pbl/assembly/domain/assembly.models';
import { cloneAssemblyBlueprint } from '@pbl/assembly/domain/assembly-clone';
import {
  DEFAULT_PART_COLORS,
  DEFAULT_PART_DIMENSIONS,
  STARTER_ASSEMBLY_STATE,
} from '../data/starter-assembly';
import {
  AssemblyPartDefinition,
  createPartFromDefinition,
} from '../data/assembly-part-definitions';
import { createAssemblyId } from '@pbl/assembly/domain/assembly-id';
import { parseAssemblyState } from '../utils/assembly-validation';
import {
  addVectors,
  findNearestSnapMatch,
  findSnapPoint,
  getAssemblySnapPoints,
  getDefaultSnapPointId,
  getPartSnapPoints,
  SnapMatch,
  subtractVectors,
} from '@pbl/assembly/domain/snap-points';
import {
  cloneVector3,
  identityQuaternion,
  invertQuaternion,
  multiplyQuaternions,
  normalizeVector3,
  positiveNumber,
  rotateVectorByQuaternion,
  VectorAxis,
} from '@pbl/assembly/domain/vector-data';
import { readStoredJson, writeStoredJson } from '@pbl/assembly/persistence/json-local-storage';

const GARAGE_DRAFT_KEY = 'dragon-designer.garage-draft.v1';
const GARAGE_DRAFT_SCHEMA_VERSION = 1 as const;
const MAX_HISTORY = 40;

interface GarageDraftV1 {
  schemaVersion: typeof GARAGE_DRAFT_SCHEMA_VERSION;
  savedAtIso: string;
  assembly: AssemblyBlueprint;
}

@Service({ autoProvided: false })
export class AssemblyGarageStore implements OnDestroy {
  private readonly stateSignal = signal<AssemblyState>(cloneAssemblyState(STARTER_ASSEMBLY_STATE));
  private readonly selectionSignal = signal<AssemblySelection>({
    partId: STARTER_ASSEMBLY_STATE.parts[0]?.id ?? null,
    jointId: null,
  });
  private readonly jointDraftSignal = signal<AssemblyJointDraft>(
    createJointDraft(STARTER_ASSEMBLY_STATE),
  );
  private readonly undoSignal = signal<AssemblyBlueprint[]>([]);
  private readonly redoSignal = signal<AssemblyBlueprint[]>([]);
  private readonly persistenceEnabled = signal(false);
  private readonly savedAtSignal = signal<string | null>(null);
  private lastCheckpoint = '';
  private checkpointTimer: ReturnType<typeof setTimeout> | null = null;
  private persistenceTimer: ReturnType<typeof setInterval> | null = null;
  private suppressCheckpoint = false;

  readonly state = this.stateSignal.asReadonly();
  readonly selection = this.selectionSignal.asReadonly();
  readonly jointDraft = this.jointDraftSignal.asReadonly();
  readonly canUndo = computed(() => this.undoSignal().length > 0);
  readonly canRedo = computed(() => this.redoSignal().length > 0);
  readonly savedAt = this.savedAtSignal.asReadonly();

  readonly partCount = computed(() => this.state().parts.length);
  readonly jointCount = computed(() => this.state().joints.length);
  readonly canCreateJoint = computed(() => this.canCreateJointFromDraft());
  readonly snapPoints = computed(() => getAssemblySnapPoints(this.state()));

  readonly selectedPart = computed<AssemblyPart | null>(() => {
    const selectedPartId = this.selection().partId;
    return this.state().parts.find(part => part.id === selectedPartId) ?? null;
  });

  readonly selectedJoint = computed<AssemblyJoint | null>(() => {
    const selectedJointId = this.selection().jointId;
    return this.state().joints.find(joint => joint.id === selectedJointId) ?? null;
  });

  readonly selectedPartJoints = computed<AssemblyJoint[]>(() => {
    const selectedPartId = this.selection().partId;

    if (!selectedPartId) {
      return [];
    }

    return this.state().joints.filter(joint =>
      joint.parentPartId === selectedPartId || joint.childPartId === selectedPartId,
    );
  });

  readonly draftParentSnapPoints = computed(() => this.getDraftSnapPoints('parent'));
  readonly draftChildSnapPoints = computed(() => this.getDraftSnapPoints('child'));
  readonly exportJson = computed(() => JSON.stringify(this.state(), null, 2));

  /** Restores the last valid browser draft and begins recoverable autosave. */
  enablePersistence(): boolean {
    const stored = readStoredJson<GarageDraftV1 | null>(GARAGE_DRAFT_KEY, null, parseGarageDraft);
    if (stored) {
      this.applyHistoricalState(stored.assembly);
      this.savedAtSignal.set(stored.savedAtIso);
    }
    this.lastCheckpoint = serializeBlueprint(this.state());
    this.persistenceEnabled.set(true);
    this.persistenceTimer ??= setInterval(() => this.scheduleCheckpoint(), 220);
    return stored !== null;
  }

  ngOnDestroy(): void {
    if (this.persistenceTimer) clearInterval(this.persistenceTimer);
    if (this.checkpointTimer) clearTimeout(this.checkpointTimer);
  }

  undo(): void {
    const history = this.undoSignal();
    const previous = history.at(-1);
    if (!previous) return;
    this.undoSignal.set(history.slice(0, -1));
    this.redoSignal.update(items => [cloneAssemblyBlueprint(this.state()), ...items].slice(0, MAX_HISTORY));
    this.applyHistoricalState(previous);
    this.persistCurrent();
  }

  redo(): void {
    const [next, ...rest] = this.redoSignal();
    if (!next) return;
    this.redoSignal.set(rest);
    this.undoSignal.update(items => [...items, cloneAssemblyBlueprint(this.state())].slice(-MAX_HISTORY));
    this.applyHistoricalState(next);
    this.persistCurrent();
  }

  exportDraftJson(): string {
    return JSON.stringify(createGarageDraft(this.state()), null, 2);
  }

  importDraftJson(json: string): void {
    const parsed = parseGarageDraft(JSON.parse(json) as unknown);
    if (!parsed) throw new Error('Garage draft JSON is invalid or uses an unsupported schema.');
    this.loadAssemblyState(parsed.assembly);
  }

  addPart(shape: ShapeType): void {
    const index = this.state().parts.length;
    const part: AssemblyPart = {
      id: createAssemblyId('part'),
      shape,
      mass: shape === 'box' ? 1.5 : 1,
      dimensions: cloneVector3(DEFAULT_PART_DIMENSIONS[shape]),
      position: {
        x: -1.8 + (index % 4) * 1.2,
        y: 2 + Math.floor(index / 4) * 0.6,
        z: (index % 2) * 0.6,
      },
      color: DEFAULT_PART_COLORS[shape],
      visualProfile: {
        profileId: `primitive-${shape}`,
        meshType: 'primitive',
        materialId: 'default',
      },
    };

    this.stateSignal.update(state => ({
      ...state,
      parts: [...state.parts, part],
      isSimulating: false,
    }));
    this.reconcileJointDraft();
    this.selectPart(part.id);
  }

  addCatalogPart(definition: AssemblyPartDefinition): void {
    const pose = this.getCatalogPartPose(definition);
    const part = createPartFromDefinition(
      definition,
      pose.position,
    );
    part.rotation = pose.rotation;

    this.stateSignal.update(state => ({
      ...state,
      parts: [...state.parts, part],
      isSimulating: false,
    }));
    this.reconcileJointDraft();
    this.selectPart(part.id);

    if (definition.attachment) {
      this.snapPartToNearest(part.id);
    }
  }

  addJoint(type: JointType): void {
    this.updateJointDraftType(type);

    if (!this.canCreateJointFromDraft()) {
      this.seedDraftFromSelection(type);
    }

    this.createJointFromDraft();
  }

  createJointFromDraft(): void {
    const state = this.state();
    const draft = this.jointDraft();
    const parentSnap = findSnapPoint(state, draft.parentPartId, draft.parentSnapId);
    const childSnap = findSnapPoint(state, draft.childPartId, draft.childSnapId);

    if (!parentSnap || !childSnap || parentSnap.partId === childSnap.partId) {
      return;
    }

    const joint: AssemblyJoint = {
      id: createAssemblyId('joint'),
      type: draft.type,
      parentPartId: parentSnap.partId,
      childPartId: childSnap.partId,
      pivotOnParent: cloneVector3(parentSnap.localPosition),
      pivotOnChild: cloneVector3(childSnap.localPosition),
      axis: normalizeVector3(draft.axis),
    };

    this.stateSignal.update(current => ({
      ...current,
      joints: [...current.joints, joint],
      isSimulating: false,
    }));
    this.selectJoint(joint.id);
  }

  selectPart(partId: string): void {
    if (!this.state().parts.some(part => part.id === partId)) {
      return;
    }

    this.selectionSignal.set({ partId, jointId: null });
  }

  selectJoint(jointId: string): void {
    if (!this.state().joints.some(joint => joint.id === jointId)) {
      return;
    }

    this.selectionSignal.set({ partId: null, jointId });
  }

  selectSnapPoint(partId: string, snapPointId: string): void {
    const draft = this.jointDraft();
    this.selectPart(partId);

    if (!draft.parentPartId || draft.childPartId) {
      this.setDraftPart('parent', partId);
      this.setDraftSnap('parent', snapPointId);
      this.setDraftPart('child', this.findNextPartId(partId));
      return;
    }

    if (draft.parentPartId === partId) {
      this.setDraftSnap('parent', snapPointId);
      return;
    }

    this.setDraftPart('child', partId);
    this.setDraftSnap('child', snapPointId);
  }

  updateSelectedPartMass(value: number): void {
    const selected = this.selectedPart();

    if (!selected) {
      return;
    }

    this.patchPart(selected.id, {
      mass: positiveNumber(value, selected.mass),
    });
  }

  updateSelectedPartColor(color: string): void {
    const selected = this.selectedPart();

    if (!selected) {
      return;
    }

    this.patchPart(selected.id, { color });
  }

  updateSelectedPartRoles(roles: string[]): void {
    const selected = this.selectedPart();
    if (!selected) return;
    this.patchPart(selected.id, {
      roles: [...new Set(roles.map(role => role.trim().toLowerCase()).filter(Boolean))],
    });
  }

  updateSelectedPartVector(field: 'dimensions' | 'position', axis: VectorAxis, value: number): void {
    const selected = this.selectedPart();

    if (!selected || !Number.isFinite(value)) {
      return;
    }

    if (field === 'dimensions') {
      this.updateSelectedPartDimensions({ ...selected.dimensions, [axis]: value });
      return;
    }

    this.patchPart(selected.id, {
      position: { ...selected.position, [axis]: value },
    });
  }

  /**
   * Resizes the selected part and carries its geometry with it.
   *
   * Authored snap points are absolute local offsets, and every joint pivot sits
   * on one. A part that grows without them leaves its sockets behind at the old
   * size, so the jaw floats off the skull and physics rebuilds against pivots
   * that no longer touch the collider. Same ratio rule `resizePartDefinition`
   * applies on the way in from the catalog, applied here to a live part.
   */
  updateSelectedPartDimensions(dimensions: Vector3Data): void {
    const selected = this.selectedPart();

    if (!selected) {
      return;
    }

    const next: Vector3Data = {
      x: positiveNumber(dimensions.x, selected.dimensions.x),
      y: positiveNumber(dimensions.y, selected.dimensions.y),
      z: positiveNumber(dimensions.z, selected.dimensions.z),
    };
    const ratio: Vector3Data = {
      x: sizeRatio(next.x, selected.dimensions.x),
      y: sizeRatio(next.y, selected.dimensions.y),
      z: sizeRatio(next.z, selected.dimensions.z),
    };

    this.stateSignal.update(state => ({
      ...state,
      parts: state.parts.map(part => (part.id === selected.id
        ? {
            ...part,
            dimensions: next,
            // Primitives derive their snap points from `dimensions` and so need nothing here.
            snapPoints: part.snapPoints?.map(snapPoint => ({
              ...snapPoint,
              localPosition: scaleVector(snapPoint.localPosition, ratio),
            })),
          }
        : part)),
      joints: state.joints.map(joint => {
        if (joint.parentPartId === selected.id) {
          return { ...joint, pivotOnParent: scaleVector(joint.pivotOnParent, ratio) };
        }

        if (joint.childPartId === selected.id) {
          return { ...joint, pivotOnChild: scaleVector(joint.pivotOnChild, ratio) };
        }

        return joint;
      }),
      isSimulating: false,
    }));

    this.repositionDescendants(selected.id);
    this.reconcileDraftSnapIds();
  }

  movePart(partId: string, position: Vector3Data): void {
    this.patchPart(partId, { position });
  }

  snapPartToNearest(partId: string): boolean {
    const match = findNearestSnapMatch(this.state(), partId);

    if (!match) {
      return false;
    }

    const movingPart = this.state().parts.find(part => part.id === partId);
    const rotation = this.getAttachmentRotation(match, movingPart);
    const nextPosition = subtractVectors(
      match.targetSnap.worldPosition,
      rotateVectorByQuaternion(match.movingSnap.localPosition, rotation),
    );

    this.patchPart(partId, {
      position: nextPosition,
      rotation,
    });

    if (movingPart?.attachment) {
      this.attachPartFromRule(movingPart.id, match);
    }

    return true;
  }

  removeSelectedPart(): void {
    const selected = this.selectedPart();

    if (!selected) {
      return;
    }

    this.stateSignal.update(state => ({
      ...state,
      parts: state.parts.filter(part => part.id !== selected.id),
      joints: state.joints.filter(
        joint => joint.parentPartId !== selected.id && joint.childPartId !== selected.id,
      ),
      isSimulating: false,
    }));

    this.reconcileJointDraft();
    const fallbackPart = this.state().parts[0] ?? null;
    this.selectionSignal.set({ partId: fallbackPart?.id ?? null, jointId: null });
  }

  removeSelectedJoint(): void {
    const selected = this.selectedJoint();

    if (!selected) {
      return;
    }

    this.stateSignal.update(state => ({
      ...state,
      joints: state.joints.filter(joint => joint.id !== selected.id),
      isSimulating: false,
    }));
    this.selectionSignal.set({ partId: this.state().parts[0]?.id ?? null, jointId: null });
  }

  updateJointDraftType(type: JointType): void {
    this.jointDraftSignal.update(draft => ({ ...draft, type }));
  }

  setDraftPart(role: 'parent' | 'child', partId: string | null): void {
    const part = this.state().parts.find(item => item.id === partId) ?? null;

    this.jointDraftSignal.update(draft => ({
      ...draft,
      [role === 'parent' ? 'parentPartId' : 'childPartId']: part?.id ?? null,
      [role === 'parent' ? 'parentSnapId' : 'childSnapId']: getDefaultSnapPointId(part),
    }));
  }

  setDraftSnap(role: 'parent' | 'child', snapPointId: string): void {
    this.jointDraftSignal.update(draft => ({
      ...draft,
      [role === 'parent' ? 'parentSnapId' : 'childSnapId']: snapPointId,
    }));
  }

  updateJointDraftAxis(axis: VectorAxis, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    this.jointDraftSignal.update(draft => ({
      ...draft,
      axis: {
        ...draft.axis,
        [axis]: value,
      },
    }));
  }

  updateSelectedJointType(type: JointType): void {
    const selected = this.selectedJoint();

    if (!selected) {
      return;
    }

    this.patchJoint(selected.id, { type });
  }

  updateSelectedJointPart(role: 'parent' | 'child', partId: string): void {
    const selected = this.selectedJoint();
    const part = this.state().parts.find(item => item.id === partId);

    if (!selected || !part) {
      return;
    }

    const nextParentPartId = role === 'parent' ? part.id : selected.parentPartId;
    const nextChildPartId = role === 'child' ? part.id : selected.childPartId;

    if (nextParentPartId === nextChildPartId) {
      return;
    }

    this.patchJoint(selected.id, {
      [role === 'parent' ? 'parentPartId' : 'childPartId']: part.id,
    });
  }

  updateSelectedJointVector(
    field: 'pivotOnParent' | 'pivotOnChild' | 'axis',
    axis: VectorAxis,
    value: number,
  ): void {
    const selected = this.selectedJoint();

    if (!selected || !Number.isFinite(value)) {
      return;
    }

    this.patchJoint(selected.id, {
      [field]: {
        ...selected[field],
        [axis]: value,
      },
    });
  }

  updateJointBehaviorProfile(jointId: string, profile: JointBehaviorProfile): void {
    const joint = this.state().joints.find(item => item.id === jointId);

    if (!joint) {
      return;
    }

    this.patchJoint(joint.id, {
      behavior: {
        ...getDefaultBehavior(profile),
        ...joint.behavior,
        profile,
      },
    });
  }

  updateJointBehaviorNumber(
    jointId: string,
    field: keyof Omit<AssemblyJointBehavior, 'profile'>,
    value: number,
  ): void {
    const joint = this.state().joints.find(item => item.id === jointId);

    if (!joint || !Number.isFinite(value)) {
      return;
    }

    const behavior = joint.behavior ?? getDefaultBehavior('passive');

    this.patchJoint(joint.id, {
      behavior: {
        ...behavior,
        [field]: value,
      },
    });
  }

  resetJointMotion(jointId: string): void {
    const joint = this.state().joints.find(item => item.id === jointId);
    const childPart = this.state().parts.find(part => part.id === joint?.childPartId);
    const attachment = childPart?.attachment;

    if (!joint || !attachment) {
      return;
    }

    this.patchJoint(joint.id, {
      type: attachment.jointType,
      axis: normalizeVector3(attachment.axis),
      behavior: attachment.behavior ? { ...attachment.behavior } : undefined,
    });
  }

  resetSelectedPartJointMotion(): void {
    for (const joint of this.selectedPartJoints()) {
      this.resetJointMotion(joint.id);
    }
  }

  toggleSimulation(): void {
    this.stateSignal.update(state => ({
      ...state,
      isSimulating: !state.isSimulating,
    }));
  }

  stopSimulation(): void {
    this.stateSignal.update(state => ({
      ...state,
      isSimulating: false,
    }));
  }

  resetAssembly(): void {
    this.loadAssemblyState(STARTER_ASSEMBLY_STATE);
  }

  loadAssemblyJson(json: string): void {
    this.loadAssemblyState(JSON.parse(json) as unknown);
  }

  loadAssemblyState(input: unknown): void {
    const nextState = cloneAssemblyState(parseAssemblyState(input));
    this.stateSignal.set(nextState);
    this.selectionSignal.set({ partId: nextState.parts[0]?.id ?? null, jointId: null });
    this.jointDraftSignal.set(createJointDraft(nextState));
  }

  getSnapPointsForPart(partId: string | null): AssemblySnapPoint[] {
    const part = this.state().parts.find(item => item.id === partId);
    return part ? getPartSnapPoints(part) : [];
  }

  private commitCheckpoint(serialized: string): void {
    this.checkpointTimer = null;
    if (serialized === this.lastCheckpoint) return;
    if (this.lastCheckpoint) {
      const previous = JSON.parse(this.lastCheckpoint) as AssemblyBlueprint;
      this.undoSignal.update(items => [...items, previous].slice(-MAX_HISTORY));
    }
    this.redoSignal.set([]);
    this.lastCheckpoint = serialized;
    this.persistCurrent();
  }

  private scheduleCheckpoint(): void {
    if (!this.persistenceEnabled() || this.suppressCheckpoint) return;
    const next = serializeBlueprint(this.state());
    if (next === this.lastCheckpoint) return;
    if (this.checkpointTimer) clearTimeout(this.checkpointTimer);
    this.checkpointTimer = setTimeout(() => this.commitCheckpoint(next), 20);
  }

  private applyHistoricalState(input: AssemblyBlueprint): void {
    this.suppressCheckpoint = true;
    this.loadAssemblyState(input);
    this.lastCheckpoint = serializeBlueprint(this.state());
    this.suppressCheckpoint = false;
  }

  private persistCurrent(): void {
    const draft = createGarageDraft(this.state());
    writeStoredJson(GARAGE_DRAFT_KEY, draft);
    this.savedAtSignal.set(draft.savedAtIso);
    this.lastCheckpoint = serializeBlueprint(this.state());
  }

  private seedDraftFromSelection(type: JointType): void {
    const parts = this.state().parts;
    const selectedPart = this.selectedPart();
    const child = selectedPart ?? parts[parts.length - 1] ?? null;
    const parent = parts.find(part => part.id !== child?.id) ?? null;

    this.jointDraftSignal.set({
      type,
      parentPartId: parent?.id ?? null,
      childPartId: child?.id ?? null,
      parentSnapId: getDefaultSnapPointId(parent),
      childSnapId: getDefaultSnapPointId(child),
      axis: { x: 0, y: 1, z: 0 },
    });
  }

  private canCreateJointFromDraft(): boolean {
    const draft = this.jointDraft();

    return Boolean(
      draft.parentPartId &&
      draft.childPartId &&
      draft.parentPartId !== draft.childPartId &&
      findSnapPoint(this.state(), draft.parentPartId, draft.parentSnapId) &&
      findSnapPoint(this.state(), draft.childPartId, draft.childSnapId),
    );
  }

  private getDraftSnapPoints(role: 'parent' | 'child'): AssemblySnapPoint[] {
    const draft = this.jointDraft();
    const partId = role === 'parent' ? draft.parentPartId : draft.childPartId;
    return this.getSnapPointsForPart(partId);
  }

  private reconcileJointDraft(): void {
    this.jointDraftSignal.set(createJointDraft(this.state()));
  }

  private findNextPartId(excludedPartId: string): string | null {
    return this.state().parts.find(part => part.id !== excludedPartId)?.id ?? null;
  }

  private getCatalogPartPose(definition: AssemblyPartDefinition): {
    position: Vector3Data;
    rotation: ReturnType<typeof identityQuaternion>;
  } {
    const attachment = definition.attachment;

    if (attachment) {
      const targetSnap = getAssemblySnapPoints(this.state()).find(snapPoint =>
        snapPoint.id === attachment.parentSnapId
        && (!attachment.parentPartId || snapPoint.partId === attachment.parentPartId)
        && this.isSnapUnused(snapPoint),
      );
      const childSnap = definition.snapPoints.find(snapPoint => snapPoint.id === attachment.childSnapId);

      if (targetSnap && childSnap) {
        const rotation = this.getAttachmentRotation(
          {
            movingSnap: {
              ...childSnap,
              partId: '',
              worldPosition: childSnap.localPosition,
              worldRotation: childSnap.localRotation ?? identityQuaternion(),
              mateIds: childSnap.mateIds ?? [],
              singleUse: childSnap.singleUse ?? true,
            },
            targetSnap,
            distance: 0,
          },
          { attachment },
        );

        return {
          position: subtractVectors(
            targetSnap.worldPosition,
            rotateVectorByQuaternion(childSnap.localPosition, rotation),
          ),
          rotation,
        };
      }
    }

    const index = this.state().parts.length;

    return {
      position: {
        x: -1.8 + (index % 4) * 1.2,
        y: 2 + Math.floor(index / 4) * 0.6,
        z: (index % 2) * 0.6,
      },
      rotation: identityQuaternion(),
    };
  }

  private isSnapUnused(snapPoint: AssemblySnapPoint): boolean {
    if (!snapPoint.singleUse) {
      return true;
    }

    return !this.state().joints.some(joint =>
      (joint.parentPartId === snapPoint.partId && sameVector(joint.pivotOnParent, snapPoint.localPosition))
      || (joint.childPartId === snapPoint.partId && sameVector(joint.pivotOnChild, snapPoint.localPosition)),
    );
  }

  private getAttachmentRotation(
    match: SnapMatch,
    movingPart?: Pick<AssemblyPart, 'attachment'> | null,
  ) {
    const childRotation = movingPart?.attachment?.childRotation;

    if (childRotation) {
      return multiplyQuaternions(match.targetSnap.worldRotation, childRotation);
    }

    return multiplyQuaternions(
      match.targetSnap.worldRotation,
      invertQuaternion(match.movingSnap.localRotation ?? identityQuaternion()),
    );
  }

  private attachPartFromRule(partId: string, match: SnapMatch): void {
    const part = this.state().parts.find(item => item.id === partId);
    const attachment = part?.attachment;

    if (!part || !attachment) {
      return;
    }

    const joint: AssemblyJoint = {
      id: attachment.jointId ?? createAssemblyId('joint'),
      type: attachment.jointType,
      parentPartId: match.targetSnap.partId,
      childPartId: part.id,
      pivotOnParent: cloneVector3(match.targetSnap.localPosition),
      pivotOnChild: cloneVector3(match.movingSnap.localPosition),
      axis: normalizeVector3(attachment.axis),
      behavior: attachment.behavior ? { ...attachment.behavior } : undefined,
    };

    this.stateSignal.update(state => ({
      ...state,
      joints: [
        ...state.joints.filter(existing => existing.childPartId !== part.id),
        joint,
      ],
      isSimulating: false,
    }));
    this.selectJoint(joint.id);
  }

  /**
   * Pulls everything jointed below a part back onto it.
   *
   * A joint holds two pivots at the same point in space, so once a resize has
   * moved the parent's pivots the parts below have to follow or the assembly
   * opens up at every seam. Walks parent to child, so resizing a body carries
   * the leg, then the lower leg, then the foot. Rotations are left alone —
   * growing a part does not turn anything.
   *
   * `fixed` joints matter most here: LockConstraint freezes whatever relative
   * pose exists when physics builds, so a stale pose would be locked in rather
   * than pulled closed on the first step. Spring joints settle to their own rest
   * length once simulated; the editor still shows them closed, which is the pose
   * the author is aiming at.
   */
  private repositionDescendants(rootPartId: string): void {
    this.stateSignal.update(state => {
      const parts = new Map(state.parts.map(part => [part.id, part]));
      // Seeded with the resized part so a joint cycle cannot walk back into it.
      const repositioned = new Set<string>([rootPartId]);
      const queue: string[] = [rootPartId];

      while (queue.length) {
        const parentId = queue.shift();
        const parent = parentId ? parts.get(parentId) : undefined;

        if (!parent) {
          continue;
        }

        for (const joint of state.joints) {
          if (joint.parentPartId !== parent.id || repositioned.has(joint.childPartId)) {
            continue;
          }

          const child = parts.get(joint.childPartId);

          if (!child) {
            continue;
          }

          const parentPivot = addVectors(
            parent.position,
            rotateVectorByQuaternion(joint.pivotOnParent, parent.rotation ?? identityQuaternion()),
          );

          parts.set(child.id, {
            ...child,
            position: subtractVectors(
              parentPivot,
              rotateVectorByQuaternion(joint.pivotOnChild, child.rotation ?? identityQuaternion()),
            ),
          });
          repositioned.add(child.id);
          queue.push(child.id);
        }
      }

      return {
        ...state,
        parts: state.parts.map(part => parts.get(part.id) ?? part),
      };
    });
  }

  private patchPart(partId: string, patch: Partial<AssemblyPart>): void {
    this.stateSignal.update(state => ({
      ...state,
      parts: state.parts.map(part => (part.id === partId ? { ...part, ...patch } : part)),
      isSimulating: false,
    }));
    this.reconcileDraftSnapIds();
  }

  private patchJoint(jointId: string, patch: Partial<AssemblyJoint>): void {
    this.stateSignal.update(state => ({
      ...state,
      joints: state.joints.map(joint => (joint.id === jointId ? { ...joint, ...patch } : joint)),
      isSimulating: false,
    }));
  }

  private reconcileDraftSnapIds(): void {
    const draft = this.jointDraft();
    const parentSnap = findSnapPoint(this.state(), draft.parentPartId, draft.parentSnapId);
    const childSnap = findSnapPoint(this.state(), draft.childPartId, draft.childSnapId);

    if (parentSnap && childSnap) {
      return;
    }

    this.jointDraftSignal.update(current => {
      const parentPart = this.state().parts.find(part => part.id === current.parentPartId) ?? null;
      const childPart = this.state().parts.find(part => part.id === current.childPartId) ?? null;

      return {
        ...current,
        parentSnapId: parentSnap ? current.parentSnapId : getDefaultSnapPointId(parentPart),
        childSnapId: childSnap ? current.childSnapId : getDefaultSnapPointId(childPart),
      };
    });
  }
}

export function cloneAssemblyState(state: AssemblyBlueprint | AssemblyState): AssemblyState {
  return {
    ...cloneAssemblyBlueprint(state),
    isSimulating: 'isSimulating' in state ? state.isSimulating : false,
  };
}

function createJointDraft(state: AssemblyState): AssemblyJointDraft {
  const parent = state.parts[0] ?? null;
  const child = state.parts.find(part => part.id !== parent?.id) ?? null;

  return {
    type: 'hinge',
    parentPartId: parent?.id ?? null,
    childPartId: child?.id ?? null,
    parentSnapId: getDefaultSnapPointId(parent),
    childSnapId: getDefaultSnapPointId(child),
    axis: { x: 0, y: 1, z: 0 },
  };
}

/** A part imported with a zero extent has no ratio to grow by, so its geometry holds still. */
function sizeRatio(next: number, current: number): number {
  return current > 0 ? next / current : 1;
}

function scaleVector(vector: Vector3Data, ratio: Vector3Data): Vector3Data {
  return {
    x: vector.x * ratio.x,
    y: vector.y * ratio.y,
    z: vector.z * ratio.z,
  };
}

function sameVector(a: Vector3Data, b: Vector3Data): boolean {
  return Math.abs(a.x - b.x) < 0.0001
    && Math.abs(a.y - b.y) < 0.0001
    && Math.abs(a.z - b.z) < 0.0001;
}

function serializeBlueprint(state: AssemblyBlueprint): string {
  return JSON.stringify(cloneAssemblyBlueprint(state));
}

function createGarageDraft(state: AssemblyBlueprint): GarageDraftV1 {
  return {
    schemaVersion: GARAGE_DRAFT_SCHEMA_VERSION,
    savedAtIso: new Date().toISOString(),
    assembly: cloneAssemblyBlueprint(state),
  };
}

function parseGarageDraft(value: unknown): GarageDraftV1 | null {
  if (!isRecord(value)
    || value['schemaVersion'] !== GARAGE_DRAFT_SCHEMA_VERSION
    || typeof value['savedAtIso'] !== 'string') return null;
  try {
    return {
      schemaVersion: GARAGE_DRAFT_SCHEMA_VERSION,
      savedAtIso: value['savedAtIso'],
      assembly: cloneAssemblyBlueprint(parseAssemblyState(value['assembly'])),
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDefaultBehavior(profile: JointBehaviorProfile): AssemblyJointBehavior {
  switch (profile) {
    case 'motor':
      return {
        profile,
        motorSpeed: 1,
        motorForce: 40,
      };
    case 'oscillatingMotor':
      return {
        profile,
        oscillationSpeed: 4,
        oscillationAmplitude: 4,
        motorForce: 40,
      };
    case 'springHinge':
      return {
        profile,
        motorForce: 30,
        springStiffness: 60,
        springDamping: 5,
      };
    case 'passive':
      return { profile };
  }
}
