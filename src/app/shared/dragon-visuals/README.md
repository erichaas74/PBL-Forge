# Dragon visuals boundary

This package is the contract between Dragon Genetics lessons and replaceable graphics.

Implementation guidance for every station is indexed in the
[Dragon Genetics simulation build guides](../../../../docs/dragon-genetics-simulations/README.md).
New renderers belong under [`displays`](displays/README.md).

## Dependency rule

`src/app/shared/dragon-visuals` must not import Dragon Genetics pages, content, stores, repositories, Firestore, routes, or assessment rules. It accepts versioned semantic scene data and emits semantic stage events.

The feature owns an adapter that converts lesson and genetics state into a `DragonVisualScene`. A renderer reads the bridge signals and chooses how to draw the scene. This keeps lesson correctness independent from SVG, Canvas, Three.js, animation, and art-pack changes.

## Specimen and instrument rule

The laboratory selects a dragon, egg, offspring, parent pair, sibling group, or population first. The adapter converts that selection into one or more `DragonAnalysisSample` records containing IDs, relationships, genes, alleles, and phenotype labels.

Each instrument is a separate simulation with a discriminated instrument payload. Scientific instruments render only the model they analyze: chromosomes, DNA, genes, allele pairs, inheritance cells, egg results, probability plots, allele paths, or diversity counts. They do not require dragon artwork or body-part layers. A specimen portrait may appear in the separate selection area, and the assembled dragon appears in the final arena, but neither is part of the instrument contract.

```text
lesson/store signals
        |
        v
feature scene adapter
        |
        v
DragonVisualBridge signals ---> replaceable station or cutscene renderer
        ^                                      |
        |                                      v
lesson action handler <---------- semantic DragonVisualStageEvent
```

## Replaceable visual packs

A visual pack contains versioned assets, motion presets, and declarative teaching sequences. It declares the scene contract versions it supports. Packs contain no executable lesson or assessment code.

Visual-only updates may replace assets and motion definitions or publish a new compatible pack version. A contract change requires an explicit version bump and adapter migration.

Teaching sequences use named targets and actions such as focus, move, trace, morph, pause for prediction, and reveal. The same sequence may declare support for both the in-station surface and a full cutscene surface. Captions use semantic IDs so curriculum wording remains outside the graphics package.
