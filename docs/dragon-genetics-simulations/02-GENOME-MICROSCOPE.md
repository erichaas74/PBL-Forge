# 02 - Genome Microscope

**Curriculum:** Module 2, Genome Decoder · **Skill:** GEN-2

**Runtime status:** dedicated SVG workstation

## Teaching purpose

Students investigate the connected information model:

`dragon → cell → nucleus → chromosome pairs → one chromosome → gene → DNA → allele → protein`

The visual begins with a dragon loaded from the student's account genetics library. Students may
zoom one level at a time or select any visible structure. The model keeps chromosome, gene, DNA,
allele, and protein distinct instead of collapsing them into one object.

## Workstation contract

1. **Scientific goal:** Connect one loaded dragon to the nested biological structures and
   information that produce it: organism, cell, nucleus, chromosome pair, chromosome, gene, DNA,
   allele, and protein product.
2. **Manipulable evidence:** Students may load any available account dragon, move directly among
   magnification levels, select chromosomes and loci, and choose either allele copy from the loaded
   dragon. The same actions remain available in any scientifically valid order.
3. **Observable consequence:** The live dragon, shared cell/chromosome viewport, gene focus, DNA
   sequence, allele copies, mRNA, and protein-chain model all update from the selected specimen and
   locus. Moving between levels preserves the selection so containment remains visible.
4. **Student-built record:** The component emits a reusable evidence trail containing the loaded
   dragon, selected level, chromosome, gene, and allele copy. A host may persist that trail or attach
   a separate question or explanation without putting a question dock inside the workstation.
5. **Shared sources:** Account dragons come from `AccountGeneticsLibraryService`; dragon phenotype
   uses `SpecimenViewportComponent`; cell and chromosome views use
   `CellChromosomeViewportComponent` and the shared chromosome catalog; gene and allele records use
   the Allele Workbench catalog; DNA and transcription use the shared DNA-process models and
   `DnaTranscriptionAnimationComponent`.

## Code-driven model

- The live dragon renderer, cell/nucleus viewport, chromosome glyphs, DNA process animations, base
  sequences, gene region, and protein chain are existing reusable components or code-driven models.
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
| Interactive template                  | [`genome-microscope.component.html`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.html)                                                                                                                          |
| Responsive presentation               | [`genome-microscope.component.scss`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.scss)                                                                                                                          |
| Zoom and chromosome-pair models       | [`genome-microscope.models.ts`](../../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.models.ts)                                                                                                                                    |
| Shared chromosome geometry and colors | [`workstations/shared/dragon-chromosome.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-chromosome.catalog.ts)                                                                                                                         |
| Reusable chromosome SVG               | [`workstations/shared/chromosome-svg.component.ts`](../../src/app/features/dragon-genetics/workstations/shared/chromosome-svg.component.ts)                                                                                                                           |
| Shared gene and allele records        | [`workstations/allele-workbench/allele-vault.models.ts`](../../src/app/features/dragon-genetics/workstations/allele-workbench/allele-vault.models.ts)                                                                                                                 |
| Shared allele DNA                     | [`workstations/shared/dragon-gene-dna.catalog.ts`](../../src/app/features/dragon-genetics/workstations/shared/dragon-gene-dna.catalog.ts)                                                                                                                             |
| Routed open-workstation host          | [`adaptive/dragon-simulation-experience.page.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts)                                                                                                                               |

## Interaction behavior

- `Zoom in` and `Zoom out` move exactly one scientific level.
- The level rail permits direct review of a previously observed scale.
- Selecting a chromosome pair opens both homologs, explicitly labeled by parental origin.
- Selecting a gene locus focuses the gene region on the DNA model.
- The allele level compares the two code-driven reference DNA sequences.
- Selecting a scientific object emits reusable evidence state that an external explanation or
  assessment host may observe without adding a question dock to the workstation.

## Reusable host API

- `dragons`, `genes`, `alleles`, and `autosomeChromosomes` keep the scientific data supplied by
  the host.
- `initialLevel` lets an explanation open at a relevant scale without locking the other levels.
- `showSpecimenLoader` and `showGuideControl` allow a compact embedded view while keeping the full
  routed workstation open-ended.
- `evidenceChanged` reports the current dragon, level, chromosome, gene, and allele copy. A
  separate assessment may listen to that event; the microscope itself does not render answer
  choices or correctness feedback.

## Acceptance targets

- The initial state is the loaded whole dragon, not a disconnected chromosome or DNA fragment.
- Changing the loaded dragon updates its sex chromosomes and the allele copies available from its
  account genome.
- The nucleus contains the configured number of autosome pairs plus one sex pair.
- XX and XY are visually and semantically distinct.
- Chromosome colors never drift from Allele Workbench because both use the same catalog objects.
- DNA base pairing does not imply that one base pair is an allele.
- Reduced-motion mode shows the same final state without animated scaling.
- Keyboard users can operate the dragon loader, zoom controls, level map, chromosomes, genes, and
  allele copies.
