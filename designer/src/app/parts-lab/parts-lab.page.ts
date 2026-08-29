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
import { PartTuningStore } from './part-tuning.store';
import {
  DesignerDragonDraftStore,
  DesignerPartPlacement,
} from '../designer-dragon-draft.store';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';
import {
  DragonVisualParameterDefinition,
  dragonParametersForProfile,
  editableDragonParametersForProfile,
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
export type PartInspectorTab = 'shape' | 'features' | 'surface' | 'sockets' | 'genes' | 'test';

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
}

export interface PartParameterControl extends DragonVisualParameterDefinition {
  value: number;
}

interface InheritedParameterControl extends DragonVisualParameterDefinition {
  readonly value: string | number | boolean;
}

interface AnatomyLayerView extends PartAnatomyLayer {
  readonly styleControls: readonly StyleControl[];
  readonly parameterControls: readonly PartParameterControl[];
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
  { id: 'surface', label: 'Surface' },
  { id: 'sockets', label: 'Sockets' },
  { id: 'genes', label: 'Genes' },
  { id: 'test', label: 'Test' },
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

  readonly tuning = inject(PartTuningStore);
  readonly families = FAMILIES;
  readonly inspectorTabs = INSPECTOR_TABS;
  readonly arenaBodyTypes = DRAGON_BODY_TYPE_OPTIONS;
  readonly miniBreedOptions = MINI_DRAGON_BREED_OPTIONS;
  readonly placementHandleKinds = ['move', 'rotate', 'scale'] as const;
  readonly angleViews = ANGLE_VIEWS;
  readonly wingPresetIds = Object.keys(WING_SHAPES) as (keyof typeof WING_SHAPES)[];
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
      : this.family());

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
    const profile = this.profileId();
    const style = this.style();
    return editableDragonParametersForProfile(profile)
      .filter(definition => definition.species === 'classic' && definition.styleSection)
      .map(definition => {
        const section = definition.styleSection!;
        const key = definition.key === 'jointBall' ? 'ball' : definition.key;
        return {
          section,
          key,
          label: definition.label,
          min: definition.min!,
          max: definition.max!,
          step: definition.step ?? 0.01,
          value: readStyleValue(style, section, key),
        };
      });
  });

  readonly parameterControls = computed<PartParameterControl[]>(() => {
    const definition = this.selected();
    if (!definition) return [];
    const values = this.designerDraft.parametersFor(definition.id, definition.visualProfile?.parameters);
    const species = this.dragonSpecies() === 'mini' ? 'mini' : 'classic';
    return editableDragonParametersForProfile(this.profileId())
      .filter(parameter => parameter.species === species
        && !parameter.styleSection
        && !parameter.geneticsOwned)
      .map(parameter => ({
        ...parameter,
        value: typeof values[parameter.key] === 'number'
          ? values[parameter.key] as number
          : parameter.defaultValue as number,
      }));
  });

  readonly surfaceControls = computed(() =>
    this.parameterControls().filter(control => SURFACE_PARAMETER_KEYS.has(control.key)));

  readonly partParameterScopeLabel = computed(() =>
    this.dragonSpecies() === 'mini'
      ? 'This Show part'
      : this.profileId() === 'dragon-body' ? 'This Arena body type' : 'This Arena part');

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

  readonly geneContext = computed(() =>
    partGeneContext(this.selected(), this.dragonSpecies()));

  readonly anatomyLayers = computed<AnatomyLayerView[]>(() => {
    const styleControls = this.styleControls();
    const parameterControls = this.parameterControls();
    const inheritedParameters = this.inheritedParameters();
    const genes = this.geneContext();
    const availableKeys = [
      ...styleControls.map(control => control.key),
      ...parameterControls.map(control => control.key),
      ...inheritedParameters.map(control => control.key),
    ];

    return partAnatomyLayers(this.profileId(), this.dragonSpecies(), availableKeys)
      .map(layer => {
        const keySet = new Set(layer.parameterKeys);
        const layerStyleControls = styleControls.filter(control => keySet.has(control.key));
        const layerParameterControls = parameterControls.filter(control => keySet.has(control.key));
        const layerInheritedParameters = inheritedParameters.filter(control => keySet.has(control.key));
        const layerGenes = genes.filter(gene => layer.geneIds.includes(gene.id));
        const visibilityStyle = layerStyleControls.find(control => control.key === layer.visibilityKey);
        const visibilityParameter = layerParameterControls.find(control => control.key === layer.visibilityKey);
        const visibilityValue = visibilityStyle?.value ?? visibilityParameter?.value;
        return {
          ...layer,
          styleControls: layerStyleControls,
          parameterControls: layerParameterControls,
          inheritedParameters: layerInheritedParameters,
          genes: layerGenes,
          canToggle: !layer.structural && visibilityValue !== undefined,
          visible: visibilityValue === undefined || visibilityValue !== 0,
          editable: layerStyleControls.length > 0 || layerParameterControls.length > 0,
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
    this.styleControls().length + this.parameterControls().length);

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
          this.selectedAnatomyLayer()?.meshNamePrefixes ?? [],
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
      this.renderer.setPartFocus(null);
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
    this.scheduleCommit();
  }

  resetSurface(): void {
    const definition = this.selected();
    if (!definition) return;
    for (const control of this.surfaceControls()) {
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
      this.selectedAnatomyLayer()?.meshNamePrefixes ?? [],
    );
    this.schedulePlacementAnchorRefresh();
  }

  /**
   * Collapses a drag into one rebuild. The override is applied here rather than
   * in an effect so the thumbnail computeds see it the moment the version bumps
   * — effect ordering against template evaluation is not guaranteed.
   */
  private scheduleCommit(): void {
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      setDragonStyleOverride(this.style());
      this.designerDraft.setStyle(this.style());
      const definition = this.selected();
      const dimensions = this.scaledDimensions();
      if (definition && dimensions) this.designerDraft.setDimensions(definition.id, dimensions);
      this.committedScale.set(this.scaleVector());
      this.commitVersion.update(version => version + 1);
    }, COMMIT_DELAY_MS);
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
    const profile = definition.visualProfile?.profileId ?? '';
    const styled = editableDragonParametersForProfile(profile).length > 0;
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

/** Maps canonical procedural parameter names to a predictable drag gesture. */
function proceduralHandle(
  control: PartParameterControl | StyleControl,
  source: 'parameter' | 'style',
): ProceduralHandleControl | null {
  const key = control.key;
  const move = /(Offset[XYZ]|Axial|Start)$/i.test(key);
  const rotate = /(Splay|Rake|Sway|Tilt|Lean)$/i.test(key);
  const scale = /(Scale|Length|Radius|Width|Depth|Height|Span|Size)$/i.test(key);
  if (!move && !rotate && !scale) return null;

  const axis: ProceduralHandleAxis = /OffsetY|Height|Depth|Rake|Tilt/i.test(key)
    ? 'vertical'
    : scale && !/Width|Span/i.test(key)
      ? 'diagonal'
      : 'horizontal';
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
