# Dragon Genetics Genome Forge Workstation Build Guide

## Purpose

Build a **Genome Forge** workstation where students investigate whether a targeted DNA change alters the protein produced and ultimately changes a dragon trait.

The first version should focus on **layout, workflow, scientific state, evidence records, and experiment logic**. Do not build final graphics, 3D dragons, CRISPR animations, or cinematic effects yet.

The workstation should preserve the open-investigation model used elsewhere in Dragon Genetics:

- no fixed click sequence;
- no embedded question dock;
- no hidden correctness wiring inside the workstation;
- students can move backward and forward between comparison, editing, expression, and testing;
- the scientific model is the source of truth;
- story overlays and teacher orchestration are added outside the workstation shell later.

---

# Scientific Goal

Students investigate whether changing a specific DNA sequence changes the protein produced and ultimately changes a dragon trait.

The core causal chain is:

`source trait → candidate gene → DNA comparison → target selection → edit → mRNA → protein → function → phenotype → evidence-based decision`

The workstation must **not** teach:

> Insert a good gene → automatically get the desired trait.

Instead, students should be able to discover that an edit may:

- alter DNA but not protein;
- alter protein but not phenotype;
- improve the target trait;
- create a tradeoff;
- reduce function;
- produce no observable effect.

---

# Overall Screen Layout

Use a three-column workstation with a persistent evidence strip at the bottom.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ GENOME FORGE                                      Current Project / Dragon │
│ Scientific Goal: Modify a selected gene and test what actually changes.    │
├──────────────────┬───────────────────────────────────┬─────────────────────┤
│                  │                                   │                     │
│ SOURCE LIBRARY   │          GENOME FORGE             │  EDIT INSPECTOR     │
│                  │                                   │                     │
│ Living Dragon    │     Main active workspace         │ Current target      │
│ Source Species   │                                   │ Original DNA        │
│ Candidate Genes  │  changes according to workflow   │ Insert DNA          │
│                  │                                   │ Edit status         │
│                  │                                   │                     │
├──────────────────┴───────────────────────────────────┴─────────────────────┤
│ EVIDENCE RECORD                                                             │
│ DNA comparison │ Edit │ mRNA │ Protein │ Function │ Phenotype │ Decision   │
└────────────────────────────────────────────────────────────────────────────┘
```

The workstation should not behave like a wizard. Students should be free to:

- compare a gene;
- try an edit;
- test the result;
- return to comparison;
- choose another gene;
- revise the edit;
- compare multiple experimental outcomes.

---

# 1. Header

Keep the header compact and consistent with the other Dragon Genetics workstations.

## Left label

**DRAGON GENETICS · GENOME FORGE**

## Main title

**Experimental Gene Editing Laboratory**

## Scientific goal text

> Determine whether a targeted DNA change produces a functional change in the dragon.

## Header controls

- Return to Dragon Genetics
- Reset Experiment
- Load Saved Experiment
- Save Experiment
- Open Evidence Record

Optional later:

- Story commission indicator
- Teacher takeover indicator
- Side-quest status

---

# 2. Left Column: Source Library

This column defines **what is being changed** and **where the candidate DNA comes from**.

## A. Target Dragon

Show a compact record.

```text
TARGET DRAGON

Cinder
Silverhide Dragon

Trait under investigation:
Heat-sensitive scales

[ Change Dragon ]
```

For the first prototype, this can be text and data only.

Later, the dragon renderer can be added without changing the data contract.

---

## B. Trait Goal

The quest, teacher, or open mode can define the trait goal.

```text
TRAIT GOAL

Current:
Heat resistance

Target system:
Scale structure

Current phenotype:
Low heat tolerance
```

Use **trait goal**, not “gene for heat resistance.”

This keeps the scientific question open.

---

## C. Source Genome

Students choose a source organism or dragon whose genome contains candidate alleles or gene versions.

```text
SOURCE GENOME

Basalt Wyrm
Extinct volcanic dragon

Known observations:
• Survived near volcanic vents
• Thick dark scales
• High heat tolerance

[ Load Genome ]
```

Future quests can swap in different source species without changing the workstation logic.

---

## D. Candidate Gene List

This should be one of the main open-investigation areas.

```text
CANDIDATE GENES

□ SCL4   Scale structural protein
□ HSP2   Heat-response protein
□ PIG7   Scale pigment pathway
□ KRT3   Keratin-like structural protein
□ UNK9   Function uncertain
```

Clicking a gene loads its records into the center comparison workspace.

Do not label one as correct.

Students should investigate which gene is most relevant.

---

# 3. Center Workspace

Use six freely accessible tabs:

```text
[ COMPARE ] [ TARGET ] [ EDIT ] [ EXPRESS ] [ TEST ] [ REVIEW ]
```

These are workspace modes, not required steps.

---

# Tab 1 — Compare

## Purpose

Compare the target dragon gene with the source genome version.

## Layout

```text
GENE COMPARISON

Selected gene: SCL4

TARGET DRAGON
5'  A T G C C A T T G C A A ... 3'

SOURCE GENOME
5'  A T G C C G T T G C A A ... 3'

                    ▲
              sequence difference

Differences found: 3
Protein-changing differences: Unknown until tested
```

## Controls

- Previous difference
- Next difference
- Align sequences
- Show coding region
- Show differences only
- Save comparison evidence

## Saved evidence example

```text
Comparison Evidence
Gene: SCL4
3 DNA differences observed.
Student note: ___________________
```

Important concept:

> A DNA difference has been found. Its effect is not yet known.

---

# Tab 2 — Target

This tab represents simplified CRISPR targeting.

Do not implement real guide-RNA design or wet-lab procedure.

## Layout

```text
SELECT EDIT TARGET

Target DNA

... A C T G A [ C C G T T A C G ] T T A G ...

Possible target regions

○ Region A
○ Region B
○ Region C

Selected replacement region:
Source SCL4 segment

Target match quality:
High / Partial / Poor
```

## Student chooses

1. Gene
2. Target region
3. Replacement segment

## Instrument feedback

Use scientific feedback such as:

> Target region matches the selected edit location.

or:

> This target would cut outside the selected gene region.

Do not use quiz-style feedback like:

> Correct target!

---

# Tab 3 — Edit

This is the genome modification simulation.

The first version should be text/sequence based.

## Before/after layout

```text
GENOME EDIT

ORIGINAL

5' ... A C C T [A A G C T A] G G T C ... 3'

REPLACEMENT

               [G A G C T G]

PROPOSED EDIT

5' ... A C C T [G A G C T G] G G T C ... 3'
```

## Controls

- Preview Edit
- Apply Edit
- Undo Edit
- Restore Original
- Save Edited Genome

## After applying an edit

```text
EDIT COMPLETE

Target gene: SCL4
Bases replaced: 6
Other genes changed: 0

Experiment genome:
EDIT-01
```

Do not say the edit “worked.”

At this stage only DNA has changed.

---

# 4. Right Column: Edit Inspector

The inspector remains visible while the student moves through the tabs.

## Current Experiment

```text
EXPERIMENT 01

Target:
Cinder

Trait goal:
Heat resistance

Source:
Basalt Wyrm

Gene:
SCL4

Status:
DNA edited
```

## Before / After DNA

```text
ORIGINAL
AAGCTA

EDITED
GAGCTG
```

## Evidence Status

```text
EVIDENCE

✓ Source selected
✓ Gene compared
✓ DNA difference located
✓ Edit completed
○ mRNA observed
○ Protein produced
○ Protein function tested
○ Dragon phenotype tested
```

These are evidence states, not navigation locks.

---

# Tab 4 — Express

This should reuse the same scientific reasoning used in the Protein Rescue Lab.

Students compare the original and edited gene-expression pathways.

## Layout

```text
GENE EXPRESSION TEST

             ORIGINAL                 EDITED

DNA          ATGCCA...                ATGCGA...
                ↓                        ↓

mRNA         AUGCCA...                AUGCGA...
                ↓                        ↓

Protein      Met-Pro-...              Met-Arg-...

Length       128 aa                   128 aa

Difference   —                        amino acid 37 changed
```

## Controls

- Transcribe Original
- Transcribe Edited
- Translate Original
- Translate Edited
- Compare Proteins
- Save Molecular Evidence

Students should be able to run either side first.

---

# Protein Comparison

Display beneath the expression test:

```text
PROTEIN COMPARISON

Original protein
Length: 128 aa
Function status: Untested

Edited protein
Length: 128 aa
Difference: amino acid 37
Function status: Untested

[ Send Both to Function Test ]
```

This reinforces:

**DNA changed ≠ trait automatically changed.**

---

# Tab 5 — Test

Separate **protein function** from **whole-dragon phenotype**.

That distinction is essential.

## A. Protein Function Test

Example result:

```text
PROTEIN FUNCTION CHAMBER

Original protein
Scale binding: 42%
Heat stability: LOW

Edited protein
Scale binding: 39%
Heat stability: HIGH
```

Another edit might produce:

```text
Edited protein
Scale binding: FAILED
Heat stability: N/A
```

---

## B. Dragon Trait Test

Now test the organism-level phenotype.

```text
TRAIT TEST

Test:
Heat exposure

Temperature:
[ 30° ————— 90° ]

Original condition:
Scale damage: High
Mobility: Normal

Edited condition:
Scale damage: Low
Mobility: Reduced
```

This is where tradeoffs become visible.

A successful edit may improve one trait while creating another problem.

---

# Trait Test Controls

Students should be able to:

- change temperature;
- repeat the test;
- compare original vs edited;
- try a different gene;
- try a different edit;
- reverse the edit.

Every run should add a record to a trial ledger.

---

# Tab 6 — Review

This is a scientific decision screen, not a quiz.

## Evidence Chain

```text
GENOME FORGE CASE RECORD

TARGET
Cinder

TRAIT GOAL
Improve heat tolerance

SOURCE
Basalt Wyrm

GENE TESTED
SCL4

DNA
Sequence changed

mRNA
Sequence changed

PROTEIN
1 amino acid changed

FUNCTION
Heat stability increased

PHENOTYPE
Heat damage decreased

SECONDARY EFFECT
Scale flexibility decreased
```

---

# Student Decision

Provide three decision options:

## Approve Edit

> Evidence supports using this modification.

## Revise Experiment

> The modification affects the desired trait, but another edit should be tested.

## Reject Edit

> Current evidence does not support using this modification.

Then allow students to attach evidence.

```text
EVIDENCE FOR MY DECISION

Attach:
[ DNA comparison ]
[ Protein result ]
[ Trait test ]
[ Secondary effect ]

Explanation:
_________________________________
_________________________________
```

Do not hard-code one universal correct answer.

Different quest cases should produce different defensible outcomes.

---

# Bottom Persistent Panel: Evidence Record

Keep a collapsible evidence strip visible across the workstation.

```text
EVIDENCE RECORD

DNA
3 differences

EDIT
SCL4 region 2

RNA
1 codon changed

PROTEIN
1 amino acid changed

FUNCTION
Heat stability ↑

PHENOTYPE
Heat tolerance ↑

TRADEOFF
Flexibility ↓

[ Open Full Record ]
```

This becomes the primary student-built artifact from the Genome Forge.

---

# Intended Scientific Workflow

```text
Choose Dragon
      ↓
Identify Trait Goal
      ↓
Explore Source Genome
      ↓
Compare Candidate Genes
      ↓
Choose a Candidate
      ↓
Locate DNA Difference
      ↓
Select Edit Target
      ↓
Apply Edit
      ↓
Transcribe DNA
      ↓
Translate Protein
      ↓
Compare Protein Function
      ↓
Test Dragon Phenotype
      ↓
Observe Benefits / Tradeoffs
      ↓
Approve / Revise / Reject
```

However, the actual interface must support open investigation:

```text
compare gene
   ↓
test it
   ↓
return
   ↓
try another gene
   ↓
compare results
   ↓
revise edit
```

---

# First Prototype Dataset

For the first build, hard-code three candidate genes.

## SCL4 — Scale Structure

Known to be associated with scale structure.

Potential simulated effect:

- source version increases heat stability;
- may reduce flexibility.

## PIG7 — Scale Pigment

Known to affect scale pigmentation.

Potential simulated effect:

- changes visible scale color;
- little or no effect on heat resistance.

This creates a believable but weak hypothesis.

## HSP2 — Heat-Response Protein

Known to affect cellular heat response.

Potential simulated effect:

- moderate improvement under heat;
- may create a cost under normal conditions.

These three genes give students multiple meaningful experimental paths.

---

# Recommended First Quest Configuration

## Fireproof Scale Project

**Target:** Silverhide dragon  
**Problem:** poor survival near volcanic nesting grounds  
**Source genome:** extinct Basalt Wyrm  
**Trait goal:** increased heat tolerance

Candidate genes:

| Gene | What students know initially |
|---|---|
| `SCL4` | Associated with scale structure |
| `PIG7` | Associated with scale pigmentation |
| `HSP2` | Associated with cellular heat response |

The simulator knows the actual modeled consequences.

The student does not.

---

# Suggested Angular Component Structure

```text
src/app/features/dragon-genetics/genome-forge/
  genome-forge.page.ts
  genome-forge.page.html
  genome-forge.page.scss

  components/
    forge-source-library/
    forge-gene-comparison/
    forge-target-selector/
    forge-edit-preview/
    forge-expression-test/
    forge-protein-comparison/
    forge-trait-test/
    forge-evidence-record/
    forge-decision-panel/

  models/
    genome-forge.models.ts
    genome-forge-cases.ts

  services/
    genome-edit-simulator.service.ts
    genome-forge.repository.ts
```

---

# Responsibilities by Layer

## `genome-forge.page.ts`

Owns:

- current experiment selection;
- selected dragon;
- selected source genome;
- selected candidate gene;
- active workspace tab;
- orchestration between child components;
- evidence-record assembly;
- save/load experiment actions.

It should **not** own molecular calculation logic.

---

## `genome-edit-simulator.service.ts`

Owns the scientific simulation logic:

- sequence alignment;
- DNA differences;
- target-region validation;
- sequence replacement;
- edited sequence generation;
- transcription;
- translation;
- amino-acid comparison;
- protein-function simulation;
- phenotype consequence simulation;
- secondary-effect simulation.

This service is the scientific source of truth for the workstation.

---

## `genome-forge.repository.ts`

Owns:

- saved experiments;
- evidence records;
- student decisions;
- trial ledger;
- before/after snapshots;
- local persistence or later backend persistence.

---

# Suggested Data Model

```ts
export interface GenomeForgeCase {
  id: string;
  title: string;
  targetDragonId: string;
  traitGoalId: string;
  sourceGenomeId: string;
  candidateGeneIds: string[];
}

export interface GenomeForgeExperiment {
  id: string;
  caseId: string;
  targetDragonId: string;
  sourceGenomeId: string;
  selectedGeneId: string | null;
  selectedTargetRegionId: string | null;
  originalSequence: string | null;
  replacementSequence: string | null;
  editedSequence: string | null;
  molecularEvidence: GenomeForgeMolecularEvidence | null;
  functionTrials: GenomeForgeFunctionTrial[];
  phenotypeTrials: GenomeForgePhenotypeTrial[];
  decision: GenomeForgeDecision | null;
}

export interface GenomeForgeMolecularEvidence {
  originalMrna: string;
  editedMrna: string;
  originalProtein: string[];
  editedProtein: string[];
  aminoAcidDifferences: number[];
}

export interface GenomeForgeFunctionTrial {
  id: string;
  proteinVersion: "original" | "edited";
  metrics: Record<string, number | string>;
  atIso: string;
}

export interface GenomeForgePhenotypeTrial {
  id: string;
  conditionId: string;
  inputs: Record<string, number | string | boolean>;
  originalOutcome: Record<string, number | string | boolean>;
  editedOutcome: Record<string, number | string | boolean>;
  atIso: string;
}

export interface GenomeForgeDecision {
  choice: "approve" | "revise" | "reject";
  evidenceIds: string[];
  explanation: string;
  savedAtIso: string;
}
```

---

# Workstation Events for Story and Orchestration Integration

The Genome Forge should emit typed observational events that can later feed the side-quest system.

Suggested events:

```ts
type GenomeForgeEvent =
  | { type: "GENE_COMPARED"; geneId: string; atIso: string }
  | { type: "TARGET_SELECTED"; geneId: string; targetRegionId: string; atIso: string }
  | { type: "EDIT_APPLIED"; experimentId: string; geneId: string; atIso: string }
  | { type: "TRANSCRIPTION_COMPLETED"; experimentId: string; version: "original" | "edited"; atIso: string }
  | { type: "PROTEIN_COMPARED"; experimentId: string; atIso: string }
  | { type: "FUNCTION_TESTED"; experimentId: string; version: "original" | "edited"; atIso: string }
  | { type: "PHENOTYPE_TESTED"; experimentId: string; conditionId: string; atIso: string }
  | { type: "EDIT_DECISION_SAVED"; experimentId: string; choice: "approve" | "revise" | "reject"; atIso: string };
```

These events should be observational only.

The story layer can react to them later, but the Genome Forge scientific logic remains local.

---

# Teacher / Story Integration Later

The side-quest system can later wrap this workstation with missions such as:

- Fireproof Scale Project
- Frostwing Rescue
- Deep-Sea Dragon Vision
- Silent Hunter Scale Modification
- Mini Dragon Designer

The side-quest layer can provide:

- client;
- problem;
- constraint;
- acceptance criteria;
- optional NPC messages;
- evidence-triggered story beats;
- teacher-triggered demonstrations.

None of those should be hard-coded inside the Genome Forge component.

---

# What Not to Build Yet

The first implementation does **not** need:

- 3D dragons;
- chromosome animations;
- CRISPR protein animations;
- animated Cas proteins;
- realistic molecular graphics;
- NPC portraits;
- voice acting;
- motion-comic cutscenes;
- complex protein-folding visuals;
- cinematic consequence scenes.

Build the scientific workflow and state first.

Graphics can be layered onto stable components later.

---

# First Prototype Acceptance Criteria

1. A student can load a target dragon and source genome.
2. A student can inspect at least three candidate genes.
3. DNA sequences can be compared and differences identified.
4. A student can choose a simplified edit target.
5. The simulator can generate an edited DNA sequence.
6. Original and edited DNA can both be transcribed and translated.
7. The interface can compare resulting proteins.
8. Protein function can be tested independently from phenotype.
9. The target dragon can be tested under at least one environmental condition.
10. The edited phenotype can include both benefits and secondary effects.
11. Students can revise or reverse an edit and test again.
12. All experiment runs are stored in a trial ledger.
13. Students can save an approve/revise/reject decision with attached evidence.
14. The evidence record remains available across the workstation.
15. No fixed click order is required.
16. No embedded question dock exists inside the workstation.
17. Scientific conclusions come from the simulator state, not story scripting.
18. Story overlays can later subscribe to typed workstation events without changing the scientific core.

---

# Recommended Build Order

## Phase 1 — Static Layout

Build:

- header;
- three-column layout;
- six workspace tabs;
- source library;
- edit inspector;
- persistent evidence strip.

Use fake data only.

## Phase 2 — Gene Comparison

Build:

- candidate gene selection;
- target/source sequence comparison;
- difference navigation;
- saved comparison evidence.

## Phase 3 — Edit Simulation

Build:

- simplified target-region selection;
- before/after sequence preview;
- apply/undo/restore edit;
- edited genome state.

## Phase 4 — Expression

Build:

- original/edited transcription;
- original/edited translation;
- protein comparison;
- molecular evidence record.

Reuse existing Dragon Genetics DNA/protein logic where appropriate.

## Phase 5 — Function and Phenotype Testing

Build:

- protein-function test;
- environmental trait test;
- repeatable trial ledger;
- secondary effects.

## Phase 6 — Review and Evidence

Build:

- evidence chain;
- approve/revise/reject decision;
- attached evidence;
- saved experiment record.

## Phase 7 — Side-Quest Integration

Add:

- typed workstation events;
- quest adapter;
- optional story overlays;
- teacher takeover support;
- exact state snapshot/restore.

---

# Final Design Principle

The Genome Forge should feel like a genetics engineering lab where students are trying to answer:

> **What actually changed, and what evidence shows that the change mattered?**

The workstation should reward comparison, testing, revision, and evidence rather than treating gene editing as a magic trait-selection tool.
