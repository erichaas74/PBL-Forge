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
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';
import { MINI_DRAGON_PART_DEFINITIONS } from './mini-dragon-part-definitions';
import {
  DragonVisualParameterDefinition,
  editableDragonParametersForProfile,
} from '@pbl/assembly/model-pack/dragon-visual-parameter-registry';
import { applyDesignerDraft } from '../designer-part-overrides';
import { buildPartAcceptanceReport, partGroup } from './part-acceptance';
import { exactPartPreviewFrame } from './part-preview-frame';

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

const ANGLE_VIEWS: readonly AngleView[] = [
  { id: 'three-quarter', label: 'Three-quarter', direction: { x: 0.86, y: 0.42, z: 1 } },
  { id: 'side', label: 'Side', direction: { x: 0, y: 0.08, z: 1 } },
  { id: 'front', label: 'Front', direction: { x: 1, y: 0.08, z: 0 } },
  { id: 'top', label: 'Top', direction: { x: 0.05, y: 1, z: 0.05 } },
  { id: 'below', label: 'Below', direction: { x: 0.5, y: -0.55, z: 0.7 } },
  { id: 'rear', label: 'Rear three-quarter', direction: { x: -0.8, y: 0.35, z: -0.9 } },
];

const FAMILIES: readonly AssemblyPartFamily[] = ['dragon', 'robot', 'car', 'primitive'];
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

  /** Live feature proportions, seeded from the shipped defaults. */
  readonly style = signal<DragonStyle>(cloneStyle(this.designerDraft.style()));

  /** What the meshes are actually built from — updated on a debounce. */
  private readonly committedScale = signal<Vector3Data>({ x: 1, y: 1, z: 1 });
  private readonly commitVersion = signal(0);
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

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
      ? this.dragonSpecies() === 'mini' ? 'mini dragon' : 'lab dragon'
      : this.family());

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
    return editableDragonParametersForProfile(this.profileId())
      .filter(parameter => parameter.species === 'mini')
      .map(parameter => ({
        ...parameter,
        value: typeof values[parameter.key] === 'number'
          ? values[parameter.key] as number
          : parameter.defaultValue as number,
      }));
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
      const color = this.useDefinitionColor() ? null : this.color();

      const blueprint = this.blueprintFor(definition, scale, color);
      this.renderer.show(
        describeSpecimen(definition.id, blueprint, { label: definition.label }),
        {
          pose: { droopRadians: 0 },
          frame: exactPartPreviewFrame(blueprint.parts[0]),
        },
      );
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
    if (this.mounted()) this.renderer.recover();
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

    this.style.update(current => writeStyleValue(current, control.section, control.key, value));
    this.scheduleCommit();
  }

  onPartParameter(control: PartParameterControl, event: Event): void {
    const definition = this.selected();
    const value = Number((event.target as HTMLInputElement).value);
    if (!definition || !Number.isFinite(value)) return;
    this.designerDraft.setParameter(definition.id, control.key, value);
    this.scheduleCommit();
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
    this.tuning.add({
      partId: definition.id,
      label: definition.label,
      dimensions,
      scale: this.scaleVector(),
      styleSection: controls.length ? controls[0].section : undefined,
      styleValues: controls.length
        ? Object.fromEntries(controls.map(control => [control.key, control.value]))
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
    return { parts: [part], joints: [] };
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

function scaleKey(scale: Vector3Data): string {
  return `${scale.x}x${scale.y}x${scale.z}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
