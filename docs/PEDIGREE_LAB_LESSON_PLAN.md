# Pedigree Lab lesson plan: finding and locating genes from a pedigree

**Status: built.** All three ship as extra lessons anchored to *Meiosis and Dragon Eggs*: A and B
are open by default, C waits for a teacher to open it in `/teacher/lesson-plan`. Governed by
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md) and shaped like the
existing curriculum in [`LESSON_PLAN.md`](LESSON_PLAN.md). The executable source of truth for
anything published is `DEFAULT_DRAGON_LESSON_PLAN` in
`src/app/features/dragon-genetics/lesson-plan/dragon-lesson-plan.models.ts`; this document explains
the intended lessons in teacher-facing language.

## What students learn

One science goal across all three tiers: **an allele is still in a bloodline after the phenotype
stops appearing, and a pedigree can tell you who carries it and where the gene sits.**

"Locating the gene" means two different things, and the tiers separate them deliberately:

1. **Locate the allele in the family** — which living dragons must, may, or cannot carry it.
2. **Locate the gene on a chromosome** — autosome vs. X, deduced from the pattern of who can and
   cannot show the trait, not from being told.

Tier 1 does (1) only. Tier 2 does (1) against a competing model. Tier 3 does (2).

## Why this fits the existing workstation

The lab already contains everything the three tiers need; nothing about the investigation surface
changes:

| Affordance | Where it lives today |
| --- | --- |
| Four authored bloodline mysteries with per-investigation DNA budgets | `BLOODLINE_INVESTIGATIONS`, `pedigree-population.ts` |
| Four selectable inheritance models with contradiction reporting | `INHERITANCE_MODELS`, `deducePedigree` in `pedigree-deduction.ts` |
| Carrier statuses with an evidence source per dragon | `PedigreeCarrierStatus`, `PedigreeEvidenceSource` |
| Notation that follows the student's hypothesis, not the answer | `modelAlleleSymbols` |
| Carrier calls, sequencing spend, hypothesis text, clutch log | `PedigreeLabSnapshot`, `pedigree-lab.repository.ts` |

The four investigations already form a difficulty ladder, so a tier is chosen by **which
investigation the lesson launches**, not by adding modes to the instrument:

| Investigation | Pattern the records support | Complication | Budget |
| --- | --- | --- | --- |
| `frost-scale` | Autosomal recessive | none — a clean two-allele trace | 5 |
| `emberfall-teal` | Autosomal recessive | a second harmful recessive (`wings`) rides in the same line | 5 |
| `stonewake-tail` | Incomplete dominance | three phenotypes, so "carrier" is visible rather than deduced | 4 |
| `duskmere-eye` | X-linked recessive | sequencing a male contradicts *every* autosomal model | 5 |

## The three lessons

### Lesson A — Reading a pedigree (guided / beginner)

**Investigation:** `frost-scale`.
**Learning goal:** Use pedigree records to determine which living dragons must carry an allele that
is no longer visible.

Students open Vyrak's line, read the register, choose a model, and mark carriers. The model choice
is nearly free here — the pale form skipping generations rules out autosomal dominant on the records
alone — so the deduction, not the model, is the work. The budget is generous (5), so a wasted test
is survivable.

Guidance is *guided* only in the ways the rules allow: heavier lesson-page framing and a fuller
closed Guide entry. The canvas gets no numbered steps, no phase rail, and no "notice this"
narration.

Written responses (lesson page, four as in every other lesson):

1. Which dragons show the lost appearance, and in which generations?
2. Name one dragon your records prove must carry the allele, and give the family relationship that
   forces it.
3. Which model did you choose, and which record would have been impossible under a different one?
4. Where did your sequencing result agree with your deduction, and where did it change it?

### Lesson B — Choosing between models (intermediate)

**Investigation:** `stonewake-tail`, then `emberfall-teal` for students who finish.
**Learning goal:** Use contradictions across the whole pedigree to decide between competing
inheritance models, and spend a limited sequencing budget where it discriminates.

Stonewake carries three tail forms, so a recessive model produces contradictions the student can
read directly and incomplete dominance is the model that survives. The reduced budget (4) makes
"which dragon is worth testing" a real decision rather than a formality. Emberfall then adds a
second locus: the line the student wants to breed also carries a flightless recessive, so
authorising a pairing stops being a one-gene decision.

Written responses:

1. Which model did you test first, and which record did it fail to explain?
2. Which dragon did you sequence to separate two models, and why that dragon rather than another?
3. Under your surviving model, what does the middle appearance mean about allele copies?
4. (Emberfall) What did the second locus change about which pairing you were willing to authorise?

### Lesson C — Locating the gene on a chromosome (advanced)

**Investigation:** `duskmere-eye`.
**Learning goal:** Use sex-linked inheritance evidence to determine which chromosome a gene sits on,
and state the limit of that evidence.

This is where "find and locate the gene" becomes literal. The Duskmere records show the trait
following mothers' lines and appearing in males; sequencing a male at that locus returns a `Y` where
every autosomal model has no room for one, so the contradiction is not a soft signal, it is a
disproof. Students must state the chromosome claim and name the record that establishes it.

Written responses:

1. What is the pattern of which sexes show the trait, across generations?
2. Which single result made every autosomal model impossible, and why?
3. Under X-linked recessive, why can a male never be a silent carrier at this locus?
4. What would you have to observe in a future clutch for your chromosome claim to be wrong?

## How the tiers stay scaffolding and not a script

The rules forbid main-surface directions, fixed-order gates, and required worked examples. The
tiering is therefore carried entirely outside the investigation surface:

- **The launched investigation.** Difficulty is authored into the archive, so a beginner and an
  advanced student use the identical instrument.
- **The lesson page.** Framing, goal, and the four written questions per tier. This is already the
  only place formal questions may live.
- **The closed Guide panel.** `WISE_DRAGON_GUIDE_CONTENT['pedigree-lab']` currently holds one
  operations/evidence/explanation entry. Add per-tier text keyed by the launch context so a beginner
  gets a fuller `evidence` hint — without the panel changing or resetting any investigation state.
- **The DNA budget.** Already per investigation, already persisted. It is the difficulty dial that
  needs no UI mode.

Nothing gates progress: a student may open any investigation from the archive at any time, and
finishing Lesson A is not a prerequisite for opening Duskmere.

## What shipped

- `optional` and `anchorLessonId` on `DragonSharedLesson`, plus `launchParams` on a lesson
  workstation; document `schemaVersion` 6 → 7 and storage key `…lesson-plan.v7`.
- `coreLessons` / `extraLessons` / `extraLessonsFor()` on `DragonLessonPlanRepository`. An extra
  lesson never takes a sequence number and never becomes anybody's "next lesson".
- Student surfaces: an **Extra lessons and commissions** section on the home path chooser (one link
  per path) and on the path index, listing extra lessons and the enabled field commissions together;
  the anchor lesson page offers its extra lessons. Commissions no longer appear on Lesson 4.
- Teacher: the same publish checkbox reads *Open this extra lesson to students* for an extra lesson,
  with a note naming its anchor.
- The lesson’s launch link now carries `?investigation=…`, which the Pedigree Lab page already
  accepted; lesson context (`path`, `lesson`) always overrides an authored parameter.

## Build steps

1. **Curriculum data.** Add three `DragonSharedLesson` entries to `DEFAULT_DRAGON_LESSON_PLAN`
   (`pedigree-reading`, `pedigree-models`, `pedigree-chromosome`), each with one required
   workstation entry pointing at `/dragon-genetics/pedigree-lab`. Bump `revision`, update
   `updatedAtIso`, and extend `dragon-lesson-plan.models.spec.ts`.
2. **Launch context.** The lesson must be able to open a *specific* investigation. Extend the
   workstation launch query (`dragon-workstation-launch-context`) with an investigation id, and have
   `dragon-pedigree-lab.page.ts` seed `activeInvestigationId` from it only when that student's
   snapshot holds no progress for the investigation. Never overwrite work in progress.
3. **Route.** Confirm the lesson-scoped route in `src/app/app.routes.ts` carries `?path=…&lesson=…`
   plus the new parameter, and cover it in `app.routes.spec.ts`.
4. **Guide content.** Per-tier entries in `wise-dragon-guide.content.ts`, with matching
   `wise-dragon-guide.content.spec.ts` coverage.
5. **Manifest.** `PEDIGREE_LAB_MANIFEST` already declares the `pedigree.trace`, `pedigree.carrier`,
   `pedigree.sequence`, and `genotype.to.phenotype` probes — the three lessons need no new probes.
   Verify the anchor ids still resolve before relying on them.
6. **Docs.** Update the published-lesson table in [`LESSON_PLAN.md`](LESSON_PLAN.md) and the pedigree
   lab README in the same change.

## Open decisions for the author

- ~~**Placement.**~~ Decided: all three are extra lessons anchored to *Meiosis and Dragon Eggs*, so
  the numbered path stays at five core lessons. A and B are open by default; C is opened by the
  teacher. The two field commissions moved to the same optional-work list.
- **Mini-show parity.** The archive is full-size dragons only. Either both paths use it unchanged
  (consistent with "the paths share the science"), or a mini-dragon archive is authored later. The
  existing `mini-dragon-pedigree` station is a different, lighter activity and does not substitute.
- **Persistence.** Everything here is device-local, like the rest of the curriculum. Do not describe
  carrier calls or clutch logs as teacher-visible until a Firestore repository exists.
