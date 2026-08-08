/**
 * The Berk palette, as values.
 *
 * `src/styles.scss` owns the same colours as CSS custom properties, and that is
 * what almost everything should use. This module exists for the two places a
 * `var()` cannot reach:
 *
 * 1. **SVG presentation attributes.** `[attr.fill]="theme().fill"` sets the
 *    attribute, not the CSS property, and attributes do not resolve `var()`.
 *    The chromosome diagram and every station glyph bind this way.
 * 2. **three.js materials**, which take numbers and `THREE.Color`, never CSS.
 *
 * Keep this in sync with `:root` in `src/styles.scss`. `npm run check:palette`
 * fails the build if they drift.
 *
 * ## Why the stations moved off navy
 *
 * `DRAGON_GENETICS_VISUAL_LAB_PLAN.md` asks for "dark blue-gray laboratory
 * walls… brass or amber safety accents", and the stations delivered that as a
 * cool navy console. Then the shell and the arena were rethemed to Berk — warm
 * parchment over an overcast north-Atlantic day — and the stations were left
 * behind, so a student moved between two unrelated worlds inside one lesson.
 *
 * The brief is still satisfied here; it is just read through Berk. A station is
 * a lit instrument standing in a timber hall: charred slate housings, weathered
 * edges, gold for the brass, and one cold sea-blue for the readouts. Dark
 * instruments on a parchment page is a deliberate look. Dark instruments inside
 * somebody else's dark was not.
 */

/** Surfaces, ink, and rules. Mirrors the `:root` block in styles.scss. */
export const BERK = {
  paper: '#f4efe4',
  surface: '#e8e0d0',
  surfaceRaised: '#fdfaf2',
  surfaceSunken: '#ded4c0',

  timber: '#7a5c3e',
  timberDark: '#4b3826',
  stone: '#8d949b',
  slate: '#2b3a43',
  slateDeep: '#1a252c',

  ink: '#1f2a30',
  inkSoft: '#38474f',
  muted: '#6d7a80',
  onDark: '#f1ece1',
  onDarkMuted: '#a9b4b8',

  line: '#cdc2ad',
  lineStrong: '#a89074',
  lineDark: '#3c4a52',

  ember: '#e2622a',
  emberSoft: '#f2a15c',
  emberDeep: '#a83d16',
  fury: '#86c232',
  gold: '#d9a441',
  sea: '#2f6a86',

  moss: '#4a7a2e',
  mossTint: '#e9f1e0',
  rune: '#6b5a86',
  runeTint: '#eeeaf4',
} as const;

/**
 * The instrument sub-palette: Berk hues lifted for legibility against a dark
 * console housing.
 *
 * The base tokens are authored for ink-on-parchment. Dropped straight onto a
 * slate panel, `--sea` and `--moss` go muddy and `--ink` disappears, so each
 * one that has to carry text or a mark on dark is lifted here rather than at
 * every call site. These are the only values a station theme should reach for.
 */
export const BERK_INSTRUMENT = {
  /** Housing: charred slate, warm-neutral rather than blue. */
  consoleTop: '#24323a',
  consoleBottom: '#161f25',
  /** Inset panel face. */
  panel: '#2b3a43',
  /** Weathered metal edge, between `lineDark` and `stone`. */
  panelEdge: '#4c5d67',

  ink: '#f1ece1',
  mutedInk: '#a9b4b8',

  /** Brass fittings and safety markings. */
  brass: '#d9a441',
  /** Cold readout glow: `sea`, lifted until it reads on slate. */
  glow: '#6fa8c4',
  /** Second readout hue for paired diagrams: `rune`, lifted. */
  violet: '#a793c4',

  /**
   * Verdicts. Green/red is kept because every station also renders a ✓ / !
   * glyph beside it, so the colour is reinforcement rather than the only
   * channel — but both are pulled off pure hue toward Berk's moss and clay so
   * they sit in the same world as everything around them.
   */
  correct: '#7fb845',
  incorrect: '#d9694c',
  /** Third verdict state: something the student should have caught. */
  missed: '#e0b054',

  /** Allele roles. Distinguished by lightness as well as hue. */
  dominant: '#6fb8ae',
  recessive: '#b49ad0',
  focus: '#e8bd63',
} as const;

/**
 * The four categorical trait-band colours used on every chromosome diagram.
 *
 * These are data colours: a student learns "the red band is the wing locus" and
 * carries that across five stations, so they must stay distinguishable from
 * each other before they stay pretty. They are Berk's four accent hues, which
 * separate by lightness as well as hue and so survive both colour-vision
 * deficiency and a washed-out classroom projector.
 */
export const BERK_TRAIT_BANDS = ['#c0442c', '#4a7a2e', '#2f6a86', '#6b5a86'] as const;
