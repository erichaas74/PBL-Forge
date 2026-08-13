# Dragon Genetics workstations

All active student workstation UI lives under this directory.

Product behavior is governed by
[`docs/DRAGON_GENETICS_WORKSTATION_RULES.md`](../../../../../docs/DRAGON_GENETICS_WORKSTATION_RULES.md).
Dedicated workstations are open investigations with no embedded question dock or scripted phase
sequence.

- `allele-workbench/` owns allele selection, expression, and chart-building behavior.
- `blood-compatibility/` owns antiserum testing, the multiple-allele blood catalog, donor supply
  constraints, transfusion compatibility, the Healing Chamber, and persistent emergency records.
  It has its own open-workstation route at `/dragon-genetics/blood-type-lab`.
- `dna-process-lab/` owns DNA sequence comparison, mutation, and repair tools.
- `dragon-hatchery/` owns account-parent loading, five-pair meiosis and gamete selection, selected
  fertilization records, parent canvases, the egg bench, Hatchery renderer, and scene adapter.
- `genome-microscope/` owns the staged cell-to-allele SVG investigation.
- `pedigree-lab/` owns the historical dragon archive, the pedigree canvas, carrier deduction under a
  student-chosen inheritance model, the budgeted sequencing bay, and the breeding board. It is the
  only workstation with its own route (`/dragon-genetics/pedigree-lab`) rather than a registry entry.
- `protein-rescue/` owns patient gene samples, transcription-to-translation investigation, Dracase
  enzyme and digestion models, diet trials, and persistent clinical rescue records. It has its own
  open-workstation route at `/dragon-genetics/protein-rescue`.
- `punnett-composer/` owns the open 2 × 2 inheritance canvas, gamete placement, cell inspection,
  and saved cross records.
- `simulation-visual/` is the compact generic model used by registry-driven workstations that do
  not yet need a dedicated instrument.
- `shared/` owns chromosome data, DNA catalog data, the genetics notebook, and the reusable
  user-account genetics file shared across labs.

Generic assembly rendering remains in `src/app/shared/assembly`. Semantic visual contracts and
cross-workstation renderer primitives remain in `src/app/shared/dragon-visuals`; feature-specific
workstation components do not belong there.
