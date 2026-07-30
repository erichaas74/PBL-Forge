# Allele Switchboard renderer

The Module 4 renderer consumes `allele-switchboard` scenes from `DragonVisualBridge`. It owns the
replaceable laboratory presentation, SVG chromosome drawing, accessible token controls, and
sequence playback. It does not calculate phenotype expression or grade evidence.

## Files

| File | Responsibility |
| --- | --- |
| `allele-switchboard-display.component.ts/.html/.scss` | Interactive instrument, SVG chromosome pair, animation state, and accessibility |
| `allele-switchboard.view-model.ts` | Pure scene-to-display mapping and screen-reader summary |
| `allele-switchboard.theme.ts` | Replaceable palette, motion timing, and semantic target IDs |

The lesson supplies starting, requested, and working allele pairs plus the actual expression result.
Visual updates can replace this folder without changing the curriculum or Firestore record shape.
