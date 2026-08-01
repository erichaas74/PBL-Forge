# Parts lab

A workbench for the part meshes themselves, and the feedback loop for improving them.

## Why it exists

The dragon's anatomy is **generated code**, not authored art —
[`dragon-procedural-mesh.factory.ts`](../../shared/assembly/rendering/dragon-procedural-mesh.factory.ts)
builds every part from lathes, cones, and shape extrusions sized from `part.dimensions`. That makes
it fast to edit and slow to evaluate: checking a change used to mean build, serve, navigate, and
find a dragon carrying the part.

This page renders one part at a time, isolated, from six angles, and deep-links by part id so a
script can drive it headlessly. The loop drops from minutes to seconds.

## Using it

`/parts-lab` — or with a deep link:

```text
/parts-lab?family=dragon&part=dragon-left-wing&tile=220
```

- **Contact sheet** — every part in the family, baked through the shared thumbnail context (one
  WebGL context for the whole grid, plus one live viewer).
- **Live stage** — orbit the selected part. Runs at `quality: 'high'`, unlike the embedded viewers,
  because this is where quality is judged.
- **Dimension sliders** — the genetics pipeline scales these same dimensions per genome, so a part
  has to hold up across the range, not just at ×1. Drag them before declaring a part finished.
- **Uniform colour by default** — the authored definition colours are a rainbow, which is useful in
  the garage and useless for judging form. A bright hue reads as detail that is not there.

## Tuning the wing membrane live

Select any wing and four extra sliders appear — `camber`, `fingerSag`, `dihedral`, `scallop`. They
drive [`setWingShapeOverride`](../../shared/assembly/rendering/dragon-procedural-mesh.factory.ts),
a module-level hook that is `null` in production so the shipped `DEFAULT_WING_SHAPE` is what
everyone else renders.

Two consequences worth knowing:

- The override applies **app-wide until you reload**, so you can tune here and then open
  `/dragon-test-bench` to see the wing on a whole dragon before committing to the numbers.
- Only the wing tiles rebuild while you drag. The other 21 parts keep their cached thumbnails
  because membrane tuning cannot affect them.

## Recording values for hardcoding

The lab finds numbers by eye; they still have to get back into source. **Record these values**
snapshots the current part id, its tuned dimensions, and (for wings) the membrane shape into a list
that renders as paste-ready TypeScript with a Copy button.

Records persist to localStorage, deliberately: tuning happens across reloads, and a hot reload
after a mesh edit would otherwise wipe the session's work.

```ts
// Left Wing (dragon-left-wing) — recorded 2026-07-31 22:34
// assembly-part-definitions.ts
dimensions: { x: 0.26, y: 0.08, z: 1.35 },
// dragon-procedural-mesh.factory.ts — WING_SHAPES entry
{ camber: 0.3, fingerSag: 0.06, dihedral: 0.04, scallop: 0.13 },
```

## Baking renders

```bash
npm run bake:parts -- --part=dragon-left-wing
npm run bake:parts -- --family=robot
npm run bake:parts -- --url=http://localhost:4288 --scale=3
```

Needs the dev server running and `playwright` installed (`npm i --no-save playwright`). Output goes
to `.parts-bake/`, which is gitignored — these are working images, not assets.

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
