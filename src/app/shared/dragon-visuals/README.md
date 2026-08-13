# Dragon visual contracts and shared primitives

This package is the boundary between Dragon Genetics lesson state and generic, replaceable visual
infrastructure. Active feature-specific workstation implementations live in
`src/app/features/dragon-genetics/workstations`.

## Dependency rule

`src/app/shared/dragon-visuals` must not import Dragon Genetics pages, content, stores,
repositories, routes, Firestore services, or assessment rules. It may contain:

- versioned semantic scene and event contracts;
- bridge state used to publish a scene and receive semantic actions;
- teaching-sequence and visual-pack contracts;
- copy, motion, SVG, and chromosome primitives used by multiple workstations; and
- validation for the shared contracts.

Feature-owned adapters, view models, themes, components, content, and persisted records belong with
their workstation under `src/app/features/dragon-genetics/workstations/<name>/`.

```text
lesson and student state
        |
        v
feature workstation / adapter
        |
        v
shared semantic scene and events
        |
        v
generic shared rendering primitives
```

The shared layer does not decide scientific correctness or persist student progress. It receives
data that has already been selected by the owning workstation and emits semantic events rather than
feature-specific state mutations.
