# 01 - Trait Evidence Analyzer

**Curriculum:** Module 1, Trait Detective · **Skill:** GEN-1 · **Contract:** `trait-inspector` ·
**Status:** built and wired into Module 1

## Teaching purpose

Students distinguish inherited characteristics from learned behaviors and environmental effects.
The display must teach students to classify from evidence, not from whether a trait seems useful or
looks like a body feature.

Both errors are modeled directly. Every observation offers three clues: the record that shows where
the characteristic came from, a clue that argues from usefulness, and a clue that argues from body
location. Pinning a wrong clue names the misconception instead of only marking the answer.

## Display model

A laboratory evidence console with a generic sample record, three source instruments, an
observation bay, and three category trays. No dragon anatomy appears anywhere in the instrument.

```text
+---------------------------------------------------------------+
| sample-record            | mode · phase rail · progress        |
+---------------+-----------------------------------------------+
| gene-record   |  observation queue                            |
| training-log  |  observation-card + prediction-control        |
| environment-  |  teaching caption + lesson feedback           |
|   log         |                                               |
+---------------+-----------------------------------------------+
| inherited-tray      | learned-tray      | environmental-tray  |
+---------------------------------------------------------------+
```

After a placement is revealed, a glowing path is drawn from the recording instrument, through the
observation card, into the tray the student used. The path is measured from real layout, so it
stays correct at any width and after any theme change.

## Student sequence

1. **Observe** — open a record and read it. The queue locks every card the lesson has not opened.
2. **Predict** — lock inherited, learned, or environmental. Nothing reveals before this.
3. **Manipulate** — drag the record into a tray, or select the card and activate a tray button.
   The tray used is the graded answer; a changed mind is reported in the feedback.
4. **Reveal** — the evidence path animates and the verdict names the rule.
5. **Explain** — pin the clue that shows where the characteristic came from.
6. **Save** — one compact record goes to the notebook, the store, and the trait-sort answers.

## Modes

| Mode | Behaviour |
| --- | --- |
| Learn | Opens on a solved worked example, keeps source hints on, gives feedback at every step |
| Practice | Deterministically varied order from the scene seed, source hints off |
| Official | No hints, no verdicts, no evidence paths until **Submit responses** reveals the whole set |
| Reteach | Loads a bundle of unseen examples chosen by the diagnosed misconception |

Reteach also triggers itself: two hits on the same misconception append two fresh records to the
queue with a banner, so the correction is tested on a new example rather than on a replay.

## Semantic targets and events

Targets: `sample-record`, `observation-card`, `prediction-control`, `evidence-source`,
`evidence-mark`, `inherited-tray`, `learned-tray`, `environmental-tray`.

Emitted stage events: `hotspot-selected` (card or source inspected), `prediction-locked`
(value = category), `label-placed` (value = tray), `evidence-pinned` (target = clue),
`reveal-requested` (evidence path replayed), and `sequence-checkpoint-completed` when the
`classification-prediction` checkpoint in `evidence-path-v1` releases.

Saved evidence per observation: scene ID, seed, sample ID, mode, pre-reveal prediction, tray used,
actual category, correctness, pinned clue, clue correctness, attempts, misconception flag, elapsed
active time, and timestamp. No animation frames, pointer tracks, or markup are stored.

## Implementation

| Concern | File |
| --- | --- |
| Renderer | [`displays/trait-inspector/trait-inspector-display.component.ts`](../../src/app/shared/dragon-visuals/displays/trait-inspector/trait-inspector-display.component.ts) |
| Scene → view model | [`trait-inspector.view-model.ts`](../../src/app/shared/dragon-visuals/displays/trait-inspector/trait-inspector.view-model.ts) |
| Graphics theme | [`trait-inspector.theme.ts`](../../src/app/shared/dragon-visuals/displays/trait-inspector/trait-inspector.theme.ts) |
| Reveal timeline | [`data/core-teaching-sequences.ts`](../../src/app/shared/dragon-visuals/data/core-teaching-sequences.ts) (`EVIDENCE_PATH_SEQUENCE`) |
| Lesson controller | [`stations/trait-evidence-station.component.ts`](../../src/app/features/dragon-genetics/stations/trait-evidence-station.component.ts) |
| Curriculum content | [`simulation/data/trait-evidence-content.ts`](../../src/app/features/dragon-genetics/simulation/data/trait-evidence-content.ts) |
| Scene adapter | [`visual-adapter/dragon-visual-scene.adapter.ts`](../../src/app/features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter.ts) |
| Saved evidence | `DragonGeneticsStore.recordTraitEvidence` |

The renderer imports no lesson code. The station component owns correctness, misconception
diagnosis, reteach selection, and evidence; it publishes scenes through `DragonVisualBridge` and
reacts to stage events.

## Changing the content

Everything a student reads is in `trait-evidence-content.ts`. To add an observation, append one
`observation({ … })` entry with its label, detail, true category, recording instrument, the rule the
reveal should name, the supporting clue, two misconception distractors, and the sets it belongs to.
`TRAIT_EVIDENCE_COPY` is generated from that list, so no other file changes.

Adding `sortCardId` links an observation to a Module 1 trait-sort card, which keeps the existing
completion gate and GEN-1 mastery scoring working.

## Changing the graphics

`trait-inspector.theme.ts` is the only file that needs editing to restyle the station: palette,
source and tray glyph paths, tray textures, and motion durations. It can also be replaced per host
through the component's `theme` input. Layout responds to the console width through container
queries, so a new theme does not need layout work. See the
[station README](../../src/app/shared/dragon-visuals/displays/trait-inspector/README.md) for the
full checklist and the rules a replacement theme must keep.

## Accessibility and motion

- Select-then-place works entirely from the keyboard; every target is a real button.
- Category identity is carried by glyph and texture as well as colour.
- A polite live region reports the open observation, the tray used, the revealed path, and progress.
- Reduced motion resolves the reveal to its final state with no path animation or scan sweep.

## Acceptance checks

- [x] Every Module 1 trait-sort card has a visual observation record with an evidence trail.
- [x] Category correctness is lesson-owned; the renderer only draws the status it is given, and the
      view model hides the true category until the lesson reveals the placement.
- [x] Keyboard users can select a card and then a destination tray.
- [x] Reteach provides new examples rather than replaying the missed one.
- [x] Learn, Practice, Official, and Reteach scenes all run from fixed seeds without Firebase.
- [x] Unit tests cover the view-model mapping, the renderer interactions, and one path per mode
      (`trait-inspector.view-model.spec.ts`, `trait-inspector-display.component.spec.ts`,
      `trait-evidence-station.component.spec.ts`).
