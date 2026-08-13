# Dragon Hatchery workstation

This directory owns the complete shared clutch workstation. It draws the `dragon-hatchery` scene
held by `DragonVisualBridge` and reports student actions as `DragonVisualStageEvent`s. Several
modules may host it with different tools enabled, but its feature-specific implementation stays
together here.

| File                                               | Role                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `dragon-hatchery-station.component.ts/.html/.scss` | Lesson-facing host, local state transitions, and emitted records             |
| `dragon-hatchery-display.component.ts/.html/.scss` | Parent canvases, egg tray, examination bench, hatch tray, and evidence marks |
| `hatchery-egg-glyph.component.ts`                  | One egg shell rendered in its current instrument state                       |
| `dragon-hatchery.view-model.ts`                    | Pure scene-to-view mapping and screen-reader summary                         |
| `dragon-hatchery.theme.ts`                         | Palette, shell geometry, and interaction timing                              |
| `dragon-hatchery-scene.adapter.ts`                 | Focused genetics-state to visual-scene conversion                            |
| `dragon-hatchery-content.ts`                       | Reviewed investigation content                                               |
| `dragon-hatchery.models.ts`                        | Workstation inputs and persisted record types                                |

## Student operations

| Tool       | Reveals                                | Semantic event                       |
| ---------- | -------------------------------------- | ------------------------------------ |
| Examine    | Observable traits                      | `reveal-requested`, value `examine`  |
| Sample DNA | The allele pair at the focus gene      | `reveal-requested`, value `sample`   |
| Hatch      | The dragon represented by a staged egg | `egg-marked`, then `hatch-committed` |

Selecting an egg emits `specimen-selected`; pinning evidence emits `evidence-pinned`. The host may
limit samples or hatches with its configured budgets.

## Concealment rules

The view model keeps phenotype and genotype evidence separate:

- an unexamined egg carries no trait wording;
- an unsampled egg carries no allele pair;
- hatching reveals the dragon's phenotype, not an unperformed genotype test; and
- state supplied by the host determines whether an egg is examined, sampled, hatched, or locked.

These rules prevent answer-bearing text from leaking into the DOM before the investigation earns
it. The renderer does not grade an answer or advance the lesson.

## Shared dependencies

The Hatchery uses the generic assembly renderer for its parent and offspring dragon canvases. It
uses `src/app/shared/dragon-visuals/displays/shared/chromosome-pair.component.ts` and the neighboring
`chromosome-diagram.ts` for the chromosome readout. Semantic visual contracts, bridge state,
reduced-motion handling, and teaching-sequence playback remain in `src/app/shared/dragon-visuals`.

Only code that is genuinely reused across workstations belongs in those shared packages.
