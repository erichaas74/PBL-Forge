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
- `companion-show/` owns the student-written breed standard, the kennel and its pedigree, litters and
  the nursery, the pedigree-only bloodline meter, and the breed registry. It is the open-workstation
  alternative to the arena and has its own route at `/dragon-genetics/companion-show`.
- `dna-process-lab/` owns DNA sequence comparison, mutation, and repair tools.
- `dragon-hatchery/` owns account-parent loading, five-pair meiosis and gamete selection, selected
  fertilization records, parent canvases, the egg bench, Hatchery renderer, and scene adapter.
- `genome-microscope/` owns the staged cell-to-allele SVG investigation.
- `incubator-sampler/` owns phenotype-only batch breeding, animated sorting, balanced bucket pools,
  visible-outcome history, and user-scoped sampler persistence.
- `island-diversity/` owns the seven-island population model, field genotype scans, individual
  relocation, protected-pair breeding, generation events, population metrics, and the persistent
  conservation ledger. It has its own route at `/dragon-genetics/island-diversity`.
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
- `shared/` owns chromosome data, DNA catalog data, the genetics notebook, the reusable user-account
  genetics file shared across labs, and `visible-phenotype.ts` — the one place a phenotype-only lab
  names an observable form without naming the allele pair behind it.

Generic assembly rendering remains in `src/app/shared/assembly`. Semantic visual contracts and
cross-workstation renderer primitives remain in `src/app/shared/dragon-visuals`; feature-specific
workstation components do not belong there.
