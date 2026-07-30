import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { JOINT_TYPES, JointType, SHAPE_TYPES, ShapeType } from '../../models/assembly.models';
import { VectorAxis } from '../../utils/vector-data';
import { AssemblyGarageStore } from '../../state/assembly-garage.store';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
} from '../../data/assembly-part-definitions';

@Component({
  selector: 'app-garage-parts-panel',
  templateUrl: './garage-parts-panel.component.html',
  styleUrl: './garage-parts-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaragePartsPanelComponent {
  readonly store = inject(AssemblyGarageStore);

  /** When set, only this build family's catalog (and no primitives) is offered. */
  readonly family = input<AssemblyPartFamily | null>(null);

  readonly shapeTypes = SHAPE_TYPES;
  readonly jointTypes = JOINT_TYPES;
  readonly axes: readonly VectorAxis[] = ['x', 'y', 'z'];
  readonly isSimulating = computed(() => this.store.state().isSimulating);
  readonly showPrimitives = computed(() => {
    const family = this.family();
    return family === null || family === 'primitive';
  });
  readonly carParts = computed(() => this.partsForFamily('car'));
  readonly robotParts = computed(() => this.partsForFamily('robot'));
  readonly dragonParts = computed(() => this.partsForFamily('dragon'));

  addPart(shape: ShapeType): void {
    this.store.addPart(shape);
  }

  addCatalogPart(definition: AssemblyPartDefinition): void {
    this.store.addCatalogPart(definition);
  }

  addJoint(type: JointType): void {
    this.store.addJoint(type);
  }

  setDraftType(event: Event): void {
    this.store.updateJointDraftType((event.target as HTMLSelectElement).value as JointType);
  }

  setDraftPart(role: 'parent' | 'child', event: Event): void {
    this.store.setDraftPart(role, (event.target as HTMLSelectElement).value);
  }

  setDraftSnap(role: 'parent' | 'child', event: Event): void {
    this.store.setDraftSnap(role, (event.target as HTMLSelectElement).value);
  }

  setDraftAxis(axis: VectorAxis, event: Event): void {
    this.store.updateJointDraftAxis(axis, Number((event.target as HTMLInputElement).value));
  }

  private partsForFamily(family: AssemblyPartFamily): AssemblyPartDefinition[] {
    const filter = this.family();
    if (filter && filter !== family) return [];
    return ASSEMBLY_PART_DEFINITIONS.filter(part => part.family === family);
  }
}
