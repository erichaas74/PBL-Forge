# Specimen viewer

A small, physics-free 3D view for **observing** a built thing — one specimen, posed, framed, and
labelled with the traits that shaped it. It reuses the arena and garage artwork at a size that fits
next to a Punnett square.

Nothing in this folder knows about dragons. A simulation supplies a descriptor, or registers a
profile that turns its own genome type into one.

## Why this is not the arena or the garage viewport

Same meshes, almost none of the runtime. What it drops is what made those views too heavy to embed:

| Dropped | Why it is safe to drop |
| --- | --- |
| Cannon physics | Blueprints are already in a valid pose. Presets are assembled through snap points, and the genetics pipeline re-derives child positions from joint pivots after scaling. The solver never made the pose correct. |
| The permanent `requestAnimationFrame` loop | A still specimen costs one frame. Rendering happens on input change, on orbit, and during a turntable — nothing else. |
| GTAO + bloom + SMAA | Quality is pinned to `low`, where `createStagePostPipeline` returns null. At 300px the post chain is invisible and expensive. |
| Async GLB loading | `proceduralOnly` keeps the procedural build. A clutch of eight would otherwise fetch artwork nobody can see at thumbnail size. |
| Joint lines, snap points, part picking, drag | Editing tools. This view is for looking. |

Kept, because it carries the quality: image-based lighting (`installStageEnvironment`), the
three-point rig, and the procedural anatomy in `dragon-procedural-mesh.factory.ts`.

## Using it

```html
<app-specimen-view [source]="source()" (traitFocused)="onTraitFocused($event)" />
```

```ts
source = computed<SpecimenSource>(() => ({
  kind: 'blueprint',
  id: 'rover-3',
  blueprint: this.rover(),
  traits: [
    { id: 'wheels', label: 'Wheel size', valueLabel: 'Large', roles: ['wheel'] },
  ],
}));
```

Selecting a trait mutes every part that trait did not shape. That is the pedagogical payload: it
answers *which bits did this gene build?* `roles` drives it, so a trait with an empty role list is
treated as whole-specimen (overall size, colour) and highlights nothing in particular.

## Loading a student's genome, or a stored model

Register a profile once — in `appConfig`, in a lazy route's `providers`, or on the hosting
component (all three work; the component adopts profiles from its own injector):

```ts
providers: [provideDragonSpecimenProfile()]
```

Then any of these render:

```ts
// A student's four-trait lab genotype
dragonLabGenomeSource('ember', student.genome, { label: 'Ember' })

// The continuous engine genome
dragonEngineGenomeSource(genome)

// A hatched offspring, using the exact assembly in the clutch
dragonOffspringSource(offspring)

// A record loaded from storage
{ kind: 'stored', model: parseStoredSpecimenModel(json)! }
```

Resolution never throws. A missing profile or a malformed record produces an `error` resolution the
component displays, because these inputs come from student data and from records written by older
builds.

### Saving

```ts
const model = toStoredSpecimenModel(descriptor, { genome, includeBlueprint: true });
```

Two strategies, both supported:

- **Genome included** — compact, and re-expresses through the registered profile, so saved
  specimens pick up later anatomy improvements. Needs the profile at load time.
- **Blueprint baked in** — larger and frozen at the geometry that was saved, but renders anywhere
  with no profile registered.

Saving both is the default and is deliberate: the genome is the source of truth, the blueprint is
the fallback. `SpecimenProfileRegistry` prefers the genome and falls back to the bake.

`parseStoredSpecimenModel` validates rather than casts — wrong schema version, non-renderable
parts, and malformed traits are rejected or dropped without taking the record with them.

## Grids of specimens

Do not mount a live viewer per tile. Browsers cap WebGL contexts (commonly ~16) and silently drop
the oldest, so a clutch grid degrades into blank tiles as the student scrolls.

```ts
const frame = mergeSpecimenFrames(clutch.map(d => estimateSpecimenFrame(d.blueprint)));
const images = thumbnails.bakeAll(clutch, { frame, size: 128 });
```

`SpecimenThumbnailService` bakes through **one** shared offscreen context and caches by render
signature. Reserve the live viewer for the single specimen a student has opened.

### Shared framing matters

Pass a merged `frame` whenever specimens are shown side by side. Fitting each one individually
scales them all to the same on-screen size, which erases exactly the size difference the student is
being asked to observe. Body scale spans 0.78–1.33 and wing span 0.72–1.57 across genomes; that
spread *is* the lesson.

## Writing a profile for a new simulation

```ts
export const ROVER_PROFILE: SpecimenProfile<RoverGenome> = {
  id: 'rover-lab',
  supports: (value): value is RoverGenome => /* narrow untrusted stored data */,
  express: (genome, options) => describeSpecimen(options.id ?? genome.id, buildRover(genome), {
    label: options.label,
    traits: buildRoverTraits(genome),
  }),
};
```

Two rules worth following:

1. **Never rename a shipped profile id.** It is written into saved records.
2. **Derive trait `roles` from whatever table drives the geometry**, not a second hand-written list.
   The dragon profile reads `DRAGON_LOCUS_VISUALS`, the same table `getFeatureScale` scales parts
   from. Split in two they drift, and a student gets told a gene shaped a part it never touched.

## The test bench

`<app-specimen-test-bench>` is the specimen viewer plus three panels: what the creation can
attack with, what protects it, and how that adds up. It runs no physics and needs no opponent.

```html
<app-specimen-test-bench
  [source]="build().source"
  [combatProfile]="build().combatProfile"
  [fireBreathing]="build().fireBreathing"
  [copy]="DRAGON_BENCH_COPY" />
```

Pressing a move plays it on the model — jaws snap, wings slam, the tail whips, the fire cone
opens. These are **demonstrations, not simulations**: the motion is illustration, but every damage
and cooldown figure comes from `shared/assembly/combat/assembly-abilities.ts`, which is the same
table the arena physics reads. Neither can quote a different number at a student.

Three things worth knowing if you extend it:

- **Every ability curve must return exactly 0 at phase 0 and phase 1.** Otherwise the limb jumps
  when the student presses the button and snaps back at the end. `specimen-ability-pose.spec.ts`
  enforces this for all of them.
- **Unavailable moves are listed, not hidden.** "Two recessive wing alleles (ww) means no wings
  grew" teaches more than an absent button.
- **Fire breath is gated by genotype, not by a part.** Nothing on the body announces it, so the
  host passes `fireBreathing`, exactly as the arena's control layer does.

### On the fitness score

It is a weighted mean of four saturating components, and the bench shows every weight, every raw
measurement, and a caveat naming the environment it was measured in. That transparency is the
point: the transferable idea is that fitness depends on the environment, not that a dragon has a
number. Do not reduce it to a bare score.

Two calibration notes, both learned by measuring rather than guessing:

- Half-saturation points are set from the classic dragon's real range (damage 8.6-11.5/s, health
  715-1365, core armour 0-0.28), so a genome change visibly moves the score — 41 to 60 across the
  full range.
- **Protection reads core armour, not the mean across parts.** Averaged over a 21-part dragon where
  only the core carries armour, the mean sits at 0.001-0.013 at every genome — a statistic diluted
  into meaninglessness. The core is what ends the fight.

## Keep the flat diagrams

This is a *phenotype* readout and nothing else. Chromosomes, allele pairs, Punnett grids, and egg
tray state belong in the SVG displays under `shared/dragon-visuals`, where they stay accessible and
testable. The intended layout is genotype in SVG on one side, phenotype in 3D on the other. That
also respects the display boundary: those renderers may not import feature or arena code, so
composition happens one level up, in the station components.

## Degradation

- **No WebGL** — `isSpecimenRenderingAvailable()` is false, the component shows the trait readings
  and a short explanation, and `bake()` returns null so a grid can fall back to its flat glyphs.
- **`prefers-reduced-motion`** — the turntable refuses to start. Every trait it would reveal is
  readable from the static three-quarter view.

## Tests

Pure logic (pose, framing, registry, storage) is covered without WebGL.
`specimen-thumbnail.service.spec.ts` is the one place WebGL runs: it decodes the baked PNG and
counts opaque pixels, so a blank canvas fails rather than passing a data-URL length check.
