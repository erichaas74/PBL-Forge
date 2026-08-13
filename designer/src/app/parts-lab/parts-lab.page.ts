import {
  ChangeDetectionStrategy,
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
  WING_SHAPES,
  setDragonStyleOverride,
} from '@pbl/assembly/rendering/dragon-procedural-mesh.factory';
import { PartTuningStore } from './part-tuning.store';
import { DesignerDragonDraftStore } from '../designer-dragon-draft.store';

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
}

interface AngleView {
  id: string;
  label: string;
  direction: Vector3Data;
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

/** Which style section each part profile exposes, and the ranges worth dragging. */
const STYLE_CONTROLS: Readonly<Record<string, readonly Omit<StyleControl, 'value'>[]>> = {
  'dragon-body': [
    { section: 'body', key: 'spikeCount', label: 'Spike count', min: 0, max: 16, step: 1 },
    { section: 'body', key: 'spikeSpread', label: 'Ridge length', min: 0.1, max: 0.95, step: 0.01 },
    { section: 'body', key: 'spikeHeight', label: 'Spike height', min: 0.01, max: 0.3, step: 0.005 },
    { section: 'body', key: 'spikeRadius', label: 'Spike thickness', min: 0.005, max: 0.12, step: 0.002 },
    { section: 'body', key: 'spikeLean', label: 'Spike lean', min: -1, max: 1, step: 0.02 },
  ],
  'dragon-upper-jaw': jawControls(),
  'dragon-lower-jaw': jawControls(),
  // Skull silhouette first, then the horns that sit on it. The shape values are
  // the base `DragonHeadShape`; a head's own proportions bend them from there,
  // so dragging these tunes the whole family rather than one specimen.
  'dragon-head-horned': [
    { section: 'head', key: 'cranium', label: 'Braincase', min: 0.6, max: 1.4, step: 0.02 },
    { section: 'head', key: 'browRidge', label: 'Brow ridge', min: 0, max: 0.5, step: 0.01 },
    { section: 'head', key: 'muzzleDepth', label: 'Muzzle depth', min: 0.4, max: 1.6, step: 0.02 },
    { section: 'head', key: 'muzzleWidth', label: 'Muzzle width', min: 0.4, max: 1.6, step: 0.02 },
    { section: 'head', key: 'muzzleDrop', label: 'Muzzle droop', min: 0, max: 2, step: 0.05 },
    { section: 'head', key: 'cheek', label: 'Cheek flare', min: 0.6, max: 1.4, step: 0.02 },
    { section: 'head', key: 'eyeAxial', label: 'Eye position', min: -0.3, max: 0.4, step: 0.01 },
    { section: 'head', key: 'hornLength', label: 'Horn length', min: 0.2, max: 3.5, step: 0.05 },
    { section: 'head', key: 'hornRadius', label: 'Horn thickness', min: 0.04, max: 0.5, step: 0.01 },
    { section: 'head', key: 'browLength', label: 'Brow spike', min: 0, max: 1.5, step: 0.05 },
  ],
  'dragon-foot': [
    { section: 'foot', key: 'talonCount', label: 'Talon count', min: 1, max: 7, step: 1 },
    { section: 'foot', key: 'talonLength', label: 'Talon length', min: 0.1, max: 1.6, step: 0.02 },
    { section: 'foot', key: 'talonRadius', label: 'Talon thickness', min: 0.1, max: 1, step: 0.02 },
  ],
  'dragon-tail-club': [
    { section: 'tailClub', key: 'spikeCount', label: 'Spike count', min: 1, max: 12, step: 1 },
    { section: 'tailClub', key: 'spikeLength', label: 'Spike length', min: 0.1, max: 2, step: 0.05 },
    { section: 'tailClub', key: 'spikeRadius', label: 'Spike thickness', min: 0.04, max: 0.5, step: 0.01 },
  ],
  'dragon-wing': wingControls(),
  'dragon-secondary-wing': wingControls(),
};

function jawControls(): readonly Omit<StyleControl, 'value'>[] {
  return [
    { section: 'jaw', key: 'toothCount', label: 'Teeth per side', min: 0, max: 12, step: 1 },
    { section: 'jaw', key: 'toothHeight', label: 'Tooth length', min: 0.2, max: 3, step: 0.05 },
    { section: 'jaw', key: 'toothRadius', label: 'Tooth thickness', min: 0.02, max: 0.4, step: 0.01 },
    { section: 'jaw', key: 'toothStart', label: 'Front tooth position', min: -0.2, max: 0.5, step: 0.01 },
  ];
}

function wingControls(): readonly Omit<StyleControl, 'value'>[] {
  return [
    { section: 'wing', key: 'camber', label: 'Camber', min: 0, max: 0.35, step: 0.005 },
    { section: 'wing', key: 'fingerSag', label: 'Finger sag', min: 0, max: 0.35, step: 0.005 },
    { section: 'wing', key: 'dihedral', label: 'Dihedral', min: -0.1, max: 0.35, step: 0.005 },
    { section: 'wing', key: 'scallop', label: 'Trailing scallop', min: 0, max: 0.4, step: 0.005 },
  ];
}

@Component({
  selector: 'app-parts-lab-page',
  imports: [RouterLink],
  templateUrl: './parts-lab.page.html',
  styleUrl: './parts-lab.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly selectedId = signal<string | null>(null);
  readonly color = signal(NEUTRAL_COLOR);
  readonly useDefinitionColor = signal(false);
  readonly scaleX = signal(1);
  readonly scaleY = signal(1);
  readonly scaleZ = signal(1);
  readonly tileSize = signal(176);
  readonly copied = signal(false);

  /** Live feature proportions, seeded from the shipped defaults. */
  readonly style = signal<DragonStyle>(cloneStyle(this.designerDraft.style()));

  /** What the meshes are actually built from — updated on a debounce. */
  private readonly committedScale = signal<Vector3Data>({ x: 1, y: 1, z: 1 });
  private readonly commitVersion = signal(0);
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: null });

  readonly definitions = computed(() =>
    ASSEMBLY_PART_DEFINITIONS.filter(definition => definition.family === this.family()));

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
    const definitions = Object.prototype.hasOwnProperty.call(STYLE_CONTROLS, profile)
      ? STYLE_CONTROLS[profile]
      : [];

    return definitions.map(control => ({
      ...control,
      value: readStyleValue(style, control.section, control.key),
    }));
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
  readonly angleStrip = signal<{ view: AngleView; image: string | null }[]>([]);

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
        // The lab is where quality is judged, so it gets the full pipeline even
        // though the embedded viewers run at 'low'.
        quality: 'high',
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

      this.renderer.show(
        describeSpecimen(
          definition.id,
          this.blueprintFor(definition, scale, color),
          { label: definition.label },
        ),
        { pose: { droopRadians: 0 } },
      );
    });

    // Contact sheet.
    effect(() => {
      const size = this.tileSize();
      const color = this.color();
      const useDefinition = this.useDefinitionColor();
      const definitions = this.definitions();
      this.commitVersion();

      this.tiles.set(definitions.map(definition => ({
        definition,
        image: this.thumbnails.bake(
          describeSpecimen(
            this.cacheKeyFor(definition, useDefinition ? 'own' : color),
            this.blueprintFor(definition, { x: 1, y: 1, z: 1 }, useDefinition ? null : color),
            { label: definition.label },
          ),
          { size, transparent: true, pose: { droopRadians: 0 } },
        ),
      })));
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

      this.angleStrip.set(ANGLE_VIEWS.map(view => ({
        view,
        image: this.thumbnails.bake(
          describeSpecimen(
            `${this.cacheKeyFor(definition, color ?? 'own')}:${scaleKey(scale)}`,
            blueprint,
            { label: definition.label },
          ),
          { size: 190, transparent: true, viewDirection: view.direction, pose: { droopRadians: 0 } },
        ),
      })));
    });
  }

  ngOnDestroy(): void {
    if (this.commitTimer) clearTimeout(this.commitTimer);
    // Leave the shipped defaults behind for the rest of the app.
    setDragonStyleOverride(null);
    this.renderer.dispose();
  }

  select(definition: AssemblyPartDefinition): void {
    this.selectedId.set(definition.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { part: definition.id, family: this.family() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setFamily(family: AssemblyPartFamily): void {
    this.family.set(family);
    this.selectedId.set(null);
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
    const styled = Object.prototype.hasOwnProperty.call(STYLE_CONTROLS, profile);
    return `${definition.id}:${colorKey}${styled ? `:s${this.commitVersion()}` : ''}`;
  }

  /** A single part, centred at the origin, as a one-part blueprint. */
  private blueprintFor(
    definition: AssemblyPartDefinition,
    scale: Vector3Data,
    color: string | null,
  ): AssemblyBlueprint {
    const part = createPartFromDefinition(definition, { x: 0, y: 0, z: 0 }, definition.id);
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
    tailClub: { ...style.tailClub },
  };
}

function scaleKey(scale: Vector3Data): string {
  return `${scale.x}x${scale.y}x${scale.z}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
