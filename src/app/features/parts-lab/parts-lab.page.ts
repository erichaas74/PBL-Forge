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
import { AssemblyBlueprint, Vector3Data } from '../../shared/assembly/domain/assembly.models';
import { describeSpecimen } from '../../shared/assembly/preview/specimen.models';
import { SpecimenRendererService } from '../../shared/assembly/preview/specimen-renderer.service';
import { SpecimenThumbnailService } from '../../shared/assembly/preview/specimen-thumbnail.service';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
  AssemblyPartFamily,
  createPartFromDefinition,
} from '../../shared/assembly-garage/data/assembly-part-definitions';
import {
  DEFAULT_WING_SHAPE,
  WING_SHAPES,
  WingMembraneShape,
  setWingShapeOverride,
} from '../../shared/assembly/rendering/dragon-procedural-mesh.factory';
import { PartTuningStore } from './part-tuning.store';

/**
 * A workbench for the part meshes themselves.
 *
 * The dragon's anatomy is generated code, not authored art, so improving how it
 * looks means editing `dragon-procedural-mesh.factory.ts` and looking at the
 * result. Doing that through the full app is slow: build, navigate, find a
 * dragon carrying the part, squint. This page renders one part at a time,
 * isolated, from several angles, and deep-links by part id so a screenshot
 * script can drive it headlessly.
 *
 * Every tile is baked through the shared thumbnail context, so the whole
 * contact sheet costs one WebGL context plus one live viewer.
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

/** Six views: the four a silhouette is judged from, plus top and front. */
const ANGLE_VIEWS: readonly AngleView[] = [
  { id: 'three-quarter', label: 'Three-quarter', direction: { x: 0.86, y: 0.42, z: 1 } },
  { id: 'side', label: 'Side', direction: { x: 0, y: 0.08, z: 1 } },
  { id: 'front', label: 'Front', direction: { x: 1, y: 0.08, z: 0 } },
  { id: 'top', label: 'Top', direction: { x: 0.05, y: 1, z: 0.05 } },
  { id: 'below', label: 'Below', direction: { x: 0.5, y: -0.55, z: 0.7 } },
  { id: 'rear', label: 'Rear three-quarter', direction: { x: -0.8, y: 0.35, z: -0.9 } },
];

const FAMILIES: readonly AssemblyPartFamily[] = ['dragon', 'robot', 'car', 'primitive'];

/**
 * One colour for every part by default. The authored definition colours are a
 * rainbow — useful in the garage, useless for judging form, because a bright
 * hue reads as detail that is not there.
 */
const NEUTRAL_COLOR = '#8d6a52';

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

  readonly tuning = inject(PartTuningStore);
  readonly families = FAMILIES;
  readonly angleViews = ANGLE_VIEWS;
  readonly wingPresetIds = Object.keys(WING_SHAPES) as (keyof typeof WING_SHAPES)[];

  /** Live wing membrane parameters, seeded from the shipped default. */
  readonly wing = signal<WingMembraneShape>({ ...DEFAULT_WING_SHAPE });
  /**
   * Bumped on every wing edit and folded into descriptor ids, because the
   * membrane shape is a module-level override that the thumbnail cache key
   * cannot see on its own.
   */
  private readonly wingVersion = signal(0);
  readonly copied = signal(false);

  readonly family = signal<AssemblyPartFamily>('dragon');
  readonly selectedId = signal<string | null>(null);
  readonly color = signal(NEUTRAL_COLOR);
  readonly useDefinitionColor = signal(false);
  readonly scaleX = signal(1);
  readonly scaleY = signal(1);
  readonly scaleZ = signal(1);
  /** Tile size for the contact sheet; raised when inspecting silhouettes. */
  readonly tileSize = signal(176);

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

  /** Contact sheet: every part in the family, one shared camera angle. */
  readonly tiles = computed<PartTile[]>(() => {
    const size = this.tileSize();
    const color = this.color();
    const useDefinition = this.useDefinitionColor();

    return this.definitions().map(definition => ({
      definition,
      image: this.thumbnails.bake(
        describeSpecimen(
          this.cacheKeyFor(definition, useDefinition ? 'own' : color),
          this.blueprintFor(definition, { x: 1, y: 1, z: 1 }, useDefinition ? null : color),
          { label: definition.label },
        ),
        { size, transparent: true, pose: { droopRadians: 0 } },
      ),
    }));
  });

  /** The selected part from every angle, so silhouettes can be compared. */
  readonly angleStrip = computed(() => {
    const definition = this.selected();
    if (!definition) return [];
    const color = this.useDefinitionColor() ? null : this.color();
    const blueprint = this.blueprintFor(definition, this.scaleVector(), color);

    return ANGLE_VIEWS.map(view => ({
      view,
      image: this.thumbnails.bake(
        describeSpecimen(
          `${this.cacheKeyFor(definition, color ?? 'own')}:${this.scaleKey()}`,
          blueprint,
          { label: definition.label },
        ),
        { size: 190, transparent: true, viewDirection: view.direction, pose: { droopRadians: 0 } },
      ),
    }));
  });

  readonly profileId = computed(() => this.selected()?.visualProfile?.profileId ?? '—');
  readonly meshType = computed(() => this.selected()?.visualProfile?.meshType ?? 'primitive');

  /** Wing controls only make sense on a part the wing builder actually draws. */
  readonly isWing = computed(() => {
    const profile = this.selected()?.visualProfile?.profileId ?? '';
    return profile === 'dragon-wing' || profile === 'dragon-secondary-wing';
  });

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
    // Deep link: ?part=dragon-left-wing&family=dragon lets the bake script drive
    // this page without any UI interaction.
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
      // Read so the live view refreshes when a wing slider moves.
      this.wingVersion();
      if (!this.mounted() || !definition) return;
      const color = this.useDefinitionColor() ? null : this.color();

      this.renderer.show(
        describeSpecimen(
          definition.id,
          this.blueprintFor(definition, this.scaleVector(), color),
          { label: definition.label },
        ),
        { pose: { droopRadians: 0 } },
      );
    });
  }

  // -------------------------------------------------------------------------
  // Wing membrane tuning
  // -------------------------------------------------------------------------

  onWing(key: keyof WingMembraneShape, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.applyWing({ ...this.wing(), [key]: value });
  }

  applyWingPreset(id: keyof typeof WING_SHAPES): void {
    this.applyWing({ ...WING_SHAPES[id] });
  }

  resetWing(): void {
    this.applyWing({ ...DEFAULT_WING_SHAPE });
  }

  /**
   * Applies synchronously rather than through an effect: the computeds that
   * bake thumbnails read the override the moment `wingVersion` changes, and
   * effect ordering against template evaluation is not guaranteed.
   */
  private applyWing(shape: WingMembraneShape): void {
    this.wing.set(shape);
    setWingShapeOverride(shape);
    this.wingVersion.update(version => version + 1);
  }

  // -------------------------------------------------------------------------
  // Recording values for hardcoding
  // -------------------------------------------------------------------------

  record(): void {
    const definition = this.selected();
    const dimensions = this.scaledDimensions();
    if (!definition || !dimensions) return;

    this.tuning.add({
      partId: definition.id,
      label: definition.label,
      dimensions,
      scale: this.scaleVector(),
      wingShape: this.isWing() ? { ...this.wing() } : undefined,
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
      // Clipboard is blocked outside a secure context; the snippet stays
      // on screen to select by hand.
      this.copied.set(false);
    }
  }

  ngOnDestroy(): void {
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
  }

  onScale(axis: 'x' | 'y' | 'z', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    if (axis === 'x') this.scaleX.set(value);
    else if (axis === 'y') this.scaleY.set(value);
    else this.scaleZ.set(value);
  }

  onColor(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value);
  }

  toggleDefinitionColor(): void {
    this.useDefinitionColor.update(value => !value);
  }

  private scaleVector(): Vector3Data {
    return { x: this.scaleX(), y: this.scaleY(), z: this.scaleZ() };
  }

  private scaleKey(): string {
    return `${this.scaleX()}x${this.scaleY()}x${this.scaleZ()}`;
  }

  /**
   * Thumbnail cache key. The wing version is folded in only for wing profiles —
   * the other 21 parts are unaffected by membrane tuning, so leaving their keys
   * alone keeps them cached while a slider is being dragged.
   */
  private cacheKeyFor(definition: AssemblyPartDefinition, colorKey: string): string {
    const profile = definition.visualProfile?.profileId ?? '';
    const wingged = profile === 'dragon-wing' || profile === 'dragon-secondary-wing';
    return `${definition.id}:${colorKey}${wingged ? `:w${this.wingVersion()}` : ''}`;
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

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
