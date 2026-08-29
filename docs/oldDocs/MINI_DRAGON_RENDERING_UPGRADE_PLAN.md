# Mini Dragon rendering and breed-variation upgrade

Status: proposed implementation plan, 2026-08-22

## Outcome

Turn the Mini Dragon from one rounded procedural animal with trait accessories into a family of
clearly different, composable body plans. Puggle, Fairy, Triceratops, Imperial Serpent, and
Amphiptere must be recognizable from silhouette and stance before colour or labels are shown.

The renderer must remain phenotype-driven. It must never contain `if (breedId === ...)` branches.
A breed is a named combination of visible inherited forms; offspring and student-created standards
must receive the same rendering behavior as the reference breeds.

## Baseline audit

The existing foundation is useful:

- five breed standards and thirteen inherited loci already exist;
- ten focused Mini Dragon renderer profiles keep the species separate from the classic dragon;
- a shared visual-parameter registry validates nineteen Mini Dragon parameters;
- coat, membrane, keratin, and feather textures have independent caches and disposal tests;
- the app can already render reference genomes as complete connected animals; and
- Designer publications include a complete `mini-dragon` model.

The present visual ceiling comes from the implementation rather than the genetics:

- the torso uses one symmetric lathe profile, so frame variation mostly stretches one bean shape;
- the skull is a scaled sphere and the muzzle is another sphere, so all breeds retain the same face;
- ears, cheeks, paws, toes, crests, and tail poms are mostly spheres or capsules;
- the wings use one flat shape with straight cylindrical supports;
- feather cards and dorsal decorations sit on top of the body rather than participating in its form;
- several categorical traits are encoded as thresholded numbers;
- most non-inherited variation affects large silhouette features, which can blur breed recognition;
- Mini Dragon geometry uses fixed segment counts instead of the shared render-quality tier; and
- after switching Parts Lab from Lab Dragon to Mini Dragon, only the first thumbnail currently
  completes its bake. That makes visual regression work unreliable until it is fixed.

## Visual acceptance contract

Every completed breed must pass all of these gates:

1. **Silhouette:** recognizable in a 160 px, single-colour thumbnail from side and three-quarter
   views.
2. **Three anchors:** differs from every other breed in at least three major anchors: torso, head,
   ears/crest, wings, limbs, or tail.
3. **Trait legibility:** every inherited form remains distinguishable at 160 px without relying on
   a text label.
4. **Composability:** every valid combination of forms produces connected anatomy without gaps,
   inverted surfaces, extreme intersections, or detached decorations.
5. **Inheritance honesty:** a non-inherited random feature cannot move an animal across a visible
   inherited-form boundary.
6. **Motion:** the rest pose, breathing, training motions, and arena motion preserve connections and
   do not clip the revised body plan.
7. **Performance:** the low quality tier sustains the existing app frame budget on the target
   Chromebook. Medium and high tiers add geometry and surface detail without changing anatomy.

## Architecture

Use a three-layer expression pipeline:

```text
MiniGenome + individual seed
        |
        v
student-only phenotype expression
        |
        v
shared MiniDragonMorphology (semantic, typed, breed-neutral)
        |
        +--> connected AssemblyBlueprint
        |
        +--> focused procedural part builders
                  |
                  v
          quality-tier geometry + materials
```

### 1. Add a typed morphology contract

Create a game-neutral `MiniDragonMorphology` under `src/app/shared/assembly`. It should group values
by anatomy rather than exposing one flat bag of renderer literals:

- `body`: length, chest depth, belly drop, waist tuck, shoulder width, hip width, spine arch;
- `head`: skull width/height, muzzle length/width/depth, cheek volume, eye size/spacing;
- `earsAndCrest`: ear length/width/fold, horn length/curve/spread, crown and frill scale;
- `limbs`: upper/lower length, thickness, paw width, toe count/splay, claw scale;
- `wings`: span, chord, taper, camber, sweep, scallop, finger count, fold amount;
- `tail`: length, taper, curve, tip form, fork width, club scale, plume fan;
- `surface`: coat form, feather coverage/length, dorsal scale form, patch mask, colours; and
- `presentation`: neutral pose hints that adapt to proportions but do not affect inheritance.

`mini-dragon.anatomy.ts` should express the thirteen loci into this contract, then hand the result to
a shared blueprint builder. The shared renderer remains ignorant of genomes, lessons, and breed IDs.

### 2. Separate three kinds of parameters

Extend the visual-parameter registry so each value is explicitly one of:

- **inherited morphology** — supplied by phenotype expression;
- **authoring morphology** — adjustable in Parts Lab and allowed in published models; or
- **assembly metadata** — mirroring, attachment side, and pose information that must not appear as a
  shape slider.

`miniWingSide` is assembly metadata, not a breed control. `miniTailStyle`, crest forms, coat forms,
and dorsal form should become typed string/boolean choices instead of numbers rounded or compared to
`0.5`. Keep legacy readers during migration and add aliases before removing old keys.

### 3. Add focused shape-profile modules

Builders should sample reusable profiles instead of scaling primitives:

- `mini-dragon-body-profile.ts`: elliptical station loft with separate back, belly, shoulder, waist,
  and hip controls;
- `mini-dragon-head-shape.ts`: skull stations and attachment landmarks for eyes, jaw, ears, horns, and crest;
- `mini-dragon-head-appendages.ts`: independently rigged horn coils and hinged ear petals;
- `mini-dragon-wing-profile.ts`: curved leading edge, finger paths, chord, sweep, and scallop;
- `mini-dragon-limb-profile.ts`: hip, knee, hock, paw, and toe landmarks; and
- `mini-dragon-tail-profile.ts`: connected spline, taper, curve, and tip mounts.

Keep the existing `mini-dragon-*-mesh.ts` modules as focused orchestration owners. Geometry helpers
receive fractions of part dimensions and resolve segment counts through `render-quality.ts`.

## Anatomy upgrade

| Part | Current limitation | Target construction | High-value controls |
| --- | --- | --- | --- |
| Body | Symmetric bean lathe | Elliptical loft with shoulder, rib, waist, hip, belly and spine stations | frame length, belly drop, chest/hip ratio, arch |
| Neck | Straight capsule | Tapered curved tube with mane/frill mount line | length, thickness, rise, curve |
| Head | Sphere plus sphere muzzle | Lofted skull with face landmarks and blended muzzle root | skull ratio, muzzle ratios, cheek, eye spacing |
| Eyes | Exposed balls | Socketed eye, iris, pupil, highlight and soft upper/lower lids | size, spacing, lid openness |
| Ears | Scaled spherical petals | Tapered petal/sail mesh with fold and droop | length, width, fold, tip roundness |
| Horns/crest | Capsules and bumps | Curved tapered horns; crown/frill profiles seated to skull | length, curve, spread, crown/frill scale |
| Jaw | Rounded slab | Tapered lower jaw with lip line, gum ridge and aligned milk teeth | depth, width, tooth count/scale |
| Legs | Lathe pills | Bent thigh/shank profiles with knee/hock landmarks and integrated joint covers | segment ratios, thickness, stance |
| Paws | Sphere plus toe beans | Flattened paw volume, pads, segmented toes and small claws | paw width, toe count/splay, claw scale |
| Wings | Flat kite | Curved fingers, cambered triangulated membrane and a real folded/rest shape | span, chord, sweep, camber, scallop |
| Tail | Two straight beads | Multi-segment spline with continuous taper and breed-readable terminal mounts | length, curve, taper, tip form |
| Feathers | Flat cards on top | Layered instanced cards following body/wing flow maps | coverage, length, density, lay |
| Scales/pattern | Texture grain plus blobs | Object-space masks and instanced scale families aligned to anatomy | scale size, row density, mask type |

The low tier should simplify segment counts and instance density, not replace a breed's form with a
different shape. A low-tier Puggle and high-tier Puggle must have the same silhouette.

## Breed signatures

These signatures describe how the existing visible forms should combine. They are acceptance
fixtures, not renderer branches.

| Breed | Required silhouette | Defining rendering work |
| --- | --- | --- |
| Puggle | Belly-low dumpling, oversized soft head, button muzzle and ears, thick paws, tiny folded wings | Strong belly drop and chest width; true brachycephalic muzzle; ear droop; waddler stance; soft pom tail |
| Fairy | Light balanced frame, large eyes, petal ears/frills, feather mantle, broad butterfly wing planform | Petal ear/frill mesh; layered mantle; translucent scalloped wings; narrower paws and raised curious stance |
| Triceratops | Heavy shoulders, wedge-shaped long face, crown shield/knobs, bumpy armored back, star club | Crown-to-skull integration; pronounced shoulder/rib mass; ordered dorsal armor; clearly lobed soft star club |
| Imperial Serpent | Long arched noodle body and neck, tiny legs and wings, straight velvet horns, cloud-like crown/frill | Continuous long body profile; higher neck carriage; crest mass; vestigial folded wings; gold surface treatment |
| Amphiptere | Narrow winged noodle, very broad swept wings, sail ears, minimal legs, forked paddle tail | Largest wing span/chord; smooth body; strong ear sail; rounded two-lobe tail fork; low loaf rest pose |

The first implementation pair should be **Puggle and Amphiptere**. They are the two silhouette
extremes. If one morphology system can express both without special casing, the remaining three can
be layered onto sound architecture.

## Colour, pattern, and material direction

1. Replace the current floating coat-patch blobs with deterministic object-space masks. Start with
   dorsal saddle, flank patches, face blaze, socks, and speckling. The ash-and-gold locus selects a
   two-colour mask; it should not hardcode one mask layout.
2. Introduce semantic palette roles for base coat, secondary coat, belly, dorsal armor, feather tips,
   keratin, paw pads, iris, ember, and mouth.
3. Give coat forms different normal/roughness families: sleek scales, baby-bumpy scales, and feather
   mantle. Colour cannot be the only difference.
4. Use the individual seed only for small patch placement, scale jitter, feather tilt, iris flecks,
   and tiny asymmetry. Cap silhouette jitter to a narrow band.
5. Keep emissive ember details readable in dark arena lighting, but prevent eye and mouth emissive
   values from flattening their shading.
6. Reuse cached procedural textures and instanced decorations. No per-dragon canvas texture should be
   created without a bounded cache key and disposal coverage.

## Designer upgrades needed to make future upgrades safe

1. Fix the Mini Dragon contact-sheet queue so all twenty-two parts rebake after a species switch.
2. Add a whole-animal Mini Dragon workbench beside Parts Lab:
   - neutral specimen;
   - every phenotype form at both extremes;
   - the five breed reference fixtures;
   - side, front, top, three-quarter, and back views;
   - wireframe, flat-colour silhouette, collider, socket, and joint overlays; and
   - before/after and two-preset comparison.
3. Add grouped, typed controls generated from the registry. Categorical forms use select buttons,
   booleans use toggles, and continuous morphs use sliders.
4. Add a **random valid morphology** stress action. It must generate within registry ranges and report
   disconnected joints, invalid bounds, NaN geometry, or empty meshes.
5. Add Mini Dragon presets to Garage. Designer must be able to load a complete neutral Mini Dragon and
   visual stress fixtures without importing student genetics code.
6. Generate published reference models from canonical fixtures instead of hand-copying blueprints.
   The Firebase package can expose stable IDs such as `mini-dragon-puggle` and
   `mini-dragon-amphiptere`, while the student genome remains the source of inherited animals.

## Implementation phases

### Phase 0 — Baseline and tooling

- Fix all Mini Dragon thumbnail bakes.
- Add triangle, draw-call, texture, and bounding-box reporting to the workbench.
- Capture current five-breed side/three-quarter reference images.
- Add the neutral full-animal Designer fixture and morphology randomizer.

Exit gate: every Mini part and complete fixture bakes deterministically with no console errors.

### Phase 1 — Morphology contract and migration

- Add the typed shared morphology contract and defaults.
- Move genome-to-visual mapping out of the blueprint assembly loop.
- Extend registry metadata with parameter ownership and categorical choices.
- Add legacy readers for the current nineteen parameters.
- Add round-trip and compatibility tests before changing geometry.

Exit gate: old drafts and published models render unchanged through the compatibility adapter.

### Phase 2 — Silhouette core

- Build the body loft and head shape/landmark modules.
- Replace muzzle, eyes/lids, ears, horns, crest, and jaw geometry.
- Tune Puggle and Amphiptere as the two extreme fixtures.

Exit gate: Puggle and Amphiptere pass the grayscale silhouette and six-angle connection gates.

### Phase 3 — Locomotion anatomy

- Replace thigh, lower-leg, paw, toe, wing, and tail builders.
- Introduce curved wing profiles and a folded rest configuration.
- Adapt sockets, joint covers, and motion landmarks to every proportion extreme.

Exit gate: all training and arena poses keep joints seated for both extreme fixtures.

### Phase 4 — Surface rendering

- Add object-space pattern masks and expanded semantic palette roles.
- Rework dorsal scale families, feather flow, membranes, keratin, paws, and eyes.
- Integrate render-quality tiers and bounded caches.

Exit gate: traits remain legible in bright bench, dark arena, and 160 px thumbnail lighting.

### Phase 5 — Five-breed tuning

- Tune Fairy, Triceratops, and Imperial Serpent using the same morphology controls.
- Revisit all five breed standards together; avoid improving one in isolation.
- Compile stable reference models for Designer download and Firebase publication.

Exit gate: a blind silhouette review can distinguish all five breeds, and each rendered feature is
traceable to an existing visible form or documented non-inherited microvariation.

### Phase 6 — Animation, optimization, and release

- Adapt idle, show-training, and arena poses to long, round, teacup, broad-wing, and vestigial forms.
- Profile low/medium/high quality on the target Chromebook and desktop reference device.
- Run full visual, model-pack, genetics, physics, rules, and application verification.
- Publish preview, review all five reference models and the neutral model, then promote.

Exit gate: no performance regression outside the agreed tier budget and no fallback-pack regression.

## Verification strategy

### Contract tests

- every morphology field has a registry definition, default, range, and owner;
- every Mini renderer read is registered and every registered field is consumed or explicitly
  reserved;
- old numeric categorical values migrate to typed forms;
- model-pack and draft JSON round trips preserve all Mini parameters; and
- no student source imports Designer code and no shared renderer imports genetics or breed modules.

### Geometry tests

- finite positions, normals, UVs, indices, and bounding boxes;
- required child mesh names and material roles;
- socket landmarks inside the declared tolerance;
- left/right wing mirroring without negative-scale normal errors;
- no zero-area membrane triangles; and
- bounded vertex/triangle counts at each quality tier.

### Visual tests

- six-angle contact sheets for every part;
- grayscale side and three-quarter breed sheets;
- extreme-form matrix for every inherited locus;
- bright bench, dark arena, and thumbnail captures; and
- approved pixel-diff baselines only after a human silhouette review.

### Integration tests

- every founder, every breed example genome, and a large deterministic sample of offspring builds;
- every complete blueprint is connected and accepted by model-pack validation;
- training and arena motion return to rest without detached anatomy;
- Firebase preview contains neutral Mini Dragon plus the generated reference fixtures; and
- invalid or older remote assets still fall back safely.

## Files expected to change

Shared rendering and contracts:

- `src/app/shared/assembly/model-pack/dragon-visual-parameter-registry.ts`
- `src/app/shared/assembly/rendering/mini-dragon-*.ts`
- new Mini Dragon shape/profile modules under `src/app/shared/assembly/rendering/`
- new game-neutral morphology and blueprint modules under `src/app/shared/assembly/`

Student phenotype expression and breed fixtures:

- `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.anatomy.ts`
- `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.genetics.ts`
- `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.breeds.ts`
- training/arena motion tests where revised landmarks require it

Designer authoring and publication:

- `designer/src/app/parts-lab/**`
- `designer/src/app/assembly-garage/**`
- `designer/src/app/mini-dragon-model-export.ts`
- Mini Dragon acceptance, comparison, and bake tooling

## Recommended delivery slices

Keep each slice shippable and visually reviewable:

1. Mini bake repair + complete-model workbench.
2. Morphology contract + compatibility adapter.
3. Body and head lofts + Puggle fixture.
4. Wing, tail, and limb profiles + Amphiptere fixture.
5. Pattern, scales, feathers, and material upgrade.
6. Fairy, Triceratops, and Imperial tuning.
7. Motion, performance, Firebase reference models, and final release.

Do not start by adding more breeds. First make the existing five unmistakable and make the renderer
cheap to extend; a sixth breed should then be a new standard made from existing morphs, not another
custom geometry branch.
