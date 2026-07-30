# 05 - Punnett Composer

**Curriculum:** Module 5, Breeding Predictor · **Skill:** GEN-5 ·
**Contract:** `punnett-composer`

## Teaching purpose

Students model one allele from each parent in every offspring cell, then convert genotype counts
into phenotype probabilities. The square predicts possibilities; it does not guarantee a batch.

## Scene inputs

- two parent sample IDs and a focus gene;
- each parent's allele pair;
- four offspring allele-pair cells; and
- student genotype and phenotype distributions.

## Display model

Show parent A alleles across the top, parent B alleles down the side, and a classic 2 × 2 grid.
Cells contain allele tokens and genotype labels, never miniature dragons. Below the grid, group equal
genotypes and display phenotype probability bars that total 100%.

## Student sequence

1. Place each parent's alleles on the axes.
2. Predict at least one offspring genotype.
3. Move one allele from each parent into all four cells.
4. Group genotypes and calculate phenotype probabilities.
5. Lock both distributions before the lesson enables breeding.

Learn mode demonstrates one cell before students complete three. Practice varies crosses and traits.
Official mode requires all four genes and locks predictions before generation. Reteach traces a
single cell back to both source alleles.

## Semantic targets and events

Targets: `parent-a-alleles`, `parent-b-alleles`, `offspring-cell-1` through
`offspring-cell-4`, `offspring-slot-a`, `offspring-slot-b`, `genotype-groups`,
`phenotype-probability`, `probability-total`.

Emit `allele-moved`, `prediction-locked`, `evidence-pinned`, and checkpoint events. Save the complete
grid and both distributions, not only the final percentage.

## Acceptance checks

- Every cell visibly contains one allele from each parent.
- Parent-source meaning uses labels/shapes in addition to color.
- Percentages cannot be submitted unless their distribution totals 100%.
- The display distinguishes predicted probability from observed results.
