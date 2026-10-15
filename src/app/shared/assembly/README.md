# Reusable Assembly Platform

This folder owns the game-neutral assembly runtime. Features and games may depend on it; it must not import from the Assembly Garage or Assembly Arena.

## Boundaries

- `domain/`: persistent blueprints, the universal project/part schema and graph, semantic roles, cloning, IDs, vectors, constraints, and snapping.
- `combat/`: health, armor, core-part, and ability metadata layered over a blueprint.
- `physics/`: Cannon body and shape construction shared by previews and games.
- `rendering/`: Three.js geometry, visual transforms, material profiles, and the project generator registry.
- `assembly-physics.service.ts`: single-assembly preview simulation.
- `assembly-renderer.service.ts`: interactive single-assembly renderer.

`AssemblyBlueprint` is the serialized asset. `AssemblyState` adds Garage-only simulation state and must not be stored in the Creation Library.
`AssemblyPartGraph` is the richer project-neutral authoring projection: it wraps blueprint parts and
joints with project identity and serializable constraints, then converts back for existing runtime
consumers. Project-package and inspector contracts live in `domain/assembly-part-schema.ts`.

Games obtain blueprints, moves, and scenarios through `CreationLibraryService`. Arena consumers
compose the shared combat physics, renderer, and strategy runtime directly.

Dragon models cross from the separate Dragon Designer application through a validated,
versioned `DragonModelPack`. The shared `model-pack/` folder owns that contract and parser; it does
not own any particular published pack. PBL Forge imports committed JSON from the workspace-level
`model-packs/` directory at build time.
