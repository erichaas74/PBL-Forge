# Dragon Genetics workstations

All active student workstation UI lives under this directory.

Product behavior is governed by
[`docs/DRAGON_GENETICS_WORKSTATION_RULES.md`](../../../../../docs/DRAGON_GENETICS_WORKSTATION_RULES.md).
Dedicated workstations are open investigations with no embedded question dock or scripted phase
sequence.

- `allele-workbench/` owns allele selection, expression, and chart-building behavior.
- `dna-process-lab/` owns DNA sequence comparison, mutation, and repair tools.
- `dragon-hatchery/` owns the parent canvases, egg bench, hatchery renderer, scene adapter,
  content, and records.
- `genome-microscope/` owns the staged cell-to-allele SVG investigation.
- `simulation-visual/` is the compact generic model used by registry-driven workstations that do
  not yet need a dedicated instrument.
- `shared/` owns chromosome data, DNA catalog data, and the genetics notebook shared across labs.

Generic assembly rendering remains in `src/app/shared/assembly`. Semantic visual contracts and
cross-workstation renderer primitives remain in `src/app/shared/dragon-visuals`; feature-specific
workstation components do not belong there.
