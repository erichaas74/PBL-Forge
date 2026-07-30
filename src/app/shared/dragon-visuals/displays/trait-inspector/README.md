# Trait Evidence Analyzer display

The Module 1 station renderer. It draws whichever `trait-inspector` scene
`DragonVisualBridge` holds and reports what the student did as `DragonVisualStageEvent`s.

| File | Role |
| --- | --- |
| `trait-inspector-display.component.ts/.html/.scss` | The console: interaction, keyboard support, evidence-path drawing |
| `trait-inspector.view-model.ts` | Pure scene → view model mapping and the screen-reader summary |
| `trait-inspector.theme.ts` | Palette, glyph geometry, tray textures, motion timing |

It imports the visual domain, the bridge, and the shared display helpers — never lesson code,
Firestore, routing, stores, or genetics rules. Correctness arrives in the scene as
`DragonTraitPlacement.status`; nothing here grades an answer.

## Improving the graphics

Start in `trait-inspector.theme.ts`. Everything visual is data there:

- `palette` — console gradient, panel fills, ink, brass accents, verdict colours. Values become
  CSS custom properties (`--tia-*`) on the console element.
- `sources` / `categories` — the accent colour, glyph path geometry, and tray texture for each
  evidence instrument and each category.
- `motion` — evidence-path, card-travel, and pulse durations, exposed as `--tia-trace-ms`,
  `--tia-travel-ms`, `--tia-pulse-ms`.
- `sampleGlyph` — the specimen sigil on the sample record.

Pass a modified copy through the component's `theme` input to restyle one host without touching
the default, or edit the default to restyle everywhere.

Rules a replacement theme must keep:

1. Keep the semantic keys — `gene-record`, `training-log`, `environment-log`, and the three trait
   categories — so scene data still resolves.
2. Pair every colour with a distinct glyph and texture. Category meaning must survive greyscale.
3. Keep glyph paths inside their declared `viewBox`.
4. Keep decorative contrast below the scientific marks: clue chips, verdicts, and trays must stay
   the most readable elements.

Layout is driven by container queries on the console itself, so a theme change never requires
layout work. Reduced motion is handled centrally: the `reduced-motion` class and the
`prefers-reduced-motion` query switch every animation off while keeping the same final state.

## Changing the reveal animation

The reveal is a declarative teaching sequence (`EVIDENCE_PATH_SEQUENCE` in
`data/core-teaching-sequences.ts`), validated against the visual pack. Cue timing, captions, and
the `classification-prediction` checkpoint are data — the component only reads the resulting
frame. Caption wording comes from the copy map the lesson supplies, keyed by caption ID.

The path geometry itself is measured from the rendered layout at reveal time, so it follows the
real positions of the source panel, the observation card, and the tray at any width.

## Copy contract

The `copy` input resolves these label IDs. A missing entry falls back to a readable form of the ID
rather than breaking the layout.

| Key | Used for |
| --- | --- |
| `sample.<sampleId>.label` / `.caption` | Sample record slab |
| `observation.<id>.label` / `.detail` | Observation card and queue |
| `clue.<clueId>` | Evidence clue chips |
| `source.<sourceId>.title` / `.caption` | Source instrument panels |
| `tray.<category>.title` / `.caption` | Trays and prediction options |
| `prediction.<category>.caption` | Prediction control captions |
| `evidence-path.*` | Teaching-sequence captions |
