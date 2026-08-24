import { Component, computed, inject, input, signal } from '@angular/core';
import { JOINT_TYPES, JointType, SHAPE_TYPES, ShapeType } from '@pbl/assembly/domain/assembly.models';
import { VectorAxis } from '@pbl/assembly/domain/vector-data';
import { AssemblyGarageStore } from '../../state/assembly-garage.store';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
} from '../../data/assembly-part-definitions';
import { DesignerDragonDraftStore } from '../../../designer-dragon-draft.store';
import { applyDesignerDraft } from '../../../designer-part-overrides';
import { GarageAccordionComponent } from '../garage-accordion/garage-accordion.component';
import { MINI_DRAGON_PART_DEFINITIONS } from '../../../parts-lab/mini-dragon-part-definitions';
import { partGroup } from '../../../parts-lab/part-acceptance';

@Component({
  selector: 'app-garage-parts-panel',
  imports: [GarageAccordionComponent],
  templateUrl: './garage-parts-panel.component.html',
  styleUrl: './garage-parts-panel.component.css',
})
export class GaragePartsPanelComponent {
  readonly store = inject(AssemblyGarageStore);
  private readonly designerDraft = inject(DesignerDragonDraftStore);

  /** When set, only this build family's catalog (and no primitives) is offered. */
  readonly family = input<AssemblyPartFamily | null>(null);

  readonly shapeTypes = SHAPE_TYPES;
  readonly jointTypes = JOINT_TYPES;
  readonly axes: readonly VectorAxis[] = ['x', 'y', 'z'];
  readonly search = signal('');
  readonly anatomyGroup = signal('All');
  readonly anatomyGroups = ['All', 'Body', 'Head & jaw', 'Wings', 'Limbs', 'Tail', 'Other'];
  readonly isSimulating = computed(() => this.store.state().isSimulating);
  readonly showPrimitives = computed(() => {
    const family = this.family();
    return family === null || family === 'primitive';
  });
  readonly carParts = computed(() => this.partsForFamily('car'));
  readonly robotParts = computed(() => this.partsForFamily('robot'));
  readonly dragonParts = computed(() => this.partsForFamily('dragon'));
  readonly miniDragonParts = computed(() => this.filterParts(
    MINI_DRAGON_PART_DEFINITIONS.map(part => applyDesignerDraft(part, this.designerDraft)),
  ));

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setAnatomyGroup(event: Event): void {
    this.anatomyGroup.set((event.target as HTMLSelectElement).value);
  }

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
    return this.filterParts(ASSEMBLY_PART_DEFINITIONS
      .filter(part => part.family === family)
      .map(part => applyDesignerDraft(part, this.designerDraft)));
  }

  private filterParts(parts: AssemblyPartDefinition[]): AssemblyPartDefinition[] {
    const query = this.search().trim().toLowerCase();
    const group = this.anatomyGroup();
    return parts.filter(part =>
      (group === 'All' || partGroup(part) === group)
      && (!query || `${part.label} ${part.id} ${part.visualProfile?.profileId ?? ''}`
        .toLowerCase().includes(query)));
  }
}
