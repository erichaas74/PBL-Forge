# 11 - Dragon Hatchery (shared instrument)

**Curriculum:** hosted by several modules · **Skills:** GEN-3, GEN-5, GEN-7 ·
**Contract:** `dragon-hatchery`

Unlike stations 1-10, this instrument does not belong to one module. It is the clutch surface the
laboratory reuses whenever eggs are on the bench, configured by whichever module hosts it.

## Teaching purpose

Students hold a clutch of sealed eggs and decide what to find out before deciding what to keep.
Two records stay deliberately separate: candling reports the traits an egg will show, and a DNA
sample reports the allele pair behind them. Hatching reveals a dragon, never its genotype.

## Scene inputs

- clutch ID, optional parent sample IDs, and optional focus gene;
- one `DragonEggRecord` per egg (`examined`, `sampled`, `hatched`, `locked`);
- the active egg and the eggs staged in the hatch tray;
- available tools plus `examinesRemaining`, `samplesRemaining`, and `hatchLimit`; and
- optional metrics, evidence marks, and the pinned mark.

## Display model

A numbered egg tray on the left, an examination bench on the right, and a hatch tray beneath. Eggs
are generic shells that show instrument state only: candling light when examined, a sampling needle
and strand when sampled, a crack when hatched. Trait rows and the chromosome pair appear on the
bench; no hatchling body is drawn anywhere.

## Student sequence

1. Read the clutch record. Nothing about an egg is visible yet.
2. Predict, when the module asks for one, using the parent cross rather than the shells.
3. Examine or sample the eggs the investigation needs, spending a limited budget.
4. Stage the eggs to keep, then commit the hatch.
5. Select the evidence that reports what was actually observed.

Learn mode narrates each reveal and names the trait. Practice drops the hints. Official withholds
verdicts until the record is saved. Reteach isolates one diagnosed misconception on the same clutch.

## Module configurations

| Host module | Tools | Typical settings |
| --- | --- | --- |
| Module 1 - Traits | `examine` | No prediction, unlimited candling, no hatching |
| Module 3 - Genotype vs. phenotype | `examine`, `sample` | Scarce samples so two same-looking eggs must be chosen between |
| Module 6 - Probability vs. actual | all three | Prediction required, 8-egg clutch, hatch limit matching the sample size |
| Module 8 - Sibling variation | `sample`, `hatch` | Hatch two siblings and compare the sampled allele pairs |
| Module 9 - Diversity | `examine`, `hatch` | Hatch limit forces a trade-off between traits and variation |

## Hosting it in a module

The lesson host is configured entirely through inputs, so a module adds the hatchery in one block:

```html
<app-dragon-hatchery-station
  [clutch]="store.clutch()"
  [parents]="[parentA(), parentB()]"
  clutchId="module-6-run-1"
  clutchLabel="Ember × Tide · run 1"
  focusTraitId="wings"
  moduleId="module-6"
  [tools]="['examine', 'sample', 'hatch']"
  [sampleBudget]="3"
  [hatchLimit]="2"
  [mode]="store.mode()"
  (recordSaved)="store.saveHatcheryRecord($event)"
  (hatchedDragons)="store.carryForward($event)" />
```

`recordSaved` returns the assessment record; `hatchedDragons` returns the chosen offspring so the
next module — or the arena — can carry them forward.

## Semantic targets and events

Targets: `clutch-record`, `egg-tray`, `egg-sample`, `examine-control`, `sample-control`,
`phenotype-readout`, `allele-slot-a`, `allele-slot-b`, `hatch-tray`, `hatch-control`,
`evidence-mark`.

Emit `specimen-selected`, `reveal-requested` (value `examine` or `sample`), `egg-marked`,
`hatch-committed`, and `evidence-pinned`. The saved record carries the seed, the eggs read, the
eggs hatched, the prediction, and the pinned evidence — never animation frames.

## Acceptance checks

- An unexamined egg publishes no trait wording, and an unsampled egg publishes no allele pair.
- A hatched egg that was never sampled still reports no genotype.
- Spending a tool budget closes that tool without closing the others.
- The hatch tray never exceeds the module's limit, and committing it hatches exactly the staged eggs.
- A prediction that misses a small clutch is reported as variation, not as an error.
- Screen-reader text announces the clutch counts, the selected egg's state, and the hatch tray.

## Implementation

- Display: [`displays/dragon-hatchery/`](../../src/app/shared/dragon-visuals/displays/dragon-hatchery/README.md)
- Scene builder: `createDragonHatcheryScene` in
  [`visual-adapter/dragon-visual-scene.adapter.ts`](../../src/app/features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter.ts)
- Lesson host: [`stations/dragon-hatchery-station.component.ts`](../../src/app/features/dragon-genetics/stations/dragon-hatchery-station.component.ts),
  configured per module through its inputs
- Teaching sequence: `HATCHERY_SELECTION_SEQUENCE`
