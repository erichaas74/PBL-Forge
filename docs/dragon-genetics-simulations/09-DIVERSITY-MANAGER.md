# 09 - Diversity Manager

**Curriculum:** Module 9, Diversity Manager · **Skill:** GEN-8 ·
**Contract:** `diversity-manager`

## Teaching purpose

Students compare breeding strategies using allele frequency, unique genotype counts, and allele
retention. They learn why preserving variation matters without equating genetic diversity with an
individual dragon's value or battle power.

## Scene inputs

- population sample IDs and their gene records;
- selected `strategyId`;
- candidate parent pairs;
- allele-frequency and genotype-count metrics; and
- deterministic projected offspring records.

## Display model

Show population samples as neutral nodes linked to allele tokens and genotype counters. Compare a
narrow strategy and a balanced strategy side by side. Use aligned frequency bars, retained/lost
allele indicators, unique genotype counts, and a plain-language risk alert. Avoid dragon silhouettes
and an unexplained single diversity score.

## Student sequence

1. Inspect the starting allele pool.
2. Predict which strategy retains more variation.
3. Select parent pairs and run both projections.
4. Compare frequency shifts, retained alleles, and unique genotypes.
5. Recommend a strategy and pin two evidence marks.

Learn mode explains each metric. Practice lets students revise one pairing. Official planning locks
the chosen strategy and rationale. Reteach contrasts individual phenotype success with population
variation.

## Semantic targets and events

Targets: `population-node`, `allele-frequency`, `genotype-count`, `strategy-narrow`,
`strategy-balanced`, `retained-allele`, `lost-allele`, `risk-alert`, `evidence-mark`.

Emit `specimen-selected`, `prediction-locked`, `hotspot-selected`, and `evidence-pinned` events. Save
starting metrics, strategy, parent pairs, projected metrics, and both selected evidence marks.

## Acceptance checks

- Strategy comparisons begin from equivalent starting populations and seeds.
- Every warning names the evidence causing it; color alone is insufficient.
- Lost alleles can be traced to the changed population records.
- Battle score is absent from all diversity calculations and displays.
