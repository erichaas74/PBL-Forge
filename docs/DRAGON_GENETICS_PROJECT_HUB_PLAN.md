# Dragon Genetics project hub plan

**Status:** foundation plan for the shared student and teacher project views.

This plan complements the authoritative
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md). It does not change
how a dedicated workstation behaves. The project hub may show status and route into a workstation,
but it must not add a question dock, prescribed steps, or answer-revealing directions to one.

## Product constraint: keep the hub quiet

The landing pages must help a student or teacher choose an action without presenting a wall of
cards, buttons, metrics, or directions.

- Show one primary action at a time.
- Keep the first viewport to the mission, progress, current objective, and a compact stage overview.
- Put secondary material in clearly labelled disclosure sections or menus.
- Prefer one consolidated section with short rows over a separate card for every metric.
- Keep descriptions to one short sentence. Workstation procedures stay inside optional workstation
  help, not on the hub.
- Do not hide the primary action, urgent revision state, or accessibility fallback in an accordion.
- Default secondary sections to closed. Preserve their open state only as a device preference.
- On small screens, use the ordered course map instead of shrinking or panning the visual map.

Suggested student disclosure sections:

```text
Course map
Mastery
Notebook and evidence
Team
Resources and help
```

Suggested teacher disclosure sections:

```text
Needs attention
Class progress
Mastery
Teams
Review queue
Assignment settings
```

The teacher's daily operations summary stays open. Assignment settings should not dominate the
page and should be collapsed by default.

## Current inventory

The current landing experience exposes eight adaptive records and five additional open
workstations. The built-in catalog record says there are ten activities. These counts must be
reconciled before the new hub calculates project progress.

| Current ID | Current surface | Route | Current progress source | Planning note |
| --- | --- | --- | --- | --- |
| `trait-evidence` | Trait Evidence Analyzer | `dragon-genetics/trait-evidence` | Adaptive run | Candidate foundations activity |
| `genome-microscope` | Genome Microscope | `dragon-genetics/genome-microscope` | Adaptive run | Candidate foundations activity |
| `allele-workbench` | Allele Workbench | `dragon-genetics/allele-workbench` | Adaptive run and Genetics Notebook | Keep notebook discoveries as evidence |
| `punnett-composer` | Punnett Composer | `dragon-genetics/punnett-composer` | Adaptive run and local workstation record | Requires one normalized completion rule |
| `incubator-sampler` | Incubator Sampler | `dragon-genetics/incubator-sampler` | Adaptive run and local workstation record | Requires one normalized completion rule |
| `dna-process-lab` | DNA Process Lab | `dragon-genetics/dna-process-lab` | Adaptive run | Candidate molecular genetics activity |
| `diversity-manager` | Diversity Manager | `dragon-genetics/diversity-manager` | Adaptive run | Overlaps the open Island Diversity Manager |
| `dragon-hatchery` | Dragon Hatchery | `dragon-genetics/dragon-hatchery` | Adaptive run and local workstation record | Requires one normalized completion rule |
| `dragon-arena` | Dragon Arena | `dragon-genetics/dragon-arena` | Adaptive run | Product decision: final challenge or optional extension |
| `pedigree-lab` | Pedigree Lab | `dragon-genetics/pedigree-lab` | Local workstation record | Not represented in adaptive progress |
| `protein-rescue` | Protein Synthesis and Diet Rescue | `dragon-genetics/protein-rescue` | Local workstation record | Not represented in adaptive progress |
| `blood-type-lab` | Blood Type Compatibility Lab | `dragon-genetics/blood-type-lab` | Local workstation record | Not represented in adaptive progress |
| `island-diversity` | Island Diversity Manager | `dragon-genetics/island-diversity` | Local workstation record | Preferred open-investigation replacement for the overlapping adaptive surface |
| `companion-show` | Mini Dragon Show | `dragon-genetics/companion-show` | Local workstation record | Candidate optional extension |

The project has three confirmed capstone paths:

- **Dragon Arena:** breed a fighting dragon and test it in the arena.
- **Mini Dragon Show:** breed and support a claim for the best-adapted show dragon.
- **Island Diversity:** restore island dragon populations and measure success through population
  survival rates.

The Dragon Arena path is the first implementation priority. The three paths share the foundation
curriculum, but only the selected path contributes its capstone activities to required progress.

## Decisions required before visual replacement

1. Keep the open Island Diversity Manager as the capstone surface and decide whether the older
   adaptive `diversity-manager` remains available as practice.
2. Mark every shared-foundation activity as required, optional, or teacher-selectable.
3. Define completion from authentic evidence for every open workstation.
4. Decide which dependencies are instructional requirements and which are only suggested order.
5. Map each activity to mastery skills without using completion as a mastery score.
6. Decide which team evidence is shared and which mastery evidence always remains individual.

## Progress rules

- Overall completion is `completed required activities / all required activities`.
- Optional extensions never lower the percentage.
- Activities that have not yet been released still remain in the required denominator so releasing
  content does not make progress move backwards.
- Submitted work is not complete unless the activity contract explicitly treats submission as
  completion.
- Work returned for revision receives priority over other next actions.
- Mastery is displayed separately and never averaged into the completion percentage.

## Next-action rules

Choose no more than one primary student action, in this order:

1. Required work that needs revision.
2. Required work already in progress.
3. The first available required activity in project order.
4. An available optional extension after all required work is complete.

Submitted work awaiting review is not presented as an action. A concise waiting state may replace
the action when it blocks the next required activity.

## Implementation sequence

1. Add reusable project definition, assignment, student-state, and view-model contracts.
2. Add pure selectors for availability, progress, locks, and the single next action.
3. Build a Dragon adapter that reads the existing adaptive store, notebook, and workstation
   repositories without changing workstation interaction models.
4. Introduce one versioned repository boundary for future persistence migration.
5. Replace the student landing page with the sparse project summary and collapsed secondary
   sections.
6. Reorder the teacher page around daily operations and move configuration into a collapsed
   section.
7. Add structured learning events and AI support only after the shared state is reliable.
