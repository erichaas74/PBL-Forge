# PBL Forge code organization

The workspace contains two Angular applications. Student-facing PBL Forge code lives under
`src/app`; private dragon authoring tools live under `designer/src/app`.

## Application features

- `src/app/features/dragon-genetics`: the three-week student experience, teacher dashboard, persistence, assessments, and arena integration.
- `src/app/features/dragon-genetics/lesson-plan`: the authoritative student path and lesson flow. Public lessons use `/dragon-genetics/path/:pathId/lesson/:lessonId`; workstation routes remain explicit and receive `path` and `lesson` query parameters when launched from a lesson.
- `src/app/features/dragon-genetics/workstations`: every active Dragon Genetics student workstation, grouped by lab with cross-lab chromosome and notebook code in `workstations/shared`.
- `src/app/features/dragon-genetics/simulation`: Dragon Genetics inheritance, phenotype generation, simplified genome models, and source content extracted from the migration prototype.
- Other folders under `src/app/features`: catalog, generic activity player, project view, and teacher studio.

The older `journey` and adaptive simulation experience code is not a public routing layer. Do not add
new lesson navigation to `/dragon-genetics/journey/**` or to a dynamic
`/dragon-genetics/:simulationId` fallback. Add each workstation as an explicit route so it remains
available for direct open-lab use and can be linked from the shared lesson plan later.

## Shared runtime

- `src/app/shared/assembly`: game-neutral assembly contracts, cloning, physics, rendering, viewport primitives, and the safe JSON storage boundary shared with Designer.
- `src/app/shared/assembly-arena`: reusable battle physics, renderer, strategy runner, and controls.
- `src/app/shared/creation-library`: built-in and browser-local assembly, move, and scenario assets.
- `src/app/shared/dragon-visuals`: versioned semantic scene contracts, Angular signal bridge, replaceable visual-pack definitions, and declarative station/cutscene timelines. It must not import lesson, assessment, persistence, or routing code.

Shared runtime code must not import from historical prototypes or private Designer source.

## Dragon Designer

- `designer/src/app/parts-lab`: isolated mesh and visual-proportion authoring.
- `designer/src/app/assembly-garage`: part, joint, physics, JSON, and model-pack authoring.
- `designer/src/app/dragon-garage.page.ts`: dragon-only Garage host.
- `model-packs/dragon-model-pack.v1.json`: committed, validated output consumed by PBL Forge.

Dragon Designer uses the shared assembly runtime and may publish validated model/arena artifacts to
the dedicated `publishedDragonAssets` Firestore collection. It has no lesson, assessment, or student
progress dependencies. PBL Forge must never import from `designer/**`; the
`check:designer-boundary` command enforces that rule. See
[`DRAGON_DESIGNER_ASSET_PIPELINE_PLAN.md`](DRAGON_DESIGNER_ASSET_PIPELINE_PLAN.md).

## Non-runtime folders

- `public`: static files copied directly to the browser build.
- `scripts`: local Firebase, seeding, verification, and security-rule tooling.
- `designer`: the independently built, local-only Dragon Designer Angular application.
- `model-packs`: reviewed build-time artifacts published by designer tools.
- `docs`: implementation and deployment guidance.

Before adding or rebuilding a Dragon Genetics workstation, follow
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md). Those product rules
override older scripted station patterns in historical planning documents.
