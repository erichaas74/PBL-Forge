# Reusable Assembly Platform

This folder owns the game-neutral assembly runtime. Features and games may depend on it; it must not import from the Assembly Garage or Assembly Arena.

## Boundaries

- `domain/`: persistent blueprints, semantic roles, cloning, IDs, vectors, and snapping.
- `combat/`: health, armor, core-part, and ability metadata layered over a blueprint.
- `physics/`: Cannon body and shape construction shared by previews and games.
- `rendering/`: Three.js geometry, visual transforms, and material profiles.
- `assembly-physics.service.ts`: single-assembly preview simulation.
- `assembly-renderer.service.ts`: interactive single-assembly renderer.
- `assembly-viewport/`: non-interactive embeddable viewport for future games.

`AssemblyBlueprint` is the serialized asset. `AssemblyState` adds Garage-only simulation state and must not be stored in the Creation Library.

Games obtain blueprints, moves, and scenarios through `CreationLibraryService`. The Arena is a reusable combat lab; its first registered game-facing consumer is `robot-battle`.
