# Assembly project packages

The private Assembly Designer is project-neutral. Dragon, Vehicle, Robot, and Primitive authoring
all run through the same part graph, generator registry, capability model, and schema-generated
inspector. Domain-specific code supplies a package; it does not add conditionals to the editor.

## The five implemented layers

1. `AssemblyPartGraph` is the universal authoring graph. Nodes own ordinary `AssemblyPart` records;
   connections wrap ordinary `AssemblyJoint` records and add serializable constraints. Conversion
   to and from `AssemblyBlueprint` keeps existing physics and game consumers compatible.
2. `AssemblyPartProfileSchema` defines capabilities, inspector sections, and number, boolean,
   select, and colour controls. The Parts Lab builds its inspector and procedural handles from these
   definitions.
3. The Dragon package adapts the canonical visual-parameter registry. Existing heads, jaws, teeth,
   surfaces, Mini Dragon parts, and shared/imported recipes therefore use the same schema contract
   without renaming established model-pack parameter keys.
4. The Vehicle `car-wheel` and Robot `robot-limb` profiles are proof generators. The wheel exposes
   radius, width, rim, spokes, tread, tire type, and rim colour. The arm exposes segment size, joint
   size, armor, end-tool scale/type, and accent colour.
5. Bundled Dragon, Vehicle, and Robot manifests define categories, materials, supported joints,
   constraints, profiles, capabilities, and controls. Primitive is a fourth neutral starter package.

## File ownership

| Concern | Owner |
| --- | --- |
| Universal schema and package types | `src/app/shared/assembly/domain/assembly-part-schema.ts` |
| Universal nodes, connections, and constraints | `src/app/shared/assembly/domain/assembly-part-graph.ts` |
| Mesh-generator plugin registry | `src/app/shared/assembly/rendering/assembly-generator-registry.ts` |
| Bundled generator registration | `src/app/shared/assembly/rendering/built-in-assembly-generators.ts` |
| Vehicle and Robot procedural geometry | `src/app/shared/assembly/rendering/machine-procedural-mesh.factory.ts` |
| Private package manifests and controls | `designer/src/app/project-packages/assembly-project-packages.ts` |
| Schema-generated inspector | `designer/src/app/parts-lab/parts-lab.page.*` |

Shared runtime source never imports the private package catalog. The renderer knows only registered
generator plugins and serializable `AssemblyPart` data. The Designer may import both shared runtime
contracts and its private package definitions.

## Universal graph

The graph adds authoring semantics without replacing the proven runtime blueprint:

```text
AssemblyPartGraph
├── projectTypeId
├── nodes[]
│   └── AssemblyPart
└── connections[]
    ├── AssemblyJoint
    └── constraints[]
```

Supported constraint records include socket alignment, hinge limits, slider limits, surface
attachment, mirroring, spacing arrays, collision clearance, and parent-follow behavior. Existing
blueprints infer socket and parent-follow constraints during conversion. Physics continues to consume
the projected `AssemblyBlueprint` until individual games need the richer authoring data.

## Schema-generated controls

A control owns its label, help text, section, value type, default, range/options, persistence binding,
surface status, and optional handle gesture. The Parts Lab does not need to know that `treadCount`
belongs to a tire or `toothRake` belongs to a jaw.

Bindings are either:

- `parameter`: stored in that definition's `visualProfile.parameters` through the local draft and
  shared immutable revisions;
- `style`: adapted to an existing Dragon shared-style section for backward compatibility.

Controls with a handle descriptor generate direct manipulation handles. Exact form values remain in
the inspector, so dragging does not create a second state system.

## Generators

`registerAssemblyMeshGenerator()` is the extension boundary. A generator has a stable id and receives
an ordinary `AssemblyPart`; it returns a Three.js object or `null` when fallback discovery does not
match. An explicit `visualProfile.generatorId` skips discovery. Older model packs that only have a
`profileId` remain supported by the registered fallback adapters.

All generator geometry must continue to use `part.dimensions`, `part.color`, and serialized
parameters. Physics colliders remain the primitive `shape` on the part.

## Custom and imported pieces

The bounded `customPartRecipe` payload is now composed by `three-assembly-mesh.factory.ts`, after the
active package generator builds the base object. It therefore works for every Dragon, Vehicle,
Robot, and Primitive profile. Existing recipe field names and version-two data remain unchanged so
saved heads and jaws migrate without a data rewrite.

Imported GLBs still use content-derived ids, IndexedDB locally, Cloud Storage for shared revisions,
and the existing mesh-safety limits. The shared database collection retains its historical
`dragonParts` name for compatibility, but the UI and revision payload accept every bundled package
definition.

## Adding another project type

1. Add catalog definitions with stable profile ids and sockets.
2. Create a validated `AssemblyProjectPackageManifest` with categories, materials, constraints,
   profile schemas, capabilities, and controls.
3. Register one or more generators. Primitive-only packages can use `generatorId: null`.
4. Add a preset and round-trip it through `AssemblyPartGraph`.
5. Verify the part in the Parts Lab, including number, option, surface, custom-piece, socket, and
   six-angle Test views.

Do not add new family-specific slider blocks to the Parts Lab. New editable values belong in the
package schema, and new generated geometry belongs behind a registered generator.

## Current limits

- The graph serializes rich constraints, but the Snap Workshop currently authors socket placement
  and existing joint behavior; a visual editor for every constraint kind is a later layer.
- Custom recipes remain a flat list of at most 32 parent-relative pieces. They do not yet form nested
  subgraphs or perform boolean mesh operations.
- Shared saves use optimistic conflict detection rather than live multi-user merging.
- Publishing a private shared GLB does not automatically approve it for the public student runtime.
