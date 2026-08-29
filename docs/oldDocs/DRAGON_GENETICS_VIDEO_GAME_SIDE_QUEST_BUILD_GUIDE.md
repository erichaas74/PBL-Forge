# Dragon Genetics Video-Game Side Quest Story Build Guide

**Status:** Proposed content and implementation guide  
**Purpose:** Add story-driven, video-game-style side quests to the Dragon Genetics workstations while preserving open scientific investigation.  
**Primary architecture:** `DRAGON_GENETICS_STORY_WORKSTATION_ORCHESTRATION_UPGRADE.md`  
**Story and diagnostic basis:** `DRAGON_DIAGNOSTICS_AND_STORY_PLAN.md`  
**Authoritative product rules:** `DRAGON_GENETICS_WORKSTATION_RULES.md`

## 1. Goal

Turn the Blood Compatibility Lab, Protein Rescue Lab, Pedigree Lab, and Island Expedition into memorable side quests that feel like missions in a story-driven game.

The student should feel that they are:

- accepting a commission from an in-world client;
- entering a real laboratory, archive, or field site;
- gathering evidence in any useful order;
- discovering a complication through the scientific model;
- making a decision with visible consequences;
- adding a meaningful record to a larger Dragon Genetics campaign.

The side-quest layer must not turn the workstations into scripted tutorials or quiz screens. The workstation remains the scientific instrument. Story, objectives, NPC dialogue, rewards, and consequences are rendered by the lesson or workstation host around the instrument.

---

## 2. Non-negotiable design rules

1. **No permanent question dock inside a dedicated workstation.**
2. **Students may investigate in any order.** Objectives describe evidence to gather, not buttons to press.
3. **The scientific model wins over the story.** The story reacts to actual results and never forces a predetermined result.
4. **Story never reveals the conclusion before the student establishes it.**
5. **Every story feature is teacher-controlled.**
6. **Teacher demonstrations are visible, temporary, cancellable, and state-restoring.**
7. **Unsuccessful decisions create recoverable complications, not a complete restart.**
8. **Rewards recognize evidence, revision, and scientific reasoning, not speed or click count.**
9. **The same workstation must still work as a fully open lab when the quest system is disabled.**
10. **Story constraints and workstation settings must come from the same authored quest record.** If the story says two sequencing runs remain, the laboratory must actually receive a sequencing budget of two.

### Good objective wording

> Gather enough blood-test evidence to recommend a donor.

> Determine whether both chromosome copies produce working Dracase.

> Propose a breeding pair that considers the lost trait, relatedness, and the second locus.

### Avoid

> Click Donor A, press Test, and answer Question 1.

> Sequence Dragon 3 before opening the breeding board.

> Complete the story question before using the laboratory again.

---

## 3. Existing workstation inventory

| Workstation | Existing foundation | Main quest work still needed |
|---|---|---|
| **Blood Compatibility** | The page is already framed as the **Dragon Genetics Emergency Healing Station** and hosts `app-blood-compatibility-lab`. | Audit the inner component, expose typed events, add quest scenarios, evidence cards, donor recommendations, patient consequences, and NPC overlays. |
| **Protein Rescue** | Patient intake, observed symptoms, two chromosome 4 samples, transcription, translation, protein-function tests, food trials, and a saved rescue record already exist. | Add quest orchestration, patient reaction states, a molecular evidence trail, NPC communications, claim complications, and campaign dossier export. |
| **Pedigree Lab** | Hall of Legendary Dragons, competing inheritance models, contradictions, sequencing budget, carrier calls, gene notebook, relatedness, breeding board, second-locus risk, clutch log, and recovery state already exist. | Add the quest director, event adapter, story dialogue, visual game polish, consequence branches, and rewards. This is the best first vertical slice. |
| **Island Expedition** | The page is already framed as a **Field Survey** and passes `initialQuestId` to `app-island-expedition`. | Audit the inner expedition engine, then connect or build survey layers, interventions, generation outcomes, evidence snapshots, council decisions, and quest-specific scenarios. |

---

## 4. Shared side-quest experience

Each quest should use the same seven-beat loop so students recognize how missions work even when the science changes.

### Beat 1: Quest offer

A quest card appears on the academy map or lesson page.

Include:

- quest title;
- client portrait and role;
- one-sentence problem;
- visible scientific setting;
- estimated investigation scope rather than a fake completion time;
- rewards or dossier records earned;
- **Accept Commission**, **Save for Later**, and **Enter Open Lab** actions.

The student must always be able to enter the open laboratory without accepting a quest.

### Beat 2: Skippable motion-comic briefing

Use a 15-25 second illustrated scene instead of expensive full animation.

Recommended format:

- three to five illustrated panels;
- subtle parallax motion;
- one animated object per panel;
- short voice lines with captions;
- replay and skip controls;
- no reading gate before the workstation opens.

### Beat 3: Open investigation

Show a compact, collapsible objective ribbon outside the workstation component.

Example:

> **Current objective:** Collect enough evidence to recommend a donor.

The ribbon must never cover scientific controls or disable free exploration.

### Beat 4: Evidence-triggered NPC communication

A small communication chip appears after a meaningful scientific record, not after every click.

Example:

> **Healer Bryn:** That reaction rules something in or out. Record what changed before choosing a donor.

The student can dismiss it and keep investigating.

### Beat 5: Mid-quest complication

The quest changes when the student reveals important evidence.

Examples:

- the donor who looks most like the patient is incompatible;
- the two chromosome copies produce different proteins;
- the pair most likely to recover a lost trait has a second-locus risk;
- the island with the largest population has the least lineage diversity.

The complication must emerge from the workstation state or authored scientific scenario, not from arbitrary story scripting.

### Beat 6: Decision and consequence

The student attaches evidence and makes a recommendation. The world responds visibly.

Possible responses:

- treatment begins;
- treatment is paused because the evidence conflicts with the recommendation;
- a bloodline returns;
- a clutch does not show a possible trait;
- an island population improves in one measure but worsens in another;
- a client requests a revision rather than declaring the student wrong.

### Beat 7: In-world reward and campaign record

Recommended rewards:

- Healer's Seal;
- Archivist's Crest;
- Expedition Patch;
- new lore page;
- cosmetic banner or title for the student's dragon;
- portrait added to the Hall of Records;
- optional new case;
- a scientific record added to the Foundling dossier.

Do not reward speed, click volume, or avoiding experiments.

---

## 5. Connected campaign: The Ashfall Foundling

The four flagship quests form one continuous campaign around an unknown young dragon. The student can name the dragon. Use **Cinder** as the neutral fallback.

### Campaign question

> Who is this dragon, what is making it sick, where did it come from, and where can it safely belong?

### Campaign chapters

| Chapter | Workstation | Main decision | Dossier record earned |
|---|---|---|---|
| 1. **The Dragon in the Ash** | Blood Compatibility | Which donor is supported by compatibility evidence? | Compatibility Record |
| 2. **The Food That Steals Fire** | Protein Rescue | What molecular pathway explains the symptoms, and what diet is supported? | Molecular Rescue Record |
| 3. **Ghost of the Emberglass Line** | Pedigree Lab | Does the lost bloodline survive, and can it be restored responsibly? | Lineage and Breeding Record |
| 4. **Council of Three Islands** | Island Expedition | Where should the foundling live without weakening the population? | Conservation Recommendation |

### Persistent campaign dossier

Create a case dossier that stores:

- dragon name and portrait;
- quest status;
- collected scientific records;
- evidence thumbnails;
- unresolved questions;
- decisions and revisions;
- earned seals;
- final conservation placement.

The dossier should not replace the workstation notebook. It summarizes and links to records produced by each workstation.

---

# Quest 1: The Dragon in the Ash

## 6. Workstation

**Dragon Blood Type Compatibility Lab**  
**Fantasy:** Emergency medical rescue  
**Primary client:** Healer Bryn  
**Location:** Emergency Healing Station

## 6.1 Story premise

A rescue patrol returns from Ashfall Island with an injured young dragon. The dragon has no registry mark, no rider, and no known family record. It has lost too much blood to survive without treatment.

Three healthy dragons are available as donors. One looks remarkably similar to the patient, and Scout Runa assumes they must be related. Healer Bryn refuses to begin a transfusion based on appearance or family claims.

The student must test the available blood evidence and recommend a donor the healer can defend.

## 6.2 Main cast

| Character | Role | Story function |
|---|---|---|
| **Cinder** | Injured foundling | Patient whose condition changes after the student's recommendation |
| **Healer Bryn** | Lead healer | Evidence-focused client who never accepts guesses |
| **Scout Runa** | Rescuer | Voices the misconception that resemblance or relationship guarantees compatibility |
| **Donor dragons** | Possible donors | Distinct portraits, personalities, and samples tied to the real compatibility model |

## 6.3 Opening motion-comic

### Panel 1: The academy gate

A storm lashes the Viking hall. A rescue cart enters while warning bells ring.

> **Scout Runa:** Foundling coming in! Severe blood loss!

### Panel 2: The healing station

Cinder lies beneath a warming blanket. A weak flame flickers near its mouth.

> **Healer Bryn:** We have time to test. We do not have time to guess.

### Panel 3: The donor stalls

Three donor dragons wait behind carved gates. One strongly resembles Cinder.

> **Runa:** The silver one must be family. Start there.

### Panel 4: Mission handoff

The compatibility table lights up.

> **Healer Bryn:** Appearance is a clue. Compatibility is evidence. Find me a donor I can defend.

## 6.4 Mission definition

**Problem:** Cinder needs a safe blood donor.  
**Constraint:** Only the currently available donor samples may be tested.  
**Acceptance:** Recommend a donor and attach direct compatibility evidence.  
**Failure mode:** Treatment is paused and the student receives a recoverable evidence conflict.

## 6.5 Any-order objectives

1. **Examine the available evidence**  
   Inspect Cinder's sample and the donor records.

2. **Produce compatibility evidence**  
   Record at least two donor-patient test results.

3. **Classify a donor from direct evidence**  
   Mark at least one donor as supported or unsafe and attach the observed result.

4. **Submit a healing recommendation**  
   Recommend a donor and identify the test result being trusted.

Students may continue testing after any objective is met.

## 6.6 Story triggers

| Trigger or record predicate | Story beat | Overlay behavior |
|---|---|---|
| First donor selected | Bryn reminds the student that appearance is not enough | Optional coach chip |
| First completed test | Bryn asks what the reaction supports and what remains unknown | Optional prompt |
| Unsafe reaction observed | Runa reacts to the unexpected result | Short NPC exchange |
| Two tests recorded | Objective ribbon changes from **collect evidence** to **prepare recommendation** | Non-blocking update |
| Recommendation and evidence disagree | Treatment pauses | Consequence panel with return-to-lab action |
| Supported recommendation submitted | Transfusion begins | Patient consequence scene |

## 6.7 Mid-quest complication

The donor who most resembles Cinder produces an unsafe compatibility reaction. The student sees a direct conflict between visible resemblance and physiological evidence.

The scenario data must be authored through the compatibility model. Do not fake an unsafe animation if the model calculates a safe result.

## 6.8 NPC messages

### After the first test

> **Healer Bryn:** One result can eliminate a donor. It may not be enough to establish the best donor.

### After an unsafe reaction

> **Scout Runa:** But they look almost identical.

> **Healer Bryn:** Then the blood has taught us something the eyes could not.

### Before the recommendation

> **Healer Bryn:** Show me the test you are trusting.

## 6.9 Consequence branches

### Branch A: Recommendation supported by compatible evidence

- transfusion tube activates;
- patient breathing steadies;
- flame or heart-rhythm meter rises;
- Cinder opens its eyes;
- Compatibility Record enters the campaign dossier;
- next chapter becomes available.

### Branch B: Recommendation conflicts with observed evidence

The healer stops before beginning treatment.

> Your recommendation and your evidence do not agree. The patient is stable enough for another test.

- all test results remain saved;
- the student returns to the lab;
- objective becomes **resolve the evidence conflict**;
- no full restart occurs.

### Branch C: Recommendation has no direct evidence attached

> This donor may be possible, but you have not shown enough evidence to use it on a living patient.

- recommendation remains in draft;
- student can attach an existing result or run another test.

## 6.10 Optional side objectives

- **No Guesswork:** Every donor classification includes an attached test result.
- **Careful Healer:** Explain one rejected donor, not only the chosen donor.
- **Full Compatibility Map:** Test every available donor.

Side objectives unlock cosmetic seals or lore only.

## 6.11 Visual and audio excitement upgrades

- donor portraits with two idle expression states;
- glass vial lighting and blood-reaction particles;
- carved testing table with animated channels;
- ambient storm and healing-station sounds;
- short healer voice lines;
- stamped case folder for each tested donor;
- patient breathing and flame states tied to quest outcomes;
- dramatic but non-punitive urgency lighting.

Avoid a hard countdown unless a teacher explicitly enables one. A student should never lose the case for investigating carefully.

## 6.12 Required build work

### Core quest content

- `blood-foundling-rescue` quest definition;
- patient and donor scenario records;
- opening and consequence scenes;
- NPC dialogue registry;
- objective predicates;
- side objectives and rewards.

### Blood workstation event adapter

Minimum events:

```ts
type BloodQuestEvent =
  | { type: "PATIENT_LOADED"; patientId: string; atIso: string }
  | { type: "DONOR_SELECTED"; donorId: string; atIso: string }
  | { type: "COMPATIBILITY_TEST_STARTED"; donorId: string; atIso: string }
  | {
      type: "COMPATIBILITY_RESULT_OBSERVED";
      donorId: string;
      resultId: string;
      result: "compatible" | "incompatible";
      atIso: string;
    }
  | { type: "BLOOD_EVIDENCE_CAPTURED"; evidenceId: string; atIso: string }
  | {
      type: "DONOR_RECOMMENDATION_SUBMITTED";
      donorId: string;
      evidenceIds: string[];
      atIso: string;
    };
```

### Evidence-card generator

Each result card stores:

- patient ID;
- donor ID;
- observed reaction;
- compatibility interpretation produced by the lab;
- timestamp;
- optional student note;
- screenshot reference when enabled.

### Host-level recommendation panel

Place outside `app-blood-compatibility-lab` and include:

- donor selection;
- evidence attachment;
- short explanation;
- submit-to-healer action;
- evidence-conflict feedback.

### Patient consequence component

Support:

- untreated or unstable;
- treatment pending;
- treatment paused;
- stabilizing;
- stable.

## 6.13 Teacher-triggered demonstration example

1. Save the complete student lab snapshot.
2. Show a visible **Healer Demonstration** banner.
3. Highlight one donor sample.
4. Run one compatibility test or highlight-only sequence.
5. Pause before the result when configured.
6. Allow the student to cancel.
7. Restore the exact pre-demonstration patient, donor selection, test history, and camera state.
8. Return control to the student.

---

# Quest 2: The Food That Steals Fire

## 7. Workstation

**Protein Rescue Lab**  
**Fantasy:** Clinical mystery and molecular detective case  
**Primary client:** Healer Fen  
**Location:** Berk Clinical Genetics, Dracose Response Unit

## 7.1 Story premise

Cinder survives the transfusion but recovery stalls. After eating standard Dracose-rich feed, the dragon becomes weak, uncomfortable, and unable to maintain a steady flame.

Kitchen Master Torvi believes a shipment of food has spoiled. Healer Fen notices that the symptoms repeatedly follow Dracose exposure and may begin at the chromosome 4 Dracase locus.

The student must compare both patient gene copies, trace each from DNA to mRNA to protein, test protein function, run food trials, and save a molecularly supported rescue recommendation.

## 7.2 Main cast

| Character | Role | Story function |
|---|---|---|
| **Cinder** | Recovering patient | Shows visible response to digestion trials and final diet |
| **Healer Fen** | Clinical genetics specialist | Keeps the explanation connected from gene to patient |
| **Kitchen Master Torvi** | Food specialist | Offers a plausible but incomplete spoiled-food explanation |
| **Merchant Varr** | Optional side character | Claims a tonic permanently repairs damaged DNA |

## 7.3 Opening motion-comic

### Panel 1: Recovery stall

Cinder eats from a bowl. Its flame abruptly fades.

> **Torvi:** That feed passed every kitchen inspection.

### Panel 2: Clinical chart

Diet records show repeated symptoms after Dracose-rich food.

> **Healer Fen:** The pattern follows the food, but the explanation may begin inside chromosome 4.

### Panel 3: Sample cartridges

Two neutral chromosome-copy cartridges slide into the gene bank.

> **Healer Fen:** Both belong to the same patient. Neither label reveals what it will produce.

### Panel 4: Mission handoff

> Follow both copies from DNA to protein. Then test what the patient can actually digest.

## 7.4 Mission definition

**Problem:** Cinder loses energy and flame stability after certain foods.  
**Constraint:** The diagnosis must account for both chromosome copies and the patient response.  
**Acceptance:** Save a rescue record connecting DNA, mRNA, protein, enzyme function, digestion, symptoms, and diet.  
**Failure mode:** The case remains open and identifies the missing link in the evidence chain.

## 7.5 Any-order objectives

1. **Review patient observations**  
   Identify the pattern in the symptom and diet record.

2. **Trace both chromosome copies**  
   Produce molecular evidence for both patient samples.

3. **Compare protein function**  
   Test what each protein does when it encounters Dracose.

4. **Run contrasting food trials**  
   Test at least two foods or exposure conditions.

5. **Save the rescue record**  
   Connect the molecular and patient evidence to a diet recommendation.

## 7.6 Molecular Trail game element

Render a collapsible evidence chain outside the laboratory:

`DNA → mRNA → protein → function → digestion → symptoms`

Each valid workstation record fills one link with actual student evidence. The overlay never calculates its own scientific answer.

Examples:

- DNA link receives the loaded sequence record;
- mRNA link receives transcription evidence;
- protein link receives amino-acid length and early-stop status;
- function link receives the Dracose test result;
- digestion link receives a food trial;
- symptoms link receives the observed patient response.

## 7.7 Story triggers

| Trigger or predicate | Story beat | Overlay behavior |
|---|---|---|
| Patient loaded | Torvi states the spoiled-feed theory | NPC message |
| First sample transcribed | Fen notes that one copy is not the whole patient | Coach chip |
| Early stop observed | Torvi asks whether length alone proves function | Optional prompt |
| First protein tested | Merchant Varr advertises a DNA-repair tonic when enabled | Optional complication |
| Both protein functions tested | Molecular Trail highlights the first confirmed divergence | Evidence animation |
| First food trial completed | Fen asks what changed and what did not | Optional prompt |
| Rescue record saved | Patient consequence scene runs | Quest resolution |

## 7.8 Mid-quest complication: the miracle cure

Merchant Varr claims:

> One defective copy proves it. My tonic repairs damaged dragon DNA overnight.

This creates an optional claim-review side objective. The student chooses:

- evidence supports the claim;
- evidence contradicts the claim;
- current evidence is insufficient.

The explanation should distinguish reducing Dracose exposure from repairing DNA or restoring the missing protein.

## 7.9 NPC messages

### After the first chromosome copy

> **Healer Fen:** You have followed one pathway. The patient carries two copies.

### When an early stop appears

> **Torvi:** That chain ended early. Does shorter automatically mean harmless, or do we still need a function test?

### After a food trial

> **Healer Fen:** The patient changed. Did the food alter the gene, replace the protein, or change what entered the digestive system?

### Before saving the rescue record

> Trace the explanation all the way through. Do not jump from DNA directly to symptoms.

## 7.10 Consequence branches

### Branch A: Fully supported rescue record

- selected food enters the patient stall;
- digestion result is replayed briefly;
- energy rises;
- eyes become alert;
- flame stabilizes;
- Molecular Rescue Record enters the dossier.

### Branch B: Useful diet with incomplete mechanism

> The recommendation may help the patient. The mechanism is still missing from the record.

- preserve the selected diet;
- highlight the missing Molecular Trail link;
- return to the open lab.

### Branch C: Unsupported DNA-repair claim

> Show me which part of the patient's DNA changed during the food trial.

- open a comparison view of pre-trial DNA and food-trial records;
- allow revision without deleting prior work.

## 7.11 Optional side objectives

- **Complete Molecular Trail:** Capture evidence for every link.
- **Compare Before Claiming:** Test both chromosome copies before selecting a genotype claim.
- **Clinical Communicator:** Explain the diet without claiming it repairs DNA.
- **Tonic Investigator:** Evaluate Merchant Varr's claim.

## 7.12 Visual and audio excitement upgrades

- physical-looking sample cartridges;
- glowing DNA reader and ribosome track;
- stronger translation sound feedback;
- protein shape moving into the Dracose test chamber;
- evidence cards sliding onto a detective board;
- patient flame and energy tied to food trials;
- optional clinical replay after the rescue record is saved;
- subtle medical-room ambience rather than loud arcade music.

## 7.13 Required build work

### Protein quest adapter

Minimum events:

```ts
type ProteinRescueQuestEvent =
  | { type: "PROTEIN_PATIENT_LOADED"; patientId: string; atIso: string }
  | { type: "GENE_SAMPLE_LOADED"; sampleId: string; atIso: string }
  | { type: "TRANSCRIPTION_COMPLETED"; sampleId: string; atIso: string }
  | {
      type: "TRANSLATION_COMPLETED";
      sampleId: string;
      aminoAcidCount: number;
      stoppedEarly: boolean;
      atIso: string;
    }
  | {
      type: "PROTEIN_FUNCTION_TESTED";
      sampleId: string;
      result: "dracose-split" | "dracose-intact";
      atIso: string;
    }
  | {
      type: "FOOD_TRIAL_COMPLETED";
      foodId: string;
      resultId: string;
      energy: number;
      atIso: string;
    }
  | { type: "RESCUE_RECORD_SAVED"; recordId: string; atIso: string };
```

### Host-level additions

- Molecular Trail overlay;
- NPC communication sequence;
- optional Merchant Varr claim panel;
- patient visual-state component;
- quest ending scene;
- dossier export from the saved rescue record.

### Scientific core

Do not replace the current patient intake, sample reader, transcription animation, ribosome bench, protein function test, digestion chamber, or rescue record. The quest layer listens to the records they already create.

## 7.14 Teacher-triggered demonstration example

A teacher may demonstrate one translation pathway:

1. snapshot the loaded patient, selected sample, progress, trial log, and case draft;
2. show a visible demonstration banner;
3. load a previously tested sample or use highlight-only mode;
4. advance translation to a teacher-selected codon;
5. pause before the early-stop or full-chain result;
6. restore the student's exact state;
7. return control.

---

# Quest 3: Ghost of the Emberglass Line

## 8. Workstation

**Dragon Pedigree Lab**  
**Fantasy:** Lost bloodline mystery and responsible breeding decision  
**Primary client:** Archivist Solveig  
**Location:** Hall of Legendary Dragons

## 8.1 Story premise

During Cinder's examination, healers discover a silver ridge beneath the wings. The feature resembles the legendary **Emberglass Mantle**, last recorded seventy-three years ago.

Some archivists believe the allele disappeared. Others believe it survived silently in dragons that never displayed the phenotype. The archive has only a small number of sequencing runs available.

The student must test inheritance models, use the pedigree before spending limited sequencing runs, identify likely carriers, stage a breeding pair, evaluate relatedness and a second-locus risk, predict a clutch, and decide whether the bloodline can be restored responsibly.

## 8.2 Main cast

| Character | Role | Story function |
|---|---|---|
| **Archivist Solveig** | Keeper of the lineage archive | Evidence-focused client and guide to contradictions |
| **Councilor Eirik** | Political sponsor | Pushes for fast restoration of the legendary trait |
| **Healer Fen** | Medical advisor | Draws attention to relatedness and second-locus risk |
| **Cinder** | Possible descendant | Connects the campaign to the lost bloodline |

## 8.3 Opening motion-comic

### Panel 1: Archive at night

A silver ridge glows on an old banner.

> **Solveig:** The Emberglass Mantle has not been recorded for seventy-three years.

### Panel 2: Cinder's examination

The same ridge pattern is visible under Cinder's wing.

> **Solveig:** The trait may have survived unseen through generations.

### Panel 3: Sequencing device

A small number of charge crystals remain.

> The archive can sequence only **{{dnaTestBudget}}** samples before the tide generator resets.

The narration must render the actual configured budget.

### Panel 4: Breeding council

> **Eirik:** Find the carriers. Restore the line.

> **Fen:** And do not create a sick clutch merely to recover a beautiful trait.

## 8.4 Mission definition

**Problem:** Determine whether the Emberglass line survives in living descendants.  
**Constraint:** Sequencing runs are limited; a second-locus risk and relatedness must be considered.  
**Acceptance:** Submit a defensible inheritance model, carrier record, and breeding proposal with prediction and risk explanation.  
**Failure mode:** The archive marks the case provisional or the breeding plan requires revision.

## 8.5 Any-order objectives

1. **Test an inheritance model**  
   Find a model that can explain the surviving records.

2. **Narrow carrier candidates**  
   Use family relationships and visible records before or alongside sequencing.

3. **Use sequencing strategically**  
   Spend available runs on dragons whose results reduce uncertainty.

4. **Record carrier calls**  
   Mark likely carriers and explain the evidence.

5. **Build a responsible breeding proposal**  
   Evaluate the lost trait, relatedness, and second locus.

6. **Predict and hatch a clutch**  
   Save the predicted percentage before breeding, then compare it with the observed result.

The laboratory remains open after any clutch result.

## 8.6 Video-game presentation

### Archive conflict seals

When a model cannot explain a record, render a red wax seal on the affected branch:

> **ARCHIVE CONFLICT**

Selecting the seal focuses the existing contradiction. The story layer does not invent a new contradiction.

### Sequencing charge crystals

Represent `testsRemaining()` as physical crystals in the host overlay or enhanced header. Each real sequencing run extinguishes one crystal.

### Lineage trace thread

When trait trace mode is active, allow the lineage path to glow like a thread through generations. Carrier calls attach evidence tags to the family tree.

### Breeding dilemma presentation

When two dragons are staged, show three separate decision lenses:

- chance of the lost phenotype;
- kinship or inbreeding risk;
- second-locus health risk.

Do not collapse these into one hidden score. Students must reason about tradeoffs.

## 8.7 Story triggers

| Trigger or predicate | Story beat | Overlay behavior |
|---|---|---|
| Investigation opened | Solveig introduces the lost phenotype and actual sequencing budget | Mission ribbon |
| Model produces contradictions | Archive conflict seals appear | Visual consequence |
| First carrier note saved | Solveig acknowledges a supported deduction | NPC message |
| Sequencing used before any deduction | Optional diagnostic message about using the pedigree first | Coach chip, never scored |
| Two dragons staged | Eirik urges restoration | NPC message |
| High relatedness or second-locus risk detected | Fen interrupts with the complication | Mid-quest scene |
| Breeding authorized | Predicted percentage is locked into the quest record | Evidence checkpoint |
| Clutch hatched | Story branches from actual observed outcome | Consequence scene |
| Lost phenotype appears | Recovery ceremony | Quest resolution |

## 8.8 Mid-quest complication

The pair most likely to recover the Emberglass Mantle is also closely related or carries an elevated risk at the second locus.

> **Councilor Eirik:** The trait could return in one clutch.

> **Healer Fen:** So could the disorder.

The interface must not label one choice as morally or scientifically automatic. The student records the risk they accept and why.

## 8.9 Consequence branches

### Branch A: Lost phenotype appears

- hall bells ring;
- historical banner lights up;
- recovery lineage displays;
- hatchling portrait enters the Hall of Records;
- student earns the Archivist's Crest;
- Lineage and Breeding Record enters Cinder's dossier.

### Branch B: Trait does not appear

This is not failure. A possible outcome is not a guarantee.

> **Councilor Eirik:** You predicted the trait could appear. It did not. Was the model wrong?

Student options:

- authorize another clutch;
- change the pair;
- revise the model;
- explain why the result remains possible under the prediction.

### Branch C: Second-locus problem appears

The healer requests a revised breeding plan. Preserve all lineage evidence and clutch records.

### Branch D: Model retains unresolved contradictions

> This model explains part of the archive. The sealed contradictions remain.

Mark the case provisional and return the student to investigation.

## 8.10 Optional side objectives

- **Archive Detective:** Make at least two carrier deductions before sequencing.
- **Conservation Breeder:** Evaluate both relatedness and the second locus.
- **Probability Defender:** Explain a clutch that differs from the predicted percentage.
- **Lineage Restorer:** Recover the lost phenotype.
- **Exhaustive Scholar:** Test every plausible inheritance model.

Process achievements should never affect the grade.

## 8.11 Visual and audio excitement upgrades

- animated dust, torchlight, and moving banners in the Hall of Legendary Dragons;
- red wax conflict seals on pedigree branches;
- physical sequencing crystals;
- glowing trait-trace line;
- draggable evidence tags with parchment texture;
- council portraits that react to risk information;
- egg-hatching reveal tied to the actual clutch;
- recovery ceremony using the existing recovered state;
- short archive bell and seal-stamp sounds.

## 8.12 Required build work

### Pedigree quest adapter

Minimum events:

```ts
type PedigreeQuestEvent =
  | { type: "PEDIGREE_INVESTIGATION_OPENED"; investigationId: string; atIso: string }
  | {
      type: "INHERITANCE_MODEL_SELECTED";
      modelId: string;
      contradictionCount: number;
      unexplainedCount: number;
      atIso: string;
    }
  | { type: "PEDIGREE_DNA_TEST_USED"; dragonId: string; geneId: string; atIso: string }
  | {
      type: "CARRIER_CALL_SAVED";
      dragonId: string;
      status: "carrier" | "not-carrier" | "uncertain";
      atIso: string;
    }
  | { type: "BREEDING_DRAGON_STAGED"; dragonId: string; slot: 1 | 2; atIso: string }
  | {
      type: "BREEDING_RISK_CALCULATED";
      kinshipPercent: number;
      secondLocusRisk?: number;
      atIso: string;
    }
  | {
      type: "BREEDING_AUTHORIZED";
      motherId: string;
      fatherId: string;
      predictedPercent: number;
      atIso: string;
    }
  | {
      type: "PEDIGREE_CLUTCH_HATCHED";
      hatchRecordId: string;
      observedPercent: number;
      recoveredCount: number;
      affectedByRiskCount: number;
      atIso: string;
    }
  | { type: "LOST_BLOODLINE_RECOVERED"; investigationId: string; atIso: string };
```

### Host and presentation work

- quest dialogue registry;
- objective predicates;
- conflict-seal overlay tied to actual contradictions;
- sequencing crystal presentation tied to `testsRemaining()`;
- breeding dilemma scene;
- probability and health-risk branches;
- recovery ceremony;
- campaign dossier export.

### Why this should be the first playable prototype

The scientific interactions already exist. The first vertical slice is primarily:

- event mapping;
- quest shell;
- dialogue;
- objective evaluation;
- visual polish;
- consequence scenes;
- state persistence.

It requires less new scientific UI than the other quests.

## 8.13 Teacher-triggered demonstration example

1. Save the student's selected model, focused dragon, zoom, depth, trace state, carrier notes, sequencing budget, staged pair, predictions, and draft justification.
2. Display a visible **Archivist Demonstration** banner.
3. Highlight one inheritance model.
4. Show where actual contradictions appear.
5. Compare a second model when enabled.
6. Stop at the configured duration or on cancel.
7. Restore the exact student state.
8. Return control.

---

# Quest 4: Council of Three Islands

## 9. Workstation

**Island Expedition**  
**Fantasy:** Field exploration and conservation strategy  
**Primary client:** Ranger Ivar  
**Location:** Three island sanctuaries

## 9.1 Story premise

Three islands offer Cinder a home.

- **Hearth Island** has many dragons, but most descend from a small founder group.
- **Mist Island** has fewer dragons, but several rare bloodlines.
- **Ashfall Island** is Cinder's likely birthplace, but an eruption damaged the population and nesting habitat.

Each island leader argues that their island is the best choice. Ranger Ivar asks the student to survey the evidence, identify hidden risks, test an intervention, and make a recommendation that can remain healthy for generations.

## 9.2 Main cast

| Character | Role | Story function |
|---|---|---|
| **Ranger Ivar** | Expedition leader | Neutral client who requires field evidence and tradeoff analysis |
| **Chief Yrsa** | Hearth Island representative | Equates a large population with safety |
| **Keeper Maelin** | Mist Island representative | Prioritizes rare lineages and diversity |
| **Scout Runa** | Ashfall representative | Emphasizes birthplace and restoration |
| **Cinder** | Placement candidate | Connects the conservation decision to the campaign |

## 9.3 Opening motion-comic

### Panel 1: Council map

Three carved islands illuminate on a table.

> **Ranger Ivar:** Three sanctuaries have offered the foundling a home.

### Panel 2: Hearth Island

Crowded cliffs and many nests fill the scene.

> **Chief Yrsa:** No island has more dragons than Hearth. Cinder will never be alone.

### Panel 3: Mist Island

Fewer dragons appear, but many lineage symbols glow.

> **Keeper Maelin:** Numbers are not the same as diversity.

### Panel 4: Ashfall Island

The terrain is scarred by eruption.

> **Scout Runa:** This may be where Cinder belongs, but the population has not recovered.

### Panel 5: Mission handoff

> **Ranger Ivar:** Survey first. Choose later. The council needs a plan that still works generations from now.

## 9.4 Mission definition

**Problem:** Choose a healthy long-term placement or management plan for Cinder.  
**Constraint:** Population size, lineage diversity, relatedness, rare lines, and habitat capacity may conflict.  
**Acceptance:** Submit a recommendation supported by at least two field evidence records and one acknowledged tradeoff.  
**Failure mode:** Restore the pre-intervention state and revise one part of the plan.

## 9.5 Minimum expedition loop to connect or build

Because the host page does not show the inner expedition implementation, audit `app-island-expedition` before coding these features.

### Objective 1: Survey islands in any order

Each island should expose some or all of these layers:

- current population size;
- represented bloodlines;
- founder concentration or relatedness;
- rare-line representation;
- habitat capacity;
- recent disturbances;
- generation trends.

### Objective 2: Identify a hidden risk

The student must find at least one risk that is not obvious from population size alone.

### Objective 3: Create an intervention

Possible actions, depending on the existing model:

- place Cinder on one island;
- transfer an unrelated dragon;
- protect a rare lineage;
- reduce breeding from one dominant line;
- expand a nesting zone;
- establish a second sanctuary population.

### Objective 4: Advance or test the population

Run the intervention through several generations or simulation turns.

### Objective 5: Submit a council recommendation

Attach at least two field records and identify one tradeoff or remaining uncertainty.

## 9.6 Exploration presentation

### 2.5D expedition map

Use SVG or Canvas rather than a full 3D open world.

Recommended features:

- moving clouds and water;
- animated dragon silhouettes;
- fog over unsurveyed data layers;
- selectable survey flags;
- nesting-site markers;
- route lines between islands;
- island-specific ambient sound;
- before-and-after population snapshots.

### Field notebook discoveries

Each survey produces a field card containing:

- island and location;
- population observation;
- lineage observation;
- metric snapshot;
- optional student note;
- screenshot or chart evidence.

### Stakeholder voices

Each island leader should advocate for their own interest. Students distinguish stakeholder preference from scientific evidence.

## 9.7 Story triggers

| Trigger or predicate | Story beat | Overlay behavior |
|---|---|---|
| Quest loaded from `initialQuestId` | Council briefing uses the selected scenario | Opening scene |
| First island surveyed | Ivar asks what can and cannot be concluded from one island | Coach chip |
| Largest population identified | Yrsa argues that size proves safety | NPC message |
| Founder concentration or low diversity revealed | Maelin presents the hidden risk | Mid-quest complication |
| First intervention applied | Before snapshot locks into evidence record | Evidence checkpoint |
| Generation advanced | Council reacts to actual change | Consequence message |
| Optional disturbance enabled | Storm, disease, food shortage, or temporary removal runs deterministically | Resilience event |
| Recommendation submitted | Council decision scene | Quest resolution or revision branch |

## 9.8 Mid-quest complication

Hearth Island has the largest population but the lowest lineage diversity because most young dragons descend from one founder group.

The apparently safest answer becomes scientifically complicated.

## 9.9 Optional resilience event

A teacher may enable one deterministic disturbance after a student tests an initial plan:

- storm damages one nesting region;
- disease affects one highly represented lineage;
- food shortage reduces habitat capacity;
- a rare breeding adult is temporarily removed.

All students assigned the same scenario must receive the same event rules.

## 9.10 Consequence branches

### Branch A: Population and diversity improve within habitat limits

- council approves the plan;
- Cinder's portrait appears on the chosen island;
- conservation record enters the dossier;
- student earns the Expedition Patch.

### Branch B: Population rises while diversity declines

> The plan increased the dragon count but concentrated the bloodlines. Change one part and test again.

- restore the pre-intervention snapshot;
- preserve the student's evidence and first plan;
- allow a revised intervention.

### Branch C: Diversity improves but habitat fails

The council requests a plan that also considers environmental capacity.

### Branch D: Recommendation lacks evidence

The council does not vote until the student attaches field records. The expedition remains open.

## 9.11 Optional side objectives

- **Field Naturalist:** Survey every island before intervening.
- **Single-Variable Tester:** Change one factor, observe, then revise.
- **Rare-Line Guardian:** Prevent a represented lineage from disappearing.
- **Resilient Planner:** Maintain diversity after the optional disturbance.
- **Council Defender:** State both a benefit and a cost of the final plan.

## 9.12 Visual and audio excitement upgrades

- fog-of-war map reveal;
- moving water, clouds, and dragon silhouettes;
- animated survey flags;
- ranger compass and route marker;
- before-and-after population cards;
- council portraits with competing reactions;
- short storm or eruption effects for optional events;
- island-specific ambience;
- final placement marker showing Cinder on the selected island.

## 9.13 Required build or audit work

### Audit `app-island-expedition` for

- population model;
- island map;
- dragon transfer controls;
- generation simulation;
- diversity metrics;
- stored worlds;
- intervention records;
- evidence output;
- snapshot and restore support.

### Quest registry using the existing `initialQuestId`

Recommended IDs:

- `ashfall-foundling-placement`;
- `one-grandfather`;
- `golden-crest-boom`;
- `eruption-bottleneck`.

### Island quest adapter

Minimum events:

```ts
type IslandQuestEvent =
  | { type: "ISLAND_QUEST_LOADED"; questId: string; atIso: string }
  | { type: "ISLAND_SURVEYED"; islandId: string; evidenceId: string; atIso: string }
  | { type: "POPULATION_METRIC_VIEWED"; islandId: string; metricId: string; atIso: string }
  | {
      type: "ISLAND_INTERVENTION_APPLIED";
      interventionId: string;
      beforeSnapshotId: string;
      atIso: string;
    }
  | {
      type: "ISLAND_GENERATION_ADVANCED";
      resultSnapshotId: string;
      generation: number;
      atIso: string;
    }
  | { type: "ISLAND_DISTURBANCE_APPLIED"; disturbanceId: string; atIso: string }
  | {
      type: "CONSERVATION_RECOMMENDATION_SUBMITTED";
      islandId?: string;
      evidenceIds: string[];
      tradeoff: string;
      atIso: string;
    };
```

### Host-level additions

- field evidence cards;
- before-and-after snapshots;
- council recommendation interface;
- deterministic disturbance hook;
- snapshot and restore;
- map atmosphere;
- campaign ending scene.

## 9.14 Teacher-triggered demonstration example

A teacher may demonstrate one data layer or intervention without taking permanent control:

1. snapshot the student's world;
2. display **Ranger Demonstration** banner;
3. highlight one island or metric;
4. optionally run one predefined intervention;
5. show the immediate change;
6. stop on timeout or cancel;
7. restore the exact student world;
8. return control.

---

# Replayable Side-Quest Packs

## 10. Blood Compatibility cases

### 10.1 The Champion's Brother

**Hook:** An arena champion is injured. His brother demands to donate immediately.  
**Scientific tension:** Family relationship does not replace compatibility evidence.  
**Main complication:** The relative may not be the safest donor.  
**Extra build:** Mostly scenario data, portraits, and dialogue.

### 10.2 Storm-Washed Vials

**Hook:** A lightning storm washes the labels from three donor vials.  
**Scientific tension:** Students must rely on observed reactions rather than names.  
**Main complication:** One apparently promising vial remains untested against a critical condition.  
**Extra build:** Anonymous-vial display mode.

### 10.3 The Healer's Shortage

**Hook:** Several injured dragons share a limited donor supply.  
**Scientific tension:** Compatibility must be considered across multiple patients.  
**Main complication:** The most flexible donor may need to be saved for a patient with fewer options.  
**Extra build:** Multi-patient matrix and resource-allocation view.

## 11. Protein Rescue cases

### 11.1 The Midwinter Feast

**Hook:** Several dragons become ill after a feast, but one reacts repeatedly to Dracose-rich food.  
**Scientific tension:** Spoiled food versus an inherited Dracase pathway.  
**Extra build:** Patient case queue and feast artwork.

### 11.2 The Emberless Hatchling

**Hook:** Trainers call a hatchling lazy because its flame fades after meals.  
**Scientific tension:** Learned behavior explanation versus molecular limitation.  
**Extra build:** New patient data and trainer dialogue.

### 11.3 The Merchant's Miracle Cure

**Hook:** A traveling tonic seller claims to repair DNA permanently.  
**Scientific tension:** Managing exposure versus changing DNA.  
**Extra build:** Claim-review ending and advertisement asset.

## 12. Pedigree cases

### 12.1 Moonhorn Restoration

**Hook:** Restore a legendary navigation trait while avoiding a scale disorder.  
**Scientific tension:** Rare-trait recovery versus second-locus health risk.  
**Extra build:** New investigation record and archive art.

### 12.2 The False Heir of Stormhold

**Hook:** Two dragons claim descent from a legendary guardian.  
**Scientific tension:** Reputation and resemblance versus pedigree and limited DNA evidence.  
**Extra build:** Two-claimant dialogue branch.

### 12.3 The Last Blue Flame

**Hook:** A hatchling reveals a phenotype unseen for decades.  
**Scientific tension:** New evidence changes earlier carrier deductions.  
**Extra build:** New pedigree dataset and reactive archive beat.

## 13. Island Expedition cases

### 13.1 The Island of One Grandfather

**Hook:** A huge population descends from one highly successful founder.  
**Scientific tension:** Population size versus lineage diversity.  
**Extra build:** Scenario data.

### 13.2 The Golden Crest Boom

**Hook:** Breeders select a popular show trait until nearly every dragon displays it.  
**Scientific tension:** Artificial selection versus loss of diversity.  
**Extra build:** Trait-frequency scenario and breeder stakeholder.

### 13.3 After the Eruption

**Hook:** A disaster leaves a small group of survivors and limited relocation space.  
**Scientific tension:** Preserving lineages through a population bottleneck.  
**Extra build:** Relocation and deterministic disturbance scenario.

---

# Shared Technical Build

## 14. Suggested file structure

```text
src/app/features/dragon-genetics/side-quests/
  dragon-side-quest.models.ts
  dragon-side-quest.registry.ts
  dragon-side-quest-director.service.ts
  dragon-side-quest-state.repository.ts
  dragon-side-quest-evidence.service.ts

  components/
    quest-offer-card/
    quest-motion-comic/
    quest-objective-ribbon/
    dragon-npc-comms/
    quest-evidence-pouch/
    quest-consequence-panel/
    quest-reward-toast/
    quest-journal/
    campaign-dossier/

  adapters/
    blood-compatibility-quest.adapter.ts
    protein-rescue-quest.adapter.ts
    pedigree-quest.adapter.ts
    island-expedition-quest.adapter.ts
```

Keep these components outside the scientific workstation component folders unless a workstation needs a small typed output added.

## 15. Core data model

```ts
export interface DragonSideQuestDefinition {
  id: string;
  workstationId: string;
  campaignId?: string;
  chapter?: number;

  title: string;
  subtitle?: string;
  client: QuestClient;
  openingScene: QuestScene;

  problem: string;
  constraint: QuestConstraint;
  acceptance: QuestAcceptance;

  objectives: QuestObjectiveDefinition[];
  beats: QuestBeatDefinition[];
  branches: QuestBranchDefinition[];
  sideObjectives?: QuestObjectiveDefinition[];
  rewards: QuestRewardDefinition[];

  workstationPatch?: Record<string, unknown>;
  teacherDemo?: QuestDemoSequence;
}

export interface QuestClient {
  id: string;
  name: string;
  role: string;
  portraitAssetId?: string;
  voiceAssetId?: string;
}

export interface QuestScene {
  id: string;
  panels: QuestScenePanel[];
  skippable: boolean;
  replayable: boolean;
}

export interface QuestScenePanel {
  id: string;
  backgroundAssetId: string;
  foregroundAssetIds?: string[];
  speakerId?: string;
  line?: string;
  caption?: string;
  durationMs?: number;
}

export interface QuestConstraint {
  narrativeTemplate: string;
  workstationPatch: Record<string, unknown>;
}

export interface QuestAcceptance {
  text: string;
  predicate: RecordPredicate;
}

export interface QuestObjectiveDefinition {
  id: string;
  label: string;
  description: string;
  predicate: RecordPredicate;
  requiredForStoryResolution: boolean;
  evidenceType?: string;
  rewardId?: string;
}

export interface QuestBeatDefinition {
  id: string;
  trigger: RecordPredicate;
  message: QuestMessage;
  once: boolean;
  priority?: number;
  directive?: OverlayDirective;
}

export interface QuestBranchDefinition {
  id: string;
  predicate: RecordPredicate;
  consequenceSceneId: string;
  followUpObjectiveIds?: string[];
  preserveEvidence: boolean;
  restoreStudentState?: boolean;
}

export interface QuestRewardDefinition {
  id: string;
  type: "seal" | "crest" | "patch" | "lore" | "cosmetic" | "case-unlock";
  label: string;
  assetId?: string;
}
```

## 16. Runtime rule

The quest director does not calculate scientific correctness.

```text
Workstation scientific action or result
        ↓
Typed workstation event
        ↓
Scientific evidence record
        ↓
Record predicate
        ↓
Objective update, NPC message, consequence, or reward
```

The workstation remains the source of scientific truth.

## 17. Quest runtime state

```ts
type DragonSideQuestRuntimeState =
  | "offered"
  | "accepted"
  | "briefing"
  | "investigating"
  | "decision-ready"
  | "decision-submitted"
  | "revision-needed"
  | "resolved"
  | "saved-for-later";
```

This state is separate from the teacher takeover runtime in the orchestration document.

## 18. Shared UI components

### Quest offer card

- short mission summary;
- client portrait;
- scientific location;
- rewards;
- accept, save, and open-lab actions.

### Motion-comic component

- three to five panels;
- captions and optional voice;
- parallax;
- replay and skip;
- reduced-motion mode.

### Objective ribbon

- one active objective at a time;
- compact and collapsible;
- no click-order checklist;
- does not cover lab controls.

### NPC communication chip

- short text;
- portrait and role;
- dismiss action;
- optional open-journal action;
- rate-limited by orchestration policy.

### Evidence pouch

- thumbnails or record cards from the current workstation;
- attach-to-decision action;
- provenance and timestamp;
- no duplicated scientific calculation.

### Consequence panel

- reflects actual outcome;
- supports revision branches;
- always provides a way back to the lab when unresolved.

### Campaign dossier

- chapter records;
- evidence links;
- dragon portrait and name;
- unresolved questions;
- seals and rewards;
- final defense view.

## 19. Persistence

Store at minimum:

```ts
export interface DragonSideQuestProgress {
  studentId: string;
  questId: string;
  runtimeState: DragonSideQuestRuntimeState;
  acceptedAtIso?: string;
  resolvedAtIso?: string;
  completedObjectiveIds: string[];
  firedBeatIds: string[];
  evidenceIds: string[];
  decisionRecordId?: string;
  earnedRewardIds: string[];
  latestWorkstationSnapshotId?: string;
}
```

Quest progress must be user-scoped and must not overwrite local scientific records already owned by a workstation.

## 20. Accessibility and comfort

- captions for all voice lines;
- skip and replay for scenes;
- reduced-motion setting;
- no story-critical information delivered by color alone;
- keyboard-accessible quest controls;
- large readable text;
- short dialogue chunks;
- no unavoidable timer;
- audio independently adjustable from narration;
- optional story-off mode that preserves the laboratory.

---

# Teacher Controls

## 21. Assignment settings

Every feature should be independently configurable:

- campaign on or off;
- quest offers on or off;
- opening scenes on or off;
- NPC messages on or off;
- objective ribbon on or off;
- optional side objectives on or off;
- mid-quest complication on or off;
- student-name personalization on or off;
- evidence pouch on or off;
- patient or world consequence scenes on or off;
- teacher demonstration allowed or disabled;
- highlight-only, assist, or autoplay demonstration;
- student confirmation before takeover;
- exact pre-demo state restoration;
- deterministic disturbance events on or off;
- post-quest reflection optional or required.

With every story feature disabled, the workstation must behave exactly as it does now.

## 22. Recommended presets

### Open Lab

- story off;
- overlays off;
- evidence capture available;
- takeover off.

### Light Story

- quest offer on;
- opening scene on;
- objective ribbon on;
- low-frequency NPC messages;
- side objectives off;
- takeover requires confirmation.

### Guided Side Quest

- full story beats;
- optional evidence prompts;
- consequence branches;
- side objectives on;
- takeover available with confirmation;
- no blocking inside the lab.

### Teacher Demo

- story optional;
- takeover enabled;
- visible banner;
- fixed duration;
- exact state restore;
- student cancel available.

---

# Build Plan

## 23. Phase 0: Shared quest shell

Build with fake events first:

- quest registry;
- quest director;
- progress repository;
- quest offer card;
- motion-comic component;
- objective ribbon;
- NPC communication chip;
- evidence pouch;
- consequence panel;
- reward toast;
- teacher settings;
- story-off behavior.

## 24. Phase 1: Pedigree vertical slice

Build **Ghost of the Emberglass Line** first.

Reasons:

- the scientific mechanics already exist;
- it has natural game resources through limited sequencing;
- it already supports contradictions, evidence, risk, prediction, and a visible recovery state;
- it exercises nearly every shared quest system without requiring a new scientific simulation.

Deliverable:

- one complete side quest from offer through recoverable branches and reward.

## 25. Phase 2: Protein Rescue

Add **The Food That Steals Fire**.

Priorities:

- event adapter;
- Molecular Trail;
- patient visual states;
- Merchant Varr optional claim;
- rescue record to campaign dossier.

## 26. Phase 3: Blood Compatibility

Audit the inner blood-lab component, expose typed events, then add:

- donor evidence cards;
- recommendation panel;
- patient consequence scene;
- `blood-foundling-rescue` scenario.

## 27. Phase 4: Island Expedition

Audit the expedition engine, then add:

- quest registry through `initialQuestId`;
- survey evidence;
- intervention snapshots;
- council recommendation;
- deterministic resilience event;
- final campaign placement.

## 28. Phase 5: Connected campaign

Link all four records into Cinder's dossier and add a final defense:

> Use the compatibility, molecular, lineage, and conservation evidence to defend Cinder's identity and placement.

## 29. Phase 6: Replayable quest packs

Author alternate cases primarily as data:

- blood donor scenarios;
- protein patient scenarios;
- pedigree investigations;
- island population scenarios.

Avoid building a new Angular page for every story.

---

# Acceptance Criteria

## 30. Student experience

1. The student can enter every workstation without accepting a quest.
2. Story overlays never create a permanent question dock inside the lab.
3. Objectives describe evidence and decisions rather than click order.
4. Story beats trigger from scientific records, not arbitrary button clicks.
5. NPC dialogue never reveals the scientific conclusion.
6. Every unresolved branch returns the student to the lab with prior evidence preserved.
7. Story consequences reflect actual model outcomes.
8. Rewards recognize investigation and reasoning, not speed.
9. The connected campaign produces a four-part evidence dossier.
10. A teacher can disable the entire quest layer without changing workstation behavior.

## 31. Technical behavior

1. Each workstation emits a documented typed quest event contract.
2. The quest director consumes events without owning scientific domain logic.
3. Quest constraints patch actual workstation settings from the same data that renders the story.
4. Quest progress persists independently from workstation scientific records.
5. Teacher demonstrations snapshot and restore exact student state.
6. Takeover auto-stops on timeout, completion, or cancel.
7. Evidence retains provenance, timestamp, workstation ID, and record ID.
8. The Island Expedition can load cases through `initialQuestId`.
9. Existing scientific behavior passes regression tests with story disabled.
10. Reduced-motion, captions, keyboard controls, and story-off mode are supported.

## 32. Content quality

1. Dialogue is short, competent, and treats students as junior scientists.
2. Clients state the problem and evidence needed but not the answer.
3. Complications arise from authentic scientific tensions.
4. Every case has a recoverable revision branch.
5. Alternate cases maintain equivalent scientific coverage and difficulty.
6. Story text never claims a model result that the workstation did not produce.

---

# Final implementation direction

Build the side-quest system as an orchestration and content layer around the existing workstations. Do not rebuild the scientific labs as games. The game feeling should come from the mission offer, motion-comic briefing, NPC communication, evidence collection, meaningful complication, visible consequence, and persistent campaign record.

Begin with **Ghost of the Emberglass Line** as the vertical slice. Once its quest offer, event adapter, objective predicates, consequence branches, teacher takeover, rewards, and persistence work correctly, apply the same shell to Protein Rescue, Blood Compatibility, and Island Expedition.
