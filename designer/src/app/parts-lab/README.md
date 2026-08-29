# Dragon Part Workshop

A unified workbench for Arena and Mini Dragon Show part meshes. The selected mesh remains visible
while the right-side inspector switches between Shape, Layers, Surface, Sockets, Genes, and Test. The
contact-sheet library now sits below the active workshop instead of separating part selection from
editing.

The Layers inspector groups the flat renderer parameter list into anatomical ideas: core form,
belly, armor forms, spike rows, feather mantle, dorsal scales, plates, fins, and other appendages.
Only one layer editor is open at a time. Each layer has its own reset; optional layers can be hidden
for preview, structural layers are protected, and gene-connected layers warn that lesson expression
can replace the authoring default. The grouping metadata lives in `part-anatomy-layers.ts`; parameter
keys remain owned by the shared visual-parameter registry.

When a selected layer owns placement, rotation, or size parameters, **procedural handles** appear
over the isolated preview. Blue handles move generated children, amber handles rotate them, and
green handles resize them. Dragging and keyboard nudging write the same canonical value as the
layer slider. These are semantic parameter handles rather than vertex gizmos: a Teeth spacing
handle regenerates the paired row, and a Horn splay handle preserves bilateral symmetry.

The **Surface** inspector controls the classic dragon's generated material per definition. It keeps
genetics-owned pigment and pattern choice intact while exposing relief depth, roughness, texture
detail frequency, marking intensity, and marking frequency. Texture-frequency changes clone only a
small UV-transform wrapper; the cached canvas texture pixels remain shared across dragons. Wing
membrane veins remain anatomy-mapped and do not tile like scale or keratin maps.

The stage can switch between **Isolated part** and **Whole dragon**. Whole-dragon mode uses the
same six Arena body presets and five Mini Dragon breed presets as Assembly Garage, highlights the
selected layer, and fades the rest of the specimen. The Arena body or Mini breed selector changes
the placement context without changing the selected catalog part.

Wings, tails, Mini horns, plates, fins, dorsal rows, and Arena back-spike rows expose anchored Move,
Rotate, and Scale handles in whole-dragon mode. Exact X/Y/Z controls sit in the selected layer
editor. Those values are saved by assembly context and part instance: moving a Fairy Dragon wing
does not move the Puggle wing, and moving a Regal wing does not move a Bulwark wing. Back spikes are
a generated child group, so their placement is stored as body-relative offsets and does not move the
torso. Shape dimensions remain saved by definition as before.

The **Authored / Dominant / Recessive** switch is a comparison tool. It applies the selected
gene-connected layer's representative phenotype values to a cloned preview only; it never writes a
genotype or replaces the authored draft. Returning to Authored shows exactly what is saved.

The classic horned head also exposes an explicit **Authored / Female / Male** switch beside the
preview scope. It changes the sex-linked crest/frill form in isolated and whole-dragon previews,
but never writes the genetics-owned `sex` parameter back to the Designer draft. Authored restores
the value supplied by the selected dragon or model pack.

Arena body definitions expose per-body station controls for the neck, chest, waist, belly, hips,
spine, and tail root. Mini Dragon Show bodies reuse their existing morphology parameters. Both show
labelled drag handles over the canvas; dragging a handle and moving the matching inspector slider
write the same per-definition draft value. Arrow keys nudge a focused handle by one registered step.

**What it does and does not change.** Legacy shared layer sliders drive `setDragonStyleOverride`, a
module-level hook in the shared `dragon-style.ts`, so they change every part using that style
section. Head, jaw, body-station, and surface controls are definition-owned and do not leak to other
catalog parts. Dimension sliders also save per definition and are what the Garage stamps and
rebuilds at. None touches a part's **sockets**; those live in
`snapPoints` and are edited in the [Snap Workshop](../snap-workshop/README.md). Nothing here writes
source — everything is a local draft plus a paste-ready snippet.

Body-station controls are the exception to the shared-style rule: they are registered visual
parameters stored by definition id, so tuning Regal does not reshape Bulwark, Courser, Prowler,
Double-Wing, or Serpent. The body archetype remains genetics-owned; station values refine the chosen
archetype instead of replacing it.

## Why it exists

The dragon's anatomy is **generated code**, not authored art. The shared rendering modules build
every part from lathes, cones, and shape extrusions sized from `part.dimensions`. That makes
it fast to edit and slow to evaluate: checking a change used to mean build, serve, navigate, and
find a dragon carrying the part.

This page renders one part at a time from six angles and can place that same part inside a complete
Arena or Mini assembly. It deep-links by part id, view, assembly, and expression mode so a script can
drive it headlessly. The loop drops from minutes to seconds.

## Using it

`/parts-lab` — or with a deep link:

```text
/parts-lab?family=dragon&part=dragon-left-wing&tile=220
/parts-lab?family=dragon&part=dragon-left-wing&view=assembly&assembly=regal-dragon&gene=dominant
```

- **Contact sheet** — every part in the family, baked through the shared thumbnail context (one
  WebGL context for the whole grid, plus one live viewer).
- **Live stage** — orbit an isolated part or its complete assembly. The selected assembly anatomy
  stays in full colour while non-selected parts fade for context.
- **Dimension sliders** — the genetics pipeline scales these same dimensions per genome, so a part
  has to hold up across the range, not just at ×1. Drag them before declaring a part finished.
- **Uniform colour by default** — the authored definition colours are a rainbow, which is useful in
  the garage and useless for judging form. A bright hue reads as detail that is not there.

## Tuning anatomy layers live

Selecting a part reveals a short layer list. Selecting one layer reveals only the feature counts and
proportions belonging to that anatomy, instead of mixing the entire parameter registry into one
scrolling stack:

| Part | Controls |
| --- | --- |
| Body | spike count, ridge length, spike height/thickness/lean |
| Jaw | per-jaw teeth count/size, row span, XYZ placement, splay/rake; upper-jaw nostrils, nose horn, and fangs |
| Horned head | skull proportions; eye, horn, brow-spike, crest, sex-display, and Wise-regalia placement |
| Clawed foot | talon count, talon length, talon thickness |
| Club tail | spike count, spike length, spike thickness |
| Wing | camber, finger sag, dihedral, trailing scallop (+ four presets) |

These are usually more useful than the overall X/Y/Z scale sliders, which only stretch the part.

**Counts are absolute; every length is a fraction of the part it sits on.** That is deliberate —
the genetics pipeline rescales parts per genome, and a spike measured in world units would drift
out of proportion with the body carrying it.

Legacy shared-style values still drive `setDragonStyleOverride` in the shared `dragon-style.ts`.
Head and jaw controls are deliberately per-definition visual parameters, so tuning lower-jaw teeth
does not alter the upper row and every placement survives in the Designer draft. Record the chosen
values, apply them to the designer catalog, then verify the assembled model in `/dragon-garage`
before exporting a pack.

## Building and adding meshes

Dragon art is assembled procedurally by the shared rendering modules. The
[`dragon-procedural-mesh.factory.ts`](../../shared/assembly/rendering/dragon-procedural-mesh.factory.ts)
file is the profile router; each anatomy family lives in a focused `dragon-*-mesh.ts` module.
Each `AssemblyPart` has a `visualProfile.profileId`, and
`createDragonProceduralObject` routes that ID to the corresponding builder. The shared renderer
uses that factory automatically for procedural dragon parts.

### 1. Choose the owning part

Add geometry to the part that owns the feature. For example, a belly plate belongs in
`buildDragonBody` in `dragon-body-mesh.ts`, teeth belong in `buildDragonJaw` in
`dragon-jaw-mesh.ts`, talons belong in `buildDragonTalon` in `dragon-limb-mesh.ts`, and wing veins
belong in `buildDragonWing` in `dragon-wing-mesh.ts`. Do not add visual-only features
to the physics blueprint: `AssemblyPart.shape` and `AssemblyPart.dimensions` define collision,
mass, and joints, while the procedural mesh is only what the player sees.

### 2. Build the simplest geometry first

Use Three.js primitives through the shared `mesh` helper in `dragon-geometry.ts`, which enables
shadows consistently:

```ts
const belly = mesh(
  new THREE.SphereGeometry(1, 12, 8),
  bellyMaterial(palette),
);
belly.name = 'dragon-belly';
belly.scale.set(dims.x * 0.38, dims.y * 0.3, dims.z * 0.34);
belly.position.set(dims.x * 0.04, -dims.y * 0.22, 0);
group.add(belly);
```

Start with a low-segment `SphereGeometry`, `BoxGeometry`, `ConeGeometry`, `CylinderGeometry`, or
`TubeGeometry`. Add custom vertices only when a primitive cannot make the intended silhouette.
Name meaningful child meshes so tests and debugging tools can find them without depending on child
order.

### 3. Keep the mesh genome-scaled

Every size and position should be a fraction of `part.dimensions`, usually named `dims` in the
builder. Never use fixed world-space measurements for anatomy. The genetics pipeline changes those
dimensions per dragon, so this keeps the new feature in proportion for every phenotype.

Use the palette-derived helpers in `dragon-materials.ts` rather than hard-coded dragon colors.
The pigment locus updates `part.color`, and the shared helpers preserve that genetic connection
along with the project's texture, relief, roughness, and appearance-preservation rules.

### 4. Add a focused test

Extend the owning builder's focused spec, such as
[`dragon-jaw-mesh.spec.ts`](../../shared/assembly/rendering/dragon-jaw-mesh.spec.ts), with a minimal
`AssemblyPart` fixture for the profile being changed. Assert that the named child exists, has the
intended geometry, and uses a dimension-derived scale or position. Run only that spec while iterating:

```bash
npx ng test pbl-forge --watch=false --include="src/app/shared/assembly/rendering/dragon-jaw-mesh.spec.ts"
```

### 5. Inspect it in the app

With the dev server running, open `/parts-lab`, select the relevant dragon part, and rotate the
live stage through several angles. Test the dimension sliders too: the mesh should remain attached,
read clearly at thumbnail scale, and avoid clipping adjacent parts. Use `/dragon-garage` to check
the same part on a complete, physics-backed designer model.

### Two things that bit here

Both are worth knowing before adding more controls:

- **Thumbnail baking must not happen inside a `computed`.** It renders to a GPU context and lazily
  mounts a renderer; both are side effects. Doing it in a computed threw `NG0600` as soon as the
  renderer gained a signal, and meant a single read could fire 25 synchronous renders. The tile and
  angle lists are plain signals populated by effects.
- **Slider input is debounced before rebuilding** (`COMMIT_DELAY_MS`). Rebuilding on every event
  disposed and re-uploaded every geometry ~60 times a second and re-baked six angle thumbnails
  alongside — enough GPU churn that the browser dropped the WebGL context outright and the preview
  died mid-drag. Labels still update instantly, so it feels live. The renderer now also handles
  `webglcontextlost`/`restored` and rebuilds itself, with a manual retry button as a backstop.

## Recording values for hardcoding

The lab finds numbers by eye; they still have to get back into source. **Record these values**
snapshots the current part id, its tuned dimensions, and (for wings) the membrane shape into a list
that renders as paste-ready TypeScript with a Copy button.

Records persist to localStorage, deliberately: tuning happens across reloads, and a hot reload
after a mesh edit would otherwise wipe the session's work.

```ts
// Classic Dragon Body (dragon-classic-body) — recorded 2026-07-31 22:34
// assembly-part-definitions.ts
dimensions: { x: 1.6, y: 0.72, z: 0.68 },
// dragon-style.ts — DEFAULT_DRAGON_STYLE.body
body: { spikeCount: 12, spikeSpread: 0.62, spikeHeight: 0.085, spikeRadius: 0.032, spikeLean: 0.32 },
```

## Baking renders

```bash
npm run bake:parts -- --part=dragon-left-wing
npm run bake:parts -- --family=robot
npm run bake:parts -- --url=http://localhost:4288 --scale=3
```

Needs the dev server running and `playwright` installed (`npm i --no-save playwright`). Output goes
to `.parts-bake/`, which is gitignored — these are working images, not assets.

For anything interactive — a slider, a drag, a panel that scrolls — use the general
[browser driver](../../../../docs/BROWSER_DRIVER.md) instead, which can operate the page rather
than only photograph it.

The script fails on unexpected console errors and on an essentially blank first tile. That second
check matters: a mesh builder that returns `null` renders an empty stage, and an empty PNG looks
exactly like a successful bake. It earned its keep immediately by catching a `@ViewChild(static:
true)` that could never resolve inside an `@if`.

## What the baseline looks like

Baked 2026-07-31, before any mesh work:

- **Four body definitions render identically.** Wyvern, Drake, Classic, and Four Wing all map to the
  `dragon-body` profile, and `buildBody` ignores everything that distinguishes them.
- **Wing membranes are perfectly flat.** `buildWing` uses `ShapeGeometry`, which is planar by
  definition — the front view is literally a single line. No camber, no thickness, no sag between
  the finger struts.
- **Legs, tail links, and the whip tail are featureless tapered lathes**, near-indistinguishable
  from each other.
- **Zero textures anywhere.** Every material is a flat colour with roughness/metalness. Nothing
  carries scale, grain, or wear.

## Where the wins are

Ranked by visual gain per unit of effort:

1. **Canvas-generated textures.** [`scene-environment.ts`](../../shared/assembly/rendering/scene-environment.ts)
   already draws the ground texture to a `<canvas>` and wraps it in a `CanvasTexture`. The same
   trick gives scale patterns, horn ridging, and membrane veining with no asset files — and it can
   be genome-reactive, so the pigment gene drives the pattern rather than just the base colour.
2. **Normal maps from that same canvas.** Bumpy skin catching the three-point rig, at no geometry
   cost.
3. **Silhouette.** These render at 300px in the inspector and 120px as thumbnails. Outline beats
   surface detail at both sizes.
4. **Give the shared profiles real variants**, so four body definitions stop being one mesh.

## A note on authored GLB models

The [asset loader](../../shared/assembly/rendering/assembly-asset-loader.ts) is plumbed and falls
back per part, so AI-generated or hand-authored GLBs can land one at a time in
`public/models/<assetId>.glb`.

Prefer procedural for anything genome-driven, which is nearly everything. The genetics pipeline
scales `part.dimensions` per genome and repaints `part.color` from pigment genes — procedural parts
respond automatically, so a wide-wingspan genome *builds* a wider wing with correctly proportioned
struts. A fixed GLB just gets stretched, and its baked textures ignore the pigment gene entirely.
Reserve authored assets for fixed decorative props where genetics does not reach.
