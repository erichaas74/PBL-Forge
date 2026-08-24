# Dragon Designer asset pipeline

Status: implemented 2026-08-12

## Decision

Parts Lab and Assembly Garage are developer/designer tools, not student features. They are built as
a separate Angular application named `dragon-designer`. The PBL Forge student application must not
import designer components, stores, routes, or authoring catalogs.

The applications exchange data through a validated, versioned `DragonModelPack` plus arena settings:

```text
Parts Lab -> designer part catalog -> Garage -> preview/version/current Firestore docs -> PBL Forge
                                           \-> downloaded JSON / committed offline fallback
```

The arrow never points back toward the designer. Versioned browser localStorage retains unfinished
designer work with undo/redo and recovery, but it is not a publishing channel and the student
application never reads it.

## Goals

- Keep designer-only routes and code out of the student build.
- Preserve the existing procedural renderer, physics, and genetics behavior.
- Publish completed dragon assemblies as reviewable JSON rather than mutable application state.
- Validate schema versions, model IDs, part and joint references, renderer profile IDs, and visual
  parameters before either application accepts a pack.
- Keep immutable publication history and allow a previous version to be restored as a complete rollback.
- Preserve a committed fallback so classroom startup does not depend on the network.

## Non-goals

- The designer does not generate new Three.js mesh-builder code. A new procedural `profileId` still
  requires a developer to add a compatible builder to the shared renderer.
- The model pack is not the instructional Dragon Visual Pack. Visual teaching sequences and dragon
  assembly models remain separate contracts.
- Garage simulation state such as `isSimulating` is never published.
- Publication never writes into the repository from the browser. Designers can download a package
  for review/commit or use the teacher-authorized preview, promote, and rollback flow; the committed
  pack remains the offline fallback.

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
- Designer code must not import student progress, lessons, assessments, or the student
  creation-library service. Its isolated publisher may load the Firebase SDK lazily.
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

Designer publication includes both the editable classic model and a complete connected
`mini-dragon` model. The surrounding publication document also contains the strictly validated arena
scenario, release metadata, and immutable version ID.

Each part may contain scalar `visualProfile.parameters`. Geometry itself is never serialized. The
pack references a shared renderer builder through `visualProfile.profileId`.

`AssemblyState` is an editor type. Export must clone only `parts` and `joints` into an
`AssemblyBlueprint`.

## Publishing workflow

1. Tune either species in Parts Lab; acceptance checks flag invalid dimensions, sockets, profiles,
   and parameter ranges.
2. Assemble and simulate in Garage. Drafts autosave locally and can be exported or restored.
3. Edit and validate the arena scenario in Garage.
4. Publish a teacher-authenticated preview. This also creates an immutable version document.
5. Review the preview, release notes, and recent-version list, then promote it to `current`.
6. Run both application builds plus rendering, genetics, physics, pack, and Firestore-rule tests.
7. Keep a reviewed downloaded package under `model-packs/` when updating the offline fallback.

PBL Forge hydrates `publishedDragonAssets/current` after startup. Invalid, unavailable, or older
documents are rejected without replacing the bundled committed fallback.

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

Use Garage's rollback action to promote the previous immutable Firebase version. For the offline
fallback, revert `model-packs/dragon-model-pack.v1.json` to a previous reviewed version and rebuild
PBL Forge. Pack versions are immutable once released; changed contents receive a new `packVersion`.

## Definition of done

- `ng build pbl-forge` contains no Parts Lab or Garage route/chunk.
- `ng build dragon-designer` works without a live classroom database connection.
- No production TypeScript under `src/**` imports `designer/**` or `assembly-garage`.
- Student genetics and the creation library use a strictly validated current publication or the
  committed fallback.
- Designer publication contains both classic and Mini Dragon models plus a valid arena scenario.
- Pack export contains an `AssemblyBlueprint`, never `AssemblyState`.
- Model-pack validation, lint, tests, and both builds pass.
