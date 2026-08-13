import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DragonSimulationDefinition } from '../../adaptive/dragon-simulation.models';

@Component({
  selector: 'app-dragon-simulation-visual',
  templateUrl: './dragon-simulation-visual.component.html',
  styleUrl: './dragon-simulation-visual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
