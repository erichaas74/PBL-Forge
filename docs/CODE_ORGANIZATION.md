# PBL Forge code organization

All TypeScript, Angular templates, and component styles used by the deployed application live under `src/app`.

## Application features

- `src/app/features/dragon-genetics`: the three-week student experience, teacher dashboard, persistence, assessments, and arena integration.
- `src/app/features/dragon-genetics/simulation`: Dragon Genetics inheritance, phenotype generation, simplified genome models, and source content extracted from the migration prototype.
- Other folders under `src/app/features`: catalog, generic activity player, project view, and teacher studio.

## Shared runtime

- `src/app/shared/assembly`: game-neutral assembly contracts, cloning, physics, rendering, and viewport primitives.
- `src/app/shared/assembly-garage`: reusable assembly editor and built-in presets. Dragon Genetics consumes the classic dragon preset.
- `src/app/shared/assembly-arena`: reusable battle physics, renderer, strategy runner, controls, and arena UI.
- `src/app/shared/creation-library`: built-in and browser-local assembly, move, and scenario assets.
- `src/app/shared/dragon-visuals`: versioned semantic scene contracts, Angular signal bridge, replaceable visual-pack definitions, and declarative station/cutscene timelines. It must not import lesson, assessment, persistence, or routing code.

Shared runtime code must not import from `migration-archive` or the standalone `dragon-genetics-lab` project.

## Non-runtime folders

- `migration-archive`: historical prototypes and intentionally unintegrated adapters. Nothing under `src/app` may import from it.
- `dragon-genetics-lab`: the earlier standalone Angular lab retained as a reference; it is not part of the PBL Forge build.
- `public`: static files copied directly to the browser build.
- `scripts`: local Firebase, seeding, verification, and security-rule tooling.
- `docs`: implementation and deployment guidance.

Before moving or deleting an archive, run `rg` to confirm there are no imports from `src`, then run `npm run verify`.
