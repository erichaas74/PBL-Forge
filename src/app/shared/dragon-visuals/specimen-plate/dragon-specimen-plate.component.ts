import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SpecimenDescriptor } from '../../assembly/preview/specimen.models';

/**
 * The dragon as a field-guide plate.
 *
 * A drawn specimen, not a photograph of one. Every choice here is in service of
 * being read at 120px next to five other dragons:
 *
 * - **Strict side profile, fixed camera.** Two specimens are only comparable if
 *   nothing but the animal varies. A three-quarter view flatters an individual
 *   and ruins a comparison — wing span and tail length both foreshorten, which
 *   is exactly the measurement being asked for.
 * - **Traits exaggerated on a legibility curve.** The 3D dragon renders a
 *   1.27x jaw honestly and it disappears at thumbnail size. Here the same gene
 *   moves the snout far enough to see. This is a deliberate lie in service of
 *   the truth the student is meant to extract, and it is why the render mode
 *   exists to check against.
 * - **Each gene owns a different *kind* of change.** Presence (wings),
 *   silhouette (horns), surface (pattern), and emission (fire) — never four
 *   size changes, which would be four things nobody can tell apart.
 * - **Colour is identity, never a trait.** Two dragons of one genotype must
 *   still be distinguishable.
 *
 * Geometry is authored in a 220x170 viewBox and posed with transforms rather
 * than recomputed path data, so a proportion can be retuned by changing one
 * number instead of re-authoring a curve.
 */

/** Everything the plate needs, pulled out of the descriptor's readouts. */
interface PlateTraits {
  wings: boolean;
  horns: boolean;
  fire: boolean;
  patterned: boolean;
  wingSpan: number;
  jaw: number;
  tail: number;
  body: number;
}

/**
 * Which parts each trait owns, for focus dimming.
 *
 * Keyed by readout id rather than by `roles`, because the flat plate has parts
 * the 3D rig does not — a painted flank pattern is not an assembly role, and
 * the horns trait maps to `armor` in the rig, which would light the torso here.
 */
const TRAIT_PARTS: Readonly<Record<string, readonly string[]>> = {
  'trait:wings': ['wing'],
  'wing-span': ['wing'],
  'trait:horns': ['horn'],
  'trait:fire': ['fire', 'head'],
  'jaw-strength': ['head'],
  'trait:scales': ['pattern', 'body'],
  'tail-length': ['tail'],
};

@Component({
  selector: 'app-dragon-specimen-plate',
  template: `
    <svg
      viewBox="0 0 220 170"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      [attr.aria-label]="label()"
      [style]="paletteVariables()">

      <!-- Body group carries the overall size gene, scaled about the torso. -->
      <g [attr.transform]="bodyTransform()">

        @if (traits().wings) {
          <!--
            Wing sits behind the torso. Drawn first so the body overlaps its
            root, which is what makes it read as attached rather than pinned on.
          -->
          <g class="part" [class.dim]="dim('wing')" [attr.transform]="wingTransform()">
            <path class="membrane" [attr.d]="WING_MEMBRANE" />
            <path class="bone" [attr.d]="WING_STRUTS" />
          </g>
        }

        <!-- Tail: three tapering segments, so it narrows without a custom outline. -->
        <g class="part" [class.dim]="dim('tail')" [attr.transform]="tailTransform()">
          <path class="hide stroke-thick" d="M 74 104 Q 46 108 30 96" />
          <path class="hide stroke-mid" d="M 34 98 Q 20 92 14 78" />
          <path class="hide stroke-thin" d="M 16 82 Q 10 70 14 58" />
          <path class="horn" d="M 14 62 L 6 44 L 22 54 Z" />
        </g>

        <!-- Rear leg behind the body, front leg in front: depth from order alone. -->
        <g class="part" [class.dim]="dim('body')">
          <path class="hide stroke-leg" d="M 80 112 Q 74 126 76 136" />
          <path class="claw" d="M 68 138 L 86 138 L 84 132 L 70 132 Z" />
        </g>

        <g class="part" [class.dim]="dim('body')">
          <!-- Torso, haunch and shoulder as overlapping masses. -->
          <ellipse class="hide" cx="100" cy="96" rx="37" ry="26" />
          <circle class="hide" cx="74" cy="100" r="22" />
          <circle class="hide" cx="126" cy="94" r="21" />
          <!-- Belly: a darker underside is most of what makes a flat shape read as a volume. -->
          <ellipse class="belly" cx="102" cy="110" rx="28" ry="12" />
        </g>

        @if (traits().patterned) {
          <g class="part" [class.dim]="dim('pattern')">
            <ellipse class="pattern" cx="86" cy="88" rx="9" ry="6" />
            <ellipse class="pattern" cx="106" cy="84" rx="7" ry="5" />
            <ellipse class="pattern" cx="118" cy="98" rx="6" ry="4.5" />
            <ellipse class="pattern" cx="92" cy="104" rx="6" ry="4" />
          </g>
        }

        <!-- Dorsal ridge. Part of the species, not of any modelled gene. -->
        <g class="part" [class.dim]="dim('body')">
          <path class="horn" d="M 82 74 L 86 62 L 92 73 Z" />
          <path class="horn" d="M 96 71 L 101 58 L 107 70 Z" />
          <path class="horn" d="M 110 73 L 114 62 L 119 74 Z" />
        </g>

        <!-- Front leg. -->
        <g class="part" [class.dim]="dim('body')">
          <path class="hide stroke-leg" d="M 126 110 Q 132 124 130 136" />
          <path class="claw" d="M 122 138 L 140 138 L 138 132 L 124 132 Z" />
        </g>

        <!-- Neck, drawn as a stroke so it tapers into both masses it joins. -->
        <path class="hide stroke-neck" [class.dim]="dim('head')" d="M 128 84 Q 146 76 156 60" />

        <!-- Head group carries the jaw gene. -->
        <g class="part" [class.dim]="dim('head')" [attr.transform]="headTransform()">
          @if (traits().horns) {
            <g class="part" [class.dim]="dim('horn')">
              <path class="horn" d="M 156 44 L 146 22 L 163 38 Z" />
              <path class="horn" d="M 164 42 L 160 24 L 172 38 Z" />
            </g>
          }

          <!-- Skull, then a snout the jaw gene lengthens. -->
          <ellipse class="hide" cx="164" cy="50" rx="16" ry="13" />
          <g [attr.transform]="snoutTransform()">
            <path class="hide" d="M 172 42 Q 196 45 200 51 Q 196 57 172 60 Z" />
            <path class="jaw" d="M 174 56 Q 194 57 198 60 Q 190 64 174 62 Z" />
            <path class="tooth" d="M 190 56 L 193 61 L 186 57 Z" />
          </g>

          <circle class="eye" cx="167" cy="46" r="3.1" />
          <circle class="glint" cx="168.2" cy="45" r="1" />
        </g>

        @if (traits().fire) {
          <!--
            Fire is the one trait with no anatomy to show, so it gets the one
            channel nothing else uses: something leaving the animal. Presence is
            the strongest signal available at this size — far stronger than the
            30% jaw difference the gene actually drives in the 3D rig.
          -->
          <g class="part" [class.dim]="dim('fire')" [attr.transform]="headTransform()">
            <path class="flame outer" d="M 200 51 Q 214 42 219 50 Q 213 52 216 58 Q 208 56 200 60 Z" />
            <path class="flame inner" d="M 201 52 Q 209 47 212 52 Q 207 54 209 57 Q 204 55 201 58 Z" />
          </g>
        }
      </g>
    </svg>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }

    /*
     * One hide colour, three derived tones. Mirrors createDragonPalette in the
     * 3D factory so the plate and the render agree about what a dragon is made
     * of — derived in CSS rather than JS so a theme can override any of them.
     */
    .hide { fill: var(--plate-base); }
    .belly { fill: color-mix(in srgb, var(--plate-base) 72%, #1f2a30); opacity: .55; }
    .pattern { fill: color-mix(in srgb, var(--plate-base) 45%, #ffffff); opacity: .85; }
    .horn, .claw, .tooth { fill: color-mix(in srgb, var(--plate-base) 26%, #e9dcc0); }
    .tooth { fill: #f2ead6; }
    .jaw { fill: color-mix(in srgb, var(--plate-base) 80%, #1f2a30); }
    .membrane {
      fill: color-mix(in srgb, var(--plate-base) 52%, #ffffff);
      opacity: .82;
      stroke: color-mix(in srgb, var(--plate-base) 60%, #1f2a30);
      stroke-width: 1.6;
      stroke-linejoin: round;
    }
    .bone {
      fill: none;
      stroke: color-mix(in srgb, var(--plate-base) 26%, #e9dcc0);
      stroke-width: 3;
      stroke-linecap: round;
    }

    /* Limbs and neck are strokes: a round cap sinks them into the mass they join. */
    .stroke-thick, .stroke-mid, .stroke-thin, .stroke-leg, .stroke-neck {
      fill: none;
      stroke: var(--plate-base);
      stroke-linecap: round;
    }
    .stroke-thick { stroke-width: 17; }
    .stroke-mid { stroke-width: 11; }
    .stroke-thin { stroke-width: 6; }
    .stroke-leg { stroke-width: 13; }
    .stroke-neck { stroke-width: 23; }

    .eye { fill: #1f2a30; }
    .glint { fill: #fff6e2; }
    .flame.outer { fill: #e2622a; }
    .flame.inner { fill: #ffd9a0; }

    /*
     * Focus dimming. Opacity rather than a grey wash, so a muted part keeps its
     * silhouette — the student still needs to see the whole animal to know what
     * they are looking at.
     */
    .part { transition: opacity 160ms ease; }
    .part.dim { opacity: .16; }

    @media (prefers-reduced-motion: reduce) {
      .part { transition: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonSpecimenPlateComponent {
  readonly descriptor = input.required<SpecimenDescriptor>();
  readonly focusedTraitId = input<string | null>(null);

  /** Membrane outline: leading edge up to the tip, scalloped trailing edge back. */
  protected readonly WING_MEMBRANE =
    'M 116 80 C 108 50 100 28 92 14 C 72 28 52 44 36 58 '
    + 'Q 48 68 60 64 Q 72 76 84 68 Q 98 80 116 80 Z';

  protected readonly WING_STRUTS =
    'M 116 80 L 92 14 M 116 80 L 60 42 M 116 80 L 36 58';

  private readonly traitsById = computed(
    () => new Map(this.descriptor().traits.map(trait => [trait.id, trait])),
  );

  protected readonly traits = computed<PlateTraits>(() => {
    const byId = this.traitsById();
    /*
     * Defaults describe a plain dragon rather than an empty one. A descriptor
     * from a simulation that does not publish these readouts should still draw
     * something recognisable instead of a wingless, hornless stub that looks
     * like a deliberate genotype.
     */
    return {
      wings: byId.get('trait:wings')?.expressed ?? true,
      horns: byId.get('trait:horns')?.expressed ?? false,
      fire: byId.get('trait:fire')?.expressed ?? false,
      patterned: byId.get('trait:scales')?.expressed ?? false,
      wingSpan: byId.get('wing-span')?.normalized ?? 0.5,
      jaw: byId.get('jaw-strength')?.normalized ?? 0.5,
      tail: byId.get('tail-length')?.normalized ?? 0.5,
      body: byId.get('body-size')?.normalized ?? 0.5,
    };
  });

  protected readonly label = computed(() => {
    const traits = this.traits();
    // Spoken description, not a decorative alt: this is the only form of the
    // specimen a screen reader can reach, so it carries the same four genes the
    // drawing does.
    const marks = [
      traits.wings ? 'winged' : 'wingless',
      traits.horns ? 'horned' : 'smooth-headed',
      traits.patterned ? 'spotted scales' : 'solid scales',
      traits.fire ? 'breathing fire' : 'no fire',
    ];
    return `${this.descriptor().label}: ${marks.join(', ')}`;
  });

  protected readonly paletteVariables = computed(() => ({
    '--plate-base': this.descriptor().accentColor ?? '#7c8f71',
  }));

  /**
   * Overall size, about the torso centre.
   *
   * A narrow range on purpose. Body size is not one of the four modelled genes,
   * so it must never vary enough to be mistaken for one — it is texture that
   * keeps a clutch from looking cloned, and nothing more.
   */
  protected readonly bodyTransform = computed(() => {
    const scale = 0.94 + this.traits().body * 0.12;
    return `translate(110 96) scale(${scale.toFixed(3)}) translate(-110 -96)`;
  });

  /** Wing span, about the shoulder where the wing attaches. */
  protected readonly wingTransform = computed(() => {
    const scale = 0.82 + this.traits().wingSpan * 0.42;
    return `translate(116 80) scale(${scale.toFixed(3)}) translate(-116 -80)`;
  });

  /** Tail length, about the hip. Exaggerated well past the rig's real range. */
  protected readonly tailTransform = computed(() => {
    const scale = 0.78 + this.traits().tail * 0.5;
    return `translate(74 104) scale(${scale.toFixed(3)}) translate(-74 -104)`;
  });

  /** The head itself only follows the neck; the jaw gene acts on the snout. */
  protected readonly headTransform = computed(() => 'translate(0 0)');

  /**
   * Jaw strength, stretching the snout forward from the skull.
   *
   * Anchored at the skull's front edge so a longer jaw grows out of the head
   * rather than sliding the whole face off the neck.
   */
  protected readonly snoutTransform = computed(() => {
    const scale = 0.8 + this.traits().jaw * 0.46;
    return `translate(172 51) scale(${scale.toFixed(3)} 1) translate(-172 -51)`;
  });

  /** True when a trait is focused and this part is not one it shaped. */
  protected dim(part: string): boolean {
    const focused = this.focusedTraitId();
    if (!focused) return false;

    const lit = TRAIT_PARTS[focused];
    // A focused trait with no entry acts on the whole animal (size, pigment),
    // so nothing dims — dimming everything would say the opposite.
    if (!lit) return false;

    return !lit.includes(part);
  }
}
