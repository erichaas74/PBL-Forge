# 08 - Sibling Tracer

**Curriculum:** Module 8, Sibling Variation and Crossing Over · **Skills:** GEN-5 and GEN-7 ·
**Contract:** `sibling-tracer`

## Teaching purpose

Students use parent-to-offspring allele paths to explain why siblings can differ. Each sibling
receives one allele per modeled gene from each parent, but may receive a different combination.

## Scene inputs

- two parent sample IDs;
- sibling sample IDs;
- optional focus gene;
- allele `parentSource` values; and
- sibling genotype and phenotype labels.

## Display model

Place parent allele lanes at the top and sibling genotype records below. Use labeled solid/dashed
paths to trace allele origin. Selecting siblings highlights only the relevant paths and a comparison
matrix. Do not use dragon profiles or visible body traits.

## Student sequence

1. Select two sibling records and predict whether their alleles match.
2. Choose a focus gene.
3. Trace one allele from each parent into each sibling pair.
4. Reveal phenotype labels after the genotype trace.
5. Pin the path that explains a similarity or difference.

Learn mode traces one gene. Practice compares two siblings across several genes. Official mode asks
for the path supporting a claim. Reteach isolates parent A and parent B contributions before
recombining the view.

## Semantic targets and events

Targets: `parent-a-alleles`, `parent-b-alleles`, `sibling-record`, `maternal-path`,
`paternal-path`, `focus-gene`, `sibling-comparison`, `phenotype-readout`.

Emit `specimen-selected`, `hotspot-selected`, `prediction-locked`, and `evidence-pinned` events. Save
the compared sibling IDs, focus gene, selected allele path, and student explanation reference.

## Acceptance checks

- Every displayed offspring allele traces to exactly one parent source.
- Parent source is distinguishable without color.
- The display does not claim siblings differ only because of crossing over.
- The same tracer can reconstruct a saved official offspring record.
