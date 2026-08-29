# Dragon Genetics Story, Questioning, and Workstation Orchestration Upgrade

**Status:** Proposed implementation plan  
**Primary product contract:** `DRAGON_GENETICS_WORKSTATION_RULES.md`  
**Related architecture:** `DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md`, `DRAGON_WORKSTATION_INQUIRY_ARCHITECTURE.md`, and `DRAGON_STUDENT_WALKTHROUGH_PLAN.md`

## 1. Goal

Integrate story, questioning, evidence collection, diagnostic support, and teacher-controlled demonstrations directly into the lesson-to-workstation flow without sending students to a separate investigation page and without converting open workstations into scripted quiz panels.

Students should enter the same full workstation labs that can also operate independently. When a workstation is launched from a lesson, the surrounding lesson host may add:

- a short commission or mission ribbon;
- optional contextual question overlays;
- a floating coach chip;
- evidence-capture invitations;
- non-blocking checkpoints;
- teacher-triggered demonstrations that temporarily control selected workstation functions;
- story beats triggered by evidence the student establishes;
- a return path into lesson synthesis using the evidence already collected.

The workstation remains the scientific instrument. The orchestration layer decides when to frame, prompt, highlight, capture, or demonstrate. It does not become the source of scientific truth.

---

## 2. Non-negotiable product rules

These rules win over every other requirement in this document.

1. **No embedded question dock inside a dedicated workstation layout.**
2. **Workstations remain open-order investigation tools.** Students may change controls, repeat trials, compare cases, and leave or return without following a prescribed click sequence.
3. **The lesson layer is orchestration, not scientific truth.** Prompts may ask students to notice, predict, compare, explain, or support a claim. They may not dictate what the workstation must produce.
4. **Every orchestration behavior is teacher-controlled.** Story framing, prompt overlays, coach support, evidence capture, progress indicators, adaptive selection, and takeover must all have independent controls.
5. **Teacher takeover is temporary, visible, cancellable, and time-bounded.** It must always return control to the student.
6. **Scientific behavior is unchanged when orchestration is disabled.** A lesson-launched workstation with all orchestration features off must behave like the same workstation opened directly.
7. **Required prompts never disable laboratory controls.** A teacher may require a response for lesson completion, but the student must remain free to continue investigating.
8. **Story never overrides a model result.** If the model produces an unexpected sample, ratio, phenotype, or recombinant chromosome, the story must react to that result rather than replacing it.
9. **Story never narrates the conclusion before the student establishes it.** A client can state the problem and acceptance criteria, but not the scientific answer.
10. **Process diagnostics are reported, not graded.** Work patterns can guide support and teacher decisions, but they must not become hidden behavior scores.

### 2.1 Where overlays are allowed

Overlays belong to the **lesson/workstation host shell**, not inside the workstation component itself. They may visually float above or beside the workstation, but they must be rendered by the host page or context layer.

This distinction preserves the workstation as a reusable, app-agnostic instrument:

```text
Lesson or Journey Page
  └── Workstation Host Shell
        ├── Story / prompt / takeover overlay plane
        ├── Workstation component
        └── Evidence and event bridge
```

The workstation component emits scientific interaction and result events. It does not decide which story beat, question, or teacher intervention should appear.

---

## 3. Unified student experience

### 3.1 Two valid launch modes

Every workstation must support both launch modes.

#### Direct open-lab launch

- No lesson context is required.
- No commission, prompt overlay, progress map, or takeover behavior appears unless explicitly supplied.
- The student uses the workstation as a standalone investigation tool.

#### Lesson-context launch

- The student opens the same workstation from a lesson or journey step.
- The host resolves the assignment's orchestration settings, current story commission, prompt registry, evidence targets, and return route.
- The host renders orchestration around the workstation without changing its scientific rules.

### 3.2 Recommended lesson-to-workstation flow

1. **Commission brief:** The lesson page introduces the client, problem, constraint, and evidence the client will accept.
2. **Open workstation:** The same full workstation loads inside a lesson-aware host.
3. **Mission ribbon:** A compact, dismissible ribbon restates the immediate goal and any real case constraint. It does not contain a long story passage.
4. **Free investigation:** Students manipulate the lab in any order.
5. **Observational event capture:** The host receives typed actions, results, and evidence events.
6. **Occasional prompt:** When policy and trigger conditions allow, the host displays an optional or teacher-required question overlay.
7. **Evidence capture:** A student can attach a result, notebook statement, comparison, screenshot, or record to the lesson's evidence set.
8. **Story beat:** When a meaningful record predicate is satisfied, the client may respond, a candidate may be excluded, or the next part of the case may be revealed.
9. **Teacher demonstration, when used:** A visible banner requests confirmation, temporarily operates selected controls, and restores the student's state.
10. **Return and synthesize:** The lesson page reopens with the student's collected evidence already available for the final claim, chart, or reflection.

The student does not leave the investigation to answer a separate quiz page. The orchestration travels with the lesson context and then returns the student to synthesis.

---

## 4. Target architecture

### 4.1 Layer 1: Workstation core

**Existing responsibility:**

- scientific controls and domain logic;
- simulations, models, and visible consequences;
- local notebook or evidence records;
- scientific events and results;
- local persistence already owned by the workstation.

**Must not own:**

- story selection;
- prompt frequency;
- lesson completion rules;
- misconception selection;
- teacher takeover policy;
- cross-workstation progress;
- adaptive case assignment.

### 4.2 Layer 2: Workstation orchestration adapter

Each host provides a small adapter around the workstation. The adapter translates generic orchestration commands into controls that the particular workstation supports.

```ts
export interface WorkstationOrchestrationAdapter<TSnapshot = unknown> {
  workstationId: string;

  createSnapshot(): TSnapshot;
  restoreSnapshot(snapshot: TSnapshot): Promise<void>;

  highlightControl(targetId: string): void;
  clearHighlights(): void;

  runAssistCommand(command: WorkstationAssistCommand): Promise<void>;
  runAutoplayCommand(command: WorkstationAutoplayCommand): Promise<void>;
  cancelActiveCommand(): Promise<void>;
}
```

A workstation does not have to support every command. The host must declare supported capabilities so the runtime never attempts unsupported control.

### 4.3 Layer 3: Orchestration runtime

Create a focused service under:

`src/app/features/dragon-genetics/orchestration/`

Recommended primary service:

`dragon-lesson-orchestration.service.ts`

Responsibilities:

- consume assignment settings, launch context, workstation events, story state, and student inquiry history;
- apply prompt frequency and cooldown policies;
- select eligible prompts without forcing an action order;
- emit host-level overlay directives;
- activate story beats from evidence predicates;
- run the takeover state machine;
- request, store, and restore pre-takeover snapshots;
- publish evidence bridge actions;
- update non-linear progress states;
- keep all orchestration behavior inactive when disabled.

### 4.4 Layer 4: Story and commission registry

The story registry defines cases, constraints, acceptance criteria, story beats, failure branches, and equivalent variants for the Arena and Mini Dragon Show paths.

Story and briefing configuration must come from the same authored object so displayed text cannot drift from actual settings.

### 4.5 Layer 5: Teacher settings and live controls

Teacher settings define what is enabled for an assignment. Live controls may initiate a demonstration, dismiss a planned intervention, or pause orchestration for a class or student session.

### 4.6 Layer 6: Evidence and diagnostic bridge

The bridge stores scientific records and selected process traces, maps evidence into lesson charts and synthesis views, and derives non-scored process signatures.

### 4.7 Layer 7: Lesson synthesis

Shared written questions, final claims, and chart completion remain lesson-owned. They can reuse workstation evidence without embedding a permanent question panel in the workstation.

---

## 5. Assignment settings schema

Add `lessonOrchestrationSettings` parallel to `journeyPlan` and `inquirySettings`.

```ts
export interface LessonOrchestrationSettings {
  mode:
    | "open-investigation"
    | "guided-investigation"
    | "teacher-takeover-demo";

  features: FeatureToggles;
  story: StoryPolicy;
  prompts: PromptPolicy;
  takeover: TakeoverPolicy;
  progress: ProgressPolicy;
  evidence: EvidencePolicy;
  diagnostics: DiagnosticPolicy;
  presets?: PresetRef[];
}

export interface FeatureToggles {
  missionRibbon: boolean;
  storyBeatOverlays: boolean;
  overlayPrompts: boolean;
  floatingCoachChip: boolean;
  checkpointReflections: boolean;
  evidenceCapture: boolean;
  progressMap: boolean;
  adaptivePromptEngine: boolean;
  adaptiveCaseSelection: boolean;
  teacherTakeover: boolean;
  postInvestigationSynthesis: boolean;
}

export interface StoryPolicy {
  enabled: boolean;
  spineId?: string;
  personalization: "none" | "roster" | "full";
  useFailureBranches: boolean;
  allowAdaptiveCaseSelection: boolean;
  showClientMessagesDuringLab: boolean;
  fallbackToNeutralSlots: boolean;
}

export interface PromptPolicy {
  requiredness: "optional" | "required";
  maxPromptsPerSession: number;
  minActionsBetweenPrompts: number;
  allowSkip: boolean;
  blockLessonCompletionIfUnanswered: boolean;
  hintDepth: "light" | "medium" | "worked-example";
  captureConfidence: boolean;
  repeatMissStrategy: "none" | "rephrase" | "alternate-case" | "teacher-review";
}

export interface TakeoverPolicy {
  allowTakeover: boolean;
  takeoverMoments: Array<
    "intro" | "checkpoint" | "misconception" | "wrap-up" | "teacher-live"
  >;
  takeoverDurationSec: number;
  controlLevel: "highlight-only" | "assist" | "autoplay";
  requireStudentConfirmBeforeRun: boolean;
  returnToStudentState: boolean;
  showTakeoverBanner: boolean;
  allowStudentCancel: boolean;
  separateDemoEvidenceFromStudentEvidence: boolean;
}

export interface ProgressPolicy {
  model: "competency-state";
  states: Array<"observed" | "tested" | "explained">;
  completionRule: "any-order";
  showToStudent: boolean;
}

export interface EvidencePolicy {
  autoAttachMetadata: boolean;
  allowScreenshotCapture: boolean;
  requireEvidenceForChartFields: boolean;
  minEvidenceItems: number;
  allowStudentRemoveEvidence: boolean;
  allowTeacherDemoEvidenceToCount: boolean;
}

export interface DiagnosticPolicy {
  persistWorkstationTraces: boolean;
  traceRetention: "session" | "current-unit";
  sampleHighFrequencyEvents: boolean;
  deriveProcessSignatures: boolean;
  showProcessSignaturesToTeacher: boolean;
  scoreProcessSignatures: false;
}
```

### 5.1 Required semantics

- `requiredness: "required"` means the response can be required to complete the **lesson record**. It never means workstation controls are disabled.
- `blockLessonCompletionIfUnanswered` cannot block direct workstation exit or prevent further experiments.
- `adaptiveCaseSelection` can vary the context of a case, but not its science coverage, difficulty, evidence requirement, or allotted opportunity.
- `allowTeacherDemoEvidenceToCount` should default to `false`.
- `scoreProcessSignatures` is intentionally fixed to `false`.

### 5.2 Recommended defaults

```ts
export const DEFAULT_LESSON_ORCHESTRATION_SETTINGS: LessonOrchestrationSettings = {
  mode: "open-investigation",
  features: {
    missionRibbon: true,
    storyBeatOverlays: true,
    overlayPrompts: true,
    floatingCoachChip: true,
    checkpointReflections: true,
    evidenceCapture: true,
    progressMap: false,
    adaptivePromptEngine: false,
    adaptiveCaseSelection: false,
    teacherTakeover: true,
    postInvestigationSynthesis: true,
  },
  story: {
    enabled: true,
    personalization: "roster",
    useFailureBranches: true,
    allowAdaptiveCaseSelection: false,
    showClientMessagesDuringLab: true,
    fallbackToNeutralSlots: true,
  },
  prompts: {
    requiredness: "optional",
    maxPromptsPerSession: 3,
    minActionsBetweenPrompts: 4,
    allowSkip: true,
    blockLessonCompletionIfUnanswered: false,
    hintDepth: "light",
    captureConfidence: false,
    repeatMissStrategy: "rephrase",
  },
  takeover: {
    allowTakeover: true,
    takeoverMoments: ["intro", "checkpoint", "teacher-live"],
    takeoverDurationSec: 45,
    controlLevel: "highlight-only",
    requireStudentConfirmBeforeRun: true,
    returnToStudentState: true,
    showTakeoverBanner: true,
    allowStudentCancel: true,
    separateDemoEvidenceFromStudentEvidence: true,
  },
  progress: {
    model: "competency-state",
    states: ["observed", "tested", "explained"],
    completionRule: "any-order",
    showToStudent: false,
  },
  evidence: {
    autoAttachMetadata: true,
    allowScreenshotCapture: true,
    requireEvidenceForChartFields: false,
    minEvidenceItems: 1,
    allowStudentRemoveEvidence: true,
    allowTeacherDemoEvidenceToCount: false,
  },
  diagnostics: {
    persistWorkstationTraces: true,
    traceRetention: "current-unit",
    sampleHighFrequencyEvents: true,
    deriveProcessSignatures: true,
    showProcessSignaturesToTeacher: true,
    scoreProcessSignatures: false,
  },
};
```

### 5.3 Suggested teacher presets

| Preset | Story | Prompts | Evidence | Takeover | Best use |
|---|---:|---:|---:|---:|---|
| **Open Lab** | Brief only | Optional, low frequency | Optional | Confirmation required | Default independent investigation |
| **Guided Case** | Full commission and beats | Required for lesson completion, never lab-blocking | Required for selected chart fields | Assist only | Students who need more structure |
| **Live Demonstration** | Brief only | Reflection after demo | Demo evidence separate | Autoplay permitted, time-bounded | Whole-class or small-group modeling |
| **Quiet Assessment** | Minimal | No adaptive hints | Evidence required | Off | Individual evidence collection without coaching |

---

## 6. Story architecture: make the case drive the investigation

### 6.1 Story is a readable configuration, not decoration

The same record must generate both the visible commission and the workstation briefing patch.

```ts
export interface Commission {
  id: string;
  lessonId: string;
  actId: string;
  spineId: string;

  client: string;
  problem: string;
  constraint: CommissionConstraint;
  acceptance: string;

  goalTemplate: string;
  slotBindings: StorySlotBinding[];
  briefingPatch: Partial<WorkstationBriefing>;
  completionPredicate: RecordPredicate;

  caseTags: ConceptId[];
  variants: CommissionVariant[];
  beats: StoryBeat[];
  failureBranches?: StoryFailureBranch[];
}
```

A constraint such as “the sequencing bay has charge for two runs” must render the number from the same value that configures `sequencingBudget: 2`.

### 6.2 Recommended story spine: The Foundling

A single unknown hatchling or young dragon creates a continuing evidence problem across the unit:

> Establish where this dragon came from, which traits are inherited, how its gene information is organized and expressed, and which breeding line it can responsibly join.

The same spine can support both existing visual paths:

- **Dragon Arena:** an undocumented full-size dragon has arrived at the academy or conservation herd.
- **Mini Dragon Show:** an undocumented mini dragon has arrived at the registry or show kennel.

The scientific goal and questions remain equivalent. Specimens, client language, and visual stakes change.

### 6.3 Story beats fire on records, not clicks

```ts
export interface StoryBeat {
  id: string;
  commissionId: string;
  trigger: RecordPredicate;
  textTemplate: string;
  presentation: "lesson-card" | "host-overlay" | "return-briefing";
  briefingDelta?: Partial<WorkstationBriefing>;
  evidenceRefs?: string[];
}
```

A meaningful record can produce three coordinated effects:

1. satisfy a scientific checkpoint;
2. advance the story;
3. modify the next briefing or open the next case record.

Example: a blood-compatibility record excludes one candidate parent. The same record satisfies the checkpoint, triggers the client's reply, and removes that candidate from the next parentage board.

### 6.4 Failure branches are recoverable

Failure branches should reuse the student's actual prediction or evidence record without shaming the student.

Example:

> “You predicted that the next clutch would balance the earlier results. It did not. The herder wants to know whether probability promised a result or only described a chance.”

A failure branch may activate a new prompt, alternate case, or teacher support option. It must never close the case permanently.

### 6.5 Personalization

Story slots may draw from records already created by the student:

- named founder or starter dragon;
- selected parent pair;
- observed phenotype;
- saved batch result;
- chosen gene;
- selected gamete;
- excluded candidate;
- teacher or academy client name.

Every slot requires a neutral fallback so skipped naming or missing local data never breaks the story.

### 6.6 Adaptive case selection

Diagnostics may choose among equivalent cases that confront a likely misconception:

- `carrier-shows-trait` → an unaffected carrier case;
- `probability-guarantee` → a client demanding certainty from a clutch prediction;
- `learned-is-genetic` → a trained behavior the client incorrectly wants to breed;
- `dominant-means-two` → a heterozygous expression case;
- `sample-size-irrelevant` → a misleading small sample followed by a larger comparison.

**Equity guard:** case variants may differ in context, not in science coverage, difficulty, evidence quality, or time opportunity.

---

## 7. Question overlay architecture

### 7.1 Overlay questions are investigation prompts, not a quiz dock

A question overlay should be short, contextual, and attached to a meaningful moment. It can ask the student to:

- notice a visible difference;
- make a prediction before a run;
- compare two records;
- identify what evidence is still missing;
- explain a pattern in the student's own chart;
- choose evidence for a claim;
- reflect after a teacher demonstration.

It should not:

- occupy a permanent side panel;
- show red/green correctness during open investigation;
- force a fixed sequence of controls;
- reveal the conclusion;
- repeatedly interrupt after every action;
- prevent further exploration until answered.

### 7.2 Prompt types

| Prompt type | Purpose | Typical trigger | Default behavior |
|---|---|---|---|
| **Mission cue** | Restate the immediate case goal | Workstation opened | Dismissible ribbon |
| **Observation prompt** | Direct attention without naming the answer | A relevant object or result first appears | Optional overlay |
| **Prediction prompt** | Store reasoning before a result | Before a hatch, expression run, or fertilization | Optional in open mode; configurable in guided mode |
| **Comparison prompt** | Encourage use of more than one case or run | Two records exist | Optional overlay |
| **Evidence prompt** | Attach a record to the lesson claim | Evidence-eligible result exists | Non-blocking capture card |
| **Checkpoint reflection** | Explain what the evidence supports | Student indicates they are ready to leave or synthesize | May be required for lesson completion |
| **Coach chip** | Offer a small hint or question | Stalled pattern or repeated confident miss | User opens it; no automatic answer reveal |
| **Post-demo reflection** | Reconnect teacher demonstration to student investigation | Takeover finishes and control is restored | Dismissible; never locks controls |

### 7.3 Prompt definition

```ts
export interface OverlayPromptDefinition {
  id: string;
  lessonId: string;
  workstationId: string;
  kind:
    | "mission-cue"
    | "observation"
    | "prediction"
    | "comparison"
    | "evidence"
    | "checkpoint-reflection"
    | "coach"
    | "post-demo";

  textTemplate: string;
  trigger: RecordPredicate;
  suppressWhen?: RecordPredicate;

  requirednessOverride?: "optional" | "required";
  responseType:
    | "none"
    | "short-text"
    | "claim-evidence"
    | "choice"
    | "confidence-choice"
    | "select-record";

  evidenceTargetId?: string;
  diagnosisMap?: Record<string, ConceptId>;
  maxShowsPerSession?: number;
  minActionsSinceLastPrompt?: number;
  storyBeatId?: string;
}
```

### 7.4 Prompt selection rules

The runtime should select a prompt only when all are true:

1. the feature is enabled;
2. the prompt's trigger predicate is satisfied;
3. the prompt is not suppressed by existing evidence or a prior response;
4. session maximum and action cooldown are satisfied;
5. no takeover or other modal overlay is active;
6. the prompt does not repeat content already established;
7. the prompt is valid for the current story variant and workstation capability.

When several prompts are eligible, priority should be:

1. safety or state-return notices;
2. teacher-live intervention;
3. evidence capture tied to a result the student just created;
4. prediction before an irreversible result;
5. misconception-responsive coach support;
6. general observation or comparison prompts.

---

## 8. Runtime contracts

### 8.1 Launch context

```ts
export interface WorkstationLaunchContext {
  launchId: string;
  assignmentId: string;
  lessonId: string;
  workstationId: string;
  studentId: string;

  settings: LessonOrchestrationSettings;
  commissionId?: string;
  briefing: WorkstationBriefing;
  evidenceTargetIds: string[];
  returnRoute: string;
}
```

The workstation component does not need this whole object. The host uses it and passes only scientific configuration that the workstation already understands.

### 8.2 Minimum workstation event contract

```ts
export type WorkstationOrchestrationEvent =
  | {
      type: "WORKSTATION_OPENED";
      workstationId: string;
      atIso: string;
    }
  | {
      type: "WORKSTATION_ACTION";
      workstationId: string;
      actionId: string;
      payload?: unknown;
      atIso: string;
    }
  | {
      type: "WORKSTATION_RESULT";
      workstationId: string;
      resultId: string;
      payload?: unknown;
      atIso: string;
    }
  | {
      type: "EVIDENCE_CAPTURED";
      workstationId: string;
      evidenceId: string;
      payload?: unknown;
      atIso: string;
    }
  | {
      type: "TAKEOVER_REQUESTED";
      workstationId: string;
      moment: "intro" | "checkpoint" | "misconception" | "wrap-up" | "teacher-live";
      atIso: string;
    }
  | {
      type: "TAKEOVER_STARTED";
      workstationId: string;
      atIso: string;
    }
  | {
      type: "TAKEOVER_FINISHED";
      workstationId: string;
      reason: "completed" | "timeout" | "cancelled" | "error";
      atIso: string;
    };
```

Events are observational and orchestration-only. Scientific domain rules remain local to workstation modules.

### 8.3 Host UI events

```ts
export type OrchestrationUiEvent =
  | { type: "PROMPT_SHOWN"; promptId: string; atIso: string }
  | { type: "PROMPT_RESPONDED"; promptId: string; responseId: string; atIso: string }
  | { type: "PROMPT_SKIPPED"; promptId: string; atIso: string }
  | { type: "STORY_BEAT_SHOWN"; beatId: string; atIso: string }
  | { type: "TAKEOVER_CONFIRMED"; sequenceId: string; atIso: string }
  | { type: "TAKEOVER_DECLINED"; sequenceId: string; atIso: string };
```

### 8.4 Runtime directives

```ts
export type OrchestrationDirective =
  | { type: "SHOW_MISSION_RIBBON"; text: string }
  | { type: "SHOW_PROMPT"; prompt: ResolvedOverlayPrompt }
  | { type: "SHOW_COACH_CHIP"; prompt: ResolvedOverlayPrompt }
  | { type: "OFFER_EVIDENCE_CAPTURE"; target: EvidenceTarget }
  | { type: "SHOW_STORY_BEAT"; beat: ResolvedStoryBeat }
  | { type: "REQUEST_TAKEOVER_CONFIRMATION"; sequence: TakeoverSequence }
  | { type: "RUN_TAKEOVER"; sequence: TakeoverSequence }
  | { type: "UPDATE_PROGRESS"; progress: CompetencyProgress }
  | { type: "OPEN_SYNTHESIS"; evidenceIds: string[] };
```

---

## 9. Teacher takeover and exact return

### 9.1 Runtime state machine

```ts
export type WorkstationRuntimeState =
  | "student_control"
  | "takeover_pending_confirm"
  | "takeover_running"
  | "takeover_paused"
  | "returning_state";
```

Post-demo reflection is an overlay displayed **after controls are restored**. It should not be a control-locking runtime state.

### 9.2 Required transitions

- `student_control -> takeover_pending_confirm` when a valid trigger fires and confirmation is required.
- `student_control -> takeover_running` when confirmation is not required.
- `takeover_pending_confirm -> takeover_running` when the student confirms.
- `takeover_pending_confirm -> student_control` when the student declines or the request expires.
- `takeover_running -> takeover_paused` only when the sequence supports pausing.
- `takeover_paused -> takeover_running` when resumed.
- `takeover_running -> returning_state` on completion, cancellation, timeout, or error.
- `returning_state -> student_control` always.

### 9.3 Required guards

- Never enter takeover when `allowTakeover = false` or `teacherTakeover = false`.
- Never run a command the workstation adapter has not declared as supported.
- Capture a pre-takeover snapshot before any assist or autoplay command.
- Auto-stop at `takeoverDurationSec`.
- Allow cancellation when policy permits.
- Clear highlights and transient animation state before restoring.
- If `returnToStudentState = true`, restore the pre-takeover state exactly.
- Never allow a takeover error to strand the workstation outside `student_control`.

### 9.4 Demo evidence isolation

Teacher-driven runs must be tagged:

```ts
source: "teacher-demo"
```

They should not be mixed into the student's own batch ledger, experimental record, or mastery evidence by default. A demonstration may produce an ephemeral comparison card or a separately labeled demo record.

“Restore exactly” refers to the student's scientific control state, selections, camera/zoom, unsaved notebook text, and active specimen. Append-only audit logs may retain that a demo occurred, but demo actions must not silently satisfy student evidence requirements.

---

## 10. Evidence and diagnostic bridge

### 10.1 Evidence envelope

```ts
export interface WorkstationEvidenceEnvelope {
  evidenceId: string;
  studentId: string;
  assignmentId: string;
  lessonId: string;
  workstationId: string;
  commissionId?: string;

  evidenceType: string;
  sourceRecordId?: string;
  payload: Record<string, unknown>;
  studentNote?: string;
  screenshotRef?: string;

  metadata: {
    specimenIds?: string[];
    geneId?: string;
    traitId?: string;
    parentIds?: string[];
    runNumber?: number;
    inputSummary?: Record<string, unknown>;
    resultSummary?: Record<string, unknown>;
    source: "student" | "teacher-demo";
    capturedAtIso: string;
  };
}
```

### 10.2 Evidence-to-chart mapping

Use configurable mapping rules rather than hard-coded workstation questions.

```ts
export interface ChartEvidenceRule {
  chartFieldId: string;
  acceptedEvidenceTypes: string[];
  predicate?: RecordPredicate;
  minimumItems: number;
  allowTeacherDemoEvidence: boolean;
}
```

A chart may show that evidence is missing, but missing evidence must not disable the workstation.

### 10.3 Persist existing process data

Add an append-only, user-scoped trace store stamped with the lesson, commission, briefing, and launch IDs.

```ts
export interface WorkstationTrace {
  studentId: string;
  lessonId: string;
  briefingId?: string;
  launchId: string;
  instrumentId: string;
  probeId: ProbeId | null;
  eventType: string;
  payload: Record<string, string | number | boolean>;
  atIso: string;
}
```

Persist meaningful events already emitted by instruments, including selected examples such as:

- gene and allele selections;
- comparison swaps;
- allele installation and expression runs;
- discovery claims;
- microscope scale evidence;
- saved crosses and hatchery runs;
- DNA, enzyme, meiosis, gamete, island, and companion-show records.

Cap traces per run, sample high-frequency selection events, and retain full traces only for the current unit unless the policy is changed.

### 10.4 Diagnostic upgrades

1. **Distractor diagnosis tags:** map each wrong option to the misconception it represents.
2. **Optional confidence capture:** distinguish confident misconceptions from uncertainty or guessing.
3. **Process signatures:** derive patterns over traces and records.
4. **Class misconception map:** show what may need teaching next.
5. **Student concept card:** show secure concepts, likely misconceptions, unassessed concepts, and repeated process signatures.
6. **Item health analytics:** identify dead distractors, ambiguous items, and mis-banded difficulty after sufficient aggregate data exists.

### 10.5 Initial process signatures

| Signature | Evidence pattern | Interpretation |
|---|---|---|
| **Claim before evidence** | A claim appears before at least two relevant runs or comparisons | Concluding too early |
| **Prediction after result** | Prediction timestamp follows the result it describes | Rationalizing instead of predicting |
| **Sample not increased** | A mismatch is followed by another batch of the same small size | Sample-size misconception in practice |
| **Never zoomed** | DNA-level claim with no evidence below chromosome scale | Claiming from labels rather than model evidence |
| **Exhaustive tester** | All unique allele combinations tested before claiming | Positive systematic testing pattern |
| **Single-variable comparison** | One factor changes between comparable runs | Positive controlled-comparison pattern |

A single occurrence is not a diagnosis. Require repetition across sessions or corroboration from response evidence before surfacing a teacher-facing claim.

### 10.6 Two separate progress systems

Do not conflate these:

- **Student-facing investigation progress:** `observed -> tested -> explained`, any order and optionally hidden.
- **Teacher-facing inquiry/mastery history:** `unseen -> briefed -> practiced -> determined -> defended`.

“Unseen” must remain distinct from “incorrect” or “not mastered.”

---

## 11. Teacher settings and orchestration UI

Extend `dragon-teacher.page.ts` and `dragon-teacher.page.html` with the following sections.

### 11.1 Preset and mode controls

- preset buttons;
- mode selector;
- clear summary of what each mode changes;
- “required prompts affect lesson completion, not lab control” notice.

### 11.2 Story controls

- enable/disable story commissions;
- select story spine;
- enable mission ribbon;
- enable story beat messages;
- personalization level;
- failure branches on/off;
- adaptive case selection on/off;
- preview Arena and Mini Show variants side by side.

### 11.3 Prompt controls

- each prompt feature toggle;
- optional versus required;
- maximum prompts per session;
- minimum actions between prompts;
- skip policy;
- lesson-completion policy;
- confidence capture;
- hint depth;
- adaptive prompt engine;
- prompt preview by lesson.

### 11.4 Takeover controls

- allow takeover;
- allowed trigger moments;
- control level;
- duration;
- confirmation requirement;
- cancel permission;
- exact return-state toggle;
- demo-evidence isolation;
- preview supported controls for each workstation;
- live “Run Demo” button when a compatible student session is available.

### 11.5 Evidence and diagnostics controls

- evidence capture on/off;
- screenshot capture;
- minimum evidence requirement;
- chart-field evidence rules;
- trace persistence and retention;
- confidence capture;
- process-signature reporting;
- class misconception map visibility.

### 11.6 Persistence

Persist settings through the existing assignment save flow. Maintain the current local-device fallback where the lesson-plan system already uses local storage, while keeping repository interfaces ready for Firebase or another shared backend later.

---

## 12. Lesson 1–5 integration plan

The following integrations preserve each lesson's existing scientific goal, open-order controls, observable consequences, and student-built records.

### 12.1 Lesson 1 — Meet the Dragons

**Existing scientific goal:** Distinguish inherited physical characteristics from behaviors acquired through training by comparing two contrasting dragons.

**Story commission:**

- **Arena:** An undocumented young dragon has scars, a startle response, and several visible body features. The academy must decide which evidence belongs in its inherited-trait record and which belongs in its training history.
- **Mini Show:** A mini dragon arrives without registry papers. The show keeper wants to breed for one of its charming behaviors, but first needs evidence that the behavior is inherited rather than trained.

**Mission ribbon:**

> Compare the two dragons. Record one body difference and one behavior difference, then decide which evidence could be inherited and which could have been learned.

**Eligible overlay prompts:**

- After both specimen cards have been opened: “What is visibly different before either behavior trial begins?”
- After the same cue has been run on both dragons: “What changed because of the cue, and what was already present?”
- On evidence capture: “Choose the observation that best supports your inherited-or-learned classification.”

**Teacher takeover example:**

- Highlight the common behavior-trial control.
- With confirmation, run the same cue once for each specimen.
- Keep the demonstration record separate.
- Restore the student's selected specimen, camera angle, zoom, and notebook text.

**Evidence bridge:**

- Mystery Pair notebook observation;
- genetic-or-learned classification;
- evidence statement;
- selected specimen IDs and behavior trial IDs.

**Diagnostic opportunities:**

- claim before observing both specimens;
- trained behavior treated as inherited;
- positive signature for comparing the same cue across both specimens.

**Hard boundary:** No embedded question dock, correctness colors, prescribed sequence, or completion gate appears in the workstation.

### 12.2 Lesson 2 — Breeding Dragons

**Existing scientific goal:** Notice patterns in how parent traits appear among offspring.

**Story commission:**

- **Arena:** The academy is evaluating which parent pair could produce traits useful in a strong arena line without promising a guaranteed outcome.
- **Mini Show:** The registry is evaluating which parent pair is likely to produce a desired visible mini-dragon trait while preserving an honest statement about chance.

**Mission ribbon:**

> Choose parents, follow one visible trait, and use more than one clutch when needed to decide what pattern the evidence supports.

**Eligible overlay prompts:**

- Before the first hatch: “What do you predict you will see in this clutch?”
- After a small clutch: “Does this batch establish a pattern, or would another sample help?”
- After two different sample sizes: “Which result gives you stronger evidence, and why?”
- Before leaving: “Select one batch-ledger record that supports your claim.”

**Teacher takeover example:**

- Preserve the student's parents, selected trait, sample size, and ledger.
- Demonstrate changing only sample size while keeping the same parents and trait.
- Show demo results in a separately labeled comparison card.
- Restore the student's state and ledger view.

**Evidence bridge:**

- parent pair;
- selected phenotype;
- sample size;
- bucket counts;
- batch ledger;
- prediction timestamp and text;
- selected evidence record.

**Diagnostic opportunities:**

- prediction after result;
- probability guarantee;
- gambler's fallacy;
- sample size treated as irrelevant;
- positive signature for increasing sample size or making a single-variable comparison.

**Hard boundary:** Students may repeat with any parents, traits, or sample sizes. There is no scored click path or completion gate.

### 12.3 Lesson 3 — Where Do Genes Live?

**Existing scientific goal:** Locate a gene within a chromosome and chromosomes within a cell nucleus.

**Story commission:**

The client has identified a visible trait on the foundling but needs the student to trace where the information for that trait is physically organized, from dragon to gene locus.

**Mission ribbon:**

> Follow one trait from the whole dragon into a body cell, nucleus, chromosome, and gene locus. Keep track of what remains connected as the scale changes.

**Eligible overlay prompts:**

- After moving from dragon to cell: “What structure now contains the information you are tracing?”
- After selecting a chromosome: “How do you know this chromosome is still connected to the original dragon and trait?”
- At gene-locus scale: “Capture the view that best shows where the gene is located.”
- If the student makes a DNA-level claim without deeper evidence: offer a coach chip asking, “What scale would let you point to the gene rather than only name the chromosome?”

**Teacher takeover example:**

- Highlight the scale controls.
- Autoplay the nested path from dragon to gene locus, pausing at each scale.
- Do not choose the student's final gene for them.
- Restore the student's original scale, selected chromosome, locus, and camera view.

**Evidence bridge:**

- dragon ID;
- visited scales;
- selected chromosome and gene locus;
- captured microscope evidence;
- lesson-page written response.

**Diagnostic opportunities:**

- DNA-level claim without visiting gene-locus scale;
- chromosome and gene treated as interchangeable;
- positive signature for moving both forward and backward to verify nesting.

**Hard boundary:** Students can move among scales in any order, select different chromosomes and loci, and decide when to return.

### 12.4 Lesson 4 — Allele Experiments

**Existing scientific goal:** Determine phenotype expression by testing allele pairs rather than being told a click sequence.

**Story commission:**

The client needs evidence explaining why a visible trait can appear in one dragon but remain hidden in another. The student must test allele pairings and use the outcome chart rather than rely on the labels alone.

**Mission ribbon:**

> Test allele pairings for one gene and use the visible dragon plus the outcome chart to determine the expression pattern.

**Eligible overlay prompts:**

- After the first expression run: “What changed in the visible dragon when this pair was installed?”
- After two unique pairings: “Is there another unique pairing that could test whether your pattern still holds?”
- After all three are present: “What claim does the completed chart support?”
- Evidence prompt: “Select the chart rows that provide the strongest comparison.”

**Teacher takeover example:**

- Highlight the allele slots and expression control.
- Demonstrate installing and running one teacher-selected pairing only.
- Do not autoplay all three pairings or narrate the final dominance pattern.
- Restore the student's selected gene, installed alleles, comparison orientation, dragon view, and chart state.

**Evidence bridge:**

- selected gene;
- tested pairings;
- visible phenotype after each run;
- completed outcome-chart rows;
- discovery claim and timestamp.

**Diagnostic opportunities:**

- claim before testing enough pairings;
- `dominant-means-two`;
- heterozygous condition misread;
- positive signature for exhaustive testing of all unique pairings before claiming.

**Hard boundary:** The outcome chart is an evidence record, not a navigation gate. Students can leave before or after testing all three pairings.

### 12.5 Lesson 5 — Meiosis and Dragon Eggs

**Existing scientific goal:** Investigate how meiosis produces varied haploid cells and how one egg and one sperm restore chromosome pairs in a fertilized dragon egg.

**Story commission:**

The parentage case has narrowed to candidate dragons. The client now needs an explanation of how two parents can produce varied gametes and how one particular egg and sperm could combine to produce the foundling or a planned offspring.

**Mission ribbon:**

> Run meiosis in either parent, inspect the four resulting cells, and combine one egg with one sperm. Use the chromosome evidence to explain why the offspring is not an exact copy of either parent.

**Eligible overlay prompts:**

- At homolog pairing: “Which chromosomes are paired, and what could change if matching segments cross over?”
- After four cells appear: “How are the four cells alike, and how are they different?”
- Before gamete selection: “Which chromosome or allele evidence matters for the offspring you are trying to explain?”
- After fertilization: “What did the egg contribute? What did the sperm contribute?”

**Teacher takeover example:**

- Highlight the speed control and crossing-over stage.
- Slow the animation and pause at recombinant chromosomes.
- Optionally highlight one exchanged segment without selecting the student's gamete.
- Restore the student's selected parent, stage, speed, chromosome inspection, and gamete choices.

**Evidence bridge:**

- parent ID;
- meiosis stage records;
- crossing-over event or recombinant chromosome evidence;
- four gamete records;
- selected egg and sperm;
- fertilized egg allele pairs;
- offspring record.

**Diagnostic opportunities:**

- all gametes assumed identical;
- fertilized egg treated as haploid;
- selected offspring assumed to be guaranteed;
- positive signature for inspecting multiple gametes before selecting one.

**Hard boundary:** Meiosis stages support investigation but do not gate lesson-path navigation. Students may replay, slow, inspect, choose any gamete, or return to the lesson at any time.

---

## 13. Authoring contract for future lessons

Every lesson-to-workstation integration should define the following before implementation:

1. **Scientific goal:** What scientific relationship is the student investigating?
2. **Manipulable evidence:** Which variables, specimens, controls, or records can the student change or inspect?
3. **Observable consequence:** What changes visibly or numerically in the workstation?
4. **Student-built record:** What evidence artifact can be reused in lesson synthesis?
5. **Commission:** Who needs the evidence, what is the problem, what constraint is real, and what counts as an acceptable response?
6. **Story variants:** How do Arena and Mini Show change context without changing science?
7. **Prompt set:** Which prompts are observational, predictive, comparative, evidentiary, or reflective?
8. **Prompt triggers:** Which record predicates make each prompt relevant?
9. **Takeover capability:** Which controls can safely be highlighted, assisted, or autoplayed?
10. **Snapshot definition:** What state must be restored exactly?
11. **Evidence mapping:** Which records may populate which chart or synthesis fields?
12. **Diagnostic signals:** Which misconceptions or positive reasoning patterns can be inferred, and what corroboration is required?
13. **Disabled behavior:** How is it verified that the workstation remains unchanged when orchestration is off?

---

## 14. Implementation map

### 14.1 Data model and normalization

Modify:

- `src/app/features/dragon-genetics/adaptive/dragon-simulation.models.ts`
- `src/app/features/dragon-genetics/adaptive/dragon-adaptive.repository.ts`

Add:

- `lessonOrchestrationSettings` to the assignment model;
- safe defaults and normalization for every nested settings object;
- migration handling for existing assignments with no orchestration field.

### 14.2 New orchestration folder

Recommended files:

```text
src/app/features/dragon-genetics/orchestration/
  dragon-lesson-orchestration.models.ts
  dragon-lesson-orchestration.service.ts
  dragon-workstation-orchestration-adapter.ts
  dragon-orchestration-directives.ts
  dragon-evidence-bridge.service.ts
  dragon-workstation-trace.repository.ts
  dragon-process-signature.service.ts
```

### 14.3 Story folder

```text
src/app/features/dragon-genetics/story/
  dragon-commission.models.ts
  dragon-commission.registry.ts
  dragon-story-resolver.service.ts
  dragon-story-slot.service.ts
```

### 14.4 Prompt authoring

```text
src/app/features/dragon-genetics/orchestration/prompts/
  dragon-overlay-prompt.models.ts
  dragon-overlay-prompt.registry.ts
  dragon-overlay-prompt-resolver.service.ts
```

### 14.5 Teacher UI

Modify:

- `dragon-teacher.page.ts`
- `dragon-teacher.page.html`
- associated styles and tests.

Add mode, story, prompt, takeover, evidence, diagnostic, and preset controls. Persist through the existing assignment save flow.

### 14.6 Lesson/workstation hosts

In journey and adaptive workstation host pages:

- resolve `WorkstationLaunchContext`;
- instantiate the orchestration service;
- register the workstation adapter;
- forward typed workstation events;
- render the overlay plane outside workstation internals;
- forward evidence bridge actions;
- cleanly destroy session subscriptions on exit.

### 14.7 Workstation changes

Keep changes minimal:

- add typed outputs only where meaningful scientific actions or results are not currently emitted;
- expose an optional orchestration adapter or host-accessible control surface;
- do not add story selection, prompt logic, completion logic, or teacher policy inside the workstation.

---

## 15. Rollout phases

### Phase 1 — Safe model foundation

- settings interfaces;
- repository defaults and normalization;
- feature flags defaulted to safe behavior;
- existing assignments load unchanged;
- orchestration service returns no directives when disabled.

### Phase 2 — Event, evidence, and trace foundation

- typed host event bridge;
- evidence envelope and chart mapper;
- persistence for currently discarded evidence;
- capped and sampled workstation trace storage;
- no visible student UI required yet.

### Phase 3 — Host overlay shell and teacher settings

- mission ribbon;
- prompt overlay component;
- coach chip;
- evidence capture card;
- teacher toggles and presets;
- persistence and reload tests.

### Phase 4 — Commission and story beats

- commission model;
- story slots and neutral fallbacks;
- record-triggered beats;
- recoverable failure branches;
- Arena and Mini Show variants for Lessons 1–5;
- recommended Foundling spine.

### Phase 5 — Takeover adapters and state machine

- capability declarations per workstation;
- snapshot/restore contract;
- banner, confirmation, cancellation, timeout, and error recovery;
- demo evidence isolation;
- first demonstrations for Lessons 1–5.

### Phase 6 — Diagnostics and adaptive support

- distractor diagnosis tags;
- optional confidence capture;
- process signatures;
- adaptive prompt selection;
- equivalent adaptive case selection;
- teacher-facing misconception map.

### Phase 7 — Reporting, tuning, and item health

- mastery ledger and student cards;
- aggregate item health analytics after sufficient data exists;
- prompt frequency tuning;
- accessibility review;
- story and case-equivalence review by teachers.

Each phase must be independently shippable and must preserve the ability to run workstations with orchestration fully off.

---

## 16. Acceptance criteria

1. A student can complete every workstation investigation with orchestration fully disabled.
2. No dedicated workstation layout contains a permanent question dock.
3. Workstation actions remain available in any order in every mode.
4. Required prompts may affect lesson completion but never disable workstation controls or prevent exit.
5. Teacher can independently toggle every orchestration feature.
6. Story text, constraints, and briefing settings are generated from one commission record.
7. Story prompts never state the conclusion the student is expected to discover.
8. Arena and Mini Show variants use equivalent scientific questions, evidence requirements, and difficulty.
9. Story beats fire from records or evidence predicates, not arbitrary click counts.
10. Takeover starts only when policy and capability checks pass.
11. Takeover is visible, cancellable when allowed, and automatically ends on timeout, completion, cancellation, or error.
12. The exact pre-takeover student state is restored when configured.
13. Teacher demonstration records are visibly tagged and do not count as student evidence by default.
14. Evidence captured in a workstation can populate dragon charts and post-investigation synthesis.
15. Existing workstation scientific behavior and persistence remain unchanged when orchestration is disabled.
16. Process signatures are never converted into grades or student-facing behavior scores.
17. An unassessed concept is reported as unseen, not incorrect.
18. Adaptive case selection changes context only, not science coverage or opportunity.

---

## 17. Verification checklist

### 17.1 Model and repository tests

- Existing assignments without orchestration settings normalize successfully.
- Defaults are behavior-safe.
- Every nested teacher setting saves and reloads.
- Presets modify only their documented settings.

### 17.2 Overlay tests

- Mission ribbon, prompts, coach chip, evidence card, story beats, and synthesis appear only when enabled.
- Prompt cooldown and maximum-per-session rules work.
- Optional prompts can be skipped.
- Required prompts do not disable controls.
- No two modal overlays compete for focus.

### 17.3 Takeover tests

- Confirmation path, decline path, cancel path, timeout path, completion path, and error path all return to student control.
- Unsupported commands are rejected before takeover begins.
- Snapshot and restoration include all workstation-specific state.
- Student notebook text and selections survive takeover.
- Demo records remain separate from student evidence.

### 17.4 Story tests

- Commission text and actual constraints use the same values.
- Missing personalization slots fall back cleanly.
- A story beat triggers once when its predicate is satisfied.
- Failure branches remain recoverable.
- Random scientific results are never rewritten to fit the story.
- Arena and Mini Show cases pass an equivalence review.

### 17.5 Evidence and diagnostic tests

- Workstation evidence reaches lesson synthesis with metadata.
- Screenshot capture respects settings.
- Trace caps and event sampling work.
- Distractor diagnosis and confidence persist correctly.
- Process signatures require the specified record patterns.
- A single signature is not surfaced as a stable diagnosis.
- Teacher-demo activity is excluded from student diagnostic patterns unless explicitly configured.

### 17.6 Lesson-specific integration tests

For each of Lessons 1–5, test:

1. direct open-lab launch;
2. lesson launch with orchestration off;
3. open-investigation preset;
4. guided-investigation preset;
5. teacher-demo preset;
6. Arena story variant;
7. Mini Show story variant;
8. return to lesson with evidence attached;
9. local persistence without Firebase where currently required.

### 17.7 Accessibility tests

- All overlays are keyboard accessible.
- Focus returns to the prior workstation control after an overlay closes.
- Takeover banners announce start, remaining control status, and return.
- Prompts do not cover critical controls on small screens.
- Motion can be reduced or paused.
- Story and prompt text supports readable chunking and screen readers.

After targeted tests pass, run the repository validation commands listed in `README.md` before merging.

---

## 18. Anti-patterns to reject during review

Reject an implementation if it does any of the following:

- adds a permanent question sidebar to a workstation;
- places story selection or adaptive logic inside a workstation component;
- unlocks tools only after reading a story passage;
- forces a prescribed control sequence;
- treats a random model result as wrong because it conflicts with narration;
- displays correctness colors during open exploration;
- uses click volume or time-on-task as an engagement score;
- treats one process signature as a definitive diagnosis;
- mixes teacher autoplay results into the student's own evidence without labeling;
- allows a takeover to persist after timeout, cancellation, navigation, or error;
- requires students to abandon the workstation for a separate investigation page;
- changes the scientific behavior of a workstation when all orchestration features are off.

---

## 19. Definition of done for the upgrade

The upgrade is complete when a teacher can choose a story-guided or open investigation experience, launch Lessons 1–5 into the same full workstations, use low-frequency question overlays and evidence capture without scripting student actions, trigger a safe demonstration that restores student control, and receive meaningful scientific evidence and diagnostic support afterward.

The student experience should feel like one continuous case:

```text
commission -> open investigation -> evidence -> story response -> synthesis
```

The technical implementation should remain layered:

```text
workstation science -> typed events and adapter -> host orchestration -> evidence and story
```

The story gives the investigation purpose. The questions help students notice and explain. The workstation remains where the science happens.
