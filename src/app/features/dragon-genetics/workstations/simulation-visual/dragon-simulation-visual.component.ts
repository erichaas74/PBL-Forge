/**
 * Runtime status: RETIRED — generic simulation visual imported only by the retired adaptive page.
 * Former inputs/signals: simulation definition/state inputs and interaction outputs.
 * Former data access: caller-supplied adaptive metadata; no repository access.
 * Former connections: DragonSimulationExperiencePage; dedicated active workstations own their visuals.
 */
import { Component, computed, input, output } from '@angular/core';
import { DragonSimulationDefinition } from '../../adaptive/dragon-simulation.models';

@Component({
  selector: 'app-dragon-simulation-visual',
  templateUrl: './dragon-simulation-visual.component.html',
  styleUrl: './dragon-simulation-visual.component.scss',
})
export class DragonSimulationVisualComponent {
  readonly definition = input.required<DragonSimulationDefinition>();
  readonly activeNodeId = input<string | null>(null);
  readonly revealed = input(false);
  readonly nodeSelected = output<string>();
  readonly activeNode = computed(
    () => this.definition().nodes.find((node) => node.id === this.activeNodeId()) ?? null,
  );

  selectNode(nodeId: string): void {
    this.nodeSelected.emit(nodeId);
  }
}
