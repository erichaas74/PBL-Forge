# PBL Forge code organization

The workspace contains two Angular applications. Student-facing PBL Forge code lives under
`src/app`; private dragon authoring tools live under `designer/src/app`.

## Application features

- `src/app/features/dragon-genetics`: the three-week student experience, teacher dashboard, persistence, assessments, and arena integration.
- `src/app/features/dragon-genetics/workstations`: every active Dragon Genetics student workstation, grouped by lab with cross-lab chromosome and notebook code in `workstations/shared`.
- `src/app/features/dragon-genetics/simulation`: Dragon Genetics inheritance, phenotype generation, simplified genome models, and source content extracted from the migration prototype.
- Other folders under `src/app/features`: catalog, generic activity player, project view, and teacher studio.

## Shared runtime

- `src/app/shared/assembly`: game-neutral assembly contracts, cloning, physics, rendering, and viewport primitives.
- `src/app/shared/assembly-arena`: reusable battle physics, renderer, strategy runner, controls, and arena UI.
- `src/app/shared/creation-library`: built-in and browser-local assembly, move, and scenario assets.
- `src/app/shared/dragon-visuals`: versioned semantic scene contracts, Angular signal bridge, replaceable visual-pack definitions, and declarative station/cutscene timelines. It must not import lesson, assessment, persistence, or routing code.

Shared runtime code must not import from `migration-archive` or the standalone `dragon-genetics-lab` project.

## Dragon Designer

- `designer/src/app/parts-lab`: isolated mesh and visual-proportion authoring.
- `designer/src/app/assembly-garage`: part, joint, physics, JSON, and model-pack authoring.
- `designer/src/app/dragon-garage.page.ts`: dragon-only Garage host.
- `model-packs/dragon-model-pack.v1.json`: committed, validated output consumed by PBL Forge.

Dragon Designer uses the shared assembly runtime but has no Firebase, lesson, assessment, student
progress, or creation-library dependencies. PBL Forge must never import from `designer/**`; the
`check:designer-boundary` command enforces that rule. See
[`DRAGON_DESIGNER_ASSET_PIPELINE_PLAN.md`](DRAGON_DESIGNER_ASSET_PIPELINE_PLAN.md).

## Non-runtime folders

- `migration-archive`: historical prototypes and intentionally unintegrated adapters. Nothing under `src/app` may import from it.
- `dragon-genetics-lab`: the earlier standalone Angular lab retained as a reference; it is not part of the PBL Forge build.
- `public`: static files copied directly to the browser build.
- `scripts`: local Firebase, seeding, verification, and security-rule tooling.
- `designer`: the independently built, local-only Dragon Designer Angular application.
- `model-packs`: reviewed build-time artifacts published by designer tools.
- `docs`: implementation and deployment guidance.

Before moving or deleting an archive, run `rg` to confirm there are no imports from `src`, then run `npm run verify`.

Before adding or rebuilding a Dragon Genetics workstation, follow
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md). Those product rules
override older scripted station patterns in historical planning documents.
