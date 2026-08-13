# 02 - Genome Microscope

**Curriculum:** Module 2, Genome Decoder · **Skill:** GEN-2

**Runtime status:** dedicated SVG workstation

## Teaching purpose

Students investigate the nested information model:

`dragon cell → nucleus → chromosome pairs → one chromosome → DNA → gene → allele`

The visual begins with a somatic dragon cell. Students may zoom one level at a time or select a
visible structure. The model keeps chromosome, DNA, gene, and allele distinct instead of collapsing
them into one object.

## Code-driven model

- The cell membrane, organelles, nucleus, chromosome glyphs, DNA helix, base pairs, and gene region
  are SVG or reusable SVG components.
- The default genome contains four autosome pairs and one sex-chromosome pair.
- The autosome list is an input, so the laboratory can change the modeled pair count without
  redrawing the workstation.
- Female mode displays XX; male mode displays XY with a shorter Y chromosome.
- Full chromosome bands, centromeres, lengths, and locus positions come from the same catalog used
  by Allele Workbench.
- Genes and allele DNA sequences come from the shared workstation catalogs.

The uploaded cell and chromosome-set illustrations are composition references only. No raster
image is used by the workstation.

## Current implementation

| Concern                               | Source                                                                                                                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated workstation                 | [`workstations/genome-microscope/genome-microscope.component.ts`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.ts)                                                                                               |
| SVG template                          | [`genome-microscope.component.html`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.html)                                                                                                                          |
| Responsive presentation               | [`genome-microscope.component.scss`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.scss)                                                                                                                          |
| Zoom and chromosome-pair models       | [`genome-microscope.models.ts`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.models.ts)                                                                                                                                    |
| Shared chromosome geometry and colors | [`workstations/shared/dragon-chromosome.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-chromosome.catalog.ts)                                                                                                                         |
| Reusable chromosome SVG               | [`workstations/shared/chromosome-svg.component.ts`](../../src/app/features/dragon-genetics/workstations/shared/chromosome-svg.component.ts)                                                                                                                           |
| Shared gene and allele records        | [`workstations/allele-workbench/allele-vault.models.ts`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault.models.ts)                                                                                                                 |
| Shared allele DNA                     | [`workstations/shared/dragon-gene-dna.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-gene-dna.catalog.ts)                                                                                                                             |
| Routed host and reviewed questions    | [`adaptive/dragon-simulation-experience.page.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts) and [`adaptive/dragon-simulation.registry.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation.registry.ts) |

## Interaction behavior

- `Zoom in` and `Zoom out` move exactly one scientific level.
- The level rail permits direct review of a previously observed scale.
- Selecting a chromosome pair opens both homologs, explicitly labeled by parental origin.
- Selecting a gene locus focuses the gene region on the DNA model.
- The allele level compares the two code-driven reference DNA sequences.
- Selecting a scientific object emits the matching adaptive model target for an embedded question.

## Acceptance targets

- The initial state is the complete dragon cell, not a chromosome or isolated DNA fragment.
- The nucleus contains the configured number of autosome pairs plus one sex pair.
- XX and XY are visually and semantically distinct.
- Chromosome colors never drift from Allele Workbench because both use the same catalog objects.
- DNA base pairing does not imply that one base pair is an allele.
- Reduced-motion mode shows the same final state without animated scaling.
- Keyboard users can operate the zoom controls, level rail, chromosomes, genes, and sex selector.
