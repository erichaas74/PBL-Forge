# Snap Workshop

A workbench for **where parts connect**, as opposed to what they look like.

## Why it exists

A dragon part carries authored `snapPoints` in
[`assembly-part-definitions.ts`](../assembly-garage/data/assembly-part-definitions.ts) — the sockets
that decide where a jaw meets a skull, a claw meets a wing, a foot meets a lower leg. The attachment
rules, the preset builder, and the Garage's drag-to-snap all resolve against them.

Nothing could edit them. The [Parts Lab](../parts-lab/README.md) tunes the mesh and the overall
dimensions; the Garage inspector edits a *joint's* pivots on a part instance, which is a different
thing and does not travel back to the catalog. Moving a socket meant computing an offset by hand in
source, reloading, and checking in the Garage whether it landed.

This page shows one part with its sockets live and lets you move them.

## Using it

`/snap-workshop` — or with a deep link, which is what the Garage inspector's
**Edit sockets in the Snap Workshop** button uses:

```text
/snap-workshop?family=dragon&part=dragon-horned-head
```

- **Drag a marker.** It follows the cursor in the plane facing the camera, so it moves the same way
  from any orbit angle and all three axes are reachable. **Drag: X / Y / Z** pins the other two.
- **Precision** comes from the per-axis slider, the number box, or the ± nudge buttons (one
  centimetre a press).
- The selected socket renders **amber and larger** than the rest, because sockets sit close together
  on a part and the one under the controls has to be obvious.
- **Moved** badges mark sockets that differ from the authored position. Reset returns one, or all.

Only parts that author their own sockets are listed. Primitives derive theirs from `dimensions` at
runtime, so there is nothing stored to move.

## What it changes

Positions are saved to `DesignerDragonDraftStore` — browser localStorage, keyed by definition id and
snap point id — and applied by
[`applyDesignerDraft`](../designer-part-overrides.ts), the single place a catalog part picks up local
edits. Both the Garage parts panel and the dragon preset builder go through it, so a moved socket
changes what the Garage stamps *and* what the Classic Dragon preset rebuilds at.

Positions are stored **absolute**, not as deltas. A socket dragged onto a jaw hinge belongs at that
point and should not drift the next time the part's dimensions change. That decides the ordering
inside `applyDesignerDraft`: the saved size scales the authored sockets first, then an explicitly
moved socket overrides its scaled position.

## Getting values back into source

The draft is local to one browser, exactly like the Parts Lab's. The **Back into source** panel
renders the part's whole `snapPoints` array as paste-ready TypeScript with a Copy button — paste it
over the definition to make the change authored, and the local override becomes a no-op.

## Three things worth knowing

- **A drag moves by the pointer delta, never to the pointer.** The grab records where the ray met
  the plane and how far that was from the socket, and applies the difference from there. Moving the
  socket to the ray's plane intersection instead displaces it by about a marker radius over the sine
  of the camera elevation — roughly 0.1 world units, which on a 0.4-wide foot is a quarter of the
  part, before the pointer has moved at all. This is what made the first version feel broken.

- **Dragging a socket rebuilds no geometry.** `getAssemblyRenderSignature` covers shape, dimensions,
  colour, and visual profile — not sockets — so a drag repositions a marker and reuses the mesh.
  Adding snap points to that signature would turn every pointermove into a full rebuild, which is
  the churn that costs the Parts Lab its WebGL context on a dimension drag.
- **Orbiting and dragging are the same gesture.** The drag claims it through
  `setControlsEnabled(false)` on pointerdown and hands it back on pointerup. Without that, moving a
  socket also spins the camera.
