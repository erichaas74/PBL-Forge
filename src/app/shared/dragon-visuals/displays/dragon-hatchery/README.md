# Dragon Hatchery display

The shared clutch instrument. It draws whichever `dragon-hatchery` scene `DragonVisualBridge`
holds and reports what the student did as `DragonVisualStageEvent`s. Several modules host it with
different tools enabled, so it belongs to no single module.

| File | Role |
| --- | --- |
| `dragon-hatchery-display.component.ts/.html/.scss` | The bay: egg tray, examination bench, hatch tray, evidence marks |
| `hatchery-egg-glyph.component.ts` | One shell, drawn in its instrument state |
| `dragon-hatchery.view-model.ts` | Pure scene → view model mapping and the screen-reader summary |
| `dragon-hatchery.theme.ts` | Bay palette, shell geometry, and candling/sampling/hatching timings |

## What the student can do

| Tool | Reveals | Semantic event |
| --- | --- | --- |
| Examine (candling) | The traits the egg will show | `reveal-requested`, value `examine` |
| Sample DNA | The allele pair at the focus gene | `reveal-requested`, value `sample` |
| Hatch | Only the eggs staged in the hatch tray | `egg-marked`, then `hatch-committed` |

Selecting an egg for the bench emits `specimen-selected`; pinning a mark emits `evidence-pinned`.

A module enables a subset with `availableToolIds`, and makes the tools scarce with
`examinesRemaining`, `samplesRemaining`, and `hatchLimit`. An examine-only module gets a candling
station; a sample-only module gets a genotype bench; all three give the full hatchery.

## Two records, kept apart

The concealment rules live in the view model, not the template, so a sealed record cannot leak
through the DOM:

- an unexamined egg carries **no trait wording** at all;
- an unsampled egg carries **no allele pair**, and its locus stays behind the shared chromosome
  shield; and
- **hatching reveals only what a dragon shows.** A hatched egg that was never sampled still has
  `genotypeLabel === null`, because seeing a hatchling is not a genotype test.

Which eggs have been examined, sampled, or hatched arrives in the scene as `DragonEggRecord`
flags. Nothing here decides them, grades an answer, or advances a lesson.

## Phases

| Phase | What is operable |
| --- | --- |
| `observe` | Selecting an egg for the bench |
| `predict` | Nothing in the instrument; the lesson owns the prediction control |
| `manipulate` | Examine, sample, and staging eggs in the hatch tray |
| `reveal` | Committing the hatch (staging stays open until it is committed) |
| `explain` | Evidence marks |

## Allele and genotype artwork

Chromosomes come from `../shared/chromosome-pair.component.ts`, which draws the diagram defined in
`../shared/chromosome-diagram.ts` — geometry and colours taken from `docs/allelle-diagram.html`.
The bench uses `view="full"` with `concealed` bound to "not yet sampled".

Shells come from `hatchery-egg-glyph.component.ts`, whose outline and speckle count live in the
theme. Speckles are derived from the egg's tray position, so a given egg looks identical on every
replay and no two eggs in a clutch look alike. The glyph is always `aria-hidden`; the host supplies
the accessible text.

## Copy contract

The `copy` input resolves these label IDs; a missing entry falls back to a readable form of the ID.

| Key | Used for |
| --- | --- |
| `clutch.<clutchId>.label` | Clutch record heading |
| `sample.<eggId>.caption` | Egg caption on the bench |
| `trait.<traitId>.name` | Trait names in the readout |
| `evidence.<markId>` | Evidence marks |
| `hatchery.*` | Teaching-sequence captions |

Phenotype wording is the sample's own `phenotypeId`, and genotypes are the allele letters, so
neither needs a copy entry.
