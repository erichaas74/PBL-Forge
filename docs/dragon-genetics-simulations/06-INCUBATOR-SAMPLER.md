# 06 - Incubator Sampler

**Curriculum:** Module 6, Probability vs. Actual Hatchlings · **Skills:** GEN-5 and GEN-7 ·
**Contract:** `incubator-sampler`

## Teaching purpose

Students compare an expected Mendelian distribution with actual sampled outcomes and observe why
larger samples usually resemble the expected distribution more closely.

## Scene inputs

- saved parent cross and focus gene;
- egg sample IDs;
- `expectedPercent` and nullable `observedPercent`;
- deterministic trial seed; and
- current hatch/sample count.

## Display model

Show generic numbered eggs on the left and one aligned expected-versus-observed plot on the right.
Eggs reveal genotype or phenotype labels, not hatchling bodies. Keep the expected marker fixed while
observed counts and percentages update at 8-offspring and 100-offspring sample sizes.

## Student sequence

1. Read the expected probability from the saved cross.
2. Predict whether a small batch will match it exactly.
3. Sample or reveal eggs one at a time or as an approved batch.
4. Compare observed marks to the fixed expected marker.
5. Select evidence explaining sample variation and the effect of sample size.

Learn mode narrates the first small batch. Practice compares two fixed seeds. Official mode records
the locked expectation before hatching. Reteach overlays small and large samples on the same scale.

## Semantic targets and events

Targets: `egg-tray`, `egg-sample`, `expected-marker`, `observed-bar`, `sample-count`,
`variance-gap`, `evidence-mark`.

Emit `specimen-selected`, `prediction-locked`, `reveal-requested`, and `evidence-pinned` events. Save
the seed and aggregate outcomes so replay never depends on saved animation frames.

## Acceptance checks

- Expected and observed values use the same axis and units.
- A small sample is not labeled incorrect merely for differing from expectation.
- The same seed always reconstructs the same ordered results.
- Screen-reader text announces counts, percentages, and comparison direction.
