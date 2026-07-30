# Genome Microscope display

The Module 2 station renderer consumes `genome-microscope` scenes from `DragonVisualBridge` and
emits semantic stage events. It contains no lesson scoring, Firestore, routes, module unlocks, or
dragon anatomy.

| File | Role |
| --- | --- |
| `genome-microscope-display.component.ts/.html/.scss` | Responsive instrument, interactions, animation state, and accessibility |
| `genome-microscope.view-model.ts` | Pure scene-to-view mapping and screen-reader summary |
| `genome-microscope.theme.ts` | Replaceable palette, level accents, target IDs, and motion timing |
| `genome-level-glyph.component.ts` | Curriculum-free SVG cell, chromosome, DNA, gene, and allele geometry |

Correctness enters through lesson-owned `DragonGenomeLabelPlacement.status` values. The renderer
does not compare labels with destinations and does not know whether a prediction or evidence mark
is correct.

## Graphics updates

Edit or replace the theme and glyph component without changing scene adapters or lesson logic.
Preserve the five semantic level IDs, the target IDs in `GENOME_MICROSCOPE_TARGETS`, and the allele
slot targets. Essential curriculum wording remains in the feature copy map rather than inside SVG.

The five bays remain visible at all widths. Practice and Official scenes conceal bay identities
until reveal; Learn and Reteach can show guided level hints. Allele symbols stay hidden until the
lesson includes `allele` in `revealedLevelIds`.

## Animation

`GENOME_ZOOM_SEQUENCE` owns the reusable cell-to-allele timeline and its prediction checkpoint.
`prefers-reduced-motion` skips spatial travel while preserving the same resolved hierarchy and
allele state.
