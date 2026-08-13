# 01 - Trait Evidence Analyzer

**Curriculum:** Module 1, Trait Detective · **Skill:** GEN-1 · **Contract:** `trait-inspector`

**Runtime status:** active through the registry-driven simulation surface

## Teaching purpose

Students distinguish inherited characteristics from learned behaviors and environmental effects.
The investigation should make evidence of origin more important than a characteristic's appearance
or usefulness.

## Investigation model

Students inspect a sample record and decide whether each observation is inherited, learned, or
environmental. They must predict, manipulate the evidence model, reveal a result, and support a
claim. Official correctness and saved evidence remain lesson-owned.

## Current implementation

| Concern                                      | Source                                                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulation definition and reviewed questions | [`adaptive/dragon-simulation.registry.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation.registry.ts)                                                             |
| Routed lesson shell and persistence wiring   | [`adaptive/dragon-simulation-experience.page.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts)                                               |
| Active generic workstation renderer          | [`workstations/simulation-visual/dragon-simulation-visual.component.ts`](../../src/app/features/dragon-genetics/workstations/simulation-visual/dragon-simulation-visual.component.ts) |
| Assignment and run state                     | [`adaptive/dragon-adaptive.store.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-adaptive.store.ts)                                                                       |

The former discovery gallery, specialized trait-inspector renderer, station controller, and
duplicate content/store stack were removed because no active route imported them. This guide keeps
the scientific intent while describing only the current runtime.

## Extension boundary

Change reviewed tasks, claims, and answer choices in the simulation registry. Change the shared
registry-driven presentation in `workstations/simulation-visual/`. If this simulation later needs a
dedicated instrument, create it in `workstations/trait-evidence/`; do not put feature-specific UI in
`src/app/shared/dragon-visuals`.

## Acceptance targets

- Category correctness is owned by the lesson, not presentation code.
- Keyboard operation provides a select-then-place alternative to dragging.
- Color is paired with labels, symbols, or patterns.
- Official runs do not expose answers before the required prediction.
- Fixed seeds reproduce the same reviewed task without a database connection.
