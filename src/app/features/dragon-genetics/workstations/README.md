# Dragon Genetics workstations

All active student workstation UI lives under this directory.

Product behavior is governed by
[`docs/DRAGON_GENETICS_WORKSTATION_RULES.md`](../../../../../docs/DRAGON_GENETICS_WORKSTATION_RULES.md).
Dedicated workstations are open investigations with no embedded question dock or scripted phase
sequence.

Architecture, source-of-truth ownership, the current audit, and instructions for moving a
workstation are documented in
[`docs/DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md`](../../../../../docs/DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md).

- `allele-workbench/` owns allele selection, expression, and chart-building behavior.
- `blood-compatibility/` owns antiserum testing, the multiple-allele blood catalog, donor supply
  constraints, transfusion compatibility, the Healing Chamber, and persistent emergency records.
  It has its own open-workstation route at `/dragon-genetics/blood-type-lab`.
- `companion-show/` owns the **mini dragon** — a separate species from the four-gene lab dragon, with
  its own six loci across five inheritance patterns (`mini-dragon.genetics.ts`), its own genome →
  blueprint builder (`mini-dragon.anatomy.ts`), and its own judged show-ring trials
  (`mini-dragon.events.ts`) — plus the student-written breed standard, the kennel and its pedigree,
  litters and the nursery, the pedigree-only bloodline meter, and the breed registry. It is the
  open-workstation alternative to the arena and has its own route at
  `/dragon-genetics/companion-show`. Its anatomy is rendered by
  `src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts`, which shares nothing
  with the classic dragon factory.
- `dna-process-lab/` owns DNA sequence comparison, mutation, and repair tools.
- `dragon-hatchery/` owns account-parent loading, five-pair meiosis and gamete selection, selected
  fertilization records, parent canvases, the egg bench, Hatchery renderer, and scene adapter.
- `genome-microscope/` owns the reusable dragon-to-cell-to-protein scale investigation.
- `incubator-sampler/` owns phenotype-only batch breeding, animated sorting, balanced bucket pools,
  visible-outcome history, and user-scoped sampler persistence.
- `island-diversity/` owns the seven-island population model, field genotype scans, individual
  relocation, protected-pair breeding, generation events, population metrics, and the persistent
  conservation ledger. It has its own route at `/dragon-genetics/island-diversity`.
- `island-expedition/` owns the archipelago map, the ecology-driven **natural selection** model, and
  the expedition briefs. It is a different question from `island-diversity/`: that lab asks how to
  keep a population healthy, while this one asks *why the islands differ in the first place* and
  sends students to find a phenotype or genotype by reasoning about where selection would have made
  it common. It has its own route at `/dragon-genetics/island-expedition`. See the section below.
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
  names an observable form without naming the allele pair behind it. It also owns `CellModelComponent`
  — the one drawn cell every lab uses — and `CellChromosomeViewportComponent`, the cell/chromosome
  navigation surface wrapped around it. Consumers adapt their domain records to
  `CellChromosomeViewportItem` using the existing `ChromosomeSvgModel`; the shared viewport must not
  import a workstation-specific genetics model.

Generic assembly rendering remains in `src/app/shared/assembly`. Semantic visual contracts and
cross-workstation renderer primitives remain in `src/app/shared/dragon-visuals`; feature-specific
workstation components do not belong there.

## Instrument manifests

Each workstation owns a `*.manifest.ts` declaring the **probes** it offers — the named, addressable
parts of the instrument a student can operate (`allele.pair`, `gene.locus`, `cross.predict`). The
shared vocabulary and manifest shape live in `shared/instrument-manifest.models.ts`.

A manifest is a capability declaration, not content: no prompts, no answers, no lesson text. The
inquiry layer reads manifests so an authored question can bind to a *capability* rather than to a
workstation id, which is what lets one question run in every lab offering that probe. The dependency
runs one way — `inquiry/` imports manifests, and nothing under `workstations/` imports `inquiry/` or
`journey/`.

`sessionModes` is where the product rules are enforced mechanically. A workstation listing only
`investigation` can never be sent question UI; `guided` is opt-in and today only the Hatchery module
host declares it. Adding `guided` to a dedicated workstation is a product decision against
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](../../../../../docs/DRAGON_GENETICS_WORKSTATION_RULES.md),
not a refactor.

Architecture: [`docs/DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md`](../../../../../docs/DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md).

## The shared cell model

`CellModelComponent` (`shared/cell-model.component.ts`) draws the cell itself: an organic membrane
with a lipid-bilayer edge, cytoplasm, mitochondria, Golgi, rough and smooth ER with ribosomes,
lysosomes, a vacuole, a centrosome, and a nucleus with an envelope, pores, and a nucleolus. Every
chromosome it is given is drawn by the same `app-chromosome-svg` used everywhere else.

All of its measurements come from `shared/cell-model.geometry.ts`, which is pure and covered by
`cell-model.geometry.spec.ts`. That module is what guarantees a chromosome sits inside the structure
that contains it — `chromosomeSlots` fits every slot, corners included, inside the nucleus ellipse
for any chromosome count. Before this existed, the genome microscope positioned chromosomes with a
CSS grid over a decorative membrane and they fell outside the cell.

Inputs worth knowing:

- `stage` — `interphase`, `prophase`, `metaphase-i`, `metaphase`, `anaphase`, or `telophase`. It
  moves the chromosomes (scattered in the nucleus → equator → two poles), dissolves and reforms the
  nuclear envelope, raises the spindle, marks the equator, and pinches a cleavage furrow into the
  membrane. `metaphase-i` is the meiosis I plate, where homologous pairs straddle the equator two
  abreast; `metaphase` is the single file of mitosis and meiosis II. Slot positions are
  CSS-transitioned, so stepping `stage` animates a division with no animation code in the caller.
- `focus` — `cell` or `nucleus`. `nucleus` is a CSS transform on the whole drawing, not a narrower
  viewBox, so moving between the two is a transition the browser animates rather than a cut. The
  zoomed frame follows the chromosomes, widening as they travel to the poles so they stay in shot.
- `annotated` — adds named leader lines for the drawn structures, and widens the viewBox with a
  gutter to hold the text. Meant for a stage at least ~50rem wide.
- `detail` — `simple` drops the cytoplasm detail for card-sized cells.

Hatchery's meiosis animation is the fullest use of it. `meiosis-cell-stage.ts` maps a `MeiosisRun`
and a phase index onto the cells to draw, and it is the file to read to see how a division is
staged: the camera opens on the whole parent cell, zooms to the nucleus for prophase I through
anaphase II, and pulls back out to the four gamete cells. Chromosome identity comes from the run's
own gamete records, so what the animation shows separating is exactly what the four gametes carry.

## Reusing the chromosome viewport

`CellChromosomeViewportComponent` is a controlled, presentational component:

- pass `CellChromosomeViewportItem[]` containing a stable ID, display label, and the shared
  `ChromosomeSvgModel`;
- pass `selectedChromosome` from the owning workstation and handle `chromosomeSelected`;
- handle `locusSelected` only when the workstation supports choosing loci;
- choose `overview`, `inspect`, or `thumbnail` through the `layout` input; and
- adapt domain records beside the owning workstation, as Hatchery does in
  `meiosis-gamete.viewport.ts`.

The viewport does not load catalogs, choose released records, persist state, or import a
workstation domain model.

## The island expedition selection model

`island-expedition/` is the one workstation whose content is **computed rather than authored**, and
that constraint is the reason it teaches anything.

Every island is settled from the same founder stock, so every locus starts at
`FOUNDER_DOMINANT_FREQUENCY` everywhere. Islands differ in exactly two ways: their `IslandEcology`
(eight 0–3 factors a student can read off the map without spending any budget) and how many
generations selection has been running. `island-expedition.selection.ts` turns ecology into relative
fitness for each visible form, then advances allele frequency one generation at a time with ordinary
one-locus population genetics. Genotype frequencies come from Hardy-Weinberg.

Three rules follow, and they are what keep the lab honest:

- **No file states an allele frequency.** A student who reasons *"heavy predators, cold climate, so
  plating should be common"* and a student who flies a survey must reach the same answer, because
  the survey samples the distribution the ecology produces. Nobody can quietly tune an island to
  make a lesson come out nicely.
- **Every locus needs a genuine trade-off.** A trait that won everywhere would make the islands
  identical and leave nothing to reason about. `island-expedition.selection.spec.ts` fails if any
  locus lacks an island favouring each direction.
- **Content is checked against the model.** `island-expedition.quests.spec.ts` asserts every brief
  has an island where its target is genuinely findable within budget, so retuning the ecology breaks
  the spec rather than handing a student an impossible brief.

Selection acts on the phenotype, so heterozygotes are shielded and a recessive allele never quite
disappears. That is what makes carriers findable — and why the best island for a *carrier* is the
weakly-selected one where allele frequency sits near half, not the one where the recessive form is
commonest. The `hidden-line` brief exists to break exactly that misconception, and a spec asserts
those two islands are never the same.

## Artificial selection: the settlement breeding programme

`viking-breeding/` is the deliberate companion to `island-expedition/`. Both model selection; they
differ in who does the selecting and what the student does about it.

| | `island-expedition/` | `viking-breeding/` |
| --- | --- | --- |
| Selective agent | the environment | a Viking settlement |
| Species | classic lab dragon | mini dragon |
| Student's job | **find** an animal selection already made | **build** a line over seasons |
| Timescale | generations already elapsed | seasons the student runs |

The mini dragon is the right species here because its thirteen genes span four inheritance
patterns, and that is what makes an artificial-selection programme more than a Punnett square. The
finding the workstation exists to produce is that **some commissions can never breed true**: a job
asking for a form that only appears in a heterozygote — an incomplete-dominance blend or a
codominant both-at-once — condemns the settlement to keeping two lines and crossing them every
season. Selecting harder does not help, and no amount of student effort changes it.

So `viking-breeding.domain.ts` distinguishes two things that are easy to conflate:

- `bestAchievableLitterRate(role)` is **always 1**. Even a heterozygous target reaches every pup, by
  crossing the two homozygous parent lines. The ceiling is not what separates these commissions.
- `roleBreedsTrue(role)` is what separates them, and `crossPlan(role)` names the two lines a
  settlement must maintain when the answer is no.

Nothing surfaces that verdict until the student has delivered an animal. Before then they have to
read it off their own litters, which is the point: two perfect trickster dragons still throw
off-type pups, every season, forever.

Founder stock is generated per commission with two guarantees the specs enforce — every allele the
job needs is present somewhere in the stock, and no founder already satisfies the whole commission.
The settlement supplies raw material, never the finished animal.
