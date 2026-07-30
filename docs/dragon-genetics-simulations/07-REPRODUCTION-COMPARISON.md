# 07 - Reproduction Comparison

**Curriculum:** Module 7, Sexual vs. Asexual and Station D, Mitosis vs. Meiosis ·
**Skills:** GEN-6 and GEN-7 · **Contract:** `reproduction-comparison`

## Teaching purpose

Students compare one-parent genotype copying with two-parent allele mixing and connect the models to
differences in genetic variation. The display must not imply that either process has a goal.

## Scene inputs

- source sample IDs;
- sexual offspring sample IDs;
- asexual offspring sample IDs; and
- genotype records for each output sample.

## Display model

Use two synchronized chambers. The asexual chamber copies one chromosome/allele record into multiple
offspring records. The sexual chamber selects and reshuffles alleles from two parent records. Output
rows use sample IDs and genotype tiles instead of parent or offspring dragon images.

## Student sequence

1. Predict which chamber will create more modeled combinations.
2. Run one copying cycle and one mixing cycle.
3. Compare offspring genotype rows.
4. Count unique combinations.
5. Pin the chromosome evidence supporting the reproduction label.

Learn mode traces both processes slowly. Practice hides chamber labels. Official mode asks students
to identify the process from output patterns. Reteach separates cell-copying language from
inheritance across generations.

## Semantic targets and events

Targets: `asexual-chamber`, `sexual-chamber`, `single-parent-source`, `parent-a-alleles`,
`parent-b-alleles`, `copy-path`, `mixing-path`, `offspring-genotype-row`, `unique-count`.

Emit `prediction-locked`, `reveal-requested`, `hotspot-selected`, and `evidence-pinned` events. Save
the predicted chamber, generated sample IDs, unique counts, and selected pathway evidence.

## Acceptance checks

- The asexual side represents genotype copying without showing literal dragon cloning.
- The sexual side visibly traces one allele contribution from each parent.
- Variation is measured from output records, not inferred from decorative differences.
- Both chambers remain comparable at the same scale and generation count.
