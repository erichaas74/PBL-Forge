# Universal Assembly Garage

This feature is intentionally outside `src/app/game-types` and does not register with the game manifest loop.

## Structure

- `../shared/assembly/domain`: canonical blueprint contracts, vectors, roles, cloning, and snapping. The local model/utility files are compatibility exports.
- `state/assembly-garage.store.ts`: Angular signal store for parts, joints, selection, and simulation state.
- `../shared/assembly/rendering`: reusable Three.js geometry and material factories.
- `../shared/assembly/physics`: reusable cannon-es body and shape factories.
- `components/garage-viewport`: rendering and physics loop host.
- `components/garage-parts-panel`: primitive and joint creation controls.
- `components/garage-inspector`: selected part and joint inspection controls.
- `data/presets/robot-load.ts`: starter robot assembly load.
- `data/presets/car-load.ts`: starter car assembly load.
- `data/presets/assembly-preset-builder.ts`: helper functions for adding new preset parts and joints.
- `data/assembly-part-definitions.ts`: catalog parts with one-socket snap rules for fast car and robot building.

The route is lazy-loaded from `app.routes.ts` at `/assembly-garage`, separate from `GAME_MANIFESTS`.

## Current Capabilities

- Add primitive box, sphere, and cylinder parts.
- Add configured car and robot catalog parts from the left panel.
- Auto-place catalog parts onto their one valid socket when a matching base frame is present.
- Drag parts on the build plane and auto-snap nearby snap points after release.
- Click visible snap points to seed the joint builder.
- Create fixed, hinge, spring, and slider joints from explicit parent/child snap points.
- Edit selected part properties and selected joint pivots/axis/type.
- Export and import strict `AssemblyState` JSON.
- Load simple robot and car assembly presets from source files.
- Run the cannon-es physics loop independently from the game services.

## Adding Preset Parts

Add a new `part(...)` call to `robot-load.ts` or `car-load.ts`, then add a matching `joint(...)` call if it should connect to another part. Presets are registered through `data/presets/assembly-presets.ts`.

## Adding Catalog Parts

Add a new `AssemblyPartDefinition` to `data/assembly-part-definitions.ts`. Base frames should expose named sockets. Attach-on parts should expose one child snap point plus an `attachment` rule that names the parent socket, child snap, joint type, and joint axis.

## Known Gaps

- Slider joints are represented with cannon-es point constraints until a prismatic constraint adapter is introduced.
- Part rotation editing and transform gizmos are not implemented yet.
- Physics snapshots render live but are not persisted back into the editor state.
