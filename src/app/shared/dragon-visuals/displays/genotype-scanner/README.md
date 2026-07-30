# Genotype Scanner display

The Module 3 station renderer. It draws whichever `genotype-scanner` scene
`DragonVisualBridge` holds and reports what the student did as `DragonVisualStageEvent`s.

| File | Role |
| --- | --- |
| `genotype-scanner-display.component.ts/.html/.scss` | The console: readout, shielded scan bay, option grid, evidence marks |
| `genotype-scanner.view-model.ts` | Pure scene → view model mapping and the screen-reader summary |
| `genotype-scanner.theme.ts` | Console palette and scan timings |

Correctness arrives in the scene as `DragonScannerOptionStatus`; nothing here grades an answer.
The scanned allele pair is absent from the view model until the lesson sets `genotypeRevealed`,
so a shielded locus cannot leak through the DOM.

## Allele and genotype artwork

Chromosomes come from `../shared/chromosome-pair.component.ts`, which draws the diagram defined in
`../shared/chromosome-diagram.ts` — geometry and colours taken from `docs/allelle-diagram.html`.

Two views of the same drawing keep the console coherent:

- `view="full"` — the whole chromosome pair in the scan bay, with the focus locus shielded until
  the scan runs.
- `view="locus"` — the identical drawing cropped to the focus band, used for each genotype
  option card.

`geneIndex` selects the gene band (`chromosomeModel - 1`), `alleles` supplies the two letters, and
`concealed` covers the locus with the hatched shield and lock. The component is always
`aria-hidden`; the host supplies the accessible text.

To restyle chromosomes across every station, edit `CHROMOSOME_DIAGRAM` or pass a modified
`ChromosomeDiagramTheme`. Keep the four gene bands distinguishable by position as well as colour,
and keep glyph coordinates inside the declared body height.

## Copy contract

The `copy` input resolves these label IDs; a missing entry falls back to a readable form of the ID.

| Key | Used for |
| --- | --- |
| `sample.<sampleId>.caption` | Sample record and comparison record |
| `phenotype.<traitId>.<dominant\|recessive>` | Phenotype option labels |
| `evidence.<markId>` | Evidence marks |
| `genotype-scan.*` | Teaching-sequence captions |

Genotype option labels are the allele pair itself (`WW`, `Ww`, `ww`) and need no copy entry.
