import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AssemblyBlueprint, Vector3Data } from '@pbl/assembly/domain/assembly.models';
import {
  AssemblyInspectorControlDefinition,
  AssemblyPartProfileSchema,
  AssemblyProjectPackageManifest,
} from '@pbl/assembly/domain/assembly-part-schema';
import { describeSpecimen } from '@pbl/assembly/preview/specimen.models';
import { SpecimenRendererService } from '@pbl/assembly/preview/specimen-renderer.service';
import { SpecimenThumbnailService } from '@pbl/assembly/preview/specimen-thumbnail.service';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
  createPartFromDefinition,
} from '../assembly-garage/data/assembly-part-definitions';
import {
  DEFAULT_DRAGON_STYLE,
  DragonStyle,
  setDragonStyleOverride,
} from '@pbl/assembly/rendering/dragon-style';
import { WING_SHAPES } from '@pbl/assembly/rendering/dragon-wing-profile';
import {
  DragonCustomMaterialSlot,
  DragonCustomPartPiece,
  DragonCustomPartRecipe,
  DragonCustomPieceMaterial,
  DragonCustomPieceShape,
  parseDragonCustomPartRecipe,
  serializeDragonCustomPartRecipe,
} from '@pbl/assembly/rendering/dragon-custom-part-recipe';
import {
  DesignerImportedPartAsset,
  ImportedPartAssetsStore,
} from '../imported-part-assets.store';
import {
  SharedDragonPart,
  SharedDragonPartAccess,
  SharedDragonPartRevision,
  SharedDragonPartSnapshot,
  SharedDragonPartStatus,
  SharedDragonPartUser,
  sharedPartAccess,
} from '../shared-dragon-parts.models';
import {
  SharedDragonPartConflictError,
  SharedDragonPartsService,
} from '../shared-dragon-parts.service';
import { PartTuningStore } from './part-tuning.store';
import {
  DesignerDragonDraftStore,
  DesignerPartPlacement,
} from '../designer-dragon-draft.store';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';
import {
  dragonParametersForProfile,
} from '@pbl/assembly/model-pack/dragon-visual-parameter-registry';
import { applyDesignerDraft } from '../designer-part-overrides';
import { buildPartAcceptanceReport, partGroup } from './part-acceptance';
import { exactPartPreviewFrame } from './part-preview-frame';
import {
  DRAGON_BODY_TYPE_OPTIONS,
  createDragonBodyTypePresets,
} from '../assembly-garage/data/presets/dragon-body-types';
import { PartGeneContext, partGeneContext } from './part-workshop-context';
import { PartAnatomyLayer, partAnatomyLayers } from './part-anatomy-layers';
import {
  MINI_DRAGON_BREED_OPTIONS,
  createMiniDragonBreedAuthoringPreset,
} from '../mini-dragon-model-export';
import { MiniDragonBreedPresetId } from '@pbl/assembly/rendering/mini-dragon-breed-morphology';
import {
  BACK_SPIKE_PLACEMENT_SUFFIX,
  WorkshopHeadSexPreview,
  WorkshopGenePreviewMode,
  WorkshopPreviewMode,
  applyHeadSexPreview,
  applyLayerGenePreview,
  applyWorkshopPlacements,
  matchingAssemblyPartIds,
} from './part-workshop-assembly';
import {
  ASSEMBLY_PROJECT_PACKAGES,
  partProfileSchema,
  projectPackageForFamily,
} from '../project-packages/assembly-project-packages';

/**
 * A workbench for the part meshes themselves.
 *
 * The dragon's anatomy is generated code, so improving how it looks means
 * editing `dragon-procedural-mesh.factory.ts` and looking at the result. Doing
 * that through the full app is slow. This page renders one part at a time,
 * isolated, from several angles, with live controls for the feature counts and
 * proportions that are otherwise hardcoded — and records the values you land on
 * so they can go back into source.
 */

interface PartTile {
  definition: AssemblyPartDefinition;
  image: string | null;
  pending: boolean;
}

interface AngleView {
  id: string;
  label: string;
  direction: Vector3Data;
}

export type PartsLabDragonSpecies = 'lab' | 'mini';
export type PartInspectorTab =
  | 'shape'
  | 'features'
  | 'builder'
  | 'shared'
  | 'surface'
  | 'sockets'
  | 'genes'
  | 'test';

interface PartInspectorTabOption {
  readonly id: PartInspectorTab;
  readonly label: string;
}

/** One tunable number, resolved from the selected part's style section. */
export interface StyleControl {
  section: keyof DragonStyle;
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  readonly handle?: AssemblyInspectorControlDefinition['handle'];
}

export interface PartParameterControl extends AssemblyInspectorControlDefinition {
  readonly type: 'number';
  readonly defaultValue: number;
  value: number;
}

interface PartOptionControl extends AssemblyInspectorControlDefinition {
  readonly type: 'boolean' | 'select' | 'color';
  readonly value: string | boolean;
}

interface InheritedParameterControl {
  readonly key: string;
  readonly label: string;
  readonly value: string | number | boolean;
}

interface AnatomyLayerView extends PartAnatomyLayer {
  readonly styleControls: readonly StyleControl[];
  readonly parameterControls: readonly PartParameterControl[];
  readonly optionControls: readonly PartOptionControl[];
  readonly inheritedParameters: readonly InheritedParameterControl[];
  readonly genes: readonly PartGeneContext[];
  readonly canToggle: boolean;
  readonly visible: boolean;
  readonly editable: boolean;
}

type BodyHandleAxis = 'horizontal' | 'vertical';

interface BodyHandleLayout {
  readonly key: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly axis: BodyHandleAxis;
  readonly invert?: boolean;
}

interface BodyHandleControl extends BodyHandleLayout {
  readonly control: PartParameterControl;
}

type ProceduralHandleKind = 'move' | 'rotate' | 'scale';
type ProceduralHandleAxis = 'horizontal' | 'vertical' | 'diagonal';

interface ProceduralHandleControl {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly kind: ProceduralHandleKind;
  readonly axis: ProceduralHandleAxis;
  readonly source: 'parameter' | 'style';
  readonly control: PartParameterControl | StyleControl;
}

interface ProceduralHandleDrag {
  readonly id: string;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startValue: number;
}

type PlacementHandleKind = 'move' | 'rotate' | 'scale';

interface PlacementHandleDrag {
  readonly kind: PlacementHandleKind;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly placement: DesignerPartPlacement;
}

const ANGLE_VIEWS: readonly AngleView[] = [
  { id: 'three-quarter', label: 'Three-quarter', direction: { x: 0.86, y: 0.42, z: 1 } },
  { id: 'side', label: 'Side', direction: { x: 0, y: 0.08, z: 1 } },
  { id: 'front', label: 'Front', direction: { x: 1, y: 0.08, z: 0 } },
  { id: 'top', label: 'Top', direction: { x: 0.05, y: 1, z: 0.05 } },
  { id: 'below', label: 'Below', direction: { x: 0.5, y: -0.55, z: 0.7 } },
  { id: 'rear', label: 'Rear three-quarter', direction: { x: -0.8, y: 0.35, z: -0.9 } },
];

const FAMILIES: readonly AssemblyPartFamily[] = ['dragon', 'robot', 'car', 'primitive'];
const INSPECTOR_TABS: readonly PartInspectorTabOption[] = [
  { id: 'shape', label: 'Shape' },
  { id: 'features', label: 'Layers' },
  { id: 'builder', label: 'Builder' },
  { id: 'shared', label: 'Shared' },
  { id: 'surface', label: 'Surface' },
  { id: 'sockets', label: 'Sockets' },
  { id: 'genes', label: 'Genes' },
  { id: 'test', label: 'Test' },
];
const CUSTOM_PIECE_SHAPES: readonly { id: DragonCustomPieceShape; label: string }[] = [
  { id: 'sphere', label: 'Sphere' },
  { id: 'box', label: 'Box' },
  { id: 'cylinder', label: 'Cylinder' },
  { id: 'cone', label: 'Cone' },
];
const CUSTOM_MATERIAL_SLOTS: readonly { id: DragonCustomMaterialSlot; label: string }[] = [
  { id: 'skin', label: 'Primary surface' },
  { id: 'horn', label: 'Hard accent' },
  { id: 'tooth', label: 'Light hard material' },
  { id: 'membrane', label: 'Translucent surface' },
  { id: 'dark', label: 'Dark detail' },
];
const CUSTOM_ASSET_MATERIAL_SLOTS: readonly { id: DragonCustomPieceMaterial; label: string }[] = [
  { id: 'original', label: 'Keep original' },
  ...CUSTOM_MATERIAL_SLOTS,
];
const SURFACE_PARAMETER_KEYS = new Set([
  'surfaceRelief',
  'surfaceRoughness',
  'surfaceDetailScale',
  'surfacePatternStrength',
  'surfacePatternScale',
]);
const ARENA_BODY_HANDLES: readonly BodyHandleLayout[] = [
  { key: 'bodyTailRootWidth', label: 'Tail root', x: 16, y: 52, axis: 'horizontal' },
  { key: 'bodyHipWidth', label: 'Hips', x: 31, y: 47, axis: 'horizontal' },
  { key: 'bodyWaistWidth', label: 'Waist', x: 48, y: 53, axis: 'horizontal' },
  { key: 'bodyBellyDepth', label: 'Belly', x: 52, y: 70, axis: 'vertical', invert: true },
  { key: 'bodySpineArch', label: 'Spine', x: 52, y: 28, axis: 'vertical' },
  { key: 'bodyChestWidth', label: 'Chest width', x: 68, y: 48, axis: 'horizontal' },
  { key: 'bodyChestHeight', label: 'Chest height', x: 68, y: 27, axis: 'vertical' },
  { key: 'bodyNeckWidth', label: 'Neck', x: 84, y: 48, axis: 'horizontal' },
];
const SHOW_BODY_HANDLES: readonly BodyHandleLayout[] = [
  { key: 'miniHipScale', label: 'Hips', x: 29, y: 48, axis: 'horizontal' },
  { key: 'miniWaistScale', label: 'Waist', x: 48, y: 53, axis: 'horizontal' },
  { key: 'miniBellyScale', label: 'Belly', x: 53, y: 70, axis: 'vertical', invert: true },
  { key: 'miniSpineArch', label: 'Spine', x: 53, y: 29, axis: 'vertical' },
  { key: 'miniChestScale', label: 'Chest', x: 70, y: 46, axis: 'horizontal' },
];
const NEUTRAL_COLOR = '#8d6a52';

/**
 * How long a slider must be still before the meshes rebuild.
 *
 * Rebuilding on every `input` event disposed and re-uploaded every geometry
 * 60 times a second and re-baked six angle thumbnails alongside — enough GPU
 * churn to make the browser drop the WebGL context outright, which showed up as
 * the preview simply dying mid-drag. Labels still update instantly, so the
 * controls feel live.
 */
const COMMIT_DELAY_MS = 90;

@Component({
  selector: 'app-parts-lab-page',
  imports: [RouterLink],
  templateUrl: './parts-lab.page.html',
  styleUrl: './parts-lab.page.scss',
  providers: [SpecimenRendererService],
})
export class PartsLabPage implements OnDestroy {
  /**
   * A signal query, not a static `@ViewChild`: the stage lives inside the
   * `@if (selected())` block, so it does not exist until change detection has
   * run and it disappears again if a family has no parts.
   */
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

  private readonly thumbnails = inject(SpecimenThumbnailService);
  private readonly renderer = inject(SpecimenRendererService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mounted = signal(false);
  private readonly designerDraft = inject(DesignerDragonDraftStore);
  private readonly importedAssets = inject(ImportedPartAssetsStore);
  private readonly sharedPartService = inject(SharedDragonPartsService);
  private readonly requestedImportedAssets = new Set<string>();

  readonly tuning = inject(PartTuningStore);
  readonly families = FAMILIES;
  readonly projectPackages = ASSEMBLY_PROJECT_PACKAGES;
  readonly inspectorTabs = INSPECTOR_TABS;
  readonly arenaBodyTypes = DRAGON_BODY_TYPE_OPTIONS;
  readonly miniBreedOptions = MINI_DRAGON_BREED_OPTIONS;
  readonly placementHandleKinds = ['move', 'rotate', 'scale'] as const;
  readonly angleViews = ANGLE_VIEWS;
  readonly wingPresetIds = Object.keys(WING_SHAPES) as (keyof typeof WING_SHAPES)[];
  readonly customPieceShapes = CUSTOM_PIECE_SHAPES;
  readonly customMaterialSlots = CUSTOM_MATERIAL_SLOTS;
  readonly customAssetMaterialSlots = CUSTOM_ASSET_MATERIAL_SLOTS;
  readonly importedAssetLibrary = this.importedAssets.assets;
  readonly contextLost = this.renderer.contextLost;

  readonly family = signal<AssemblyPartFamily>('dragon');
  readonly dragonSpecies = signal<PartsLabDragonSpecies>('lab');
  readonly selectedId = signal<string | null>(null);
  readonly color = signal(NEUTRAL_COLOR);
  readonly useDefinitionColor = signal(false);
  readonly scaleX = signal(1);
  readonly scaleY = signal(1);
  readonly scaleZ = signal(1);
  readonly tileSize = signal(176);
  readonly copied = signal(false);
  readonly search = signal('');
  readonly group = signal('All');
  readonly compareId = signal<string | null>(null);
  readonly inspectorTab = signal<PartInspectorTab>('features');
  readonly selectedAnatomyLayerId = signal<string | null>(null);
  readonly selectedCustomPieceId = signal<string | null>(null);
  readonly assetImporting = signal(false);
  readonly assetImportError = signal<string | null>(null);
  readonly lastImportedAsset = signal<DesignerImportedPartAsset | null>(null);
  readonly sharedUser = signal<SharedDragonPartUser | null>(null);
  readonly sharedParts = signal<readonly SharedDragonPart[]>([]);
  readonly selectedSharedPartId = signal<string | null>(null);
  readonly sharedRevisions = signal<readonly SharedDragonPartRevision[]>([]);
  readonly sharedBusy = signal(false);
  readonly sharedError = signal<string | null>(null);
  readonly sharedMessage = signal<string | null>(null);
  readonly sharedName = signal('');
  readonly sharedDescription = signal('');
  readonly sharedTags = signal('');
  readonly sharedChangeNote = signal('');
  readonly sharedEditorUids = signal('');
  readonly sharedViewerUids = signal('');
  readonly loadedSharedRevisionId = signal<string | null>(null);
  readonly showBodyHandles = signal(true);
  readonly activeBodyHandleId = signal<string | null>(null);
  readonly showProceduralHandles = signal(true);
  readonly activeProceduralHandleId = signal<string | null>(null);
  readonly previewMode = signal<WorkshopPreviewMode>('isolated');
  readonly genePreviewMode = signal<WorkshopGenePreviewMode>('authored');
  readonly headSexPreview = signal<WorkshopHeadSexPreview>('authored');
  readonly arenaAssemblyId = signal(DRAGON_BODY_TYPE_OPTIONS[0]?.id ?? 'regal-dragon');
  readonly miniBreedId = signal<MiniDragonBreedPresetId>('puggle');
  readonly selectedAssemblyPartId = signal<string | null>(null);
  readonly placementAnchor = signal<{ xPercent: number; yPercent: number } | null>(null);
  readonly activePlacementHandle = signal<PlacementHandleKind | null>(null);

  /** Live feature proportions, seeded from the shipped defaults. */
  readonly style = signal<DragonStyle>(cloneStyle(this.designerDraft.style()));

  /** What the meshes are actually built from — updated on a debounce. */
  private readonly committedScale = signal<Vector3Data>({ x: 1, y: 1, z: 1 });
  private readonly commitVersion = signal(0);
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private activeBodyHandle: {
    readonly id: string;
    readonly pointerId: number;
    readonly startX: number;
    readonly startY: number;
    readonly startValue: number;
  } | null = null;
  private proceduralHandleDrag: ProceduralHandleDrag | null = null;
  private placementHandleDrag: PlacementHandleDrag | null = null;
  private anchorFrameId: number | null = null;

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: null });

  readonly definitions = computed(() => {
    const family = this.family();
    if (family === 'dragon' && this.dragonSpecies() === 'mini') {
      return MINI_DRAGON_PART_DEFINITIONS;
    }
    return ASSEMBLY_PART_DEFINITIONS.filter(definition => definition.family === family);
  });

  readonly projectPackage = computed<AssemblyProjectPackageManifest>(() =>
    projectPackageForFamily(this.family()));

  readonly selectedPartSchema = computed<AssemblyPartProfileSchema | null>(() => {
    const definition = this.selected();
    return definition ? partProfileSchema(definition) : null;
  });

  readonly visibleInspectorTabs = computed(() => {
    const schema = this.selectedPartSchema();
    if (!schema) return INSPECTOR_TABS;
    return INSPECTOR_TABS.filter(tab => {
      if (tab.id === 'features') return schema.capabilities.includes('parameters');
      if (tab.id === 'builder') return schema.capabilities.includes('custom-pieces');
      if (tab.id === 'surface') return schema.capabilities.includes('materials') || schema.capabilities.includes('surface');
      if (tab.id === 'sockets') return schema.capabilities.includes('sockets');
      if (tab.id === 'genes') return this.family() === 'dragon';
      return true;
    });
  });

  readonly groups = computed(() => ['All', ...new Set(this.definitions().map(partGroup))]);
  readonly filteredDefinitions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const group = this.group();
    return this.definitions().filter(definition =>
      (group === 'All' || partGroup(definition) === group)
      && (!query || `${definition.label} ${definition.id} ${definition.visualProfile?.profileId ?? ''}`
        .toLowerCase().includes(query)));
  });

  readonly collectionLabel = computed(() =>
    this.family() === 'dragon'
      ? this.dragonSpecies() === 'mini' ? 'Mini Dragon Show' : 'Arena dragon'
      : this.projectPackage().label);

  readonly speciesLabel = computed(() =>
    this.dragonSpecies() === 'mini' ? 'Mini Dragon Show' : 'Dragon Arena');

  /**
   * Explicitly nullable: `list[0]` is typed as always-present without
   * `noUncheckedIndexedAccess`, so the `?? null` looks unreachable to the
   * compiler while genuinely firing for a family with no parts.
   */
  readonly selected = computed<AssemblyPartDefinition | null>(() => {
    const id = this.selectedId();
    const list = this.definitions();
    return list.find(definition => definition.id === id) ?? list[0] ?? null;
  });

  readonly profileId = computed(() => this.selected()?.visualProfile?.profileId ?? '—');
  readonly meshType = computed(() => this.selected()?.visualProfile?.meshType ?? 'primitive');

  /** Feature controls for the selected part, or none if it has no tunables. */
  readonly styleControls = computed<StyleControl[]>(() => {
    const style = this.style();
    return (this.selectedPartSchema()?.controls ?? [])
      .filter((definition): definition is AssemblyInspectorControlDefinition & {
        readonly type: 'number'; readonly defaultValue: number; readonly styleSection: string;
      } => definition.type === 'number' && definition.binding === 'style'
        && typeof definition.defaultValue === 'number' && Boolean(definition.styleSection))
      .map(definition => {
        const section = definition.styleSection as keyof DragonStyle;
        const key = definition.key === 'jointBall' ? 'ball' : definition.key;
        return {
          section,
          key,
          label: definition.label,
          min: definition.min!,
          max: definition.max!,
          step: definition.step ?? 0.01,
          value: readStyleValue(style, section, key),
          handle: definition.handle,
        };
      });
  });

  readonly schemaControls = computed<readonly (PartParameterControl | PartOptionControl)[]>(() => {
    this.commitVersion();
    const definition = this.selected();
    const schema = this.selectedPartSchema();
    if (!definition || !schema) return [];
    const values = this.designerDraft.parametersFor(definition.id, definition.visualProfile?.parameters);
    return schema.controls
      .filter(control => control.binding === 'parameter' && !control.readOnly)
      .flatMap(control => resolvedSchemaControl(control, values));
  });

  readonly parameterControls = computed<PartParameterControl[]>(() =>
    this.schemaControls().filter((control): control is PartParameterControl => control.type === 'number'));

  readonly optionControls = computed<PartOptionControl[]>(() =>
    this.schemaControls().filter((control): control is PartOptionControl => control.type !== 'number'));

  readonly surfaceControls = computed(() =>
    this.parameterControls().filter(control => control.surface || SURFACE_PARAMETER_KEYS.has(control.key)));

  readonly surfaceOptionControls = computed(() =>
    this.optionControls().filter(control => control.surface));

  readonly partParameterScopeLabel = computed(() =>
    this.dragonSpecies() === 'mini'
      ? 'This Show part'
      : this.family() === 'dragon'
        ? this.profileId() === 'dragon-body' ? 'This Arena body type' : 'This Arena part'
        : `This ${this.projectPackage().label.toLowerCase()} part`);

  readonly bodyHandles = computed<BodyHandleControl[]>(() => {
    const layouts = this.profileId() === 'dragon-body'
      ? ARENA_BODY_HANDLES
      : this.profileId() === 'mini-dragon-body'
        ? SHOW_BODY_HANDLES
        : [];
    const controls = this.parameterControls();
    return layouts.flatMap(layout => {
      const control = controls.find(candidate => candidate.key === layout.key);
      return control ? [{ ...layout, control }] : [];
    });
  });

  readonly inheritedParameters = computed<InheritedParameterControl[]>(() => {
    const definition = this.selected();
    const values = definition?.visualProfile?.parameters ?? {};
    return dragonParametersForProfile(this.profileId())
      .filter(parameter => parameter.geneticsOwned)
      .map(parameter => ({
        ...parameter,
        value: values[parameter.key] ?? parameter.defaultValue,
      }));
  });

  readonly surfaceInheritedParameters = computed(() =>
    this.inheritedParameters().filter(control =>
      control.key === 'scalePattern' || control.key === 'patternColor'));

  readonly customBuilderAvailable = computed(() =>
    this.selectedPartSchema()?.capabilities.includes('custom-pieces') ?? false);

  readonly customRecipe = computed<DragonCustomPartRecipe>(() => {
    this.commitVersion();
    const definition = this.selected();
    if (!definition || !this.customBuilderAvailable()) return { version: 2, pieces: [] };
    const parameters = this.designerDraft.parametersFor(
      definition.id,
      definition.visualProfile?.parameters,
    );
    return parseDragonCustomPartRecipe(
      typeof parameters['customPartRecipe'] === 'string' ? parameters['customPartRecipe'] : '',
    );
  });

  readonly selectedCustomPiece = computed<DragonCustomPartPiece | null>(() => {
    const pieces = this.customRecipe().pieces;
    const id = this.selectedCustomPieceId();
    return pieces.find(piece => piece.id === id) ?? pieces[0] ?? null;
  });

  readonly selectedImportedAsset = computed(() => {
    const piece = this.selectedCustomPiece();
    return piece?.kind === 'asset'
      ? this.importedAssetLibrary().find(asset => asset.id === piece.assetId) ?? null
      : null;
  });

  readonly selectedSharedPart = computed<SharedDragonPart | null>(() => {
    const id = this.selectedSharedPartId();
    return this.sharedParts().find(part => part.id === id) ?? null;
  });

  readonly selectedSharedAccess = computed<SharedDragonPartAccess | null>(() => {
    const part = this.selectedSharedPart();
    const user = this.sharedUser();
    return part && user ? sharedPartAccess(part, user.uid) : null;
  });

  readonly canEditSelectedSharedPart = computed(() =>
    this.selectedSharedAccess() === 'owner' || this.selectedSharedAccess() === 'editor');

  readonly ownsSelectedSharedPart = computed(() => this.selectedSharedAccess() === 'owner');

  readonly geneContext = computed(() =>
    partGeneContext(this.selected(), this.dragonSpecies()));

  readonly anatomyLayers = computed<AnatomyLayerView[]>(() => {
    const styleControls = this.styleControls();
    const parameterControls = this.parameterControls();
    const optionControls = this.optionControls();
    const inheritedParameters = this.inheritedParameters();
    const genes = this.geneContext();
    const availableKeys = [
      ...styleControls.map(control => control.key),
      ...parameterControls.map(control => control.key),
      ...optionControls.map(control => control.key),
      ...inheritedParameters.map(control => control.key),
    ];

    const layers: readonly PartAnatomyLayer[] = this.family() === 'dragon'
      ? partAnatomyLayers(this.profileId(), this.dragonSpecies(), availableKeys)
      : (this.selectedPartSchema()?.sections ?? []).map(section => ({
          id: section.id,
          label: section.label,
          description: section.description,
          category: section.category,
          parameterKeys: (this.selectedPartSchema()?.controls ?? [])
            .filter(control => control.sectionId === section.id && control.binding === 'parameter')
            .map(control => control.key),
          geneIds: [] as readonly string[],
          structural: section.structural,
        }));
    return layers
      .map(layer => {
        const keySet = new Set(layer.parameterKeys);
        const layerStyleControls = styleControls.filter(control => keySet.has(control.key));
        const layerParameterControls = parameterControls.filter(control => keySet.has(control.key));
        const layerOptionControls = optionControls.filter(control => keySet.has(control.key));
        const layerInheritedParameters = inheritedParameters.filter(control => keySet.has(control.key));
        const layerGenes = genes.filter(gene => layer.geneIds.includes(gene.id));
        const visibilityStyle = layerStyleControls.find(control => control.key === layer.visibilityKey);
        const visibilityParameter = layerParameterControls.find(control => control.key === layer.visibilityKey);
        const visibilityValue = visibilityStyle?.value ?? visibilityParameter?.value;
        return {
          ...layer,
          styleControls: layerStyleControls,
          parameterControls: layerParameterControls,
          optionControls: layerOptionControls,
          inheritedParameters: layerInheritedParameters,
          genes: layerGenes,
          canToggle: !layer.structural && visibilityValue !== undefined,
          visible: visibilityValue === undefined || visibilityValue !== 0,
          editable: layerStyleControls.length > 0 || layerParameterControls.length > 0
            || layerOptionControls.length > 0,
        };
      });
  });

  readonly selectedAnatomyLayer = computed<AnatomyLayerView | null>(() => {
    const layers = this.anatomyLayers();
    const selectedId = this.selectedAnatomyLayerId();
    return layers.find(layer => layer.id === selectedId) ?? layers[0] ?? null;
  });

  readonly proceduralHandles = computed<ProceduralHandleControl[]>(() => {
    const layer = this.selectedAnatomyLayer();
    if (!layer) return [];
    return [
      ...layer.parameterControls.map(control => proceduralHandle(control, 'parameter')),
      ...layer.styleControls.map(control => proceduralHandle(control, 'style')),
    ].filter((handle): handle is ProceduralHandleControl => handle !== null);
  });

  readonly assemblyContextId = computed(() => this.dragonSpecies() === 'mini'
    ? `mini-dragon-${this.miniBreedId()}`
    : this.arenaAssemblyId());

  /** Whole-dragon preview rebuilt from the same presets used by Assembly Garage. */
  readonly assemblyPreview = computed<{
    readonly blueprint: AssemblyBlueprint;
    readonly matchingPartIds: readonly string[];
  } | null>(() => {
    if (this.family() !== 'dragon') return null;
    this.commitVersion();
    const definition = this.selected();
    if (!definition) return null;

    const preset = this.dragonSpecies() === 'mini'
      ? createMiniDragonBreedAuthoringPreset(this.miniBreedId(), this.designerDraft)
      : createDragonBodyTypePresets(candidate => applyDesignerDraft(candidate, this.designerDraft))
        .find(candidate => candidate.id === this.arenaAssemblyId());
    if (!preset) return null;

    const placed = applyWorkshopPlacements(
      preset.state,
      this.designerDraft.placementsForContext(this.assemblyContextId()),
    );
    const matchingPartIds = matchingAssemblyPartIds(placed, definition);
    const genePreview = applyLayerGenePreview(
        placed,
        matchingPartIds,
        this.selectedAnatomyLayer(),
        this.dragonSpecies(),
        this.genePreviewMode(),
      );
    return {
      blueprint: this.profileId() === 'dragon-head-horned'
        ? applyHeadSexPreview(genePreview, matchingPartIds, this.headSexPreview())
        : genePreview,
      matchingPartIds,
    };
  });

  readonly assemblyPartOptions = computed(() => {
    const preview = this.assemblyPreview();
    if (!preview) return [];
    const ids = new Set(preview.matchingPartIds);
    return preview.blueprint.parts
      .filter(part => ids.has(part.id))
      .map(part => ({ id: part.id, label: part.label ?? part.id }));
  });

  readonly activeAssemblyPartId = computed(() => {
    const options = this.assemblyPartOptions();
    const selected = this.selectedAssemblyPartId();
    return options.some(option => option.id === selected) ? selected : options[0]?.id ?? null;
  });

  readonly placementTargetId = computed(() => {
    const partId = this.activeAssemblyPartId();
    const placement = this.selectedAnatomyLayer()?.placement;
    if (!partId || !placement) return null;
    return placement === 'back-spikes' ? `${partId}${BACK_SPIKE_PLACEMENT_SUFFIX}` : partId;
  });

  readonly selectedPlacement = computed(() => {
    const targetId = this.placementTargetId();
    return targetId
      ? this.designerDraft.placementFor(this.assemblyContextId(), targetId)
      : null;
  });

  readonly canPlaceSelectedLayer = computed(() =>
    this.previewMode() === 'assembly' && Boolean(this.placementTargetId()));

  readonly featureControlCount = computed(() =>
    this.styleControls().length + this.schemaControls().length);

  readonly selectedArenaBody = computed(() => {
    const definitionId = this.selected()?.id;
    return this.arenaBodyTypes.find(option => option.bodyDefinitionId === definitionId) ?? null;
  });

  readonly comparison = computed(() => {
    const id = this.compareId();
    return id ? this.definitions().find(definition => definition.id === id) ?? null : null;
  });

  readonly acceptance = computed(() => {
    const definition = this.selected();
    return definition ? buildPartAcceptanceReport(applyDesignerDraft(definition, this.designerDraft)) : null;
  });

  readonly isWing = computed(() => {
    const profile = this.profileId();
    return profile === 'dragon-wing' || profile === 'dragon-secondary-wing';
  });

  /**
   * Populated by effects, not computeds.
   *
   * Baking a thumbnail renders to a GPU context and lazily mounts a renderer —
   * side effects, which a computed must not perform. Doing it in a computed
   * also meant every read could trigger 25 synchronous renders during template
   * evaluation.
   */
  readonly tiles = signal<PartTile[]>([]);
  readonly angleStrip = signal<{ view: AngleView; image: string | null; pending: boolean }[]>([]);
  private contactBakeGeneration = 0;
  private angleBakeGeneration = 0;
  private thumbnailBakesInFlight = 0;
  private destroyed = false;

  readonly scaledDimensions = computed(() => {
    const definition = this.selected();
    if (!definition) return null;
    const scale = this.scaleVector();
    return {
      x: round(definition.dimensions.x * scale.x),
      y: round(definition.dimensions.y * scale.y),
      z: round(definition.dimensions.z * scale.z),
    };
  });

  constructor() {
    setDragonStyleOverride(this.style());

    effect(() => {
      this.importedAssets.revision();
      const assetIds = this.customRecipe().pieces
        .filter(piece => piece.kind === 'asset')
        .map(piece => piece.assetId);
      for (const assetId of assetIds) {
        if (this.requestedImportedAssets.has(assetId)) continue;
        this.requestedImportedAssets.add(assetId);
        void this.importedAssets.ensureRegistered(assetId).then(ready => {
          if (ready) this.scheduleCommit();
        });
      }
    });

    effect(() => {
      const definition = this.selected();
      if (!definition) return;
      const dimensions = this.designerDraft.dimensionsFor(definition.id, definition.dimensions);
      const scale = {
        x: dimensions.x / definition.dimensions.x,
        y: dimensions.y / definition.dimensions.y,
        z: dimensions.z / definition.dimensions.z,
      };
      this.scaleX.set(scale.x);
      this.scaleY.set(scale.y);
      this.scaleZ.set(scale.z);
      this.committedScale.set(scale);
    });

    effect(() => {
      const params = this.params();
      if (!params) return;
      const family = params.get('family') as AssemblyPartFamily | null;
      if (family && FAMILIES.includes(family)) this.family.set(family);
      const species = params.get('species');
      if (species === 'lab' || species === 'mini') this.dragonSpecies.set(species);
      const part = params.get('part');
      if (part) this.selectedId.set(part);
      const tab = params.get('tab') as PartInspectorTab | null;
      if (tab && INSPECTOR_TABS.some(option => option.id === tab)) this.inspectorTab.set(tab);
      const view = params.get('view');
      if (view === 'isolated' || view === 'assembly') this.previewMode.set(view);
      const gene = params.get('gene') as WorkshopGenePreviewMode | null;
      if (gene === 'authored' || gene === 'dominant' || gene === 'recessive') {
        this.genePreviewMode.set(gene);
      }
      const sex = params.get('sex') as WorkshopHeadSexPreview | null;
      if (sex === 'authored' || sex === 'female' || sex === 'male') {
        this.headSexPreview.set(sex);
      }
      const assembly = params.get('assembly');
      const arena = this.arenaBodyTypes.find(option => option.id === assembly);
      if (arena) this.arenaAssemblyId.set(arena.id);
      const mini = this.miniBreedOptions.find(option => option.presetId === assembly);
      if (mini) this.miniBreedId.set(mini.id);
      const tile = Number(params.get('tile'));
      if (Number.isFinite(tile) && tile >= 64 && tile <= 512) this.tileSize.set(tile);
    });

    // Mount as soon as the stage element exists, and only once.
    effect(() => {
      const stage = this.stageRef();
      if (!stage || this.mounted()) return;

      this.renderer.mount(stage.nativeElement, {
        // Procedural geometry still follows the machine's resolved detail tier,
        // while this live canvas uses the direct antialiased path. The stage
        // shares the page with a sequential thumbnail baker; giving both
        // contexts post-processing targets made Chromium drop the authoring
        // view during a contact-sheet bake.
        quality: 'low',
        interactive: true,
        showGroundShadow: true,
        pose: { droopRadians: 0 },
      });
      this.mounted.set(true);
    });

    effect(() => {
      const definition = this.selected();
      // Read so the live view rebuilds when a committed value changes.
      this.commitVersion();
      const scale = this.committedScale();
      if (!this.mounted() || !definition) return;

      if (this.previewMode() === 'assembly' && this.family() === 'dragon') {
        const preview = this.assemblyPreview();
        if (!preview) return;
        this.renderer.show(
          describeSpecimen(this.assemblyContextId(), preview.blueprint, {
            label: `${this.speciesLabel()} assembly preview`,
          }),
          { pose: { droopRadians: 0 } },
        );
        this.renderer.setPartFocus(
          preview.matchingPartIds,
          this.focusedMeshPrefixes(),
        );
        this.schedulePlacementAnchorRefresh();
        return;
      }

      const color = this.useDefinitionColor() ? null : this.color();

      const blueprint = this.blueprintFor(definition, scale, color);
      this.renderer.show(
        describeSpecimen(definition.id, blueprint, { label: definition.label }),
        {
          pose: { droopRadians: 0 },
          frame: exactPartPreviewFrame(blueprint.parts[0]),
        },
      );
      const prefixes = this.focusedMeshPrefixes();
      this.renderer.setPartFocus(prefixes.length ? [definition.id] : null, prefixes);
      this.placementAnchor.set(null);
    });

    // Contact sheet.
    effect(() => {
      const size = this.tileSize();
      const color = this.color();
      const useDefinition = this.useDefinitionColor();
      const definitions = this.filteredDefinitions();
      this.commitVersion();

      const generation = ++this.contactBakeGeneration;
      this.tiles.set(definitions.map(definition => ({ definition, image: null, pending: true })));
      this.thumbnailBakesInFlight += 1;
      void this.bakeContactSheet(definitions, size, color, useDefinition, generation);
    });

    // Angle strip for the selected part.
    effect(() => {
      const definition = this.selected();
      const scale = this.committedScale();
      this.commitVersion();

      if (!definition) {
        this.angleStrip.set([]);
        return;
      }

      const color = this.useDefinitionColor() ? null : this.color();
      const blueprint = this.blueprintFor(definition, scale, color);

      const generation = ++this.angleBakeGeneration;
      this.angleStrip.set(ANGLE_VIEWS.map(view => ({ view, image: null, pending: true })));
      this.thumbnailBakesInFlight += 1;
      void this.bakeAngleStrip(definition, blueprint, scale, color, generation);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.contactBakeGeneration += 1;
    this.angleBakeGeneration += 1;
    if (this.commitTimer) clearTimeout(this.commitTimer);
    if (this.anchorFrameId !== null) cancelAnimationFrame(this.anchorFrameId);
    // Leave the shipped defaults behind for the rest of the app.
    setDragonStyleOverride(null);
    this.thumbnails.releaseContext();
    this.renderer.dispose();
  }

  private async bakeContactSheet(
    definitions: readonly AssemblyPartDefinition[],
    size: number,
    color: string,
    useDefinition: boolean,
    generation: number,
  ): Promise<void> {
    try {
      for (let index = 0; index < definitions.length; index += 1) {
        await nextAnimationFrame();
        if (generation !== this.contactBakeGeneration) return;
        const definition = definitions[index];
        const blueprint = this.blueprintFor(
          definition,
          { x: 1, y: 1, z: 1 },
          useDefinition ? null : color,
        );
        const image = this.thumbnails.bake(
          describeSpecimen(
            this.cacheKeyFor(definition, useDefinition ? 'own' : color),
            blueprint,
            { label: definition.label },
          ),
          {
            size,
            transparent: true,
            pose: { droopRadians: 0 },
            frame: exactPartPreviewFrame(blueprint.parts[0]),
          },
        );
        this.tiles.update(tiles => tiles.map((tile, tileIndex) =>
          tileIndex === index ? { ...tile, image, pending: false } : tile));
      }
    } finally {
      this.finishThumbnailBake();
    }
  }

  private async bakeAngleStrip(
    definition: AssemblyPartDefinition,
    blueprint: AssemblyBlueprint,
    scale: Vector3Data,
    color: string | null,
    generation: number,
  ): Promise<void> {
    try {
      for (let index = 0; index < ANGLE_VIEWS.length; index += 1) {
        await nextAnimationFrame();
        if (generation !== this.angleBakeGeneration) return;
        const view = ANGLE_VIEWS[index];
        const image = this.thumbnails.bake(
          describeSpecimen(
            `${this.cacheKeyFor(definition, color ?? 'own')}:${scaleKey(scale)}`,
            blueprint,
            { label: definition.label },
          ),
          {
            size: 190,
            transparent: true,
            viewDirection: view.direction,
            pose: { droopRadians: 0 },
            frame: exactPartPreviewFrame(blueprint.parts[0]),
          },
        );
        this.angleStrip.update(entries => entries.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, image, pending: false } : entry));
      }
    } finally {
      this.finishThumbnailBake();
    }
  }

  /** Keep baked PNGs, retire the temporary context, then refresh the live view. */
  private finishThumbnailBake(): void {
    this.thumbnailBakesInFlight = Math.max(0, this.thumbnailBakesInFlight - 1);
    if (this.thumbnailBakesInFlight > 0 || this.destroyed) return;
    this.thumbnails.releaseContext();
    if (this.mounted()) {
      this.renderer.recover();
      this.reapplyAssemblyFocus();
    }
  }

  select(definition: AssemblyPartDefinition): void {
    this.selectedId.set(definition.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        part: definition.id,
        family: this.family(),
        species: this.family() === 'dragon' ? this.dragonSpecies() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setFamily(family: AssemblyPartFamily): void {
    this.family.set(family);
    this.selectedId.set(null);
    if (this.inspectorTab() === 'genes') this.inspectorTab.set('features');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { family, species: family === 'dragon' ? this.dragonSpecies() : null, part: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  familyLabel(family: AssemblyPartFamily): string {
    return projectPackageForFamily(family).label;
  }

  setDragonSpecies(species: PartsLabDragonSpecies): void {
    this.dragonSpecies.set(species);
    this.selectedId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { species, part: null, family: 'dragon' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setInspectorTab(tab: PartInspectorTab): void {
    this.inspectorTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectAnatomyLayer(layer: AnatomyLayerView): void {
    this.selectedAnatomyLayerId.set(layer.id);
  }

  selectCustomPiece(piece: DragonCustomPartPiece): void {
    this.selectedCustomPieceId.set(piece.id);
    this.reapplyCurrentFocus();
  }

  addCustomPiece(shape: DragonCustomPieceShape): void {
    const recipe = this.customRecipe();
    if (!this.customBuilderAvailable() || recipe.pieces.length >= 32) return;
    const id = nextCustomPieceId(recipe);
    const jaw = this.profileId() === 'dragon-upper-jaw' || this.profileId() === 'dragon-lower-jaw';
    const piece: DragonCustomPartPiece = {
      id,
      label: `${CUSTOM_PIECE_SHAPES.find(option => option.id === shape)?.label ?? 'Piece'} ${recipe.pieces.length + 1}`,
      kind: 'primitive',
      shape,
      material: shape === 'cone' ? (jaw ? 'tooth' : 'horn') : 'skin',
      offset: jaw ? { x: 0.1, y: -0.18, z: 0.25 } : { x: 0, y: 0.32, z: 0.3 },
      rotationDegrees: shape === 'cone' ? { x: 0, y: 0, z: jaw ? 180 : 0 } : { x: 0, y: 0, z: 0 },
      scale: shape === 'cone' ? { x: 0.08, y: 0.28, z: 0.08 } : { x: 0.2, y: 0.2, z: 0.2 },
      mirrored: true,
      visible: true,
    };
    this.selectedCustomPieceId.set(id);
    this.writeCustomRecipe({ version: 2, pieces: [...recipe.pieces, piece] });
  }

  async importCustomAsset(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.customBuilderAvailable() || this.customRecipe().pieces.length >= 32) {
      this.assetImportError.set('This recipe already contains the maximum of 32 pieces.');
      return;
    }
    this.assetImporting.set(true);
    this.assetImportError.set(null);
    try {
      const asset = await this.importedAssets.importFile(file);
      const recipe = this.customRecipe();
      const id = nextCustomPieceId(recipe);
      const jaw = this.profileId() === 'dragon-upper-jaw' || this.profileId() === 'dragon-lower-jaw';
      const piece: DragonCustomPartPiece = {
        id,
        label: asset.label,
        kind: 'asset',
        assetId: asset.id,
        sourceFileName: asset.fileName,
        material: 'original',
        offset: jaw ? { x: 0.05, y: -0.12, z: 0 } : { x: 0, y: 0.2, z: 0 },
        rotationDegrees: { x: 0, y: 0, z: 0 },
        scale: { x: 0.45, y: 0.45, z: 0.45 },
        mirrored: false,
        visible: true,
      };
      this.lastImportedAsset.set(asset);
      this.selectedCustomPieceId.set(id);
      this.writeCustomRecipe({ version: 2, pieces: [...recipe.pieces, piece] });
    } catch (error) {
      this.assetImportError.set(error instanceof Error ? error.message : 'The GLB could not be imported.');
    } finally {
      this.assetImporting.set(false);
    }
  }

  async connectSharedLibrary(): Promise<void> {
    await this.runSharedWork(async () => {
      const user = await this.sharedPartService.signIn();
      this.sharedUser.set(user);
      if (!this.sharedName().trim()) this.sharedName.set(`${this.selected()?.label ?? 'Part'} custom`);
      await this.refreshSharedParts();
      const selected = this.selectedSharedPart();
      if (selected) await this.selectSharedPart(selected);
      this.sharedMessage.set(`Connected as ${user.displayName}.`);
    });
  }

  async disconnectSharedLibrary(): Promise<void> {
    await this.runSharedWork(async () => {
      await this.sharedPartService.signOut();
      this.sharedUser.set(null);
      this.sharedParts.set([]);
      this.selectedSharedPartId.set(null);
      this.sharedRevisions.set([]);
      this.loadedSharedRevisionId.set(null);
      this.sharedMessage.set('Disconnected from the shared library. Local editing is unchanged.');
    });
  }

  async reloadSharedLibrary(): Promise<void> {
    await this.runSharedWork(async () => {
      await this.refreshSharedParts();
      const selected = this.selectedSharedPart();
      if (selected) await this.selectSharedPart(selected);
      this.sharedMessage.set('Shared parts refreshed.');
    });
  }

  async selectSharedPart(part: SharedDragonPart): Promise<void> {
    this.selectedSharedPartId.set(part.id);
    this.sharedName.set(part.name);
    this.sharedDescription.set(part.description);
    this.sharedTags.set(part.tags.join(', '));
    this.sharedEditorUids.set(part.editorUids.join('\n'));
    this.sharedViewerUids.set(part.viewerUids.join('\n'));
    this.loadedSharedRevisionId.set(null);
    this.sharedError.set(null);
    const loadRevisions = async (): Promise<void> => {
      const access = this.sharedUser() ? sharedPartAccess(part, this.sharedUser()!.uid) : null;
      this.sharedRevisions.set(
        access === 'published' || !part.currentRevisionId
          ? []
          : await this.sharedPartService.listRevisions(part.id),
      );
    };
    if (this.sharedBusy()) {
      try {
        await loadRevisions();
      } catch (error) {
        this.sharedError.set(sharedErrorMessage(error));
      }
    } else {
      await this.runSharedWork(loadRevisions, false);
    }
  }

  async createSharedPart(): Promise<void> {
    const snapshot = this.currentSharedSnapshot();
    if (!snapshot) return;
    await this.runSharedWork(async () => {
      const created = await this.sharedPartService.createPart({
        name: this.sharedName(),
        description: this.sharedDescription(),
        tags: splitValues(this.sharedTags()),
        snapshot,
        changeNote: this.sharedChangeNote(),
      }, this.importedAssets);
      await this.refreshSharedParts(created.id);
      await this.selectSharedPart(this.sharedParts().find(part => part.id === created.id) ?? created);
      this.loadedSharedRevisionId.set(created.currentRevisionId);
      this.sharedChangeNote.set('');
      this.sharedMessage.set(`Created ${created.name} with revision ${created.revisionNumber}.`);
    });
  }

  async saveSharedRevision(): Promise<void> {
    const part = this.selectedSharedPart();
    const snapshot = this.currentSharedSnapshot();
    if (!part || !snapshot) return;
    if (snapshot.sourceDefinitionId !== part.sourceDefinitionId) {
      this.sharedError.set(`Open ${part.sourceDefinitionId} before saving a revision to this shared part.`);
      return;
    }
    await this.runSharedWork(async () => {
      const updated = await this.sharedPartService.saveRevision(
        part.id,
        part.currentRevisionId,
        snapshot,
        this.sharedChangeNote(),
        this.importedAssets,
      );
      await this.refreshSharedParts(updated.id);
      const refreshed = this.sharedParts().find(candidate => candidate.id === updated.id) ?? updated;
      await this.selectSharedPart(refreshed);
      this.loadedSharedRevisionId.set(updated.currentRevisionId);
      this.sharedChangeNote.set('');
      this.sharedMessage.set(`Saved revision ${updated.revisionNumber}. Published revisions remain unchanged.`);
    });
  }

  async saveSharedMetadata(): Promise<void> {
    const part = this.selectedSharedPart();
    if (!part) return;
    await this.runSharedWork(async () => {
      const updated = await this.sharedPartService.updateMetadata(part.id, {
        name: this.sharedName(),
        description: this.sharedDescription(),
        tags: splitValues(this.sharedTags()),
      });
      await this.refreshSharedParts(updated.id);
      this.sharedMessage.set('Part information saved.');
    });
  }

  async saveSharedAccess(): Promise<void> {
    const part = this.selectedSharedPart();
    if (!part) return;
    await this.runSharedWork(async () => {
      const updated = await this.sharedPartService.updateAccess(
        part.id,
        splitValues(this.sharedEditorUids()),
        splitValues(this.sharedViewerUids()),
      );
      await this.refreshSharedParts(updated.id);
      await this.selectSharedPart(this.sharedParts().find(candidate => candidate.id === updated.id) ?? updated);
      this.sharedMessage.set('Editor and viewer access saved.');
    });
  }

  async changeSharedStatus(event: Event): Promise<void> {
    const part = this.selectedSharedPart();
    const status = (event.target as HTMLSelectElement).value as SharedDragonPartStatus;
    if (!part || !['draft', 'review', 'published', 'archived'].includes(status)) return;
    await this.runSharedWork(async () => {
      const updated = await this.sharedPartService.setStatus(part.id, status);
      await this.refreshSharedParts(updated.id);
      this.sharedMessage.set(status === 'published'
        ? `Published revision ${updated.revisionNumber}.`
        : `Part moved to ${status}.`);
    });
  }

  async loadSelectedSharedPart(): Promise<void> {
    const part = this.selectedSharedPart();
    if (!part) return;
    const revisionId = this.selectedSharedAccess() === 'published'
      ? part.publishedRevisionId
      : part.currentRevisionId;
    if (!revisionId) {
      this.sharedError.set('This shared part does not have a loadable revision.');
      return;
    }
    await this.loadSharedRevision(part, revisionId);
  }

  async loadSharedHistoryRevision(revision: SharedDragonPartRevision): Promise<void> {
    const part = this.selectedSharedPart();
    if (part) await this.loadSharedRevision(part, revision.id);
  }

  async restoreSharedRevision(revision: SharedDragonPartRevision): Promise<void> {
    const part = this.selectedSharedPart();
    if (!part) return;
    await this.runSharedWork(async () => {
      const updated = await this.sharedPartService.restoreRevision(part, revision.id, this.importedAssets);
      await this.refreshSharedParts(updated.id);
      const refreshed = this.sharedParts().find(candidate => candidate.id === updated.id) ?? updated;
      await this.selectSharedPart(refreshed);
      await this.loadSharedRevision(refreshed, updated.currentRevisionId, false);
      this.sharedMessage.set(`Restored revision ${revision.revisionNumber} as new revision ${updated.revisionNumber}.`);
    });
  }

  async copySelectedSharedPart(): Promise<void> {
    const part = this.selectedSharedPart();
    if (!part) return;
    const revisionId = this.selectedSharedAccess() === 'published'
      ? part.publishedRevisionId
      : part.currentRevisionId;
    if (!revisionId) return;
    await this.runSharedWork(async () => {
      const revision = await this.sharedPartService.loadRevision(part.id, revisionId, this.importedAssets);
      const copy = await this.sharedPartService.createPart({
        name: `${part.name} copy`.slice(0, 80),
        description: part.description,
        tags: part.tags,
        snapshot: revision,
        changeNote: `Copied from ${part.name}`,
      }, this.importedAssets);
      await this.refreshSharedParts(copy.id);
      const refreshed = this.sharedParts().find(candidate => candidate.id === copy.id) ?? copy;
      await this.selectSharedPart(refreshed);
      this.applySharedRevision(revision);
      this.loadedSharedRevisionId.set(copy.currentRevisionId);
      this.sharedMessage.set(`Created editable copy ${copy.name}.`);
    });
  }

  updateSharedField(field: 'name' | 'description' | 'tags' | 'note' | 'editors' | 'viewers', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'name') this.sharedName.set(value.slice(0, 80));
    else if (field === 'description') this.sharedDescription.set(value.slice(0, 500));
    else if (field === 'tags') this.sharedTags.set(value.slice(0, 400));
    else if (field === 'note') this.sharedChangeNote.set(value.slice(0, 300));
    else if (field === 'editors') this.sharedEditorUids.set(value.slice(0, 3_200));
    else this.sharedViewerUids.set(value.slice(0, 6_200));
  }

  async copySharedUserId(): Promise<void> {
    const uid = this.sharedUser()?.uid;
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      this.sharedMessage.set('Your collaborator UID was copied.');
    } catch {
      this.sharedMessage.set(`Your collaborator UID is ${uid}`);
    }
  }

  updateCustomPieceLabel(event: Event): void {
    const label = (event.target as HTMLInputElement).value.slice(0, 48);
    this.updateCustomPiece(piece => ({ ...piece, label }));
  }

  updateCustomPieceShape(event: Event): void {
    const shape = (event.target as HTMLSelectElement).value as DragonCustomPieceShape;
    if (!CUSTOM_PIECE_SHAPES.some(option => option.id === shape)) return;
    this.updateCustomPiece(piece => piece.kind === 'primitive' ? { ...piece, shape } : piece);
  }

  updateCustomPieceMaterial(event: Event): void {
    const material = (event.target as HTMLSelectElement).value as DragonCustomPieceMaterial;
    if (!CUSTOM_ASSET_MATERIAL_SLOTS.some(option => option.id === material)) return;
    this.updateCustomPiece(piece => {
      if (piece.kind === 'primitive') {
        return material === 'original' ? piece : { ...piece, material };
      }
      return { ...piece, material };
    });
  }

  updateCustomPieceVector(
    group: 'offset' | 'rotationDegrees' | 'scale',
    axis: keyof Vector3Data,
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.updateCustomPiece(piece => ({
      ...piece,
      [group]: { ...piece[group], [axis]: value },
    }));
  }

  toggleCustomPieceMirror(): void {
    this.updateCustomPiece(piece => ({ ...piece, mirrored: !piece.mirrored }));
  }

  toggleCustomPieceVisibility(): void {
    this.updateCustomPiece(piece => ({ ...piece, visible: !piece.visible }));
  }

  duplicateCustomPiece(): void {
    const selected = this.selectedCustomPiece();
    const recipe = this.customRecipe();
    if (!selected || recipe.pieces.length >= 32) return;
    const id = nextCustomPieceId(recipe);
    const duplicate: DragonCustomPartPiece = {
      ...selected,
      id,
      label: `${selected.label} copy`.slice(0, 48),
      offset: { ...selected.offset, x: round(selected.offset.x - 0.08) },
      rotationDegrees: { ...selected.rotationDegrees },
      scale: { ...selected.scale },
    };
    this.selectedCustomPieceId.set(id);
    this.writeCustomRecipe({ version: 2, pieces: [...recipe.pieces, duplicate] });
  }

  removeCustomPiece(): void {
    const selected = this.selectedCustomPiece();
    if (!selected) return;
    const pieces = this.customRecipe().pieces.filter(piece => piece.id !== selected.id);
    this.selectedCustomPieceId.set(pieces[0]?.id ?? null);
    this.writeCustomRecipe({ version: 2, pieces });
  }

  clearCustomPieces(): void {
    this.selectedCustomPieceId.set(null);
    this.writeCustomRecipe({ version: 2, pieces: [] });
  }

  setPreviewMode(mode: WorkshopPreviewMode): void {
    this.previewMode.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setGenePreviewMode(mode: WorkshopGenePreviewMode): void {
    this.genePreviewMode.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { gene: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setHeadSexPreview(mode: WorkshopHeadSexPreview): void {
    this.headSexPreview.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sex: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectAssemblyContext(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (this.dragonSpecies() === 'mini') {
      const option = this.miniBreedOptions.find(candidate => candidate.presetId === id);
      if (!option) return;
      this.miniBreedId.set(option.id);
    } else {
      const option = this.arenaBodyTypes.find(candidate => candidate.id === id);
      if (!option) return;
      this.arenaAssemblyId.set(option.id);
    }
    this.selectedAssemblyPartId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { assembly: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectAssemblyPart(event: Event): void {
    this.selectedAssemblyPartId.set((event.target as HTMLSelectElement).value);
  }

  selectArenaBody(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const option = this.arenaBodyTypes.find(candidate => candidate.id === id);
    if (!option) return;
    this.arenaAssemblyId.set(option.id);
    const definition = this.definitions().find(candidate => candidate.id === option.bodyDefinitionId);
    if (definition) this.select(definition);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setGroup(event: Event): void {
    this.group.set((event.target as HTMLSelectElement).value);
  }

  compare(definition: AssemblyPartDefinition, event: Event): void {
    event.stopPropagation();
    this.compareId.set(this.compareId() === definition.id ? null : definition.id);
  }

  resetScale(): void {
    this.scaleX.set(1);
    this.scaleY.set(1);
    this.scaleZ.set(1);
    this.scheduleCommit();
  }

  onScale(axis: 'x' | 'y' | 'z', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    if (axis === 'x') this.scaleX.set(value);
    else if (axis === 'y') this.scaleY.set(value);
    else this.scaleZ.set(value);
    this.scheduleCommit();
  }

  onColor(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value);
  }

  toggleDefinitionColor(): void {
    this.useDefinitionColor.update(value => !value);
  }

  // -------------------------------------------------------------------------
  // Feature proportions
  // -------------------------------------------------------------------------

  onStyle(control: StyleControl, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.setStyleControl(control, value);
  }

  onPartParameter(control: PartParameterControl, event: Event): void {
    const definition = this.selected();
    const value = Number((event.target as HTMLInputElement).value);
    if (!definition || !Number.isFinite(value)) return;
    this.setPartParameter(control, value);
  }

  onOptionControl(control: PartOptionControl, event: Event): void {
    const definition = this.selected();
    if (!definition) return;
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value: string | boolean = control.type === 'boolean'
      ? (target as HTMLInputElement).checked
      : target.value;
    this.designerDraft.setParameter(definition.id, control.key, value);
    this.scheduleCommit();
  }

  setStyleControl(control: StyleControl, value: number): void {
    this.style.update(current => writeStyleValue(current, control.section, control.key, value));
    this.scheduleCommit();
  }

  setPartParameter(control: PartParameterControl, value: number): void {
    const definition = this.selected();
    if (!definition) return;
    this.designerDraft.setParameter(definition.id, control.key, value);
    this.scheduleCommit();
  }

  toggleAnatomyLayer(layer: AnatomyLayerView): void {
    if (!layer.canToggle || !layer.visibilityKey) return;
    const styleControl = layer.styleControls.find(control => control.key === layer.visibilityKey);
    if (styleControl) {
      if (layer.visible) {
        this.setStyleControl(styleControl, 0);
        return;
      }
      const restored = readStyleValue(
        DEFAULT_DRAGON_STYLE,
        styleControl.section,
        styleControl.key,
      );
      this.setStyleControl(
        styleControl,
        restored > 0 ? restored : visibleFallback(styleControl),
      );
      return;
    }

    const parameterControl = layer.parameterControls.find(control => control.key === layer.visibilityKey);
    if (!parameterControl) return;
    this.setPartParameter(
      parameterControl,
      layer.visible ? 0 : this.visiblePartParameterValue(parameterControl),
    );
  }

  resetAnatomyLayer(layer: AnatomyLayerView): void {
    const definition = this.selected();
    if (!definition) return;

    if (layer.styleControls.length) {
      this.style.update(current => {
        let next = current;
        for (const control of layer.styleControls) {
          next = writeStyleValue(
            next,
            control.section,
            control.key,
            readStyleValue(DEFAULT_DRAGON_STYLE, control.section, control.key),
          );
        }
        return next;
      });
    }
    for (const control of layer.parameterControls) {
      this.designerDraft.clearParameter(definition.id, control.key);
    }
    for (const control of layer.optionControls) {
      this.designerDraft.clearParameter(definition.id, control.key);
    }
    this.scheduleCommit();
  }

  resetSurface(): void {
    const definition = this.selected();
    if (!definition) return;
    for (const control of this.surfaceControls()) {
      this.designerDraft.clearParameter(definition.id, control.key);
    }
    for (const control of this.surfaceOptionControls()) {
      this.designerDraft.clearParameter(definition.id, control.key);
    }
    this.scheduleCommit();
  }

  private visiblePartParameterValue(control: PartParameterControl): number {
    const authored = this.selected()?.visualProfile?.parameters?.[control.key];
    if (typeof authored === 'number' && authored > 0) return authored;
    if (typeof control.defaultValue === 'number' && control.defaultValue > 0) {
      return control.defaultValue;
    }
    return visibleFallback(control);
  }

  startBodyHandleDrag(handle: BodyHandleControl, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.activeBodyHandle = {
      id: handle.key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startValue: handle.control.value,
    };
    this.activeBodyHandleId.set(handle.key);
  }

  moveBodyHandle(handle: BodyHandleControl, event: PointerEvent): void {
    const active = this.activeBodyHandle;
    if (!active || active.id !== handle.key || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const rawPixels = handle.axis === 'horizontal'
      ? event.clientX - active.startX
      : active.startY - event.clientY;
    const pixels = handle.invert ? -rawPixels : rawPixels;
    const min = handle.control.min ?? 0;
    const max = handle.control.max ?? 2;
    const next = active.startValue + (pixels / 180) * (max - min);
    this.setPartParameter(
      handle.control,
      roundToStep(Math.max(min, Math.min(max, next)), min, handle.control.step ?? 0.01),
    );
  }

  endBodyHandleDrag(handle: BodyHandleControl, event: PointerEvent): void {
    const active = this.activeBodyHandle;
    if (!active || active.id !== handle.key || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.activeBodyHandle = null;
    this.activeBodyHandleId.set(null);
  }

  nudgeBodyHandle(handle: BodyHandleControl, event: KeyboardEvent): void {
    const increase = handle.axis === 'horizontal'
      ? event.key === 'ArrowRight'
      : event.key === 'ArrowUp';
    const decrease = handle.axis === 'horizontal'
      ? event.key === 'ArrowLeft'
      : event.key === 'ArrowDown';
    if (!increase && !decrease) return;
    event.preventDefault();
    const min = handle.control.min ?? 0;
    const max = handle.control.max ?? 2;
    const step = handle.control.step ?? 0.01;
    const next = handle.control.value + (increase ? step : -step);
    this.setPartParameter(
      handle.control,
      roundToStep(Math.max(min, Math.min(max, next)), min, step),
    );
  }

  startProceduralHandle(handle: ProceduralHandleControl, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.proceduralHandleDrag = {
      id: handle.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startValue: handle.control.value,
    };
    this.activeProceduralHandleId.set(handle.id);
  }

  moveProceduralHandle(handle: ProceduralHandleControl, event: PointerEvent): void {
    const active = this.proceduralHandleDrag;
    if (!active || active.id !== handle.id || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - active.startX;
    const dy = active.startY - event.clientY;
    const pixels = handle.axis === 'horizontal' ? dx : handle.axis === 'vertical' ? dy : (dx + dy) / 2;
    const min = handle.control.min ?? 0;
    const max = handle.control.max ?? 1;
    const step = handle.control.step ?? 0.01;
    const next = active.startValue + (pixels / 180) * (max - min);
    this.writeProceduralHandle(
      handle,
      roundToStep(Math.max(min, Math.min(max, next)), min, step),
    );
  }

  endProceduralHandle(handle: ProceduralHandleControl, event: PointerEvent): void {
    const active = this.proceduralHandleDrag;
    if (!active || active.id !== handle.id || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.proceduralHandleDrag = null;
    this.activeProceduralHandleId.set(null);
  }

  nudgeProceduralHandle(handle: ProceduralHandleControl, event: KeyboardEvent): void {
    const increase = event.key === 'ArrowRight' || event.key === 'ArrowUp';
    const decrease = event.key === 'ArrowLeft' || event.key === 'ArrowDown';
    if (!increase && !decrease) return;
    event.preventDefault();
    const min = handle.control.min ?? 0;
    const max = handle.control.max ?? 1;
    const step = handle.control.step ?? 0.01;
    const next = handle.control.value + (increase ? step : -step);
    this.writeProceduralHandle(
      handle,
      roundToStep(Math.max(min, Math.min(max, next)), min, step),
    );
  }

  private writeProceduralHandle(handle: ProceduralHandleControl, value: number): void {
    if (handle.source === 'style') {
      this.setStyleControl(handle.control as StyleControl, value);
    } else {
      this.setPartParameter(handle.control as PartParameterControl, value);
    }
  }

  startPlacementHandle(kind: PlacementHandleKind, event: PointerEvent): void {
    const placement = this.selectedPlacement();
    if (!placement) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.placementHandleDrag = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      placement,
    };
    this.activePlacementHandle.set(kind);
  }

  movePlacementHandle(kind: PlacementHandleKind, event: PointerEvent): void {
    const active = this.placementHandleDrag;
    if (!active || active.kind !== kind || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    const next = clonePlacement(active.placement);
    if (kind === 'move') {
      next.offset.x = round(active.placement.offset.x + dx * 0.012);
      next.offset.y = round(active.placement.offset.y - dy * 0.012);
    } else if (kind === 'rotate') {
      next.rotationDegrees.y = round(active.placement.rotationDegrees.y + dx * 0.6);
      next.rotationDegrees.x = round(active.placement.rotationDegrees.x - dy * 0.6);
    } else {
      next.scale = round(Math.max(0.1, Math.min(3, active.placement.scale + (dx - dy) * 0.006)));
    }
    this.writePlacement(next);
  }

  endPlacementHandle(kind: PlacementHandleKind, event: PointerEvent): void {
    const active = this.placementHandleDrag;
    if (!active || active.kind !== kind || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.placementHandleDrag = null;
    this.activePlacementHandle.set(null);
    this.schedulePlacementAnchorRefresh();
  }

  nudgePlacementHandle(kind: PlacementHandleKind, event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const placement = this.selectedPlacement();
    if (!placement) return;
    event.preventDefault();
    const next = clonePlacement(placement);
    const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const vertical = event.key === 'ArrowDown' ? -1 : event.key === 'ArrowUp' ? 1 : 0;
    if (kind === 'move') {
      next.offset.x = round(next.offset.x + horizontal * 0.05);
      next.offset.y = round(next.offset.y + vertical * 0.05);
    } else if (kind === 'rotate') {
      next.rotationDegrees.y = round(next.rotationDegrees.y + horizontal * 2);
      next.rotationDegrees.x = round(next.rotationDegrees.x + vertical * 2);
    } else {
      next.scale = round(Math.max(0.1, Math.min(3, next.scale + (horizontal + vertical) * 0.05)));
    }
    this.writePlacement(next);
  }

  onPlacementVector(
    group: 'offset' | 'rotationDegrees',
    axis: keyof Vector3Data,
    event: Event,
  ): void {
    const placement = this.selectedPlacement();
    const value = Number((event.target as HTMLInputElement).value);
    if (!placement || !Number.isFinite(value)) return;
    const next = clonePlacement(placement);
    next[group][axis] = value;
    this.writePlacement(next);
  }

  onPlacementScale(event: Event): void {
    const placement = this.selectedPlacement();
    const value = Number((event.target as HTMLInputElement).value);
    if (!placement || !Number.isFinite(value)) return;
    this.writePlacement({ ...clonePlacement(placement), scale: value });
  }

  resetPlacement(): void {
    const targetId = this.placementTargetId();
    if (!targetId) return;
    this.designerDraft.clearPlacement(this.assemblyContextId(), targetId);
  }

  onCanvasViewChanged(): void {
    this.schedulePlacementAnchorRefresh();
  }

  private writePlacement(placement: DesignerPartPlacement): void {
    const targetId = this.placementTargetId();
    if (!targetId) return;
    this.designerDraft.setPlacement(this.assemblyContextId(), targetId, placement);
  }

  private schedulePlacementAnchorRefresh(): void {
    if (this.anchorFrameId !== null) cancelAnimationFrame(this.anchorFrameId);
    this.anchorFrameId = requestAnimationFrame(() => {
      this.anchorFrameId = null;
      const partId = this.activeAssemblyPartId();
      if (!partId || this.previewMode() !== 'assembly') {
        this.placementAnchor.set(null);
        return;
      }
      this.placementAnchor.set(this.renderer.projectPartToViewport(
        partId,
        this.selectedAnatomyLayer()?.meshNamePrefixes ?? [],
      ));
    });
  }

  resetPartParameters(): void {
    const definition = this.selected();
    if (!definition) return;
    this.designerDraft.resetParameters(definition.id);
    this.scheduleCommit();
  }

  applyWingPreset(id: keyof typeof WING_SHAPES): void {
    this.style.update(current => ({ ...current, wing: { ...WING_SHAPES[id] } }));
    this.scheduleCommit();
  }

  resetStyle(): void {
    this.style.set(cloneStyle(DEFAULT_DRAGON_STYLE));
    this.designerDraft.resetStyle();
    this.scheduleCommit();
  }

  retryPreview(): void {
    this.renderer.recover();
    this.reapplyAssemblyFocus();
  }

  private reapplyAssemblyFocus(): void {
    if (this.previewMode() !== 'assembly') return;
    const preview = this.assemblyPreview();
    if (!preview) return;
    this.renderer.setPartFocus(
      preview.matchingPartIds,
      this.focusedMeshPrefixes(),
    );
    this.schedulePlacementAnchorRefresh();
  }

  private reapplyCurrentFocus(): void {
    if (this.previewMode() === 'assembly') {
      this.reapplyAssemblyFocus();
      return;
    }
    const definition = this.selected();
    const prefixes = this.focusedMeshPrefixes();
    this.renderer.setPartFocus(definition && prefixes.length ? [definition.id] : null, prefixes);
  }

  private focusedMeshPrefixes(): readonly string[] {
    if (this.inspectorTab() === 'builder') {
      const piece = this.selectedCustomPiece();
      return piece ? [`dragon-custom-piece-${piece.id}-`] : [];
    }
    return this.selectedAnatomyLayer()?.meshNamePrefixes ?? [];
  }

  private updateCustomPiece(update: (piece: DragonCustomPartPiece) => DragonCustomPartPiece): void {
    const selected = this.selectedCustomPiece();
    if (!selected) return;
    this.writeCustomRecipe({
      version: 2,
      pieces: this.customRecipe().pieces.map(piece => piece.id === selected.id ? update(piece) : piece),
    });
  }

  private writeCustomRecipe(recipe: DragonCustomPartRecipe): void {
    const definition = this.selected();
    if (!definition || !this.customBuilderAvailable()) return;
    const serialized = serializeDragonCustomPartRecipe(recipe);
    if (serialized) this.designerDraft.setParameter(definition.id, 'customPartRecipe', serialized);
    else this.designerDraft.clearParameter(definition.id, 'customPartRecipe');
    this.scheduleCommit();
  }

  /**
   * Collapses a drag into one rebuild. The override is applied here rather than
   * in an effect so the thumbnail computeds see it the moment the version bumps
   * — effect ordering against template evaluation is not guaranteed.
   */
  private scheduleCommit(): void {
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      this.commitDraft();
    }, COMMIT_DELAY_MS);
  }

  private commitDraft(): void {
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = null;
    setDragonStyleOverride(this.style());
    this.designerDraft.setStyle(this.style());
    const definition = this.selected();
    const dimensions = this.scaledDimensions();
    if (definition && dimensions) this.designerDraft.setDimensions(definition.id, dimensions);
    this.committedScale.set(this.scaleVector());
    this.commitVersion.update(version => version + 1);
  }

  private currentSharedSnapshot(): SharedDragonPartSnapshot | null {
    if (!this.sharedUser()) {
      this.sharedError.set('Connect to the shared library first.');
      return null;
    }
    const definition = this.selected();
    if (!definition) {
      this.sharedError.set('Select a part to share it.');
      return null;
    }
    this.commitDraft();
    const resolved = applyDesignerDraft(definition, this.designerDraft);
    return {
      sourceDefinitionId: definition.id,
      profileId: definition.visualProfile?.profileId ?? '',
      dimensions: { ...resolved.dimensions },
      snapPoints: Object.fromEntries(resolved.snapPoints.map(point => [
        point.id,
        { ...point.localPosition },
      ])),
      parameters: this.designerDraft.parametersFor(
        definition.id,
        definition.visualProfile?.parameters,
      ),
    };
  }

  private async loadSharedRevision(
    part: SharedDragonPart,
    revisionId: string,
    manageBusy = true,
  ): Promise<void> {
    const work = async (): Promise<void> => {
      const revision = await this.sharedPartService.loadRevision(part.id, revisionId, this.importedAssets);
      this.applySharedRevision(revision);
      this.loadedSharedRevisionId.set(revision.id);
      this.sharedMessage.set(`Loaded revision ${revision.revisionNumber} into the local Designer draft.`);
    };
    if (manageBusy) await this.runSharedWork(work);
    else await work();
  }

  private applySharedRevision(revision: SharedDragonPartRevision): void {
    const definition = [...ASSEMBLY_PART_DEFINITIONS, ...MINI_DRAGON_PART_DEFINITIONS]
      .find(candidate => candidate.id === revision.sourceDefinitionId);
    if (!definition) throw new Error(`This Designer does not contain ${revision.sourceDefinitionId}.`);
    this.family.set(definition.family);
    this.dragonSpecies.set(MINI_DRAGON_PART_DEFINITIONS.some(candidate => candidate.id === definition.id)
      ? 'mini'
      : 'lab');
    this.selectedId.set(definition.id);
    this.designerDraft.replacePartDraft(definition.id, {
      dimensions: revision.dimensions,
      snapPoints: { ...revision.snapPoints },
      parameters: { ...revision.parameters },
    });
    const scale = {
      x: revision.dimensions.x / definition.dimensions.x,
      y: revision.dimensions.y / definition.dimensions.y,
      z: revision.dimensions.z / definition.dimensions.z,
    };
    this.scaleX.set(scale.x);
    this.scaleY.set(scale.y);
    this.scaleZ.set(scale.z);
    this.committedScale.set(scale);
    this.selectedCustomPieceId.set(null);
    this.commitVersion.update(version => version + 1);
    this.select(definition);
  }

  private async refreshSharedParts(preferredPartId = this.selectedSharedPartId()): Promise<void> {
    const parts = await this.sharedPartService.listAccessibleParts();
    this.sharedParts.set(parts);
    const selected = parts.find(part => part.id === preferredPartId) ?? parts[0] ?? null;
    this.selectedSharedPartId.set(selected?.id ?? null);
    if (selected) {
      this.sharedName.set(selected.name);
      this.sharedDescription.set(selected.description);
      this.sharedTags.set(selected.tags.join(', '));
      this.sharedEditorUids.set(selected.editorUids.join('\n'));
      this.sharedViewerUids.set(selected.viewerUids.join('\n'));
    } else {
      this.sharedRevisions.set([]);
    }
  }

  private async runSharedWork(work: () => Promise<void>, clearMessage = true): Promise<void> {
    if (this.sharedBusy()) return;
    this.sharedBusy.set(true);
    this.sharedError.set(null);
    if (clearMessage) this.sharedMessage.set(null);
    try {
      await work();
    } catch (error) {
      if (error instanceof SharedDragonPartConflictError) {
        this.sharedError.set(error.message);
        await this.refreshSharedParts();
      } else {
        this.sharedError.set(sharedErrorMessage(error));
      }
    } finally {
      this.sharedBusy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Recording values for hardcoding
  // -------------------------------------------------------------------------

  record(): void {
    const definition = this.selected();
    const dimensions = this.scaledDimensions();
    if (!definition || !dimensions) return;

    const controls = this.styleControls();
    const parameters = this.parameterControls();
    this.tuning.add({
      partId: definition.id,
      label: definition.label,
      dimensions,
      scale: this.scaleVector(),
      styleSection: controls.length ? controls[0].section : undefined,
      styleValues: controls.length
        ? Object.fromEntries(controls.map(control => [control.key, control.value]))
        : undefined,
      parameterValues: parameters.length
        ? Object.fromEntries(parameters.map(control => [control.key, control.value]))
        : undefined,
    });
  }

  async copySnippet(): Promise<void> {
    const snippet = this.tuning.snippet();
    if (!snippet) return;

    try {
      await navigator.clipboard.writeText(snippet);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard is blocked outside a secure context; the snippet stays on
      // screen to select by hand.
      this.copied.set(false);
    }
  }

  private scaleVector(): Vector3Data {
    return { x: this.scaleX(), y: this.scaleY(), z: this.scaleZ() };
  }

  /**
   * Thumbnail cache key. The commit version is folded in only for parts the
   * style actually reaches, so the rest of the sheet stays cached while a
   * slider is dragged.
   */
  private cacheKeyFor(definition: AssemblyPartDefinition, colorKey: string): string {
    const styled = partProfileSchema(definition).controls.length > 0;
    return `${definition.id}:${colorKey}${styled ? `:s${this.commitVersion()}` : ''}`;
  }

  /** A single part, centred at the origin, as a one-part blueprint. */
  private blueprintFor(
    definition: AssemblyPartDefinition,
    scale: Vector3Data,
    color: string | null,
  ): AssemblyBlueprint {
    const authored = applyDesignerDraft(definition, this.designerDraft);
    const part = createPartFromDefinition(authored, { x: 0, y: 0, z: 0 }, definition.id);
    part.dimensions = {
      x: definition.dimensions.x * scale.x,
      y: definition.dimensions.y * scale.y,
      z: definition.dimensions.z * scale.z,
    };
    if (color) part.color = color;
    const blueprint: AssemblyBlueprint = { parts: [part], joints: [] };
    return definition.visualProfile?.profileId === 'dragon-head-horned'
      ? applyHeadSexPreview(blueprint, [part.id], this.headSexPreview())
      : blueprint;
  }
}

function readStyleValue(style: DragonStyle, section: keyof DragonStyle, key: string): number {
  const values = style[section] as unknown as Record<string, number>;
  return values[key] ?? 0;
}

function writeStyleValue(
  style: DragonStyle,
  section: keyof DragonStyle,
  key: string,
  value: number,
): DragonStyle {
  return { ...style, [section]: { ...style[section], [key]: value } };
}

function cloneStyle(style: DragonStyle): DragonStyle {
  return {
    wing: { ...style.wing },
    body: { ...style.body },
    jaw: { ...style.jaw },
    head: { ...style.head },
    foot: { ...style.foot },
    grasp: { ...style.grasp },
    tailClub: { ...style.tailClub },
    joint: { ...style.joint },
  };
}

function clonePlacement(placement: DesignerPartPlacement): DesignerPartPlacement {
  return {
    offset: { ...placement.offset },
    rotationDegrees: { ...placement.rotationDegrees },
    scale: placement.scale,
  };
}

function nextCustomPieceId(recipe: DragonCustomPartRecipe): string {
  const existing = new Set(recipe.pieces.map(piece => piece.id));
  let index = 1;
  while (existing.has(`piece-${index}`)) index += 1;
  return `piece-${index}`;
}

function splitValues(value: string): string[] {
  return value.split(/[\n,]+/).map(entry => entry.trim()).filter(Boolean);
}

function sharedErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return 'This account does not have permission for that shared-part action.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The shared-part action could not be completed.';
}

function resolvedSchemaControl(
  control: AssemblyInspectorControlDefinition,
  values: Readonly<Record<string, string | number | boolean>>,
): (PartParameterControl | PartOptionControl)[] {
  const authored = values[control.key];
  if (control.type === 'number') {
    const fallback = typeof control.defaultValue === 'number' ? control.defaultValue : 0;
    const value = typeof authored === 'number' && Number.isFinite(authored) ? authored : fallback;
    return [{ ...control, type: 'number', defaultValue: fallback, value }];
  }
  if (control.type === 'boolean') {
    const fallback = typeof control.defaultValue === 'boolean' ? control.defaultValue : false;
    return [{ ...control, type: 'boolean', defaultValue: fallback, value: typeof authored === 'boolean' ? authored : fallback }];
  }
  const fallback = typeof control.defaultValue === 'string' ? control.defaultValue : String(control.defaultValue);
  const value = typeof authored === 'string' ? authored : fallback;
  return [{ ...control, type: control.type, defaultValue: fallback, value }];
}

/** Maps canonical procedural parameter names to a predictable drag gesture. */
function proceduralHandle(
  control: PartParameterControl | StyleControl,
  source: 'parameter' | 'style',
): ProceduralHandleControl | null {
  const key = control.key;
  const explicit = control.handle;
  const move = explicit?.kind === 'move' || /(Offset[XYZ]|Axial|Start)$/i.test(key);
  const rotate = explicit?.kind === 'rotate' || /(Splay|Rake|Sway|Tilt|Lean)$/i.test(key);
  const scale = explicit?.kind === 'scale' || /(Scale|Length|Radius|Width|Depth|Height|Span|Size)$/i.test(key);
  if (!move && !rotate && !scale) return null;

  const axis: ProceduralHandleAxis = explicit?.axis ?? (/OffsetY|Height|Depth|Rake|Tilt/i.test(key)
    ? 'vertical'
    : scale && !/Width|Span/i.test(key)
      ? 'diagonal'
      : 'horizontal');
  const shortLabel = /OffsetX/i.test(key) ? 'X'
    : /OffsetY/i.test(key) ? 'Y'
      : /OffsetZ/i.test(key) ? 'Z'
        : control.label;
  return {
    id: `${source}:${key}`,
    label: control.label,
    shortLabel,
    kind: move ? 'move' : rotate ? 'rotate' : 'scale',
    axis,
    source,
    control,
  };
}

function scaleKey(scale: Vector3Data): string {
  return `${scale.x}x${scale.y}x${scale.z}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundToStep(value: number, min: number, step: number): number {
  return Math.round((min + Math.round((value - min) / step) * step) * 10_000) / 10_000;
}

function visibleFallback(control: Pick<PartParameterControl, 'min' | 'max' | 'step'>): number {
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const step = control.step ?? 0.02;
  return roundToStep(Math.min(max, Math.max(step, min + (max - min) * 0.65)), min, step);
}

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
