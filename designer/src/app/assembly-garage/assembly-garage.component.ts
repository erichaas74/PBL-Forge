import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ASSEMBLY_PRESETS } from './data/presets/assembly-presets';
import { AssemblyPartFamily } from './data/assembly-part-definitions';
import {
  AssemblyPreset,
  PartMoveEvent,
  SnapPointSelectionEvent,
} from '@pbl/assembly/domain/assembly.models';
import { GarageInspectorComponent } from './components/garage-inspector/garage-inspector.component';
import { GaragePartsPanelComponent } from './components/garage-parts-panel/garage-parts-panel.component';
import { GarageViewportComponent } from './components/garage-viewport/garage-viewport.component';
import { AssemblyPhysicsService } from '@pbl/assembly/assembly-physics.service';
import { AssemblyRendererService } from '@pbl/assembly/assembly-renderer.service';
import { AssemblyGarageStore } from './state/assembly-garage.store';
import { createDragonModelPack, downloadDragonModelPack } from '../dragon-model-pack-export';
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';
import { DragonAssetsPublisherService } from '../dragon-assets-publisher.service';
import { TEST_SCENARIO_CATALOG } from '@pbl/creation-library/data/test-scenario-catalog';
import { CreationTestScenarioDefinition } from '@pbl/creation-library/models/test-scenario.models';
import { parseDragonArenaScenario } from '@pbl/assembly/model-pack/published-dragon-assets.validation';
import { addMiniDragonModel } from '../mini-dragon-model-export';

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
})
export class AssemblyGarageComponent implements OnInit {
  readonly store = inject(AssemblyGarageStore);
  private readonly designerDraft = inject(DesignerDragonDraftStore);
  private readonly publisher = inject(DragonAssetsPublisherService);

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
  readonly exportPackVersion = signal('1.1.0');
  readonly publishing = signal(false);
  readonly releaseNotes = signal('');
  readonly arenaScenario = signal<CreationTestScenarioDefinition>(initialDragonArena());
  readonly recentVersionIds = signal<readonly string[]>([]);
  readonly isolateSelectedPart = signal(false);
  readonly viewportFrameRequest = signal(0);
  readonly viewportState = computed(() => {
    const state = this.store.state();
    const selected = this.store.selectedPart();
    if (!this.isolateSelectedPart() || !selected || state.isSimulating) return state;
    return { parts: [structuredClone(selected)], joints: [], isSimulating: false };
  });
  readonly arenaValidation = computed(() => {
    try {
      parseDragonArenaScenario(this.arenaScenario());
      return { valid: true, message: 'Arena settings valid.' };
    } catch (error) {
      return { valid: false, message: error instanceof Error ? error.message : 'Arena settings invalid.' };
    }
  });
  readonly redSpawnX = computed(() => this.arenaScenario().participants.find(item => item.team === 'red')?.spawnPosition.x ?? 0);
  readonly blueSpawnX = computed(() => this.arenaScenario().participants.find(item => item.team === 'blue')?.spawnPosition.x ?? 0);

  ngOnInit(): void {
    const presetId = this.initialPresetId();
    if (presetId) {
      const preset = this.presets().find(item => item.id === presetId);
      if (preset) this.loadPreset(preset);
    }
    if (this.store.enablePersistence()) {
      this.assemblyJson.set(this.store.exportJson());
      this.jsonMessage.set('Recovered the last autosaved Garage draft.');
    }
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
    this.viewportFrameRequest.update(value => value + 1);
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
      this.viewportFrameRequest.update(value => value + 1);
      this.jsonMessage.set('Assembly imported.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      this.jsonMessage.set(message);
    }
  }

  showDraftJson(): void {
    this.jsonPanelOpen.set(true);
    this.assemblyJson.set(this.store.exportDraftJson());
    this.jsonMessage.set('Versioned Garage draft JSON is ready.');
  }

  importDraftJson(): void {
    try {
      this.store.importDraftJson(this.assemblyJson());
      this.viewportFrameRequest.update(value => value + 1);
      this.jsonMessage.set('Versioned Garage draft restored.');
    } catch (error) {
      this.jsonMessage.set(error instanceof Error ? error.message : 'Draft import failed.');
    }
  }

  downloadDragonPack(): void {
    try {
      const pack = addMiniDragonModel(createDragonModelPack(this.store.state(), {
        modelId: this.exportModelId(),
        label: this.exportModelName(),
        description: this.exportModelDescription(),
        packVersion: this.exportPackVersion(),
        style: this.designerDraft.style(),
      }), this.designerDraft);
      downloadDragonModelPack(pack);
      this.jsonMessage.set(`Validated ${pack.packId}@${pack.packVersion} and downloaded it.`);
    } catch (error) {
      this.jsonMessage.set(error instanceof Error ? error.message : 'Dragon pack export failed.');
    }
  }

  async publishDragonAssets(): Promise<void> {
    this.publishing.set(true);
    try {
      const pack = addMiniDragonModel(createDragonModelPack(this.store.state(), {
        modelId: this.exportModelId(),
        label: this.exportModelName(),
        description: this.exportModelDescription(),
        packVersion: this.exportPackVersion(),
        style: this.designerDraft.style(),
      }), this.designerDraft);
      const arenaScenario = parseDragonArenaScenario(this.arenaScenario());
      const versionId = await this.publisher.publishPreview(pack, arenaScenario, this.releaseNotes());
      this.jsonMessage.set(`Published preview ${versionId}. Promote it when the live preview is approved.`);
      await this.refreshVersions();
    } catch (error) {
      this.jsonMessage.set(error instanceof Error ? error.message : 'Firebase publish failed.');
    } finally {
      this.publishing.set(false);
    }
  }

  async promotePreview(): Promise<void> {
    await this.runPublicationAction(async () => {
      const versionId = await this.publisher.promotePreview();
      return `Promoted ${versionId} to the student app.`;
    });
  }

  async rollbackPublishedAssets(): Promise<void> {
    await this.runPublicationAction(async () => {
      const versionId = await this.publisher.rollbackToPrevious();
      return `Rolled the student app back to ${versionId}.`;
    });
  }

  async refreshVersions(): Promise<void> {
    try {
      this.recentVersionIds.set((await this.publisher.recentVersions()).map(version => version.versionId));
    } catch {
      this.recentVersionIds.set([]);
    }
  }

  updateReleaseNotes(event: Event): void {
    this.releaseNotes.set((event.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  updateArenaNumber(field: 'floorX' | 'floorZ' | 'wallHeight' | 'friction' | 'restitution' | 'redX' | 'blueX', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.arenaScenario.update(current => {
      const next = structuredClone(current);
      if (field === 'floorX') next.environment.floorSize.x = value;
      else if (field === 'floorZ') next.environment.floorSize.z = value;
      else if (field === 'wallHeight') next.environment.wallHeight = value;
      else if (field === 'friction') next.physics = { ...next.physics, floorFriction: value };
      else if (field === 'restitution') next.physics = { ...next.physics, floorRestitution: value };
      else {
        const team = field === 'redX' ? 'red' : 'blue';
        const participant = next.participants.find(item => item.team === team);
        if (participant) participant.spawnPosition.x = value;
      }
      return next;
    });
  }

  toggleArenaBoolean(field: 'ringBoundary' | 'damageEnabled' | 'jointBreakageEnabled'): void {
    this.arenaScenario.update(current => {
      const next = structuredClone(current);
      if (field === 'ringBoundary') next.environment.ringBoundary = !next.environment.ringBoundary;
      else next.physics = { ...next.physics, [field]: !next.physics?.[field] };
      return next;
    });
  }

  resetArenaSettings(): void {
    this.arenaScenario.set(initialDragonArena());
  }

  addArenaObstacle(): void {
    this.arenaScenario.update(current => {
      const next = structuredClone(current);
      const index = next.environment.obstacles.length + 1;
      next.environment.obstacles.push({
        id: `garage-obstacle-${index}`,
        label: `Garage obstacle ${index}`,
        position: { x: 0, y: 0.3, z: 0 },
        size: { x: 1, y: 0.6, z: 1 },
        color: '#64748b',
        surface: 'hazard',
      });
      return next;
    });
  }

  removeArenaObstacle(id: string): void {
    this.arenaScenario.update(current => ({
      ...current,
      environment: {
        ...current.environment,
        obstacles: current.environment.obstacles.filter(obstacle => obstacle.id !== id),
      },
    }));
  }

  toggleSelectedIsolation(): void {
    this.isolateSelectedPart.update(value => !value);
  }

  private async runPublicationAction(action: () => Promise<string>): Promise<void> {
    this.publishing.set(true);
    try {
      this.jsonMessage.set(await action());
      await this.refreshVersions();
    } catch (error) {
      this.jsonMessage.set(error instanceof Error ? error.message : 'Firebase publication action failed.');
    } finally {
      this.publishing.set(false);
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

function initialDragonArena(): CreationTestScenarioDefinition {
  const scenario = TEST_SCENARIO_CATALOG.find(item => item.id === 'dragon-duel-ring');
  if (!scenario) throw new Error('Dragon duel arena settings are missing.');
  return structuredClone(scenario);
}
