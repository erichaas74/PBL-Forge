# Working on dragon parts — brief for a fresh session

Read this before editing or adding a part. It assumes no memory of previous
sessions. Companion docs: [`MESH_EDITING.md`](MESH_EDITING.md) for the file map,
[`BROWSER_DRIVER.md`](BROWSER_DRIVER.md) for seeing the result.

## The one paragraph of context

Dragon parts are **generated code, not model files**. A part is a row of data in
a catalog (`assembly-part-definitions.ts`) naming a `profileId`; at render time a
builder function keyed to that id generates the geometry from `part.dimensions`
and `part.color`. Two apps consume it: the student game (`src/`) and the private
designer tools (`designer/`). Shared code lives in `src/app/shared/assembly` —
student source must never import from `designer/`.

## Editing an existing part's shape

1. Find the builder in
   `src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.ts` —
   `buildJaw`, `buildFoot`, `buildWing`, and so on.
2. Change the numbers. Every one is a fraction of `dims`; `±0.5` on an axis is
   that face of the part.
3. Save. `/parts-lab?family=dragon&part=<id>` hot-reloads.
4. `npm run lint && npm run test:ci && npm run build`.

Nothing else needs updating **unless** you rename a named child mesh, in which
case fix `dragon-procedural-mesh.factory.spec.ts`, which looks them up by name.

Silhouettes are not in the factory. A head's shape lives in
`dragon-head-profile.ts`, a wing's in `dragon-wing-profile.ts`, a body's in
`dragon-body-profile.ts`. The factory only samples them.

## Adding a new part

The order matters — physics and sockets before looks.

1. **Catalog entry** in
   `designer/src/app/assembly-garage/data/assembly-part-definitions.ts`, via the
   `dragonPart(id, label, shape, dimensions, mass, color, options)` helper.
   - `shape` is the **physics collider** and is only `'box' | 'sphere' | 'cylinder'`.
     A sphere collides on `dimensions.x` alone, so its `y`/`z` are free for the mesh.
   - `options` carries the attachment rule: `parentSnapId`, `childSnapId`,
     `jointType`, `axis`, and optionally `childRotation`, `behavior`,
     `extraSnapPoints`.
   - `visualProfile` is inferred from the family and id by
     `getDefaultVisualProfile` — override it if the part needs a specific builder.
2. **Sockets.** Authored `snapPoints` are absolute part-local offsets. Place them
   in the Snap Workshop (`/snap-workshop?part=<id>`), then paste its **Back into
   source** snippet into the definition.
3. **Geometry**, if the part needs a new look:
   - add a `build<Thing>` function to the factory,
   - add its `profileId` to the switch in `createDragonProceduralObject`,
   - add the same id to `SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS` in
     `src/app/shared/assembly/model-pack/dragon-model-pack.models.ts` — the pack
     validator rejects unknown profiles and `npm run build` will fail,
   - add a spec to `dragon-procedural-mesh.factory.spec.ts` asserting the named
     children exist and are sized from `dimensions`.
4. **Put it on a dragon**, if it belongs on the standard model: add an entry to
   `CLASSIC_DRAGON_PARTS` in
   `designer/src/app/assembly-garage/data/presets/classic-dragon-test.ts`.
   ⚠️ `classic-dragon-test.spec.ts` **hardcodes the part and joint counts**
   (`toBe(24)` / `toBe(23)`). Adding a part fails that test until you update both.
5. **Verify:** `npm run lint`, `npm run test:ci`, `npm run test:designer:ci`,
   `npm run build`, `npm run build:designer`.

## Rules that break something real

1. **Every size and position is a fraction of `part.dimensions`.** Genetics
   rescales parts per genome; a value in metres drifts out of proportion.
2. **Colours come from `createDragonPalette(part.color, seed)`.** The pigment
   gene writes `part.color`.
3. **Keep `.name` on child meshes.** Tests find them by name, not child order.
4. **Never rename a `visualProfile.parameters` key.** They are read by the
   factory, written by `dragon-inheritance.ts`, materialised by the pack
   exporter, and asserted by `check-dragon-model-compatibility.mjs`. A rename
   throws no error — the part silently stops responding to its genes.
5. **Geometry must fill its physics volume.** Sockets are positioned against the
   mesh; a part rendering smaller than its collider leaves joints pointing at
   empty space.
6. **Student source must not import from `designer/`** — `check:designer-boundary`
   enforces it.

## Seeing the result

Do not describe a shape without looking at it:

```powershell
node scripts/browser.mjs --serve=designer "parts-lab?family=dragon&part=dragon-upper-jaw" `
  "sleep 6000" "shot part [data-bake=contact-sheet]"
```

Then open `.browse/part.png`. Paths take no leading slash (Git Bash rewrites it).

## Known-failing tests — not yours

`allele-vault-workbench.component.spec.ts` and `chromosome-svg.component.spec.ts`
have failures asserting whitespace in rendered text, and `check:type-scale` flags
`chromosome-svg.component.css`. These predate part work. Do not "fix" them
unless asked.

---

# How to ask for part work

## What I do reliably

- **Change numbers in a builder** — placement, size, angle, counts. Highest
  success rate, no ripple.
- **Promote a hardcoded number to a slider** — mechanical three-step change.
- **Add a part that reuses an existing `profileId`** — catalog data plus sockets.
- **Trace and explain** what a value does and what a change would touch. I read
  the code rather than guessing.
- **Find the real cause of a visual bug** when you can describe the symptom.
  Measuring computed styles and contrast in the browser beats my eye.
- **Write the tests** alongside, and run the whole verification suite.

## What I do less well

- **Judging whether something looks good.** I can screenshot it and see obviously
  wrong things — a floating socket, invisible text, a part inside another part.
  I cannot tell you a dragon reads as *menacing*. Describe the silhouette you
  want in words, or point at a part that already has it.
- **Inventing an art direction.** "Make the foot better" gets you my guess.
  "Three forward toes in two segments with a rear dewclaw" gets you that.
- **Large geometry from scratch in one pass.** A full anatomical rewrite usually
  takes two or three look-and-adjust rounds. Expect to iterate.
- **Anything needing your running browser.** My screenshots come from a headless
  Chromium in a clean profile — your extensions, your zoom, your OS theme, your
  localStorage are all invisible to me. Tell me if a bug depends on them.
- **Knowing what changed outside our session.** If you or another tool edited
  files, say so; I read the current state, not the history.

## How to get a good result

**Name the part by its id.** `dragon-upper-jaw`, `dragon-clawed-foot` — there are
26 dragon parts and several share a builder, so "the head" is ambiguous across
three heads.

**Say which of the four layers you mean:**

| You want | Layer |
| --- | --- |
| Bigger, smaller, longer | `dimensions` — the catalog, or Parts Lab sliders |
| Where it attaches | `snapPoints` — the Snap Workshop |
| Feature counts and proportions | `DragonStyle` / `parameters` — sliders |
| A different form | the builder — code |

**Describe the target, not the operation.** "The teeth should start further back
and hang lower" beats "change line 864".

**Say whether it is one part or the family.** `DragonStyle` is shared per profile
— all three heads read the same `style.head`. Per-part needs
`visualProfile.parameters`.

**Tell me if it must reach students.** The factory is shared, so a default change
ships to the game. A designer-only tweak belongs in the local draft instead.

## A good request looks like

> On `dragon-clawed-foot`, replace the flat pad and fan of cones with three
> forward toes in two segments each, plus a rear dewclaw. Talons should sit on
> the toe tips rather than the front face. Keep it filling the collider, make
> toe count and splay tunable, and show me the Top and Front angles.

That names the part, the current state, the target form, the constraint, what to
expose, and how to prove it.
