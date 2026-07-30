# 02 - Genome Microscope

**Curriculum:** Module 2, Genome Decoder and Station A, DNA Structure · **Skill:** GEN-2 ·
**Contract:** `genome-microscope`

## Implementation status

The first production implementation is complete and mounted in Module 2. It follows the shared
scene/bridge/event boundary and does not import lesson, store, router, or Firebase code into the
renderer.

| Layer | Implementation |
| --- | --- |
| Shared renderer | `src/app/shared/dragon-visuals/displays/genome-microscope/` |
| Semantic contract | `src/app/shared/dragon-visuals/domain/dragon-visual.models.ts` |
| Contract validation | `src/app/shared/dragon-visuals/domain/visual-contract.validation.ts` |
| Teaching animation | `GENOME_ZOOM_SEQUENCE` in `core-teaching-sequences.ts` |
| Feature adapter | `createGenomeMicroscopeScene` in `dragon-visual-scene.adapter.ts` |
| Lesson orchestration | `src/app/features/dragon-genetics/stations/genome-microscope-station.component.*` |
| Curriculum tasks and copy | `simulation/data/genome-microscope-content.ts` |
| Saved evidence model | `simulation/domain/genome-microscope.models.ts` |

## Teaching purpose

Students build the nested information model: cell nucleus → chromosome → DNA → gene location →
allele pair. The important idea is scale and containment, not a literal anatomical zoom.

## Scene inputs

- selected egg or dragon analysis sample;
- `focusLevel`: `cell`, `chromosome`, `dna`, `gene`, or `allele`;
- optional `focusGeneId`; and
- the selected gene's chromosome model and allele pair;
- lesson-owned prediction, label placements, reveal state, and pinned evidence level; and
- deterministic task and scene seeds.

## Display model

Use a continuous left-to-right microscope track with five magnification bays. Begin with a generic
sample tube or egg record, then show a stylized nucleus, chromosome pair, DNA ladder with A-T and C-G
base-pair examples, a highlighted gene locus, and two allele sockets. The sample's actual allele
symbols appear only at the final level.

## Student sequence

1. Predict which level contains the requested information.
2. Move the microscope focus through the hierarchy.
3. Place labels on the five levels.
4. Reveal the selected gene locus and allele pair.
5. Trace the containment path and pin the level that supports the answer.

Learn mode plays a narrated zoom. Practice scrambles labels and focus requests. Official mode starts
at a random level with no hints. Reteach lets the student reconstruct the hierarchy from large scale
to small scale.

The implemented station provides selectable genome extracts, fixed-seed task order, click or drag
label placement, lesson-owned correction, a reveal-only allele readout, an evidence dock, compact
notebook records, and the existing four-question GEN-2 check. A verified five-level map mirrors the
full organism-to-allele pathway into Module 2 progress; the quick check is still required before the
module unlocks.

## Semantic targets and events

Targets: `sample-record`, `cell-level`, `chromosome-level`, `dna-level`, `gene-locus`,
`allele-slot-a`, `allele-slot-b`, `zoom-path`, `level-label-dropzone`.

Emit `hotspot-selected`, `label-placed`, `prediction-locked`, `reveal-requested`, and checkpoint
events. The implemented renderer also emits `evidence-pinned`. Saved records contain the scene seed,
sample, focus gene, pre-reveal prediction, hierarchy attempts, requested level, selected evidence,
misconception flag, and active elapsed time. They never contain screenshots or animation frames.

## Acceptance checks

- All five levels remain visible enough to preserve the hierarchy during focus changes.
- DNA base pairing is accurate but does not imply that a single base pair is an allele.
- The selected sample drives the gene and allele readout.
- Reduced motion replaces zoom travel with focus and breadcrumb changes.

## Verified quality gates

- Pure view-model tests verify hidden alleles, hierarchy order, and lesson-owned grading state.
- Feature interaction tests complete prediction → map → reveal → evidence → save in Learn,
  Practice, Official, and Reteach modes.
- Adapter and contract tests verify selected-sample gene data and visual-scene compatibility.
- Angular lint, production build, and the complete headless test suite must pass before release.
