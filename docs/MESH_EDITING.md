# Editing dragon meshes

The dragon's anatomy is **generated code**, not authored art. There are no model
files: every part is built at render time from `part.dimensions`, `part.color`,
and a set of style numbers. This is the map of what lives where, and what a
change drags along with it.

## Handing the code to another assistant

```powershell
node scripts/mesh-briefing.mjs                     # factory plus shared rendering helpers
node scripts/mesh-briefing.mjs --include=head      # + skull silhouette
node scripts/mesh-briefing.mjs --include=head,wing
node scripts/mesh-briefing.mjs --include=mini      # + the focused mini-dragon renderer
node scripts/mesh-briefing.mjs --include=all       # every classic and mini module
```

Writes `.briefing/dragon-mesh-briefing.md` — the rules, the ripple table, the
file map, and the current source in one pasteable document. It is generated
rather than committed, because a hand-copied multi-file source bundle is stale
as soon as someone edits the real code.

Include only what the job needs. The silhouette of a head or a wing lives in its
**profile module**, not in its builder, so an assistant given only the factory
will try to reshape a skull by scaling primitives and get nowhere.

## Where everything lives

There are **two** procedural species. Everything below describes the classic dragon. The
domesticated mini dragon of the Mini Dragon Show is a separate animal with its own focused
`mini-dragon-*.ts` modules, sharing no builder, silhouette, palette, material, or texture with it.

| Concern                                                                        | Path                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Shared assembly object routing                                                 | `src/app/shared/assembly/rendering/three-assembly-mesh.factory.ts`                    |
| Primitive geometry, materials, and render signatures                           | `src/app/shared/assembly/rendering/assembly-primitive-rendering.ts`                   |
| Appearance, damage, highlighting, and material traversal                       | `src/app/shared/assembly/rendering/assembly-appearance.ts`                            |
| Geometry, material, and owned-texture disposal                                 | `src/app/shared/assembly/rendering/assembly-object-disposal.ts`                       |
| Shared assembly rendering tests                                                | `src/app/shared/assembly/rendering/assembly-*.spec.ts`                                |
| Stage compatibility exports                                                    | `src/app/shared/assembly/rendering/scene-environment.ts`                              |
| Stage themes                                                                   | `src/app/shared/assembly/rendering/stage-themes.ts`                                   |
| Renderer setup, environment probe, and light rig                               | `src/app/shared/assembly/rendering/stage-lighting.ts`                                 |
| Gradient, overcast-sky, and ground textures                                    | `src/app/shared/assembly/rendering/stage-textures.ts`                                 |
| Quality-gated AO, bloom, output, and antialiasing                              | `src/app/shared/assembly/rendering/stage-post-processing.ts`                          |
| `profileId` routing                                                            | `src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.ts`                 |
| **Body geometry** — torso, archetypes, spikes, sockets, glow row               | `src/app/shared/assembly/rendering/dragon-body-mesh.ts`                               |
| **Head orchestration** — joins the skull and decorative anatomy                | `src/app/shared/assembly/rendering/dragon-head-mesh.ts`                               |
| **Head skull** — lofted skull geometry and neck socket                         | `src/app/shared/assembly/rendering/dragon-head-skull.ts`                              |
| **Head-decoration orchestration**                                              | `src/app/shared/assembly/rendering/dragon-head-decorations.ts`                        |
| **Head sensory features** — horns, brows, eyes, pupils, highlights             | `src/app/shared/assembly/rendering/dragon-head-sensory-features.ts`                   |
| **Inherited head features** — genetic crest, glow, female frills               | `src/app/shared/assembly/rendering/dragon-head-expressive-features.ts`                |
| **Male display frill** — curved spines, tessellated web, jaw spines            | `src/app/shared/assembly/rendering/dragon-head-male-frill.ts`                         |
| **Jaw geometry** — tapered snout, nostrils, nose horn, teeth, fangs            | `src/app/shared/assembly/rendering/dragon-jaw-mesh.ts`                                |
| **Limb compatibility exports**                                                 | `src/app/shared/assembly/rendering/dragon-limb-mesh.ts`                               |
| **Walking legs and shared limb joint covers**                                  | `src/app/shared/assembly/rendering/dragon-leg-mesh.ts`                                |
| **Grasping arms, hands, fingers, and thumbs**                                  | `src/app/shared/assembly/rendering/dragon-grasp-mesh.ts`                              |
| **Feet, toes, and reusable talons**                                            | `src/app/shared/assembly/rendering/dragon-foot-mesh.ts`                               |
| **Wing geometry** — membrane grid, leading-edge bone, finger struts, mirroring | `src/app/shared/assembly/rendering/dragon-wing-mesh.ts`                               |
| **Tail geometry** — segments, vertebrae, glow nodes, clubs, spikes, stingers   | `src/app/shared/assembly/rendering/dragon-tail-mesh.ts`                               |
| Shared mesh, detail-tier, and tapered-geometry helpers                         | `src/app/shared/assembly/rendering/dragon-geometry.ts`                                |
| Texture-map contract and world-space tile sizes                                | `src/app/shared/assembly/rendering/dragon-texture-constants.ts`                       |
| Tiled and box-projected UV assignment                                          | `src/app/shared/assembly/rendering/dragon-uv.ts`                                      |
| Shared glow-node, joint-ball, and spacing helpers                              | `src/app/shared/assembly/rendering/dragon-anatomy.ts`                                 |
| Shared style contracts, defaults, and Designer override                        | `src/app/shared/assembly/rendering/dragon-style.ts`                                   |
| Material compatibility exports                                                 | `src/app/shared/assembly/rendering/dragon-materials.ts`                               |
| Palette and inherited pigment derivation                                       | `src/app/shared/assembly/rendering/dragon-palette.ts`                                 |
| Scale, belly, keratin, membrane, and nostril materials                         | `src/app/shared/assembly/rendering/dragon-surface-materials.ts`                       |
| Eye, pupil, highlight, and glow materials                                      | `src/app/shared/assembly/rendering/dragon-feature-materials.ts`                       |
| Typed visual-parameter readers                                                 | `src/app/shared/assembly/rendering/dragon-visual-parameter-readers.ts`                |
| Body silhouette                                                                | `src/app/shared/assembly/rendering/dragon-body-profile.ts`                            |
| Skull-profile compatibility exports                                            | `src/app/shared/assembly/rendering/dragon-head-profile.ts`                            |
| Skull shape presets, trait adjustment, and part extents                        | `src/app/shared/assembly/rendering/dragon-head-shape.ts`                              |
| Skull stations, section sampling, and surface points                           | `src/app/shared/assembly/rendering/dragon-head-sections.ts`                           |
| Jaw, eye, horn, and nostril landmarks                                          | `src/app/shared/assembly/rendering/dragon-head-landmarks.ts`                          |
| Wing planform                                                                  | `src/app/shared/assembly/rendering/dragon-wing-profile.ts`                            |
| Texture compatibility exports and per-part seed                                | `src/app/shared/assembly/rendering/dragon-textures.ts`                                |
| Texture cache, quality tier, and disposal                                      | `src/app/shared/assembly/rendering/dragon-texture-cache.ts`                           |
| Noise, canvas, field, RGB, and normal-map generation                           | `src/app/shared/assembly/rendering/dragon-texture-generation.ts`                      |
| Scale relief, chromatic grain, and pigment masks                               | `src/app/shared/assembly/rendering/dragon-scale-textures.ts`                          |
| Horn growth rings and claw/tooth keratin                                       | `src/app/shared/assembly/rendering/dragon-keratin-textures.ts`                        |
| Wing-membrane veins, tissue relief, roughness, and transparency                | `src/app/shared/assembly/rendering/dragon-membrane-textures.ts`                       |
| Texture cache, scale, keratin, membrane, and seed tests                        | `src/app/shared/assembly/rendering/dragon-*texture*.spec.ts`                          |
| UV-projection tests                                                            | `src/app/shared/assembly/rendering/dragon-uv.spec.ts`                                 |
| Palette and material tests                                                     | `src/app/shared/assembly/rendering/dragon-{palette,*-materials}.spec.ts`              |
| Geometry-helper tests                                                          | `src/app/shared/assembly/rendering/dragon-geometry.spec.ts`                           |
| Body-builder tests                                                             | `src/app/shared/assembly/rendering/dragon-body-mesh.spec.ts`                          |
| Head sensory-feature tests                                                     | `src/app/shared/assembly/rendering/dragon-head-sensory-features.spec.ts`              |
| Male-frill tests                                                               | `src/app/shared/assembly/rendering/dragon-head-male-frill.spec.ts`                    |
| Skull shape, section, and landmark tests                                       | `src/app/shared/assembly/rendering/dragon-head-{shape,sections,landmarks}.spec.ts`    |
| Skull-builder tests                                                            | `src/app/shared/assembly/rendering/dragon-head-skull.spec.ts`                         |
| Jaw-builder tests                                                              | `src/app/shared/assembly/rendering/dragon-jaw-mesh.spec.ts`                           |
| Walking-leg and foot tests                                                     | `src/app/shared/assembly/rendering/dragon-leg-foot-mesh.spec.ts`                      |
| Grasping-forelimb tests                                                        | `src/app/shared/assembly/rendering/dragon-grasp-mesh.spec.ts`                         |
| Limb-joint tests                                                               | `src/app/shared/assembly/rendering/dragon-leg-joints.spec.ts`                         |
| Wing-builder tests                                                             | `src/app/shared/assembly/rendering/dragon-wing-mesh.spec.ts`                          |
| Tail-builder tests                                                             | `src/app/shared/assembly/rendering/dragon-tail-mesh.spec.ts`                          |
| Mesh tests                                                                     | `src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.spec.ts`            |
| Which sliders the Parts Lab shows (`STYLE_CONTROLS`)                           | `designer/src/app/parts-lab/parts-lab.page.ts`                                        |
| Part catalog — dimensions, colour, mass, sockets, `visualProfile`              | `designer/src/app/assembly-garage/data/assembly-part-definitions.ts`                  |
| Allowed profile ids (`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`)                | `src/app/shared/assembly/model-pack/dragon-model-pack.models.ts`                      |
| Genome → visual parameters                                                     | `src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts`            |
| Style → parameters at export                                                   | `designer/src/app/dragon-model-pack-export.ts`                                        |
| Published-model assertions                                                     | `scripts/check-dragon-model-compatibility.mjs`                                        |
| **Mini-dragon profile routing**                                                | `src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts`            |
| **Mini-dragon body** — torso, dorsal scales, neck, sockets                     | `src/app/shared/assembly/rendering/mini-dragon-body-mesh.ts`                          |
| **Mini-dragon torso anatomy** — profile and surface sampling                   | `src/app/shared/assembly/rendering/mini-dragon-anatomy.ts`                            |
| **Mini-dragon head orchestration** — cranium, snout, and feature composition   | `src/app/shared/assembly/rendering/mini-dragon-head-mesh.ts`                          |
| **Mini-dragon face** — eyes, ears, and cheek tufts                             | `src/app/shared/assembly/rendering/mini-dragon-face-mesh.ts`                          |
| **Mini-dragon head ornaments** — horns, crown bumps, and side frills           | `src/app/shared/assembly/rendering/mini-dragon-head-ornaments.ts`                     |
| **Mini-dragon jaw** — lower muzzle, mouth, ember, and milk teeth               | `src/app/shared/assembly/rendering/mini-dragon-jaw-mesh.ts`                           |
| **Mini-dragon limbs** — thigh, shank, paw, toes, joint covers                  | `src/app/shared/assembly/rendering/mini-dragon-limb-mesh.ts`                          |
| **Mini-dragon wings** — membrane, bones, vestigial nub, feather layer          | `src/app/shared/assembly/rendering/mini-dragon-wing-mesh.ts`                          |
| **Mini-dragon tail** — segments and inherited plume forms                      | `src/app/shared/assembly/rendering/mini-dragon-tail-mesh.ts`                          |
| **Mini-dragon feathers** — generated cards and deterministic instancing        | `src/app/shared/assembly/rendering/mini-dragon-feathers.ts`                           |
| **Mini-dragon palette, materials, and low-level helpers**                      | `src/app/shared/assembly/rendering/mini-dragon-rendering.ts`                          |
| Mini dragon genome → blueprint (no published pack involved)                    | `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.anatomy.ts` |

### The mini dragon is not in the model pack

The classic dragon is stamped from `model-packs/dragon-model-pack.v1.json`, validated against
`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and rescaled per genome. The mini dragon is assembled part
by part in code instead, because its genes change _which parts exist_ and their proportions relative
to each other — a uniform rescale of one authored skeleton cannot express that. It therefore needs no
pack entry and no supported-profile-id registration, and `npm run build` does not check it. Its
parameter keys are all `mini`-prefixed so the two species' `parameters` contracts stay disjoint.

## What a change drags along

| Change                                            | Also update                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A number inside a builder — position, size, angle | **Nothing.** Most edits are this.                                                             |
| Rename or remove a named child mesh               | the factory spec, which looks them up by name                                                 |
| Add a tunable number                              | the style interface + `DEFAULT_DRAGON_STYLE`, then `STYLE_CONTROLS` for a slider              |
| Add a new `profileId`                             | the factory switch, `SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and the part's `visualProfile` |
| Rename a `parameters` key                         | four files — see the warning below                                                            |
| Part dimensions, colour, mass, sockets            | the catalog, not the factory                                                                  |

### Parameter keys are a validated contract

`visualProfile.parameters` keys are read by the rendering implementation,
**written** by the genetics code, materialised by the pack exporter, and asserted by the
compatibility script. The profile-specific schema in
`dragon-visual-parameters.ts` rejects unknown or mistyped keys at the model-pack
boundary, and the compatibility check compares that schema with every key read
through the shared readers. The current keys:

```text
backSpikeCount backSpikeScale bodyArchetype browLength browRidge camber cheek clawScale cranium
crestScale dihedral eyeAxial eyeColor fangScale fingerCount fingerLength
fingerRadius fingerSag fingerSplay glowMarkings hornLength hornRadius jointBall
muzzleDepth muzzleDrop muzzleWidth noseHornLength palmLength patternColor scalePattern scallop sex spikeCount
spikeHeight spikeLean spikeLength spikeRadius spikeSpread tailClubSpikeCount
tailClubSpikeScale talonCount talonLength talonRadius toothCount toothHeight
toothRadius toothStart
```

Wing folding is stance-driven rather than serialized as a visual parameter, so
the same blueprint can be posed for a bench or arena without mutating its model
contract.

`fingerCount`, `fingerLength`, `fingerRadius`, `palmLength` (the legacy key now
used for wrist offset) and `fingerSplay` shape the padless grasping hand
(`dragon-grasp-hand`), which with `dragon-grasp-arm` is
the **second forelimb body plan**. A dragon carrying `ll` at the leg locus has
its front walking chain swapped for these at expression time — see
`applyGraspingForelimbs` in `dragon-inheritance.ts` — and is then shown reared
onto its hind legs, because `dragonRestingPose` picks the stance off the
blueprint. Neither part is on any preset: they exist only inside an expressed
blueprint, and are catalogued purely so the Parts Lab can open them.

`jointBall` is the width of the sphere that closes a hinge, as a multiple of the
part's own radius where the joint sits. Every limb and tail link is an open
lathe, so without it a bent hip, knee, ankle, tail joint, or neck shows the
hollow inside both parts. The torso is the same story at a larger scale — its
lathe stops at 0.28 of the section at the tail and 0.42 at the neck, so it caps
its own two openings, with an **ellipsoid matched to the section** rather than a
sphere, because the opening is an ellipse and a sphere wide enough to close the
flanks stands proud of the spine and belly. It is written by `style.joint.ball` at export — spelled
out rather than spread, because the style names it `joint.ball` and the shared
reader consumes a flat `jointBall` — and the balls are seated on the **pivot**, not on the
end of the mesh, which is what keeps them in the socket at any bend angle.

`scalePattern` is the odd one out: a 0/1 flag rather than a measurement, set on
**every** part instead of one profile, and it selects a texture set rather than
reshaping geometry. It carries the `S` locus's dominant phenotype, and it is a
phenotype and not a genotype on purpose — see the note where it is written in
`dragon-inheritance.ts`.

`glowMarkings` is the other flag: a real boolean, carrying the `N` locus's
dominant phenotype, and stamped on the body, the head and every tail part —
`GLOWING_PROFILE_IDS` in `dragon-inheritance.ts` is the list. It adds emissive
nodes rather than reshaping anything, so it is the only trait that stays legible
at thumbnail size and in a dark arena. It replaced `earShape`, whose two
phenotypes were a small pointed flap and a small rounded one; nobody could tell
them apart on a hatchling, which defeats the point of a visible trait.

## Making a number tunable instead of hardcoded

Three steps, and it becomes both a Parts Lab slider and a per-part override:

1. Add the field to the style interface and `DEFAULT_DRAGON_STYLE` in `dragon-style.ts`.
2. In the builder, replace the literal with
   `visualNumber(part, 'yourKey', defaults.yourKey)`.
3. Add a row to `STYLE_CONTROLS` with a min, max, and step.

Keep it a fraction of `dims`, never a world measurement — genetics rescales
these parts per genome.

## Seeing the result

The Parts Lab hot-reloads on save. Deep-link the part:

```text
http://localhost:4300/parts-lab?family=dragon&part=dragon-upper-jaw
```

Or headlessly, which also works for an assistant:

```powershell
node scripts/browser.mjs --serve=designer "parts-lab?family=dragon&part=dragon-upper-jaw" `
  "sleep 6000" "shot jaw [data-bake=contact-sheet]"
```

Then check it:

```powershell
npm run lint
npm run test:ci    # includes the mesh specs
npm run build      # runs the model-pack and compatibility checks
```
