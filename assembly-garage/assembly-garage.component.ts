import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ASSEMBLY_PRESETS } from './data/presets/assembly-presets';
import {
  AssemblyPreset,
  PartMoveEvent,
  SnapPointSelectionEvent,
} from './models/assembly.models';
import { CreationLibraryService } from '../creation-library/services/creation-library.service';
import { GarageInspectorComponent } from './components/garage-inspector/garage-inspector.component';
import { GaragePartsPanelComponent } from './components/garage-parts-panel/garage-parts-panel.component';
import { GarageViewportComponent } from './components/garage-viewport/garage-viewport.component';
import { AssemblyPhysicsService } from '../shared/assembly/assembly-physics.service';
import { AssemblyRendererService } from '../shared/assembly/assembly-renderer.service';
import { AssemblyGarageStore } from './state/assembly-garage.store';
import { cloneAssemblyBlueprint } from '../shared/assembly/domain/assembly-clone';

@Component({
  selector: 'app-assembly-garage',
  imports: [
    GarageInspectorComponent,
    GaragePartsPanelComponent,
    GarageViewportComponent,
    RouterLink,
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
export class AssemblyGarageComponent {
  readonly store = inject(AssemblyGarageStore);
  readonly creationLibrary = inject(CreationLibraryService);
  readonly presets = ASSEMBLY_PRESETS;
  readonly jsonPanelOpen = signal(false);
  readonly assemblyJson = signal('');
  readonly jsonMessage = signal<string | null>(null);
  readonly libraryAssetName = signal('Custom Assembly');
  readonly libraryAssetDescription = signal('Built in the Universal Assembly Garage.');

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

  saveCurrentAssemblyToLibrary(): void {
    const asset = this.creationLibrary.saveAssemblyAsset({
      name: this.libraryAssetName(),
      description: this.libraryAssetDescription(),
      tags: ['custom', 'assembly'],
      assembly: cloneAssemblyBlueprint(this.store.state()),
    });
    this.jsonMessage.set(`${asset.name} saved to the creation library.`);
  }

  updateAssemblyJson(event: Event): void {
    this.assemblyJson.set((event.target as HTMLTextAreaElement).value);
  }

  updateLibraryAssetName(event: Event): void {
    this.libraryAssetName.set((event.target as HTMLInputElement).value);
  }

  updateLibraryAssetDescription(event: Event): void {
    this.libraryAssetDescription.set((event.target as HTMLInputElement).value);
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
