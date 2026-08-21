# Dragon case missions

**Status: plan. Nothing here is built.** Case-driven missions with a fixed arc: an emergency arrives,
the student investigates in real workstations, commits to a plan before seeing the result, and the
model decides the outcome.

Companion to [`DRAGON_DIAGNOSTICS_AND_STORY_PLAN.md`](DRAGON_DIAGNOSTICS_AND_STORY_PLAN.md) (which
argues the story should *be* the constraint) and
[`DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md`](DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md).

---

## 1. The mission arc

Every case runs the same seven beats. Only beats 3 and 5 use a workstation; the rest live in the
journey layer, so no lab gains narration or a question dock.

```text
1 ALERT       a patient or population is in trouble, with a constraint and a clock
2 TRIAGE      what observation alone can and cannot tell you        (journey layer)
3 INVESTIGATE open workstations, student's own order                 ← THE LAB
4 DIAGNOSE    commit to a named cause, citing saved records          (journey layer)
5 PLAN        commit to an intervention and a prediction, then lock  ← THE MISSING SURFACE
6 EXECUTE     the model runs with the chosen intervention            ← THE LAB
7 OUTCOME     computed, never scripted; case file archived           (journey layer)
```

### The plan stage is what does not exist yet

Today a student can investigate and record. There is nowhere they must say *"here is what I think is
wrong, here is what I am going to do about it, and here is what I expect to happen"* — and then be
held to it. Punnett Composer's saved cross is the closest thing in the codebase, and it only covers
one kind of prediction.

That commitment is the whole pedagogical point of a case. It is also, conveniently, exactly the
`record-precedes-record` predicate already designed for checkpoints.

**The Case Plan** — one shared surface in the journey layer:

```ts
interface CasePlan {
  caseId: string;
  studentId: string;
  diagnosis: { conceptId: ConceptId; statement: string };
  citedRecordIds: readonly string[];   // records the student actually produced
  intervention: CaseIntervention;      // options the model genuinely supports
  prediction: CasePrediction;          // quantified where the model allows
  lockedAtIso: string;                 // before EXECUTE, always
}
```

Rules: a plan cannot be submitted without at least one cited record; it locks on submit; it is
timestamped before execution; and it stays visible in the debrief next to what actually happened.

## 2. Outcomes: separate the reasoning from the result

Binary win/lose is the trap. Genetics is probabilistic, so a correct decision can produce a bad
outcome — and if the game punishes that, it teaches students that probability is a lie.

|  | **Good outcome** | **Bad outcome** |
| --- | --- | --- |
| **Sound reasoning** | ✅ **Mission success** | ⚖️ **Right call, unlucky draw** — counts as success; debrief says why |
| **Unsound reasoning** | ⚠️ **Lucky** — not celebrated; the debrief names what was missed | ❌ **Failure with a named cause** — recoverable |

The two off-diagonal cells are where the learning is, and both need explicit copy. A student who
calls a 1-in-4 risk correctly and draws the affected hatchling has done the science right; the
academy should say so plainly.

**Partial success should be the most common result.** Three of five patients respond. Richness rises
but not enough. That is what real intervention looks like, and it gives the debrief something to
chew on.

**Outcome is computed from the real genetics model, never authored.** If the fiction wants a clean
result and the model gives a messy one, the model wins.

---

## 3. The case files

Eight missions, ordered on a **scope ladder** — one patient → one clutch → one line → one island.
Scope escalation carries the story, and the genetics scales with it.

---

### CASE 1 · "Rockfall" — the transfusion

**Scope:** one patient · **Skill:** GEN-7 · **Concepts:** `two-alleles-max`,
`universal-donor-confusion`

**ALERT.** A dragon crushed in a rockfall is bleeding out. The Healing Chamber has four donors on
hand and stored volume for three transfusions. There is no time to fly for more.

**TRIAGE.** Blood type is invisible. Nothing about how the patient looks, how big it is, or who its
parents were settles this. That dead end is the point of the beat.

**INVESTIGATE** — [Blood Compatibility Lab](../src/app/features/dragon-genetics/workstations/blood-compatibility/).
Antiserum tests against markers `a` and `b` on the patient and on each donor. The reaction pattern
gives phenotype (`a-positive`, `b-positive`, `ab-positive`, `o-positive`), not genotype — an
`a-positive` patient is `AA` or `AO` and the test cannot say which.

**DIAGNOSE.** Name the patient's blood phenotype and say which markers their immune system will
attack.

**PLAN.** Choose donors and volumes. Predict which will be accepted.

**EXECUTE → OUTCOME.** The Healing Chamber runs it. Compatible blood stabilizes the patient;
incompatible blood causes agglutination and costs both the unit and time.

**The teaching twist.** The `O` donor is compatible with everyone and there is only one unit of it.
A student who reflexively reaches for the universal donor burns it on a patient who could have taken
`A`, and then meets a patient who genuinely needed it. That is a direct, mechanical attack on
`universal-donor-confusion` — and it cannot be learned from the multiple-choice item alone.

**Failure recovery.** A rejected transfusion drops the patient's condition and shortens the clock; it
does not end the case. Two rejections force a triage decision about which of two patients to save,
which is a harder and better problem.

**Escalation.** `BloodLabMode: 'challenge'` already exists in the model — use it for the second
run-through, with donors whose types must be inferred from partial tests.

---

### CASE 2 · "The Wasting Clutch" — a genetic disease

**Scope:** one clutch · **Skill:** GEN-6 · **Concepts:** `one-gene-one-trait`,
`mutation-types-confused`, `protein-shape-irrelevant`

**ALERT.** Four hatchlings from one clutch are failing on the standard feed. Two nestmates are fine.
The feed was changed three weeks ago, so the herder blames the supplier.

**TRIAGE.** [Trait Evidence](../src/app/features/dragon-genetics/workstations/trait-evidence/) — is
this inherited or environmental? The recent feed change is a genuine confound and the student has to
notice that *both* explanations fit the timing.

**INVESTIGATE.**
1. [Genome Microscope](../src/app/features/dragon-genetics/workstations/genome-microscope/) — descend
   the chr4 Dracase locus from `gene` → `dna` → `rna` → `protein`.
2. [DNA Process Lab](../src/app/features/dragon-genetics/workstations/dna-process-lab/) — compare the
   two allele copies base by base.
3. [Protein & Diet Rescue](../src/app/features/dragon-genetics/workstations/protein-rescue/) — the
   Dracase enzyme, the digestion model, and diet trials.

The model already carries the payoff. The working allele reads `ATGTTTGGCAAACCT`; the broken one
reads `ATGTTTTAGAAACCT`. A single base change turns codon 3 from `GGC` into `TAG` — a **stop codon**.
Translation halts three codons in, and no functional Dracase enzyme is produced. The student can
watch that happen at the `rna.translate` probe rather than being told it.

**DIAGNOSE.** Name the mutation (a substitution creating a premature stop), the missing protein, and
why `dd` hatchlings cannot digest dracose while `Dd` nestmates can.

**PLAN.** Choose a diet for each affected hatchling and predict which will recover. The food catalog
supports `digested` / `managed` / `no-dracose` / `undigested` outcomes, so the plan is a real choice
with real trade-offs, not a single right answer.

**OUTCOME.** Patients on a dracose-free diet recover. Patients on a "managed" diet improve but stay
fragile. The herder's supplier is exonerated — which is its own small satisfaction.

**The teaching twist.** The two healthy nestmates are `Dd` carriers. A student who concludes "the
sick ones inherited it, the healthy ones didn't" has missed that the healthy ones are carrying it
too — and that lands Case 5 later.

---

### CASE 3 · "Cold Snap" — inherited or damaged?

**Scope:** one clutch · **Skill:** GEN-1, GEN-3 · **Concepts:** `learned-is-genetic`,
`appearance-as-proof`

**ALERT.** An incubation shed lost heat overnight. Nine eggs were chilled. Incubator space is
limited: room for five.

**TRIAGE.** Candling shows some eggs developing oddly. Is that cold damage or what they were always
going to be?

**INVESTIGATE.** [Candling Workstation](../src/app/features/dragon-genetics/workstations/candling-workstation/)
with a sampling budget — candle freely, sequence only twice. Trait Evidence for the inherited-versus-
acquired sort.

**DIAGNOSE.** For each egg, damaged or inherited.

**PLAN.** Commit five eggs to the incubator and say why.

**OUTCOME.** They hatch. Some of the odd-looking ones were fine; some healthy-looking ones were not.

**The teaching twist.** Appearance under the candling lamp is a weak predictor, and the two sequencing
runs are the only strong evidence available. Students who spend both early, on the eggs that look
most obviously strange, learn that they spent them on the eggs they were already sure about.

---

### CASE 4 · "The Wrong Sire" — a forensic exclusion

**Scope:** one clutch · **Skill:** GEN-3, GEN-4 · **Concepts:** `recessive-disappears`,
`dominant-means-two`, `carrier-shows-trait`

**ALERT.** A clutch from a registered pairing has produced a hatchling showing a trait neither parent
shows. The breeder is accused of misrepresenting the sire, and their registry standing is at stake.

**TRIAGE.** Both registered parents show the dominant form. So does most of the clutch.

**INVESTIGATE.** [Allele Workbench](../src/app/features/dragon-genetics/workstations/allele-workbench/)
to establish which allele pairs produce which visible form.
[Punnett Composer](../src/app/features/dragon-genetics/workstations/punnett-composer/) to work out
what the registered pairing *can* produce.
[Blood Compatibility](../src/app/features/dragon-genetics/workstations/blood-compatibility/) to test
whether the registered sire can be **excluded** on blood markers.

**DIAGNOSE.** Either "possible — both parents are carriers" or "impossible — this pairing cannot
produce this offspring."

**PLAN.** Commit to a verdict, and propose the test that would settle it: a test cross, or a blood
exclusion.

**OUTCOME.** The breeder is cleared or the record is corrected.

**The teaching twist.** This is the case that teaches what blood evidence actually does. Blood typing
can **exclude** a sire but can never **prove** one — an incompatible type rules a candidate out,
while a compatible type only means "not ruled out". Students reliably want it to prove paternity, and
having the registry reject an over-claimed verdict is a sharp, memorable correction.

---

### CASE 5 · "The Silent Carrier" — risk before breeding

**Scope:** one line · **Skill:** GEN-5 · **Concepts:** `carrier-shows-trait`,
`skipped-generation-impossible`, `probability-guarantee`, `sequencing-replaces-reasoning`

**ALERT.** A valuable pairing is scheduled for tomorrow. A recessive condition appeared three
generations back and has not been seen since. The breeder wants a yes or no.

**INVESTIGATE.** [Pedigree Lab](../src/app/features/dragon-genetics/workstations/pedigree-lab/) —
the archive, an inheritance model the student chooses, and a **sequencing budget of two** against
nine candidates. The budget is the assessment: it forces deduction before testing.

**DIAGNOSE.** Name which individuals must be carriers, which cannot be, and which are unresolved.

**PLAN.** Approve, reject, or propose an alternative pairing — with a stated risk figure.

**EXECUTE.** [Hatchery](../src/app/features/dragon-genetics/workstations/dragon-hatchery/) breeds it.

**OUTCOME.** This is the case built for the **right call, unlucky draw** cell. A student who
correctly calculates a 1-in-4 risk, approves with that caveat, and draws an affected hatchling has
done the work correctly. The debrief must say so in as many words, and the breeder must not blame
them. Getting this beat right is what makes probability trustworthy for the rest of the unit.

---

### CASE 6 · "Copy Errors" — a failing repair system

**Scope:** one line · **Skill:** GEN-6 · **Concepts:** `replication-destroys-template`,
`repair-guarantees-no-mutations`, `mutation-always-harmful`

**ALERT.** A line is throwing more novel defects each generation. Nothing about the pairings has
changed.

**INVESTIGATE.** [DNA Process Lab](../src/app/features/dragon-genetics/workstations/dna-process-lab/)
— replication, mutation, and repair. Microscope at the `dna` and `protein` probes.

**DIAGNOSE.** Which step is failing, and why "they have repair machinery" does not mean "they get no
mutations."

**PLAN.** Limited repair capacity: choose which sequences to correct. Predict the effect on the next
generation.

**OUTCOME.** Mutation load, measured.

**The teaching twist.** Some of the accumulated changes are silent and some are beneficial. A student
who spends capacity repairing every difference wastes it. `mutation-always-harmful` dies here.

---

### CASE 7 · "The Founder Crash" — a population in decline

**Scope:** one island · **Skill:** GEN-8 · **Concepts:** `phenotype-equals-diversity`,
`wrong-diversity-metric`, `best-with-best`, `confounded-comparison`

**ALERT.** An island's hatch failures are rising. The population still looks varied and numbers are
holding. The warden wants to cull the weak animals.

**INVESTIGATE.** [Island Diversity](../src/app/features/dragon-genetics/workstations/island-diversity/)
— field genotype scans, population metrics. Pedigree Lab to see how related everyone is.

**DIAGNOSE.** Narrow allele pool, not food and not disease. The population looks varied because
visible variety and allele richness are different measurements.

**PLAN.** Relocations under a transport budget, with a predicted richness gain. The warden's proposed
cull is on the table as an option and it makes things worse — a plan the student can choose and must
then defend against the metrics.

**OUTCOME.** Measured allele richness against the prediction, across generation events.

**The teaching twist.** The obvious intervention (remove the weakest, breed the best) is the one that
narrows the pool further. `best-with-best` is confronted by consequence rather than by assertion.

---

### CASE 8 · "The Registry Challenge" — the capstone

**Scope:** the archipelago · **Skills:** all eight

**ALERT.** A ruling body challenges a claim the student made in an earlier case. The case file is
reopened.

**INVESTIGATE.** Their own archived records from Cases 1–7.

**PLAN.** Assemble the defense — the Champion Dossier from the walkthrough plan, one claim per act,
each citing real records, including the required "what I got wrong" item.

**OUTCOME.** Ruling, with a rubric.

The point of reopening an *earlier* case is that it makes the archive matter retroactively. Students
who cited sloppily in Case 2 discover it in Case 8, which is the only way that lesson ever lands.

---

## 4. Chaining cases into paths

Three routes through the same eight cases. A class can run one; a student who finishes early takes
another.

| Path | Cases | Ends as |
| --- | --- | --- |
| **The Healer's Circuit** | 1 → 2 → 6 → 8 | Academy diagnostician |
| **The Studbook** | 3 → 4 → 5 → 8 | Certified breeding advisor |
| **The Warden** | 2 → 5 → 7 → 8 | Island warden |

Each path is a scope ladder of its own, and all three converge on Case 8, so a class ends with a
shared capstone whatever route they took.

**Cases 2 and 5 appear on two paths each.** That is deliberate — they are the strongest cases, and a
student meeting Case 5 after Case 2 already knows the healthy nestmates were carriers.

### Chaining rules

- **A case ends with a consequence that opens the next.** The clutch saved in Case 2 becomes the line
  under review in Case 5. Continuity comes from the student's own records, not from new fiction.
- **A failed case still opens the next one.** Failure changes the situation, never the availability.
- **Case files persist and are re-readable.** Both blood and protein rescue already keep records
  (`BloodEmergencyRecord`, `ProteinRescueCaseRecord`) — the case archive is a view over those.

---

## 5. Where diagnostics plug in

From the [diagnostics plan](DRAGON_DIAGNOSTICS_AND_STORY_PLAN.md), the case structure is what makes
those signals available:

- **The plan record is the prediction-before-result signal** for every case, not just Punnett.
- **Cited records** show whether a diagnosis rested on evidence the student actually gathered — a
  plan citing nothing, or citing a record from a different patient, is a specific and detectable
  reasoning failure.
- **Budget-spend order** (Cases 3 and 5) reveals whether a student reasons before testing.
- **Case selection can be adaptive.** A student holding `universal-donor-confusion` gets the Case 1
  variant where the `O` supply runs out early. Same case, same assessment, different pressure.

---

## 6. Build order

1. **The Case Plan surface** — the missing piece; everything else depends on it
2. **Outcome model** — the 2×2, with copy written for all four cells, especially "right call,
   unlucky draw"
3. **Case 1 (Rockfall)** end to end — smallest scope, and the lab is the most complete
4. **Case 2 (Wasting Clutch)** — proves the multi-workstation investigation chain
5. **Case archive** — a view over the emergency and clinical records that already persist
6. **Cases 3–7**, then chaining, then Case 8

Case 1 first because the Blood Compatibility Lab already has the Healing Chamber, donor constraints,
and persistent emergency records. Most of the mission exists; what is missing is the plan-and-lock
beat and the debrief.

## 7. Rules to keep

- No case narration inside a workstation. Beats 1, 2, 4, and 7 are journey-layer surfaces.
- The clock is a constraint on resources, never a real-time timer. Students think slowly on purpose.
- Never let the fiction override the model's result.
- Every failure is recoverable, and every case can be re-run with a different draw.
- A case must never be completable by clicking through without operating an instrument.

## 8. Related documents

- [Diagnostics and story plan](DRAGON_DIAGNOSTICS_AND_STORY_PLAN.md)
- [Student walkthrough plan](DRAGON_STUDENT_WALKTHROUGH_PLAN.md)
- [Inquiry architecture](DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md)
- [Workstation product rules](DRAGON_GENETICS_WORKSTATION_RULES.md) — authoritative
