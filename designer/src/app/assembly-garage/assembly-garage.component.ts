import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { ASSEMBLY_PRESETS } from './data/presets/assembly-presets';
import { AssemblyPartFamily } from './data/assembly-part-definitions';
import {
  AssemblyPreset,
  PartMoveEvent,
  SnapPointSelectionEvent,
} from './models/assembly.models';
import { GarageInspectorComponent } from './components/garage-inspector/garage-inspector.component';
import { GaragePartsPanelComponent } from './components/garage-parts-panel/garage-parts-panel.component';
import { GarageViewportComponent } from './components/garage-viewport/garage-viewport.component';
import { AssemblyPhysicsService } from '@pbl/assembly/assembly-physics.service';
import { AssemblyRendererService } from '@pbl/assembly/assembly-renderer.service';
import { AssemblyGarageStore } from './state/assembly-garage.store';
import { createDragonModelPack, downloadDragonModelPack } from '../dragon-model-pack-export';
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';

@Component({
  selector: 'app-assembly-garage',
  imports: [
    GarageInspectorComponent,
    GaragePartsPanelComponent,
    GarageViewportComponent,
  ],
  providers: [
    AssemblyGarageStore,
    AssemblyPhysicsService,
    AssemblyRendererService,
  ],
  templateUrl: './assembly-garage.component.html',
  styleUrl: './assembly-garage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyGarageComponent implements OnInit {
  readonly store = inject(AssemblyGarageStore);
  private readonly designerDraft = inject(DesignerDragonDraftStore);

  /** Scoping controls: hosts can pin the garage to one build family and preset list. */
  readonly title = input('Universal Assembly Garage');
  readonly presets = input<readonly AssemblyPreset[]>(ASSEMBLY_PRESETS);
  readonly partFamily = input<AssemblyPartFamily | null>(null);
  readonly initialPresetId = input<string | null>(null);
  readonly dragonPackExport = input(false);

  readonly jsonPanelOpen = signal(false);
  readonly assemblyJson = signal('');
  readonly jsonMessage = signal<string | null>(null);
  readonly exportModelId = signal('classic-dragon');
  readonly exportModelName = signal('Classic Dragon');
  readonly exportModelDescription = signal('Published from the Dragon Assembly Garage.');
  readonly exportPackVersion = signal('1.0.0');

  ngOnInit(): void {
    const presetId = this.initialPresetId();
    if (!presetId) return;
    const preset = this.presets().find(item => item.id === presetId);
    if (preset) this.loadPreset(preset);
  }

  onPartMoved(event: PartMoveEvent): void {
    this.store.movePart(event.partId, event.position);
  }

  onPartDragFinished(partId: string): void {
    const didSnap = this.store.snapPartToNearest(partId);
    this.jsonMessage.set(didSnap ? 'Part snapped to the nearest compatible point.' : null);
  }

  onSnapPointSelected(event: SnapPointSelectionEvent): void {
    this.store.selectSnapPoint(event.partId, event.snapPointId);
    this.jsonMessage.set('Snap point loaded into the joint builder.');
  }

  loadPreset(preset: AssemblyPreset): void {
    this.store.loadAssemblyState(preset.state);
    this.assemblyJson.set(this.store.exportJson());
    this.jsonMessage.set(`${preset.name} loaded.`);
  }

  showExportJson(): void {
    this.jsonPanelOpen.set(true);
    this.assemblyJson.set(this.store.exportJson());
    this.jsonMessage.set('Assembly JSON is ready.');
  }

  importJson(): void {
    try {
      this.store.loadAssemblyJson(this.assemblyJson());
      this.jsonMessage.set('Assembly imported.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      this.jsonMessage.set(message);
    }
  }

  downloadDragonPack(): void {
    try {
      const pack = createDragonModelPack(this.store.state(), {
        modelId: this.exportModelId(),
        label: this.exportModelName(),
        description: this.exportModelDescription(),
        packVersion: this.exportPackVersion(),
        style: this.designerDraft.style(),
      });
      downloadDragonModelPack(pack);
      this.jsonMessage.set(`Validated ${pack.packId}@${pack.packVersion} and downloaded it.`);
    } catch (error) {
      this.jsonMessage.set(error instanceof Error ? error.message : 'Dragon pack export failed.');
    }
  }

  updateExportModelId(event: Event): void {
    this.exportModelId.set((event.target as HTMLInputElement).value);
  }

  updateExportModelName(event: Event): void {
    this.exportModelName.set((event.target as HTMLInputElement).value);
  }

  updateExportModelDescription(event: Event): void {
    this.exportModelDescription.set((event.target as HTMLInputElement).value);
  }

  updateExportPackVersion(event: Event): void {
    this.exportPackVersion.set((event.target as HTMLInputElement).value);
  }

  updateAssemblyJson(event: Event): void {
    this.assemblyJson.set((event.target as HTMLTextAreaElement).value);
  }

  toggleJsonPanel(): void {
    this.jsonPanelOpen.update(open => !open);
    this.jsonMessage.set(null);

    if (!this.jsonPanelOpen()) {
      return;
    }

    this.assemblyJson.set(this.store.exportJson());
  }
}
