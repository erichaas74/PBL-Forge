# Dragon diagnostics and story plan

**Status: suggestions. Nothing here is built.** Two related proposals: making the workstations
diagnose *reasoning* rather than only score answers, and making the story actually drive the path
instead of decorating it.

They connect at §3: once the system can tell which wrong idea a student holds, the story can hand
them a case built around exactly that idea.

Builds on [`DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md`](DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md)
and [`DRAGON_STUDENT_WALKTHROUGH_PLAN.md`](DRAGON_STUDENT_WALKTHROUGH_PLAN.md).

---

# Part 1 — Diagnostics

## 1.1 What the system can see today

After the inquiry work, `StudentInquiryHistory` knows: per-concept asked/correct/incorrect, streaks,
last-asked timestamps, items served, solved notebook genes, experiment count, completed runs, and
mean score.

That is real, and it is enough to weight selection. But every one of those signals is derived from
**answers**. The system can say *"this student misses `dominant-means-two`"*. It cannot say why, and
it cannot distinguish a student who reasoned carefully and holds a wrong model from one who clicked
without opening the instrument at all.

**Meanwhile the labs already emit the process data and it is being discarded.** Concretely:

- `AlleleVaultWorkbenchComponent` emits `AlleleWorkbenchInteraction` with seven event types.
  [`dragon-simulation-experience.page.ts:305`](../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts#L305)
  acts on **two** of them (`dna-analysis-requested` navigates, `expression-run` records an
  experiment). `gene-selected`, `allele-selected`, `comparison-swapped`, `allele-installed`, and
  `discovery-claim` are dropped on the floor.
- `GenomeMicroscopeEvidence` is emitted and, as noted in the walkthrough plan, still persisted
  nowhere.
- `HatcheryRunRecord`, `PunnettSavedCross`, `DnaEvidenceResult`, `EnzymeReactionResult`,
  `SelectedMeiosisGamete`, `MeiosisRun`, `StoredIslandDiversityWorld`, and `CompanionShowSnapshot`
  all reach a host that mostly uses them for navigation or a single counter.

The cheapest diagnostic wins are not new instruments. They are keeping what the instruments already
say.

## 1.2 Six upgrades, cheapest first

### D1 — Tag each distractor with the misconception it represents

**Highest value for the least work.** Today a miss maps to the item's one `conceptId`, so three
different wrong answers produce an identical diagnosis. Distractors are already written to embody
specific errors — that information is simply not recorded.

```ts
interface ChoiceOption {
  id: string;
  label: string;
  /** The wrong idea this option represents. Omitted on the correct option. */
  diagnosisConceptId?: ConceptId;
}
```

Take `gen4-prob-1` ("first three hatchlings all recessive; chance the fourth is dominant?"). Choosing
*"100% — the ratio must balance out"* is the gambler's fallacy; choosing *"25% — the pattern will
continue"* is treating observed frequency as the probability. Those are different repairs and today
they are recorded identically.

`SimulationResponseRecord` gains `diagnosisConceptId`, and `buildStudentInquiryHistory` counts it
against the concept the student actually revealed rather than the one the item targeted.

### D2 — Capture confidence, to separate a misconception from a guess

One extra tap before an answer commits ("sure / not sure"). It splits the single most important
diagnostic ambiguity in the system:

| | Correct | Incorrect |
| --- | --- | --- |
| **Confident** | secure | **misconception — teach** |
| **Unsure** | fragile, may be a lucky guess | gap — has not learned it yet |

A confident wrong answer is the only one that justifies re-teaching; an unsure wrong answer usually
needs more practice, not a different explanation. Feed it into selection: `masteryStreak` should not
count lucky guesses, and `repeatMissStrategy` should escalate only on confident misses.

Keep it optional per class (`InquiryPolicy.captureConfidence`) — it adds friction and some teachers
will not want it.

### D3 — Persist the traces the instruments already emit

Add a single append-only `WorkstationTrace` store, user-scoped, stamped with `briefingId`:

```ts
interface WorkstationTrace {
  instrumentId: string;
  probeId: ProbeId | null;   // which capability was exercised
  eventType: string;         // the instrument's own vocabulary
  payload: Record<string, string | number | boolean>;
  atIso: string;
}
```

Route the discarded outputs into it. This alone answers questions the current system cannot:

- Did the student ever reach the `dna` level, or claim without looking?
- How many allele combinations were tested before the discovery claim?
- Was the Punnett prediction saved before or after the clutch hatched?

**Storage caution:** these are high-frequency events. Cap per run, sample the noisy ones
(`gene-selected` fires constantly), and keep whole traces only for the current unit. The diagnostic
value is in *shape*, not in every click.

### D4 — Process signatures: diagnose the reasoning, not the answer

This is where the real gain is. A signature is a named pattern over traces and records that
describes *how a student worked*. `RecordPredicate` already exists for this; these are its natural
first consumers.

| Signature | Detected by | What it diagnoses |
| --- | --- | --- |
| **Claim before evidence** | `discovery-claim` with < 2 prior `expression-run` on that gene | Concluding from one observation |
| **Prediction after result** | `PunnettSavedCross` timestamped after the fertilization it describes | Rationalizing, not predicting |
| **Sample not increased** | Ratio mismatch, then a repeat batch of the same size | `sample-size-irrelevant` in practice |
| **Sequenced before deducing** | Pedigree budget spent with no prior carrier deduction | `sequencing-replaces-reasoning` |
| **Never zoomed** | No microscope evidence below `chromosome` before a DNA-level claim | Answering from the label, not the model |
| **Exhaustive tester** | All allele combinations tested before claiming | Positive signal — name it and tell the teacher |
| **Single-variable comparison** | Island intervention changing one factor at a time | Positive signal — controlled comparison |

Two properties make these worth building. They are **invisible to multiple choice** — a student can
hold a correct model and still work unsystematically, and vice versa. And the positive ones matter
as much as the negative: "this student tests exhaustively before claiming" is the kind of thing a
teacher wants to know and currently has no way to see.

Signatures should be **reported, never scored**. The moment a signature affects a grade, students
optimize the behaviour and it stops measuring anything.

### D5 — Item health analytics

The bank is now 84 authored items. Some are certainly worse than others, and the response data can
say which:

- **Dead distractor** — an option essentially never chosen. It is not doing work; rewrite it.
- **Non-discriminating item** — students strong overall miss it as often as weak ones. Usually
  ambiguous wording, not difficulty.
- **Too easy / too hard at band** — first-attempt accuracy above ~95% or below ~25% suggests the
  item is mis-banded rather than informative.
- **Concept disagreement** — an item whose misses do not correlate with other items on the same
  concept is probably testing something else.

Surface it as a bank health page for whoever maintains content. Aggregate across classes — no single
class has the numbers.

### D6 — Reporting that names the repair

Three views, in order of usefulness to a teacher on a Monday:

1. **Class misconception map** — concepts ranked by how many students currently hold them, split by
   confident-wrong versus unsure. This is the "what do I teach tomorrow" screen.
2. **Mastery ledger** — the `unseen → briefed → practiced → determined → defended` states from the
   walkthrough plan, as students × 8 skills. Its most valuable cell is `unseen`: currently nothing
   distinguishes *"has not learned it"* from *"was never asked"*, and those look identical in a
   gradebook.
3. **Student card** — the concept graph for one student, with secure concepts, held misconceptions,
   process signatures, and the specific prerequisite that is blocking a dependent concept.

## 1.3 What not to over-read

Worth writing into the build guide, because instrumented systems drift toward measuring what is easy:

- **Time on task is not effort.** A fast correct answer may be fluency or may be a lucky click; a
  slow one may be care or a distraction. Do not rank students by it.
- **Click volume is not engagement.** The exhaustive tester and the aimless clicker both produce a
  lot of events. Only the *shape* separates them, which is why D4 is signatures and not counters.
- **A single signature is not a diagnosis.** Require repetition across sessions before showing a
  teacher a claim about a student.
- **Never assessed is not a gap.** Report it as its own state, never as a zero.
- **Nothing here should be visible to the student as a score.** Diagnostics steer what they are asked
  next and what the teacher sees. A student-facing "you hold 3 misconceptions" display converts a
  teaching tool into a ranking.

---

# Part 2 — Stories that drive the path

## 2.1 The problem with the story today

`DragonLessonDefinition.story` is one sentence, rendered once at
[`dragon-lesson.page.html:10`](../src/app/features/dragon-genetics/journey/dragon-lesson.page.html#L10)
and referenced nowhere else. It describes a situation the lab does not know about. Students learn
within about two lessons that it can be skipped — and they are right, because skipping it costs them
nothing.

A story drives a path only when **skipping it loses you information you need**.

## 2.2 The principle: the story is the constraint

The briefing model already carries `budgets`, `release`, and `staging`. The fix is to stop writing
story text *about* those numbers and start generating both from one authored object.

> "The sequencing bay runs on stored charge. There is enough for two runs before the next tide."

That is not flavour text sitting above `sequencingBudget: 2`. It should **be** `sequencingBudget: 2`
— one authored record producing both the sentence and the setting, so the two can never drift and a
teacher who raises the budget to four gets narration that says four.

```ts
interface Commission {
  id: string;
  actId: string;
  client: string;          // who is asking, and why they cannot do it themselves
  problem: string;         // what has gone wrong
  constraint: CommissionConstraint;  // renders to prose AND to a briefing patch
  acceptance: string;      // what the client will accept as done
  predicate: RecordPredicate;        // the same machinery as a checkpoint
}
```

**Client / problem / constraint / acceptance** maps one-to-one onto the briefing plus checkpoint
already designed. The story stops being a parallel artifact and becomes the readable face of the
configuration.

## 2.3 Choose a spine with a question the student is actually answering

An episodic path ("this week, meiosis") has no pull. A spine is one question the whole unit answers.
Three candidates:

**Spine A — The Foundling.** An unclaimed hatchling arrives with no papers. Establish where it came
from and what it will become. *Recommended for the classic/arena path.*

Every act is a genuine step in a real identification, and the labs happen to be exactly the right
tools:

| Act | The question the story asks | Why this lab |
| --- | --- | --- |
| 0 | Are its scars and its startle reflex inherited or acquired? | Trait Evidence, Candling |
| I | Where in its genome do the differences sit? | Microscope, Allele Workbench |
| II | At which base does it differ from the candidate sire? | Microscope, DNA Process |
| III | Why does it react badly to the standard feed? | Protein Rescue |
| IV | Which candidate pair could actually produce it? | Punnett, Hatchery, Sampler |
| V | Which candidates can be **excluded**? | Pedigree, Blood Compatibility |
| VI | Which line should it join, and what does that cost the population? | Island Diversity |
| VII | Defend the parentage claim | Arena / dossier |

Two things make this the strongest option. Blood typing gets its **real** epistemic use — exclusion,
not proof, which is exactly what blood evidence does in actual parentage work and a genuinely
valuable idea for a 7th grader. And the spine has a real answer that can be revealed at the end,
which episodic paths never do.

**Spine B — The Failing Line.** A prized bloodline produces fewer viable hatchlings each generation;
diagnose why. *Recommended for the mini-dragon show path*, where the kennel, bloodline meter, and
registry already model exactly this. Its payoff concept is `best-with-best`, which lands in Act VI —
strong finish, slower start.

**Spine C — The Studbook.** Earn credentials by filing evidence. Makes records matter; weakest pull.
Better as the framing *around* A or B than as a spine itself.

## 2.4 Make it the student's own dragon

The single biggest lift in narrative pull, and it needs no new fiction — only slots filled from
records that already exist:

```
"{{starterFemale}} has thrown a hatchling with {{observedTrait}}, which neither parent shows.
{{clientName}} wants to know how that is possible before the herd is split."
```

Resolved from the journey roster, the genetics notebook, and the account library. A student who
named their founder Emberfall should read *Emberfall* in Act V, not "your dragon". Continuity across
seven acts is what makes a line feel owned rather than assigned.

Keep a neutral fallback for every slot — a student who skipped the naming step must still get
readable prose.

## 2.5 Beats fire on records, not on clicks

A story beat should advance when the student *establishes something*, using the same
`RecordPredicate` as a checkpoint:

```ts
interface StoryBeat {
  id: string;
  commissionId: string;
  trigger: RecordPredicate;   // fires when the lab record satisfies it
  text: string;               // slot template
  briefingDelta?: Partial<WorkstationBriefing>;  // what the world opens up
}
```

This collapses three things into one event: assessment, narrative progress, and the next briefing.
The student excludes a candidate sire → the checkpoint passes, the client writes back, and the next
act's catalog opens. One predicate, three consequences.

## 2.6 Write the failure branch

Most educational narrative only writes the success path, which is why it feels weightless. The
records needed for the other branch already exist and are timestamped.

> "You told the herder to expect three in four. Six of the eight came out plain. She wants to know
> whether she should have trusted the number — or you."

The student's own wrong prediction, quoted back. This is the moment the mathematics of probability
becomes worth understanding, and it is only available because predictions are stored *before*
results. Failure branches must be **recoverable** — the client is unhappy, never gone.

## 2.7 The join: let diagnostics choose the case

This is where Part 1 and Part 2 meet, and it is the most valuable idea in this document.

The concept graph knows which wrong idea a student currently holds. The commission model can carry
several cases per act. So **pick the case that confronts this student's misconception**:

- Holds `carrier-shows-trait` → the Act V commission is a healthy carrier whose pedigree only makes
  sense if unaffected animals can carry.
- Holds `probability-guarantee` → the Act IV client demands a guarantee, and the clutch refuses to
  give one.
- Holds `learned-is-genetic` → the foundling arrives already trained, and its trained skill is the
  thing the client wrongly wants bred for.

Same spine, same acts, same assessment machinery — a different case. Adaptive narrative built
entirely on the concept graph and the commission registry, with no new runtime.

**Guard:** cases must be equivalent in difficulty and coverage, or students end up with unequal
curricula. Vary *which case*, never *how much science*.

## 2.8 Anti-patterns

Straight from [`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md), which
wins on conflict:

- **No story text inside a dedicated workstation.** Commissions live in the journey layer; the lab
  receives a goal sentence and a configuration, nothing else.
- **The story must not narrate the conclusion.** A client may say what they want to know. They may
  never say what the student will find.
- **No reading gate.** Tools do not unlock after a wall of prose.
- **Do not punish exploration.** A budget is a constraint inside a scientific model; a story must
  never dock a student for testing something twice.
- **Never make the fiction override the science.** If the narrative wants a 3:1 clutch and the model
  produces 5:3, the model wins and the story accommodates it. The moment the fiction fudges a
  result, every result becomes untrustworthy.

## 2.9 A note on tone

The existing material has a good instinct — dry, competent, slightly bureaucratic ("the academy will
not release breeding stock to someone who cannot tell what a dragon inherited from what it learned").
Keep that. Treating a 7th grader as a junior colleague being trusted with real work carries further
than whimsy, and it survives being read twice.

---

## 3. Suggested order

1. **D1 distractor tagging** — small, and it improves every diagnosis the system already makes
2. **D3 trace persistence** — unblocks D4 and finally lands `GenomeMicroscopeEvidence`
3. **D2 confidence capture** — one tap, splits misconception from guess
4. **Commission model** — replaces the decorative `story` field; story and briefing become one record
5. **D4 process signatures** — needs D3 in place first
6. **Spine A authoring** — the Foundling across seven acts, with slot personalization
7. **D6 reporting** — the class misconception map first; it is the screen a teacher opens most
8. **§2.7 adaptive case selection** — needs both the concept graph and the commission registry
9. **D5 item health** — wait for enough response data to be meaningful

## 4. Related documents

- [Workstation product rules](DRAGON_GENETICS_WORKSTATION_RULES.md) — authoritative
- [Inquiry architecture](DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md) — concepts, probes, resolver
- [Student walkthrough plan](DRAGON_STUDENT_WALKTHROUGH_PLAN.md) — acts, briefings, checkpoints
- [Workstation architecture](DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md)
