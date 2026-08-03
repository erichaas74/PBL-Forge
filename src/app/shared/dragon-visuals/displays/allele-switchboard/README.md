# Allele Workbench reference renderer

The Module 4 renderer consumes `allele-switchboard` scenes from `DragonVisualBridge`. It is the
reference shell for Royal Hatchery workstation interactions: mission intake, sample handling,
gene discovery, model manipulation, prediction, analysis, interpretation, evidence, and records.
It owns the replaceable laboratory presentation, SVG chromosome drawing, accessible machine
controls, and sequence playback. It does not calculate phenotype expression or grade evidence.

## Files

| File | Responsibility |
| --- | --- |
| `allele-switchboard-display.component.ts/.html/.scss` | Interactive instrument, SVG chromosome pair, animation state, and accessibility |
| `allele-switchboard.view-model.ts` | Pure scene-to-display mapping and screen-reader summary |
| `allele-switchboard.theme.ts` | Replaceable palette, motion timing, and semantic target IDs |

The lesson supplies sample/chamber state, the centered and locked locus, starting/requested/working
allele pairs, both socket states, prediction and interpretation selections, and the actual expression
result. Visual updates can replace this folder without changing curriculum or the required Firestore
record shape.

## Semantic event map

| Laboratory action | Shared event | Target/value |
| --- | --- | --- |
| Select vial | `specimen-selected` | vial code / `select` |
| Load or eject vial | `hotspot-selected` | `sample-chamber` / `load` or `eject` |
| Lock chamber | `hotspot-selected` | `sample-lock` / `lock` |
| Move chromosome stage | `hotspot-selected` | `chromosome-stage` / `previous` or `next` |
| Lock centered gene | `hotspot-selected` | `gene-locator` / `lock` |
| Toggle evidence imaging | `hotspot-selected` | semantic imaging target / boolean |
| Move allele cartridge | `allele-moved` | allele socket / symbol |
| Secure cartridge socket | `hotspot-selected` | socket lock / `secure` |
| Record a prediction | `prediction-locked` | prediction target / response |
| Energize analyzer | `reveal-requested` | `expression-path` |
| Record interpretation | `hotspot-selected` | interpretation target / response |
| Pin rule evidence | `evidence-pinned` | evidence ID |

The renderer can emit every operation by keyboard, click, or optional drag-and-drop. The station
controller decides whether state advances, what scientific result is true, and what the saved record
scores. Official mode therefore stays a presentation policy, never a second grading path.
