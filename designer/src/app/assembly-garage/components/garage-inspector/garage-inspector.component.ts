import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  JOINT_BEHAVIOR_PROFILES,
  JOINT_TYPES,
  JointBehaviorProfile,
  JointType,
  Vector3Data,
} from '../../models/assembly.models';
import { VectorAxis } from '../../utils/vector-data';
import { AssemblyGarageStore } from '../../state/assembly-garage.store';
import { ASSEMBLY_PART_DEFINITIONS } from '../../data/assembly-part-definitions';
import { DesignerDragonDraftStore } from '../../../designer-dragon-draft.store';
import { GarageAccordionComponent } from '../garage-accordion/garage-accordion.component';
import { RouterLink } from '@angular/router';

type BehaviorNumberField = keyof Omit<AssemblyJointBehavior, 'profile'>;

/** A part whose size was captured when it was selected, for parts with no catalog entry. */
interface CapturedBaseline {
  partId: string;
  dimensions: Vector3Data;
}

@Component({
  selector: 'app-garage-inspector',
  imports: [GarageAccordionComponent, RouterLink],
  templateUrl: './garage-inspector.component.html',
  styleUrl: './garage-inspector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarageInspectorComponent {
  readonly store = inject(AssemblyGarageStore);
  private readonly designerDraft = inject(DesignerDragonDraftStore);

  readonly axes: readonly VectorAxis[] = ['x', 'y', 'z'];
  readonly jointTypes = JOINT_TYPES;
  readonly behaviorProfiles = JOINT_BEHAVIOR_PROFILES;
  readonly scaleMin = 0.25;
  readonly scaleMax = 3;
  readonly scaleStep = 0.05;
  readonly behaviorNumberFields: readonly BehaviorNumberField[] = [
    'motorSpeed',
    'motorForce',
    'oscillationSpeed',
    'oscillationAmplitude',
    'springStiffness',
    'springDamping',
    'breakForce',
    'breakDamage',
  ];

  readonly lockProportions = signal(true);
  readonly saveMessage = signal<string | null>(null);
  private readonly capturedBaseline = signal<CapturedBaseline | null>(null);

  /**
   * ×1 on every slider. A catalog part measures against its definition — including
   * any size already saved from the Parts Lab — so Reset means "back to the
   * authored part", not "back to wherever this drag started". Hand-built and
   * imported parts have no definition to measure against, so they fall back to
   * their size when they were selected.
   */
  readonly sizeBaseline = computed<Vector3Data | null>(() => {
    const part = this.store.selectedPart();

    if (!part) {
      return null;
    }

    const definition = part.definitionId
      ? ASSEMBLY_PART_DEFINITIONS.find(item => item.id === part.definitionId)
      : undefined;

    if (definition) {
      return this.designerDraft.dimensionsFor(definition.id, definition.dimensions);
    }

    const captured = this.capturedBaseline();
    return captured?.partId === part.id ? captured.dimensions : { ...part.dimensions };
  });

  readonly scale = computed<Vector3Data>(() => {
    const part = this.store.selectedPart();
    const baseline = this.sizeBaseline();

    if (!part || !baseline) {
      return { x: 1, y: 1, z: 1 };
    }

    return {
      x: part.dimensions.x / baseline.x,
      y: part.dimensions.y / baseline.y,
      z: part.dimensions.z / baseline.z,
    };
  });

  /** Only parts stamped from the catalog can write a size back to it. */
  readonly catalogDefinitionId = computed(() => this.store.selectedPart()?.definitionId ?? null);

  /** The catalog entry itself, when this part still matches one. */
  readonly catalogDefinition = computed(() => {
    const definitionId = this.catalogDefinitionId();

    return definitionId
      ? ASSEMBLY_PART_DEFINITIONS.find(item => item.id === definitionId) ?? null
      : null;
  });

  private readonly selectionSync = effect(() => {
    const partId = this.store.selection().partId;

    untracked(() => {
      this.saveMessage.set(null);

      if (!partId) {
        this.capturedBaseline.set(null);
        return;
      }

      // Re-selecting the same part must not re-baseline mid-edit.
      if (this.capturedBaseline()?.partId === partId) {
        return;
      }

      const dimensions = this.store.selectedPart()?.dimensions;

      if (dimensions) {
        this.capturedBaseline.set({ partId, dimensions: { ...dimensions } });
      }
    });
  });

  scaleFor(axis: VectorAxis): number {
    return roundTo(this.scale()[axis], 2);
  }

  dimensionFor(axis: VectorAxis): number {
    return roundTo(this.store.selectedPart()?.dimensions[axis] ?? 0, 3);
  }

  toggleLockProportions(event: Event): void {
    this.lockProportions.set((event.target as HTMLInputElement).checked);
  }

  setUniformScale(event: Event): void {
    const baseline = this.sizeBaseline();
    const factor = readNumberInput(event);

    if (!baseline || !Number.isFinite(factor)) {
      return;
    }

    this.store.updateSelectedPartDimensions({
      x: roundTo(baseline.x * factor, 3),
      y: roundTo(baseline.y * factor, 3),
      z: roundTo(baseline.z * factor, 3),
    });
  }

  setAxisScale(axis: VectorAxis, event: Event): void {
    const baseline = this.sizeBaseline();
    const part = this.store.selectedPart();
    const factor = readNumberInput(event);

    if (!baseline || !part || !Number.isFinite(factor)) {
      return;
    }

    this.store.updateSelectedPartDimensions({
      ...part.dimensions,
      [axis]: roundTo(baseline[axis] * factor, 3),
    });
  }

  resetSize(): void {
    const baseline = this.sizeBaseline();

    if (baseline) {
      this.store.updateSelectedPartDimensions(baseline);
    }
  }

  /**
   * Writes the tuned size back to the catalog definition. It changes what the
   * parts panel stamps and what presets rebuild at; the parts already in this
   * assembly keep the size they have until the preset is reloaded.
   */
  saveSizeToCatalog(): void {
    const part = this.store.selectedPart();

    if (!part?.definitionId) {
      return;
    }

    this.designerDraft.setDimensions(part.definitionId, part.dimensions);
    this.saveMessage.set(`Saved as the catalog size for ${part.definitionId}.`);
  }

  setMass(event: Event): void {
    this.store.updateSelectedPartMass(readNumberInput(event));
  }

  setColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateSelectedPartColor(input.value);
  }

  setRoles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.updateSelectedPartRoles(input.value.split(','));
  }

  setVector(field: 'dimensions' | 'position', axis: VectorAxis, event: Event): void {
    this.store.updateSelectedPartVector(field, axis, readNumberInput(event));
  }

  setJointType(event: Event): void {
    this.store.updateSelectedJointType((event.target as HTMLSelectElement).value as JointType);
  }

  setJointPart(role: 'parent' | 'child', event: Event): void {
    this.store.updateSelectedJointPart(role, (event.target as HTMLSelectElement).value);
  }

  setJointVector(field: 'pivotOnParent' | 'pivotOnChild' | 'axis', axis: VectorAxis, event: Event): void {
    this.store.updateSelectedJointVector(field, axis, readNumberInput(event));
  }

  setJointBehaviorProfile(jointId: string, event: Event): void {
    this.store.updateJointBehaviorProfile(
      jointId,
      (event.target as HTMLSelectElement).value as JointBehaviorProfile,
    );
  }

  setJointBehaviorNumber(jointId: string, field: BehaviorNumberField, event: Event): void {
    this.store.updateJointBehaviorNumber(jointId, field, readNumberInput(event));
  }

  partLabel(partId: string): string {
    const part = this.store.state().parts.find(item => item.id === partId);
    return part?.label ?? part?.shape ?? partId;
  }

  jointRole(joint: AssemblyJoint, partId: string): string {
    return joint.parentPartId === partId ? 'Parent' : 'Child';
  }

  jointOtherPartLabel(joint: AssemblyJoint, partId: string): string {
    return this.partLabel(joint.parentPartId === partId ? joint.childPartId : joint.parentPartId);
  }

  behaviorProfile(joint: AssemblyJoint): JointBehaviorProfile {
    return joint.behavior?.profile ?? 'passive';
  }

  behaviorNumberValue(joint: AssemblyJoint, field: BehaviorNumberField): number | null {
    return joint.behavior?.[field] ?? null;
  }
}

function readNumberInput(event: Event): number {
  const input = event.target as HTMLInputElement;
  return Number(input.value);
}

/** Keeps slider-authored sizes readable without rounding small parts into a different shape. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
