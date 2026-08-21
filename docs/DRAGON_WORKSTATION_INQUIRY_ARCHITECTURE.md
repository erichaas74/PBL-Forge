# Dragon workstation inquiry architecture

**Status: proposal. Nothing here is built yet.** This document designs one mechanism for adjusting
both *what a workstation asks* and *how a workstation is used*, for a class, a lesson, or one
student.

Companion to [`DRAGON_STUDENT_WALKTHROUGH_PLAN.md`](DRAGON_STUDENT_WALKTHROUGH_PLAN.md), which
defines the curriculum sequence that drives this mechanism.

---

## 1. What exists today

Three separate mechanisms already do part of this job, and they do not know about each other.

### 1.1 The adaptive registry — `levelChallenges`

[`dragon-simulation.registry.ts`](../src/app/features/dragon-genetics/adaptive/dragon-simulation.registry.ts)
holds 37 authored questions: exactly **one per (simulation, instruction level)** across 9
simulations × 4 levels. `DragonSimulationSetting` lets a teacher set `enabled`, `level`,
`questionCount`, and `hintsAllowed`.

### 1.2 The Allele Workbench `question` input

`AlleleWorkbenchQuestionInput` has `focusGeneId`, `startingPairIds`, `requestedPairIds`,
`comparisonAlleleIds`, `allowedAlleleIds`, and `highlight`. **It has no prompt, no options, and no
correct answer.** It is not a question — it is a configuration directive that happens to be named
"question". This is the healthiest pattern in the codebase and the one worth generalizing.

### 1.3 The Hatchery station's evidence prompt

`DragonHatcheryStationComponent` takes `prompt`, `evidence`, `correctEvidenceId`, and
`requirePrediction`. Each `HatcheryEvidenceOption` carries an `anchorId` pointing at a **real element
inside the real instrument** (`allele-slot-a`, `phenotype-readout`). And `openLab` "removes the
lesson sequence and opens every hatchery tool immediately."

That last input is the important one. It means the codebase has already solved the rules tension:
**the same instrument runs in two modes** — an open investigation with no questions, and a guided
module with them. §6 generalizes it.

---

## 2. Six problems to fix

These are the reasons a new architecture is warranted rather than an extension.

**1 — Two thirds of a 7th grader's questions are synthesized filler.** For `grade-7`,
`generateSimulationQuestions` finds 1 eligible authored challenge, then pads to `questionCount: 3`
using `buildFoundationalQuestions`, which emits *"Locate the part of the model labeled X"* and
*"Which model record should be opened next to strengthen the explanation?"* Those are content-free
templates. A student's assessment is one real question and two pieces of scaffolding cosplay.

**2 — An AP student is asked grade-7 questions.** `eligibleLevels = LEVEL_ORDER.slice(0,
targetIndex + 1)` accumulates every level *below* the target, and the supporting pool draws from it.
Level is implemented as a ladder the student carries up, when it should be a dimension they sit at.

**3 — Questions anchor to a fake diagram.** `focusNodeId` points into `definition.nodes` — a 3-to-5
item symbol list used by the generic `simulation-visual/` renderer. The generated hint reads *"Look
for the ○ symbol."* In a dedicated workstation that hint is meaningless, because the real instrument
has no ○. Meanwhile the Hatchery's `anchorId` already points at real instrument parts. The good
mechanism exists and the question system does not use it.

**4 — Six workstations cannot be asked about at all.** `DragonSimulationId` covers 9 stations.
Pedigree Lab, Protein Rescue, Blood Compatibility, Companion Show, Candling, and Island Diversity
are not in the union, so no question can target them.

**5 — Phase is assigned by array arithmetic.** `definition.sections[index % 4]` stamps
observe/predict/manipulate/explain onto questions by position after a shuffle. A question authored
as an explanation lands under "Inspect the system" roughly a quarter of the time.

**6 — The real pedagogical unit is a loose string.** There are ~20 genuinely good misconception
flags in the registry — `one-gene-one-trait`, `gamete-stays-diploid`, `dominant-means-two`,
`identical-gametes`, `learned-is-genetic`, `grid-equals-family`, `appearance-as-proof`,
`hierarchy-confusion`. They are typed as `string`. Nothing guarantees coverage, nothing prevents a
typo, nothing can ask the same misconception in a different lab, and nothing reports which
misconceptions a class still holds.

**The diagnosis:** `DragonSimulationDefinition` fuses three things that change for different reasons
and at different rates — the instrument, its configuration, and its questions. Every problem above
follows from that fusion.

---

## 3. The architecture: three registries and one resolver

Split the fused definition into three registries with different owners, joined by capability rather
than by workstation id.

```text
   INSTRUMENT MANIFEST            CONCEPT GRAPH              INQUIRY BANK
   owned by each workstation      owned by curriculum        authored content
   ────────────────────────       ─────────────────          ────────────────
   what it can be told to do      skills, misconceptions,    items targeting a concept
   what it can be asked about     prerequisites              via a required probe
   what records it emits
            │                             │                         │
            └──────────────┬──────────────┴─────────────────────────┘
                           ▼
                    SESSION RESOLVER  (pure function, 5 layers)
                           ▼
                   WorkstationSession { briefing, inquiry }
                           ▼
                    page shell binds to component inputs
```

The join key is the **probe** (§5), not the workstation id. That single change is what lets one
question run in three different labs and what lets a new workstation inherit an existing question
bank on the day it ships.

### 3.1 Instrument manifest — owned by the workstation

Each workstation declares its own capabilities, in its own folder. Nothing upstream imports from
`journey/` or from the inquiry bank.

```ts
// workstations/genome-microscope/genome-microscope.manifest.ts
export const GENOME_MICROSCOPE_MANIFEST: InstrumentManifest = {
  id: 'genome-microscope',
  sessionModes: ['investigation', 'guided'],
  configVocabulary: ['release.geneIds', 'staging.entryLevel', 'staging.focusGeneId'],
  probes: [
    { id: 'genome.hierarchy', yields: 'selection',   anchorId: 'level-rail' },
    { id: 'gene.locus',       yields: 'selection',   anchorId: 'chromosome-map' },
    { id: 'allele.pair',      yields: 'comparison',  anchorId: 'homolog-compare' },
    { id: 'dna.sequence',     yields: 'measurement', anchorId: 'sequence-readout' },
    { id: 'protein.product',  yields: 'record',      anchorId: 'translation-bench' },
    { id: 'gene.to.trait',    yields: 'record',      anchorId: 'expression-stage' },
  ],
  emits: ['microscope.evidence'],
};
```

A manifest is a **capability declaration, not content**. It says what this instrument can evidence.
It contains no prompts, no answers, and no lesson text.

### 3.2 Concept graph — owned by curriculum

Promote misconceptions from loose strings to first-class entities, keyed to the eight existing
`GeneticsSkill` values.

```ts
export interface Concept {
  id: ConceptId;                       // 'one-gene-one-trait'
  skillId: GeneticsSkill;              // 'GEN-6'
  statement: string;                   // the correct idea, in student language
  misconception: string;               // the wrong idea it displaces
  probes: readonly ProbeId[];          // probes that can evidence it
  prerequisites: readonly ConceptId[];
  gradeBand: readonly InstructionLevel[];
}
```

The ~20 flags already in the registry are the seed data. This registry is what makes coverage
checkable, reporting possible, and typos impossible.

### 3.3 Inquiry bank — authored content

One item type with **three kinds**, which unifies the multiple-choice questions that exist today
with the record predicates the walkthrough plan needs.

```ts
export type InquiryItem = ChoiceItem | ProbeItem | ConstructItem;

interface InquiryItemBase {
  id: string;
  conceptId: ConceptId;
  requiresProbe: ProbeId;              // the join: any instrument declaring it can host this
  gradeBands: readonly InstructionLevel[];  // a set, not a ladder
  phase: SimulationPhase;              // authored, never computed
  hint?: string;
  source: 'registry' | 'teacher';
}

/** Answered by choosing. What exists today. */
interface ChoiceItem extends InquiryItemBase {
  kind: 'choice';
  prompt: string;
  options: readonly { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
}

/** Answered by operating the instrument. Evaluated against the record the lab saved. */
interface ProbeItem extends InquiryItemBase {
  kind: 'probe';
  task: string;
  predicate: RecordPredicate;          // matches-catalog | precedes | threshold
}

/** Answered by building a record — a claim, a chart row, a cross. */
interface ConstructItem extends InquiryItemBase {
  kind: 'construct';
  task: string;
  recordType: string;
  rubricId: string;
}
```

`ProbeItem` is the important addition. It is a question that cannot be clicked past, it requires no
UI inside the lab, and it is the same object the walkthrough plan calls a checkpoint. One bank, one
selection algorithm, one report — whether the item is answered by choosing or by doing.

---

## 4. The resolver: five layers, one pure function

```ts
export function resolveSession(
  manifest: InstrumentManifest,
  layers: readonly SessionPatch[],
  seed: string,
): WorkstationSession;

export interface WorkstationSession {
  sessionMode: 'investigation' | 'guided';
  briefing: WorkstationBriefing;       // "how to use it" — see the walkthrough plan §2
  inquiry: ResolvedInquiry;            // "what it asks"
  provenance: readonly LayerTrace[];   // which layer set which field, for the teacher UI
}
```

Each layer emits a **patch**, never a whole object, and later layers win:

| Layer | Owner | Sets | Persisted in |
| --- | --- | --- | --- |
| L0 registry default | code | baseline briefing + concept targets | the registries |
| L1 class assignment | teacher | level, enabled, catalog release, item opt-outs | `DragonAssignment` |
| L2 act briefing | curriculum path | staging, budgets, target concepts for this step | act registry |
| L3 student adaptation | system | reweighting from misconception history | student progress |
| L4 live override | teacher, in session | anything, with a reason string | session override record |

Three properties this buys:

- **Deterministic.** Same layers plus same seed produce the same session. Reproducible for a
  teacher looking at what a student actually saw.
- **Testable with no UI.** The resolver is a pure function over plain data. Every adjustment rule
  gets a unit test.
- **Explainable.** `provenance` lets the teacher screen say *"this student sees 2 questions because
  the act asked for 3 and you disabled one"* instead of showing an opaque result.

`DragonAssignment` already carries `alleleCatalog`, `simulationSettings`, `journeyPlan`, and
`studentOverrides`. L1 and L3 are extensions of fields that exist, not new storage.

---

## 5. Probes — the join, and the fix for anchoring

A probe is a **named, addressable capability of a real instrument**: a thing a student can select,
compare, measure, or record. It is the unit that questions bind to.

```ts
export interface InstrumentProbe {
  id: ProbeId;                                     // 'allele.pair'
  yields: 'selection' | 'comparison' | 'measurement' | 'record';
  anchorId?: string;                               // real DOM anchor in the real instrument
}
```

Why this is the center of the design:

- **Questions become portable.** `one-gene-one-trait` requires `gene.to.trait`. The microscope, the
  workbench, and Protein Rescue all declare that probe, so one authored item runs in all three. Today
  it can only run in the microscope.
- **New workstations inherit content.** Blood Compatibility ships declaring `allele.pair` and
  `multiple.alleles`, and immediately has a question bank. Today it has none and cannot have one.
- **Hints point at something real.** `anchorId` is the Hatchery's existing mechanism. A hint becomes
  *"compare the two copies in the homolog panel"* — an actual place — instead of *"look for the ○
  symbol"* on a diagram the student is not looking at.
- **Coverage is checkable.** A build-time assertion can prove every concept in an act has at least
  one item, and that every item's probe is declared by at least one instrument in that act.

**Constraint:** a probe id is a stable contract. Renaming one breaks authored content, so
`probes` is versioned with the manifest and a spec asserts no probe referenced by the bank has
disappeared.

---

## 6. Session modes — how this stays inside the rules

[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md) forbids a question
dock inside a dedicated workstation, and it wins on conflict. The Hatchery's `openLab` input already
shows the resolution: one instrument, two modes.

```ts
sessionMode: 'investigation' | 'guided'
```

**`investigation`** — the dedicated open workstation. `inquiry` is present but renders **entirely
outside the instrument**: before entry as the goal, after exit in the act shell. `ProbeItem`s are
evaluated silently against saved records, so the lab is assessed without ever displaying a question.
A workstation in this mode receives no prompt, no options, and no correctness state. This is the
default and it is what every route under `/dragon-genetics/*` uses.

**`guided`** — a module host that has explicitly opted in. The manifest must list `'guided'` in
`sessionModes`, and the workstation's build guide must record the decision. Today only the Hatchery
station qualifies. In this mode the host — not the instrument — renders items, anchored into the
instrument by `anchorId`.

**A workstation that does not declare `'guided'` can never be sent inquiry UI.** That is enforced in
the resolver and asserted in a spec, so the rule is mechanical rather than a review convention.

This is also the honest reading of the current state: the rules describe the target for dedicated
workstations, the Hatchery station is a module host, and both are legitimate. The mode field names
the distinction instead of leaving it implicit in a boolean called `openLab`.

---

## 7. Selection: coverage, not padding

Replace `buildFoundationalQuestions` and the level ladder with concept-targeted selection.

```ts
export function selectInquiry(
  targetConcepts: readonly ConceptId[],   // from the act, or the workstation's default skill
  availableProbes: readonly ProbeId[],    // from the manifest ∩ the briefing's release
  bank: readonly InquiryItem[],
  level: InstructionLevel,
  history: StudentMisconceptionHistory,
  count: number,
  seed: string,
): readonly InquiryItem[];
```

Rules, in order:

1. Filter to items whose `gradeBands` **contains** `level`. A set membership test, not a prefix
   slice — an AP student never sees a grade-7 item, and a grade-7 student never sees an AP one.
2. Filter to items whose `requiresProbe` is actually available in this session. An item about allele
   pairs is not asked when the briefing released one allele.
3. Cover every target concept once before covering any concept twice.
4. Weight up concepts the student has missed before; weight down items they answered correctly
   recently.
5. Shuffle deterministically by seed.
6. **If the bank cannot fill `count`, ask fewer.** Never synthesize. A short bank is a content gap
   that should be visible in a coverage report, not hidden behind generated filler.

Rule 6 is the direct fix for problem 1, and it will initially *reduce* the number of questions
students see. That is correct: one real question beats one real question plus two fillers, and the
coverage report makes the gap actionable.

---

## 8. Who can adjust what

| Surface | Audience | Can change | Cannot change |
| --- | --- | --- | --- |
| Registry | developers | manifests, concepts, bank, defaults | — |
| Class settings | teacher | level, enabled stations, released catalog, opt out an item, question count cap | probe contracts |
| Act registry | curriculum author | staging, budgets, target concepts per step | anything a lab does not declare |
| Item authoring | teacher | write a `ChoiceItem` against an existing concept + probe | invent a probe |
| Student overrides | teacher | level, count, waive an item, reason string | — |
| Live session | teacher | any field, logged with provenance | — |

**Teacher-authored items** are the largest new capability, and they are safe because a teacher
chooses an existing concept and an existing probe rather than free-typing a target. Authored items
carry `source: 'teacher'`, validate on save against the same schema as registry items, and are
storable on `DragonAssignment` alongside `simulationSettings`. They never override a registry item —
they extend the bank, and opt-outs handle removal.

---

## 9. Migration

Each step is shippable and reversible.

**Step 1 — Concept registry.** Extract the ~20 existing `misconceptionFlag` strings into typed
`Concept` records. Change `misconceptionFlag: string` to `conceptId: ConceptId`. Mechanical, no
behavior change, immediately prevents typos and enables the first coverage report.

**Step 2 — Manifests.** Add one manifest per workstation, starting with the six that have no
`DragonSimulationId` today. Declares probes only; no behavior change.

**Step 3 — Bank extraction.** Move the 37 `levelChallenges` into `InquiryItem` records with
`kind: 'choice'`. Convert `focusNodeId` to `requiresProbe`. **Author `gradeBands` explicitly** rather
than deriving them, and author `phase` explicitly — this is where problems 2 and 5 die. Expect the
bank to look thin; that is the true state, previously masked by filler.

**Step 4 — Resolver.** Implement `resolveSession` with L0 and L1 only, and make the adaptive
experience page consume it. Behavior should be equivalent apart from the filler removal.

**Step 5 — Probe items.** Add `kind: 'probe'` and the three record predicates. This is where the
walkthrough plan's checkpoints land, and where dedicated workstations become assessable without any
in-lab UI.

**Step 6 — L2/L3/L4** — act briefings, adaptation, live override — then the teacher authoring
surface and the coverage report.

`openLab` becomes `sessionMode` in Step 4 and can keep a deprecated alias for one release.

---

## 10. What this fixes

| Problem | Fixed by |
| --- | --- |
| 1 — filler questions | §7 rule 6: ask fewer, report the gap |
| 2 — AP sees grade-7 items | §3.3 `gradeBands` as a set; §7 rule 1 |
| 3 — questions anchor to a fake diagram | §5 probes with real `anchorId`s |
| 4 — six labs unaskable | §3.1 manifests; §5 capability join |
| 5 — phase by arithmetic | §3.3 `phase` authored on the item |
| 6 — misconceptions as strings | §3.2 concept graph |

---

## 11. Decisions to confirm

1. **Do probes get one shared vocabulary or per-instrument namespaces?** Shared (`allele.pair` means
   the same thing everywhere) is what makes questions portable and is the whole point of §5.
   Per-instrument namespacing is safer against accidental collisions but gives up the reuse.
   **Recommend shared, with a registry and a rename-guard spec.**
2. **Can teachers author `ProbeItem`s, or only `ChoiceItem`s?** Probe items need a predicate, which is
   closer to programming than authoring. **Recommend choice-only for teachers** in v1, with probe
   items staying in the registry.
3. **Does `guided` mode stay Hatchery-only?** Opening it to more workstations is a product decision
   against the rules doc, and the mode field makes it explicit either way. Keeping it Hatchery-only
   means every other lab is assessed purely through probe items and records.
4. **Is the filler removal acceptable as a visible regression?** Students will see fewer questions
   until the bank is filled. This plan says yes and treats the coverage report as the remedy.
5. **Where do teacher-authored items live?** On `DragonAssignment` beside `simulationSettings` is
   simplest and matches the existing shape; a separate collection scales better if item counts grow.

---

## 12. Related documents

- [Workstation product rules](DRAGON_GENETICS_WORKSTATION_RULES.md) — authoritative, wins on conflict
- [Student walkthrough plan](DRAGON_STUDENT_WALKTHROUGH_PLAN.md) — the curriculum this drives
- [Workstation architecture](DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md)
- [Adaptive full-page architecture](dragon-genetics-simulations/ADAPTIVE_FULL_PAGE_ARCHITECTURE.md)
- [Simulation build standard](dragon-genetics-simulations/SIMULATION_BUILD_STANDARD.md)
