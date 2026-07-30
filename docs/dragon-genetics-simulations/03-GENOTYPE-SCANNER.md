# 03 - Dragon Breeding Hatchery and Genotype Scanner

**Curriculum:** Module 3, Genotype / Phenotype Reveal · **Skill:** GEN-3 ·
**Contracts:** `dragon-hatchery`, `genotype-scanner` · **Status:** built and wired into Module 3

## Teaching purpose

Students distinguish an observable phenotype from the allele pair that forms a genotype by
selecting parents, following up to three genes through meiosis, predicting possible egg genotypes,
sampling and hatching a clutch, comparing sibling evidence, and investigating a hidden parent.
They learn that each gamete carries one allele for each gene, that fertilization restores the allele
pair in an egg, and that a dominant phenotype can be supported by more than one genotype.

## Module 3 scene sequence

1. **Meiosis and Egg Prediction Lab** — select two familiar parent dragons, choose up to three
   genes, predict the possible genotype for the focused gene, then watch each parent produce four
   modeled gametes. Selected gametes combine into lettered eggs so students can see one allele from
   each parent at every locus.
2. **Incubator Reveal** — use the shared Dragon Hatchery to candle phenotypes, sample genotypes,
   choose eggs, hatch siblings, and pin the record that actually names the alleles.
3. **Sibling Comparison** — use phenotype-first and genotype-first scanner cases to show that equal
   phenotypes can hide different genotypes.
4. **Hidden Parent Mystery** — use a recessive offspring to infer the recessive allele carried by a
   dominant-looking parent.
5. **Hatchery Certification** — solve possible-egg, hatchling-prediction, hidden-parent, and
   same-look/different-genes cases.

The station makes the two competing errors visible. Distractor evidence argues from _value_
("winged dragons fly better, so W must be the stronger allele") and from _appearance_ ("both
samples read Horned, so both scans must match"). Pinning one names the misconception instead of
only marking the answer wrong.

## Hatchery display model

The lesson shell supplies two parent-dragon platforms, a focused trait, and up to three visible gene
loci. Each paired chromosome uses the Station 3 allele-bar language with letters fixed at the gene
locations. During the teaching animation, each parent produces four modeled gametes and selected
gametes combine into four eggs that keep their allele letters visible. The four-gamete display is a
teaching sample of allele separation and assortment, not a complete list of every multi-gene gamete
combination. The shared Hatchery instrument then provides a sealed clutch, candling bench, DNA
sampling bench, hatch tray, incubator control, and evidence marks. Hatching reveals phenotype; only
sampling reveals genotype.

## Scanner display model

A laboratory scanner console: a generic sample record, an open phenotype readout, a shielded
chromosome pair, the genotype records a student can select, and an optional comparison sample.

```text
+---------------------------------------------------------------+
| sample-record            | mode · phase rail · selection count |
+----------------+---------------------+----------------------- +
| phenotype-     | concealed-allele-   | comparison-record       |
|   readout      |   pair + scan-      | (second sample with the |
|                |   control           |  same readout)          |
+----------------+---------------------+-------------------------+
| genotype-option cards (chromosome locus crops)                 |
+---------------------------------------------------------------+
| caption · lesson feedback · evidence-mark row                  |
+---------------------------------------------------------------+
```

Chromosomes are drawn from [`docs/allelle-diagram.html`](../allelle-diagram.html): the same
18 × 200 banded bar, centromere line, four coloured gene bands, and allele letters on leader
lines. The scanner adds a hatched shield with a lock over the focus locus, and each genotype
option card is the _same drawing_ cropped to that locus, so a record and the scan read as one
system. No dragon anatomy appears anywhere in the instrument.

## Student sequence

1. **Read** the open half — the readout in a phenotype-first task, the scan in a genotype-first one.
2. **Select** every record the evidence still supports. Multi-select is the point: a dominant
   readout supports two genotypes.
3. **Lock** the selection. Nothing opens before this.
4. **Scan** — the shield sweeps away and the allele pair appears in the two slots.
5. **Compare** the actual pair with the selection; supported, unsupported, and _missed_ records
   are marked separately.
6. **Explain** by pinning the mark that proves the claim, then save.

## Modes

| Mode     | Behaviour                                                                               |
| -------- | --------------------------------------------------------------------------------------- |
| Learn    | Zygosity hints on each record, feedback at every step, the four Module 3 tasks in order |
| Practice | Both directions, hints off, deterministic order from the scene seed                     |
| Official | No hints, no verdicts and no watch list until **Submit scans**                          |
| Reteach  | Comparison-led bundle chosen by the diagnosed misconception                             |

Official runs still open the scan — that is the instrument's function and the pre-scan selection
is already locked — but option verdicts stay empty until the set is submitted.

## Semantic targets and events

Targets: `sample-record`, `phenotype-readout`, `concealed-allele-pair`, `genotype-option`,
`scan-control`, `allele-slot-a`, `allele-slot-b`, `comparison-record`, `evidence-mark`.

Emitted stage events: `allele-selected` (value `select`/`deselect`), `reveal-requested` (scan),
`evidence-pinned`, `hotspot-selected` (readout logged), and `sequence-checkpoint-completed` when
the `genotype-selection` checkpoint in `genotype-scan-v1` releases.

Saved evidence per scan: scene ID, seed, sample ID, task, mode, gene, direction, the full pre-scan
selection, the supported set, correctness, the revealed genotype, the pinned evidence mark and its
correctness, attempts, misconception flag, elapsed active time, and timestamp.

## Implementation

| Concern                                  | File                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combined meiosis and egg-prediction quiz | [`dragon-meiosis-quiz.component.ts`](../../src/app/features/dragon-genetics/dragon-meiosis-quiz.component.ts)                                                                                                                                                             |
| Reusable lettered egg glyph              | [`hatchery-egg-glyph.component.ts`](../../src/app/shared/dragon-visuals/displays/dragon-hatchery/hatchery-egg-glyph.component.ts)                                                                                                                                         |
| Hatchery renderer                        | [`displays/dragon-hatchery/dragon-hatchery-display.component.ts`](../../src/app/shared/dragon-visuals/displays/dragon-hatchery/dragon-hatchery-display.component.ts)                                                                                                      |
| Hatchery lesson controller               | [`stations/dragon-hatchery-station.component.ts`](../../src/app/features/dragon-genetics/stations/dragon-hatchery-station.component.ts)                                                                                                                                   |
| Hatchery records and content             | [`simulation/domain/dragon-hatchery.models.ts`](../../src/app/features/dragon-genetics/simulation/domain/dragon-hatchery.models.ts) and [`simulation/data/dragon-hatchery-content.ts`](../../src/app/features/dragon-genetics/simulation/data/dragon-hatchery-content.ts) |
| Renderer                                 | [`displays/genotype-scanner/genotype-scanner-display.component.ts`](../../src/app/shared/dragon-visuals/displays/genotype-scanner/genotype-scanner-display.component.ts)                                                                                                  |
| Scene → view model                       | [`genotype-scanner.view-model.ts`](../../src/app/shared/dragon-visuals/displays/genotype-scanner/genotype-scanner.view-model.ts)                                                                                                                                          |
| Console theme                            | [`genotype-scanner.theme.ts`](../../src/app/shared/dragon-visuals/displays/genotype-scanner/genotype-scanner.theme.ts)                                                                                                                                                    |
| Chromosome artwork                       | [`displays/shared/chromosome-diagram.ts`](../../src/app/shared/dragon-visuals/displays/shared/chromosome-diagram.ts) and [`chromosome-pair.component.ts`](../../src/app/shared/dragon-visuals/displays/shared/chromosome-pair.component.ts)                               |
| Scan timeline                            | [`data/core-teaching-sequences.ts`](../../src/app/shared/dragon-visuals/data/core-teaching-sequences.ts) (`GENOTYPE_SCAN_SEQUENCE`)                                                                                                                                       |
| Lesson controller                        | [`stations/genotype-scanner-station.component.ts`](../../src/app/features/dragon-genetics/stations/genotype-scanner-station.component.ts)                                                                                                                                 |
| Curriculum content                       | [`simulation/data/genotype-scanner-content.ts`](../../src/app/features/dragon-genetics/simulation/data/genotype-scanner-content.ts)                                                                                                                                       |
| Scene adapter                            | `createGenotypeScannerScene` in [`dragon-visual-scene.adapter.ts`](../../src/app/features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter.ts)                                                                                                                  |
| Saved evidence                           | `DragonGeneticsStore.recordGenotypeScan`                                                                                                                                                                                                                                  |

Saving a scan mirrors its verdict into the Module 3 certification answers. Completion now requires
all four certification cases, a correct locked possible-egg prediction, and at least one Hatchery
record containing both a DNA sample and a hatchling with correctly pinned evidence.

## Changing the content

Add a `task({ … })` entry in `genotype-scanner-content.ts` with its direction, sample, focus
trait, prompt, supported option IDs, per-option misconception flags, the rule the reveal should
name, one supporting mark, and two distractor marks. Option records are generated from the gene
definition, so genotype cards and phenotype readouts never drift from `DRAGON_TRAITS`. Adding a
`questionId` links the task to the Module 3 question it grades.

Specimens live in the same file. Give a specimen the exact genotype a task needs rather than
reusing a breeding parent.

## Changing the graphics

- **Chromosomes, alleles, and genotype cards:** `displays/shared/chromosome-diagram.ts`. It holds
  the geometry and palette copied from the source diagram — body size, centromere, banding, the
  four gene-band colours, and the label gutters. Every station that shows alleles uses it, so one
  edit restyles them all.
- **Console shell:** `genotype-scanner.theme.ts` — palette, scan and reveal timings. Values become
  CSS custom properties (`--gs-*`), and the theme can also be replaced per host through the
  component's `theme` input.
- **Scan animation:** `GENOTYPE_SCAN_SEQUENCE` cue timing and captions, validated against the
  visual pack's `scan-sweep` motion.

## Accessibility and motion

- Every record, the scan control, and every evidence mark is a real button; nothing needs a mouse.
- Records carry a genotype label, a zygosity caption, and a status word, so colour is never the
  only signal.
- A polite live region reports the readout, whether the scan is shielded, the current selection,
  and the comparison sample.
- Reduced motion resolves the scan to its final state with no sweep.

## Acceptance checks

- [x] The genotype is never exposed before prediction in assessed scenes — the view model omits
      the allele pair until the lesson opens the scan, and a test asserts it.
- [x] Multi-select supports more than one valid dominant genotype, and unselected supported
      records are marked `missed` rather than silently ignored.
- [x] Phenotype labels never imply strength, value, health, or frequency; value-based reasoning is
      modelled only as a named misconception.
- [x] The display is fully useful without dragon artwork.
- [x] Learn, Practice, Official, and Reteach scenes run from fixed seeds without Firebase.
- [x] Unit tests cover the view-model mapping, the renderer interactions, and one path per mode
      (`genotype-scanner.view-model.spec.ts`, `genotype-scanner-display.component.spec.ts`,
      `genotype-scanner-station.component.spec.ts`).
- [x] Module 3 uses the shared Hatchery rather than duplicating clutch state, concealment rules, or
      hatch controls in the lesson shell.
- [x] Certification checks possible eggs, genotype-to-phenotype reasoning, hidden-parent evidence,
      and same-phenotype/different-genotype reasoning.
