# Dragon Designer asset pipeline

Status: implemented 2026-08-12

## Decision

Parts Lab and Assembly Garage are developer/designer tools, not student features. They are built as
a separate Angular application named `dragon-designer`. The PBL Forge student application must not
import designer components, stores, routes, or authoring catalogs.

The applications exchange data only through a committed, versioned `DragonModelPack` artifact:

```text
Parts Lab -> designer part catalog -> Garage -> DragonModelPack JSON -> PBL Forge
```

The arrow never points back toward the designer. Browser localStorage may retain unfinished designer
work, but it is not a publishing channel and the student application never reads it.

## Goals

- Keep designer-only routes and code out of the student build.
- Preserve the existing procedural renderer, physics, and genetics behavior.
- Publish completed dragon assemblies as reviewable JSON rather than mutable application state.
- Validate schema versions, model IDs, part and joint references, renderer profile IDs, and visual
  parameters before either application accepts a pack.
- Allow a previous committed pack to be restored as a complete rollback.
- Require no database or network connection for authoring or classroom use.

## Non-goals

- The designer does not generate new Three.js mesh-builder code. A new procedural `profileId` still
  requires a developer to add a compatible builder to the shared renderer.
- The model pack is not the instructional Dragon Visual Pack. Visual teaching sequences and dragon
  assembly models remain separate contracts.
- Garage simulation state such as `isSimulating` is never published.
- The first version does not publish directly to production or write into the repository from the
  browser. Designers download a pack, review it, and commit it.

## Ownership and dependency rules

| Area | Owner | May depend on |
| --- | --- | --- |
| `src/app/shared/assembly/**` | Shared runtime | Three.js, Cannon, game-neutral contracts |
| `designer/**` | Designer application | Shared assembly runtime and committed packs |
| `model-packs/**` | Published artifacts | Data only; no executable code |
| `src/app/features/**` | Student application | Shared runtime and validated published packs |

Forbidden dependencies:

- `src/**` must not import from `designer/**`.
- Student routes and navigation must not expose Parts Lab or Garage.
- Designer code must not import Firebase, student progress, lessons, assessments, or the student
  creation-library service.
- Shared assembly runtime must not import designer code.

## Artifact contracts

### Designer part catalog

The authoring catalog contains available parts, default dimensions, snap definitions, attachment
rules, and editable visual defaults. It is designer-only and may use TypeScript helper functions to
derive socket positions safely.

### DragonModelPack v1

The published pack contains:

- `schemaVersion`, `packId`, `packVersion`, and `rendererContractVersion`;
- a `defaultModelId`;
- model labels and descriptions; and
- stable `AssemblyBlueprint` values containing parts and joints.

Each part may contain scalar `visualProfile.parameters`. Geometry itself is never serialized. The
pack references a shared renderer builder through `visualProfile.profileId`.

`AssemblyState` is an editor type. Export must clone only `parts` and `joints` into an
`AssemblyBlueprint`.

## Publishing workflow

1. Tune part proportions in Parts Lab and record the result.
2. Assemble and simulate the dragon in Garage.
3. Export `dragon-model-pack.v1.json` from Dragon Designer.
4. Run `npm run check:model-packs`.
5. Replace the committed file under `model-packs/` and review the JSON diff.
6. Run both application builds and the relevant rendering, genetics, physics, and pack tests.
7. Commit the pack and code separately when practical.

Production PBL Forge bundles the committed JSON at build time. It does not fetch the model pack at
runtime, so a lesson has no model-pack loading or network failure state.

## Validation requirements

A pack is rejected when it has:

- an unsupported schema or renderer-contract version;
- duplicate or missing pack/model/part/joint IDs;
- a default model that does not exist;
- non-finite dimensions, positions, rotations, parameters, or physics tuning;
- a joint or attachment referencing a missing part or snap point;
- an unsupported shape, joint type, mesh type, or procedural profile ID; or
- editor-only state such as `isSimulating` in a published blueprint.

Visual-profile parameters must survive JSON export/import unchanged. Round-trip tests cover this
because losing them silently removes expressed traits such as frills, eye color, spikes, claws, and
tail-club variants.

## Migration phases

- [x] Record the architecture and name the artifact separately from instructional visual packs.
- [x] Add the pack contract, parser, build-time validation, and round-trip tests.
- [x] Generate a baseline pack from the current classic dragon without visual changes.
- [x] Switch genetics and the built-in creation library from Garage preset imports to the pack.
- [x] Add the separate `dragon-designer` Angular project without Firebase providers.
- [x] Move Parts Lab and Garage entry surfaces to the designer project.
- [x] Remove their student routes and catalog links.
- [x] Add import-boundary enforcement and build both applications in verification.
- [x] Verify the current expressive traits, including sex-linked frills and `KK/Kk/kk` tail clubs.

## Rollback

Revert `model-packs/dragon-model-pack.v1.json` to the previous committed version and rebuild PBL
Forge. Pack versions are immutable once released; changed contents receive a new `packVersion`.

## Definition of done

- `ng build pbl-forge` contains no Parts Lab or Garage route/chunk.
- `ng build dragon-designer` works without Firebase or the classroom database.
- No production TypeScript under `src/**` imports `designer/**` or `assembly-garage`.
- Student genetics and the creation library use the validated committed dragon pack.
- Pack export contains an `AssemblyBlueprint`, never `AssemblyState`.
- Model-pack validation, lint, tests, and both builds pass.
