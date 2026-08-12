# Universal Assembly Garage

This reusable authoring feature lives under `src/app/shared`. Dragon Genetics currently consumes its built-in dragon preset; the full editor is not registered as a student route.

## Structure

- `../assembly/domain`: canonical blueprint contracts, vectors, roles, cloning, and snapping. The local model/utility files are compatibility exports.
- `state/assembly-garage.store.ts`: Angular signal store for parts, joints, selection, and simulation state.
- `../assembly/rendering`: reusable Three.js geometry and material factories.
- `../assembly/physics`: reusable cannon-es body and shape factories.
- `components/garage-viewport`: rendering and physics loop host.
- `components/garage-parts-panel`: primitive and joint creation controls.
- `components/garage-accordion`: collapsible side-panel section. Its body hides rather than
  unmounting, so nothing inside loses state while collapsed.
- `components/garage-inspector`: selected part and joint inspection controls. Its size sliders
  read ×1 as the catalog size for parts stamped from a definition, and can write a tuned size
  back to that definition for newly added parts and rebuilt presets.
- `data/presets/robot-load.ts`: starter robot assembly load.
- `data/presets/car-load.ts`: starter car assembly load.
- `data/presets/assembly-preset-builder.ts`: helper functions for adding new preset parts and joints.
- `data/assembly-part-definitions.ts`: catalog parts with one-socket snap rules for fast car and robot building.

Register the editor explicitly in `app.routes.ts` if it becomes a teacher-facing authoring tool. It is intentionally absent from the current student route table.

## Current Capabilities

- Add primitive box, sphere, and cylinder parts.
- Add configured car and robot catalog parts from the left panel.
- Auto-place catalog parts onto their one valid socket when a matching base frame is present.
- Drag parts on the build plane and auto-snap nearby snap points after release.
- Click visible snap points to seed the joint builder.
- Create fixed, hinge, spring, and slider joints from explicit parent/child snap points.
- Edit selected part properties and selected joint pivots/axis/type.
- Resize a selected part and keep the assembly closed: its authored snap points and joint pivots
  scale with it, and everything jointed below it is pulled back onto the moved pivots.
- Scroll each side panel independently of the stage, which stays pinned in view.
- Collapse the longer panel sections; the assembly tree stays open as the build's navigation.
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
