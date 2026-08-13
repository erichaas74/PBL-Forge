# 04 - Allele Workbench

**Curriculum:** Module 4, Allele Expression · **Skill:** GEN-4

**Runtime status:** dedicated workstation

This workstation is the reference implementation for the open-investigation rules in
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](../DRAGON_GENETICS_WORKSTATION_RULES.md). It has no embedded
question panel, phase rail, or prescribed sequence.

## Teaching purpose

Students investigate how two alleles at one gene locus produce a genotype and an expressed trait.
They build a persistent genetics chart by testing reference samples, assigning a trait, and
classifying the relationship between alleles. The workstation does not reveal the old allele-letter
answer in advance.

## Investigation model

- The teacher-controlled catalog determines which chromosomes and genes are available.
- Each chromosome owns a non-repeating set of genes.
- Selecting a gene exposes its two reference-sample allele tokens.
- Students place tokens in Sample A and Sample B by drag-and-drop or select-then-place.
- The specimen viewer renders the phenotype only after both reference samples are present.
- Students assign the trait and allele relationship in the genetics chart.
- Completed discoveries persist in the notebook and can be reused by other workstations.

Students choose combinations and repeat tests in any order. The scientific goal is to determine
which trait the selected gene influences, how its two allele samples behave, and which evidence
supports the chart record. The interface supplies specimens, tools, and consequences; it does not
script a path to the answer.

## Current implementation

| Concern                               | Source                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workstation component                 | [`allele-vault-workbench.component.ts`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault-workbench.component.ts)                                                                                                                                                               |
| Template and layout                   | [`allele-vault-workbench.component.html`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault-workbench.component.html) and [`allele-vault-workbench.component.scss`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault-workbench.component.scss) |
| Allele and chart models               | [`allele-vault.models.ts`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault.models.ts)                                                                                                                                                                                         |
| Phenotype mapping                     | [`allele-phenotype-profile.ts`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-phenotype-profile.ts)                                                                                                                                                                               |
| Reusable data-driven chromosome SVG   | [`shared/chromosome-svg.component.ts`](../../src/app/features/dragon-genetics/workstations/shared/chromosome-svg.component.ts)                                                                                                                                                                                  |
| Chromosome and DNA source catalogs    | [`shared/dragon-chromosome.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-chromosome.catalog.ts) and [`shared/dragon-gene-dna.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-gene-dna.catalog.ts)                                               |
| Persistent cross-workstation notebook | [`shared/genetics-notebook.models.ts`](../../src/app/features/dragon-genetics/workstations/shared/genetics-notebook.models.ts)                                                                                                                                                                                  |
| Routed host and persistence wiring    | [`adaptive/dragon-simulation-experience.page.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts)                                                                                                                                                                         |

The former duplicate adaptive, station-controller, and shared-renderer copies were replaced by this
single workstation implementation.

## Source-of-truth boundary

Chromosome location, gene identity, allele samples, DNA sequences, phenotype profiles, and notebook
records are data-driven. The SVG receives normalized chromosome geometry and band data. Other
workstations should load the same catalog/notebook models instead of copying gene or DNA records.

## Accessibility and responsive behavior

- Dragging has a select-then-place alternative using native buttons.
- Allele identity uses labels and distinct stripe patterns, not color alone.
- Chromosome SVGs scale with their containers and expose accessible labels.
- Workstation panels restack on narrow screens without changing the investigation state.
- Reference chromosomes begin as neutral placeholders and reveal data only after placement.

## Acceptance targets

- Allele symbols that students must determine are not pre-labeled as answers.
- Every gene belongs to exactly one chromosome in the teacher-controlled catalog.
- Both sample alleles remain distinguishable after placement.
- The phenotype viewer updates from the existing dragon assembly renderer.
- Solved chart entries persist and are available to other workstations.
- Tests cover phenotype mapping, chromosome rendering inputs, notebook persistence, and interaction
  state.
