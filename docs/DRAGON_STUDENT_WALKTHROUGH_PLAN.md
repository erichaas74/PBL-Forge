# Dragon Genetics student walkthrough plan

**Status: plan only. Nothing here is built yet.** This document designs the guided path a 7th-grade
student takes to learn genetics and build a dragon, and the mechanism by which that path drives the
existing workstations.

It extends the journey slice at [`journey/`](../src/app/features/dragon-genetics/journey/).

---

## 1. Direction of control

**A workstation is not a step in a walkthrough.** It is a standalone instrument that knows nothing
about lessons, acts, progress, or grades. It is never "inside" the path.

The learning path **configures** the instrument. It sends a briefing — which specimens are released,
which genes exist, what the scientific goal is, which tools are available, what the budgets are —
and the instrument behaves accordingly. Then the student investigates freely inside that
configuration.

```text
LEARNING PATH                    PAGE SHELL                  WORKSTATION
─────────────                    ──────────                  ───────────
resolves the briefing   ──────▶  binds briefing fields  ────▶ behaves as configured
for this student's step          to component inputs          (open investigation)
                                                                     │
reads persisted records  ◀──────────────────────────────────── emits authentic records
```

Three properties fall out of this and all three are non-negotiable:

1. **The dependency arrow points one way.** The journey imports workstation config types. A
   workstation never imports journey code. Each workstation *owns the vocabulary of its own
   configuration* — the journey only produces values in that vocabulary.
2. **Unconfigured is a valid state.** Every briefing field has a default. A student who opens
   `/dragon-genetics/pedigree-lab` cold gets today's lab, unchanged. Nothing about the path is
   required for a lab to work.
3. **Configuration is not scripting.** A briefing sets *what exists* and *what the goal is*. It
   never sets *what order to do things in*. This is the line that keeps
   [`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md) satisfied, and §3
   defines it precisely.

### This pattern already exists in the codebase

Two places prove the mechanism, and the plan generalizes them rather than inventing anything:

- **Teacher release.** `AlleleCatalogSetting.availableGeneIds` on `DragonAssignment` already means
  "these are the gene records released to this class." The rules already state that *teacher settings
  determine which records are released; components do not invent availability.* The learning path
  becomes a **second producer on that same channel**, at step granularity instead of class
  granularity.
- **Query-param configuration.** [`dragon-pedigree-lab.page.ts:27`](../src/app/features/dragon-genetics/workstations/pedigree-lab/dragon-pedigree-lab.page.ts#L27)
  already reads `?investigation=` and binds it to the `openInvestigationId` input. That page shell is
  the reference implementation of a briefing host.

And the labs are already configurable components. The existing input surface includes `goal`,
`genes`, `alleles`, `dragons`, `initialLevel`, `initialChromosome`, `selectedGene`, `focusTraitId`,
`assignedEgg`, `assignedFocusTraitId`, `analysisCase`, `tools`, `examineBudget`, `sampleBudget`,
`hatchLimit`, `mode`, `requirePrediction`, `eligibleDragonIds`, `showSpecimenLoader`, and `seed`.
Most of the briefing contract is already built. §7 lists what is missing.

---

## 2. The briefing contract

### 2.1 Shared envelope

One small type in `workstations/shared/`, owned by the workstation layer:

```ts
/** What a caller may tell any workstation. Every field is optional. */
export interface WorkstationBriefing {
  schemaVersion: 1;
  briefingId: string;          // for record attribution; the lab treats it as an opaque tag
  studentId: string;
  seed: string;                // deterministic generation
  goal?: string;               // the ONE scientific-goal sentence, replaces the lab's default
  release?: CatalogRelease;    // what scientific records exist right now
  staging?: SpecimenStaging;   // what is already loaded when the student arrives
  affordances?: ToolAffordances; // which tools and budgets are available
}
```

`briefingId` is the whole return channel. The lab stamps it onto records it saves and otherwise
ignores it. The journey later finds its own records by that tag. The lab never learns what it means.

### 2.2 Release — what exists

```ts
export interface CatalogRelease {
  geneIds?: readonly string[];         // narrows ALLELE_VAULT_GENES
  chromosomeIds?: readonly string[];
  dragonIds?: readonly string[];       // narrows the Account Genetics Library
  microscopeLevels?: readonly GenomeMicroscopeLevel[]; // see the warning in §3
  inheritancePatterns?: readonly MiniInheritancePattern[]; // show path only
}
```

This is the primary teaching instrument in the entire plan. Releasing one gene in Act 0 and four
genes in Act I is what makes the path progressive without making it scripted — the student has
complete freedom inside the released set, and the set grows as they earn it.

### 2.3 Staging — what is already loaded

```ts
export interface SpecimenStaging {
  dragonIds?: readonly string[];       // pre-loaded specimens
  parentPairId?: string;
  focusGeneId?: string;                // which locus the instrument opens on
  focusTraitId?: DragonTraitId;
  entryLevel?: GenomeMicroscopeLevel;  // where the microscope opens, NOT where it stops
  entryChromosomeId?: string;
  assignedEggId?: string;
}
```

Staging saves setup time and puts every student in the same starting frame so a class can talk to
each other. It is a starting position, never a constraint.

### 2.4 Affordances — what the student can do

```ts
export interface ToolAffordances {
  tools?: readonly string[];           // workstation-specific tool ids
  budgets?: Readonly<Record<string, number>>;  // examine, sample, sequencing, donor units
  requirePredictionBeforeResult?: boolean;
  allowMultipleAttempts?: boolean;     // default true; false is rare and teacher-set
}
```

Budgets are the honest form of difficulty. A sequencing budget of 2 makes deduction *necessary*
without narrating that deduction is necessary — the constraint teaches, not the text.

### 2.5 Per-workstation briefings

Each workstation extends the envelope with its own vocabulary, defined in its own folder:

```ts
// workstations/pedigree-lab/pedigree-lab.briefing.ts
export interface PedigreeLabBriefing extends WorkstationBriefing {
  archiveId?: string;
  offeredInheritanceModels?: readonly InheritanceModelId[];
  sequencingBudget?: number;
}
```

The journey imports `PedigreeLabBriefing`. The pedigree lab imports nothing from the journey.

---

## 3. What a briefing may and may not carry

This section is the review checklist. It exists because the briefing channel is the one way this
plan could smuggle a script into a lab.

**May carry:**

- The one scientific-goal sentence
- Which records are released — genes, chromosomes, dragons, patterns
- Which specimens are staged and where the instrument opens
- Which tools are available and what they cost
- Whether a prediction must be saved before a result is revealed
- A deterministic seed
- An opaque `briefingId`

**May not carry:**

- An ordered list of steps, tasks, or actions
- Any "next", "now", "first", or "step N" text
- Question prompts, answer options, correctness, or scoring
- Trait names, allele letters, dominance labels, genotypes, or any outcome the student is meant to
  determine — a briefing narrows a catalog, it never pre-solves it
- Progress state, lesson ids, act ids, mastery levels, or grades
- Anything that removes the ability to *compare* — narrowing to one gene is legitimate; narrowing to
  one allele so nothing can be contrasted is not
- **Removing microscope levels.** `microscopeLevels` exists in the type only for a teacher-set
  simplification mode. The learning path must never set it. All 14 levels stay reachable at every
  step; the path sets `entryLevel` and nothing more.

**The single test to apply in review:** could the student, on arriving, still choose which experiment
to run first, repeat it, and reach a different valid conclusion order than their neighbor? If no, the
briefing has become a script and must be revised.

---

## 4. The path, expressed as briefings

Seven acts. Each act is a briefing sequence plus one determination the student must record. The
classic lineage is written out; the mini-dragon show path is §4.8.

Periods assume 45 minutes and are for teacher planning, not enforced.

### 4.0 Act 0 — Hatch Permit · GEN-1 · ≈1 period

> *The academy will not release breeding stock to someone who cannot tell what a dragon inherited
> from what it learned.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| [Trait Evidence](../src/app/features/dragon-genetics/workstations/trait-evidence/) | goal: *distinguish inherited from acquired*; release: 1 gene; staging: both starters | which of four evidence types settles the question |
| [Candling](../src/app/features/dragon-genetics/workstations/candling-workstation/) | staging: assigned egg + focus trait; affordances: `budgets.sample = 1` | that candling and sequencing answer different questions |

- **Release grows to:** 1 gene · **NGSS:** MS-LS1-5, MS-LS3-2
- **Dragon gains:** two starter cards, a line name
- **Misconception:** *"if a dragon is good at something, it was born that way"*
- The single sample budget is what forces the phenotype/genotype distinction. Without it the student
  just samples everything.

### 4.1 Act I — Where the instructions live · GEN-2, GEN-3 · ≈2 periods

> *The two starters look different. The difference has an address.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| [Genome Microscope](../src/app/features/dragon-genetics/workstations/genome-microscope/) | `entryLevel: 'dragon'`; release: 4 genes; staging: one starter | that homologs carry the same genes at the same loci |
| Genome Microscope | `entryLevel: 'chromosome'`, `focusGeneId` rotates through the four | the locus of each of the four lab traits |
| [Allele Workbench](../src/app/features/dragon-genetics/workstations/allele-workbench/) | release: same 4 genes; neutral sample codes | which allele pair produces which visible form |

- **Release grows to:** 4 genes · **NGSS:** MS-LS3-1
- **Dragon gains:** the line's chromosome map
- **Misconception:** *"a chromosome is a gene"*, *"homologs are identical"*
- The microscope and workbench get the **same four genes**. Seeing one catalog through two
  instruments is what builds the locus → phenotype link.

### 4.2 Act II — Reading one gene · GEN-2, GEN-6 · ≈2 periods

> *`CH1-G1a` and `CH1-G1b` are not labels. They are sequences.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| Genome Microscope | `entryLevel: 'chromatin'`; staging: focus gene from Act I | that a chromosome is one continuous molecule |
| Genome Microscope | `entryLevel: 'allele'` | the base position where the two copies differ |
| [DNA Process Lab](../src/app/features/dragon-genetics/workstations/dna-process-lab/) | `analysisCase` built from the *student's own* focus gene | that some sequence changes alter the product and some do not |

- **Release grows to:** 4 genes + DNA-level records · **NGSS:** MS-LS3-1
- **Dragon gains:** the first named allele in the notebook
- **Misconception:** *"a mutation is always harmful"*, *"alleles are different genes"*
- `analysisCase` is currently a static default. Deriving it from the student's own gene is the
  difference between a worksheet and their dragon.

### 4.3 Act III — From gene to trait · GEN-6 · ≈2 periods

> *A sequence cannot bite anyone. Something has to happen in between.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| Genome Microscope | `entryLevel: 'rna'` | how base order becomes amino-acid order |
| Genome Microscope | `entryLevel: 'expression'` | which protein shape changes the rendered dragon |
| [Protein & Diet Rescue](../src/app/features/dragon-genetics/workstations/protein-rescue/) | staging: patient case matched to the student's focus gene | why a diet change can rescue a protein failure |

- **NGSS:** MS-LS3-1, MS-LS1-5 · **Dragon gains:** one full gene → protein → trait chain
- **Misconception:** *"the gene is the trait"* — this act is where it dies

### 4.4 Act IV — Passing it on · GEN-4 · ≈3 periods

> *You have two dragons and a chart. Predict the clutch before you make it.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| [Dragon Hatchery](../src/app/features/dragon-genetics/workstations/dragon-hatchery/) | staging: the starter pair; `focusTraitId` | why two gametes from one parent differ |
| [Punnett Composer](../src/app/features/dragon-genetics/workstations/punnett-composer/) | release: 1 gene (the focus); `requirePredictionBeforeResult: true` | the predicted ratio, **saved before breeding** |
| Dragon Hatchery | `budgets.hatch = 4` | how a real clutch compares to the prediction |
| [Incubator Sampler](../src/app/features/dragon-genetics/workstations/incubator-sampler/) | minimum batch 40; phenotype only | that ratios are limits, not guarantees |

- **NGSS:** MS-LS3-2 · **Dragon gains:** **generation 1** — the first card they bred
- **Misconception:** *"3:1 means exactly three of every four"*
- Two briefing fields do all the work here: `requirePredictionBeforeResult` on the Punnett step, and
  the deliberately small hatch budget followed by the deliberately large sampler batch. The gap
  between four eggs and forty is the lesson.

### 4.5 Act V — Evidence across generations · GEN-5, GEN-7 · ≈2 periods

> *The trait skipped a generation. Somebody was carrying it.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| [Pedigree Lab](../src/app/features/dragon-genetics/workstations/pedigree-lab/) | `offeredInheritanceModels`: 3 options; `sequencingBudget: 2` | which carrier to spend budget confirming |
| [Blood Compatibility](../src/app/features/dragon-genetics/workstations/blood-compatibility/) | release: the multi-allele locus; donor supply constrained | that one locus can have more than two alleles |

- **NGSS:** MS-LS3-2 · **Dragon gains:** a carrier deduced before it was sequenced
- **Misconception:** *"every gene has exactly two alleles"*, *"carriers show the trait"*
- The budget of 2 against an archive with more candidates is the entire assessment. A student who
  guesses runs out of budget.

### 4.6 Act VI — Populations and selection · GEN-8 · ≈2 periods

> *One dragon is not a line, and a line that is too pure is a line in trouble.*

| Lab | Briefing | Student determines |
| --- | --- | --- |
| [Island Diversity](../src/app/features/dragon-genetics/workstations/island-diversity/) | staging: a declining island; target richness threshold as the goal | which relocations raise allele richness |
| Dragon Hatchery | release: full 4-gene catalog; `budgets.hatch` raised | which three candidates to keep, and why |

- **NGSS:** MS-LS4-4, MS-LS4-5 · **Dragon gains:** a contender roster with a stated rationale
- **Misconception:** *"breeding the best with the best is always best"*

### 4.7 Act VII — The defense · ≈1 period

Full catalog released, no budgets, no staging. The student picks one dragon, runs the Arena trial,
and submits the Champion Dossier (§5.3). The absence of a briefing is the point: they are trusted
with the whole instrument now.

### 4.8 The mini-dragon show path

The [Mini Dragon Show](../src/app/features/dragon-genetics/workstations/companion-show/) is a second
species with six loci across **five** inheritance patterns — complete dominance, incomplete
dominance, codominance, multiple alleles, and sex linkage. Stronger for GEN-4 and GEN-7, weaker for
GEN-2 and GEN-6 (it has no microscope surface).

Acts 0–III are **shared**: both paths use the classic lab dragon to learn where genes live and what
proteins do. The split is at Act IV, and it is expressed purely as a different briefing sequence:

- **Arena branch** — Acts IV–VII as above.
- **Show branch** — Act IV releases `inheritancePatterns: ['complete-dominance',
  'incomplete-dominance']` for the standard and first litter; Act V adds `'codominance'` and
  `'multiple-alleles'`; Act VI adds `'sex-linked'` plus training, which is the GEN-1 callback and the
  strongest inherited-vs-learned moment in either path; Act VII is the judged show and registry.

Releasing patterns one at a time is the show path's version of releasing genes one at a time. Today
both paths diverge at lesson 1, which means show-path students never touch the microscope.

---

## 5. How the student is tested

Because the workstation is not part of the walkthrough, no test lives inside one. Three tiers:

### 5.1 Tier 1 — The briefing *is* the test (primary)

**A checkpoint is a briefing plus a record predicate.** The path configures the lab so that a
specific determination is *possible and necessary*, sends the student in, and then reads the record
the lab saved. No question is ever asked.

```ts
export interface ActCheckpoint {
  id: string;
  actId: string;
  briefing: WorkstationBriefing;   // narrows the catalog so the determination is required
  predicate: CheckpointPredicate;  // evaluated over persisted records tagged with briefingId
  masterySkillIds: readonly GeneticsSkill[];
  misconceptionOnFail: string;
}
```

Three predicate kinds cover every act:

| Kind | Meaning | Used by |
| --- | --- | --- |
| `record-matches-catalog` | the student's saved determination equals shared scientific truth | Acts I, II |
| `record-precedes-record` | a prediction was saved before the result that could reveal it | Acts III, IV, V |
| `metric-threshold` | a measured outcome crossed a stated target | Acts 0, VI |

Predicate evaluation is a pure function over repository snapshots. No UI, fully unit-testable, and
it never touches a workstation.

**Why this is the right primary tier:** it cannot be passed by clicking. It directly answers the
rules' rejection-checklist item *"could a student finish by clicking answers without investigating
the scientific model?"* And it needs zero new UI inside any lab.

### 5.2 Tier 2 — Debrief checks (formative, on the act page)

A short check on the **journey's own act page**, after the student returns. Used only where a
misconception is verbal rather than procedural.

- 3 items at the `grade-7` profile — `questionCount: 3`, `scaffold: 'high'`, `hintsAllowed: true`
- Reuses the existing `LevelChallenge` model, which already carries `misconceptionFlag` and
  `focusNodeId`. Do not invent a second question type.
- Pass 2 of 3; retries draw fresh items from a ~6-item bank per act
- A miss re-issues the **previous act's briefing with a narrower release** and sends the student back
  to the instrument. That is the remediation: not a re-read, a re-run with less noise. Pair it with
  the matching [Wise Dragon](../src/app/features/dragon-genetics/wise-dragon/) entry.
- Blocks only the next act's briefing. Never blocks free play, side quests, or any lab entered
  directly.

### 5.3 Tier 3 — Champion Dossier (summative)

Assembled from records the student already owns; the only new surface is a citation picker and one
short free-text field per claim.

1. **This is my dragon** — card, genotype, phenotype
2. **Where its traits live** — cite the Act I locus map
3. **What one of its genes does** — cite the Act III protein chain
4. **Why it looks like this** — cite the Act IV prediction and the real clutch
5. **What its family shows** — cite the Act V pedigree
6. **Why I chose it over its siblings** — cite the Act VI roster
7. **What I got wrong** — cite one failed prediction and what it changed

Item 7 is required. A dossier with no revised prediction is not passing work, and saying so up front
is what stops students from hiding their mistakes.

**Scoring:** 4-level rubric per item — *not cited / cited / cited and explained / cited, explained,
and connected to another act*. Teacher-visible, exportable.

---

## 6. Mastery ledger

The eight `GeneticsSkill` values already exist. Give each a visible per-student state:

```text
unseen → briefed → practiced → determined → defended
```

- `briefed` — a briefing for that skill was issued
- `practiced` — the lab produced records under it
- `determined` — the act checkpoint predicate passed
- `defended` — cited in the dossier

| Skill | Title | Briefed | Determined |
| --- | --- | --- | --- |
| GEN-1 | Inherited traits | Act 0 | Act 0, callback in show Act VI |
| GEN-2 | Genome organization | Act I | Act I |
| GEN-3 | Alleles and phenotype | Act I | Act II |
| GEN-4 | Inheritance patterns | Act IV | Act IV |
| GEN-5 | Pedigree evidence | Act V | Act V |
| GEN-6 | DNA and proteins | Act II | Act III |
| GEN-7 | Multiple alleles | Act V | Act V (blood) |
| GEN-8 | Population diversity | Act VI | Act VI + dossier |

Every skill is briefed in one act and determined in a later one. Nothing is assessed in the sitting
it was introduced.

Teacher view on [`teacher/dragon-genetics`](../src/app/features/dragon-genetics/dragon-teacher.page.ts):
students × 8 skills, colored by state, drilling into failed predicates and misconception flags.

---

## 7. What has to be built

### Phase 1 — The briefing contract *(blocking)*

- `WorkstationBriefing`, `CatalogRelease`, `SpecimenStaging`, `ToolAffordances` in
  `workstations/shared/workstation-briefing.ts`
- A `briefingId` field on every persisted workstation record, defaulting to `null`
- One `resolveBriefing()` helper for page shells, generalizing the pedigree page's query-param read
- A lint or spec rule asserting **no file under `workstations/` imports from `journey/`**

### Phase 2 — Close the input gaps

Seven workstations cannot currently be configured at all. Each needs a briefing input and a
per-workstation briefing type. Ordered by how much the path needs them:

| Workstation | Has today | Needs |
| --- | --- | --- |
| [Punnett Composer](../src/app/features/dragon-genetics/workstations/punnett-composer/) | `studentId`, `goal` | released gene, staged parents, `requirePredictionBeforeResult` |
| [Incubator Sampler](../src/app/features/dragon-genetics/workstations/incubator-sampler/) | `studentId`, `goal` | staged parents, minimum batch size, released traits |
| [Dragon Hatchery](../src/app/features/dragon-genetics/workstations/dragon-hatchery/) breeding lab | `studentId`, `seed` | staged pair, focus trait, hatch budget — the station component below it already has `tools`, budgets, and `mode`; the lab wrapper just does not pass them through |
| [Blood Compatibility](../src/app/features/dragon-genetics/workstations/blood-compatibility/) | `studentId` | released allele set, donor supply, staged patient |
| [Pedigree Lab](../src/app/features/dragon-genetics/workstations/pedigree-lab/) | `studentId`, `goal`, `openInvestigationId` | offered inheritance models, sequencing budget |
| [Island Diversity](../src/app/features/dragon-genetics/workstations/island-diversity/) | `studentId` | staged island, richness target as goal |
| [Protein Rescue](../src/app/features/dragon-genetics/workstations/protein-rescue/) | `studentId` | staged patient case tied to the student's focus gene |
| [Companion Show](../src/app/features/dragon-genetics/workstations/companion-show/) | `studentId`, `goal` | released inheritance patterns |

Already sufficient: Genome Microscope, Allele Workbench, DNA Process Lab, Candling.

Each of these is an additive input with a default. No interaction model changes. No new UI.

### Phase 3 — Persist microscope evidence

`GenomeMicroscopeEvidence` is emitted as an `output()` at
[`genome-microscope.component.ts:115`](../src/app/features/dragon-genetics/workstations/genome-microscope/genome-microscope.component.ts#L115)
and **nothing stores it**. Acts I–III test at specific depths and cannot be evaluated without this.

- User-scoped `GenomeMicroscopeEvidenceRepository`, stamped with `briefingId`
- The component keeps emitting; the page shell persists. No change inside the lab.

### Phase 4 — Act registry

- `DragonActDefinition`: id, title, story, ordered briefings, checkpoint, skills, release delta
- Rewrite [`dragon-journey.registry.ts`](../src/app/features/dragon-genetics/journey/config/dragon-journey.registry.ts)
  to the acts in §4, with Acts 0–III shared across both paths
- Extend `assertValidDragonJourneyRegistry()`: every act has a checkpoint; every skill is briefed
  before it is determined; the release ladder only grows; **no briefing sets `microscopeLevels`**

### Phase 5 — Checkpoint predicates

Pure evaluation over repository snapshots. Three predicate kinds, unit-tested with no UI.

### Phase 6 — Act page, mastery ledger, teacher view

Act brief, launch links carrying the briefing, checkpoint state, debrief check, skill strip, class
matrix, teacher overrides (waive a checkpoint, widen a release, adjust budgets).

### Phase 7 — Champion Dossier, then the show-path split

---

## 8. Decisions to confirm before Phase 4

1. **How does a briefing reach the page shell?** Query param (`?briefing=act1-microscope`) resolved
   against the registry, matching the pedigree lab's existing pattern — or a resolver service the
   shell injects. The query param is simpler, survives refresh, and is already proven here; a service
   keeps URLs clean and briefings unforgeable. **Recommend the query param**, since a student editing
   it only changes which catalog they see, and that is not worth defending against.
2. **Do Acts 0–III become shared across both paths?** This plan says yes. It is the biggest change to
   the existing registry, and the alternative is show-path students never using the microscope.
3. **Is the release ladder monotonic?** This plan says a release only ever grows. Allowing an act to
   *narrow* the catalog is more precise pedagogically but means a student can lose access to a gene
   they were using, which will read as a bug.
4. **Sixteen briefings at ~13 periods** is a three-week unit. If the slot is one week, keep Acts 0,
   I, IV, VII and move the rest to side quests — the structure survives the cut.

---

## 9. Review checklist

Before any commit in this effort:

- [ ] No file under `workstations/` imports from `journey/`
- [ ] Every briefing field is optional with a working default
- [ ] Opening any lab with no briefing gives today's behavior exactly
- [ ] No briefing carries steps, ordering, questions, answers, or progress state
- [ ] No briefing sets `microscopeLevels`; all 14 levels reachable at every step
- [ ] No briefing pre-solves a determination the student is meant to make
- [ ] The student can still choose which experiment to run first and reach a valid conclusion in
      their own order
- [ ] No second copy of chromosome, gene, DNA, phenotype, or notebook truth in journey code
- [ ] No checkpoint passable without operating the instrument

## 10. Related documents

- [Workstation product rules](DRAGON_GENETICS_WORKSTATION_RULES.md) — authoritative, wins on conflict
- [Workstation architecture](DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md)
- [Adaptive full-page architecture](dragon-genetics-simulations/ADAPTIVE_FULL_PAGE_ARCHITECTURE.md)
- [Simulation build standard](dragon-genetics-simulations/SIMULATION_BUILD_STANDARD.md)
- [Dragon card deck rollout](DRAGON_CARD_DECK_ROLLOUT.md)
- [Project hub plan](DRAGON_GENETICS_PROJECT_HUB_PLAN.md)
