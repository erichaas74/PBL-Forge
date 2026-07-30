import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AssemblyJoint,
  AssemblyJointBehavior,
  JOINT_BEHAVIOR_PROFILES,
  JOINT_TYPES,
  JointBehaviorProfile,
  JointType,
} from '../../models/assembly.models';
import { VectorAxis } from '../../utils/vector-data';
import { AssemblyGarageStore } from '../../state/assembly-garage.store';

type BehaviorNumberField = keyof Omit<AssemblyJointBehavior, 'profile'>;

@Component({
  selector: 'app-garage-inspector',
  templateUrl: './garage-inspector.component.html',
  styleUrl: './garage-inspector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarageInspectorComponent {
  readonly store = inject(AssemblyGarageStore);
  readonly axes: readonly VectorAxis[] = ['x', 'y', 'z'];
  readonly jointTypes = JOINT_TYPES;
  readonly behaviorProfiles = JOINT_BEHAVIOR_PROFILES;
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
