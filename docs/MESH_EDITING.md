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
| **Body geometry** — torso, archetypes, spike rows, and sockets                 | `src/app/shared/assembly/rendering/dragon-body-mesh.ts`                               |
| **Head orchestration** — joins the skull and decorative anatomy                | `src/app/shared/assembly/rendering/dragon-head-mesh.ts`                               |
| **Head skull** — lofted skull geometry and neck socket                         | `src/app/shared/assembly/rendering/dragon-head-skull.ts`                              |
| **Head-decoration orchestration**                                              | `src/app/shared/assembly/rendering/dragon-head-decorations.ts`                        |
| **Head sensory features** — horns, brows, eyes, pupils, highlights             | `src/app/shared/assembly/rendering/dragon-head-sensory-features.ts`                   |
| **Inherited head features** — genetic crest and sex-specific frills            | `src/app/shared/assembly/rendering/dragon-head-expressive-features.ts`                |
| **Male display frill** — curved spines, tessellated web, jaw spines            | `src/app/shared/assembly/rendering/dragon-head-male-frill.ts`                         |
| **Jaw geometry** — tapered snout, nostrils, nose horn, teeth, fangs            | `src/app/shared/assembly/rendering/dragon-jaw-mesh.ts`                                |
| **Limb compatibility exports**                                                 | `src/app/shared/assembly/rendering/dragon-limb-mesh.ts`                               |
| **Walking legs and shared limb joint covers**                                  | `src/app/shared/assembly/rendering/dragon-leg-mesh.ts`                                |
| **Grasping arms, hands, fingers, and thumbs**                                  | `src/app/shared/assembly/rendering/dragon-grasp-mesh.ts`                              |
| **Feet, toes, and reusable talons**                                            | `src/app/shared/assembly/rendering/dragon-foot-mesh.ts`                               |
| **Wing geometry** — membrane grid, leading-edge bone, finger struts, mirroring | `src/app/shared/assembly/rendering/dragon-wing-mesh.ts`                               |
| **Tail geometry** — segments, vertebrae, clubs, spikes, and stingers           | `src/app/shared/assembly/rendering/dragon-tail-mesh.ts`                               |
| Shared mesh, detail-tier, and tapered-geometry helpers                         | `src/app/shared/assembly/rendering/dragon-geometry.ts`                                |
| Texture-map contract and world-space tile sizes                                | `src/app/shared/assembly/rendering/dragon-texture-constants.ts`                       |
| Tiled and box-projected UV assignment                                          | `src/app/shared/assembly/rendering/dragon-uv.ts`                                      |
| Shared horn, joint-ball, and spacing helpers                                   | `src/app/shared/assembly/rendering/dragon-anatomy.ts`                                 |
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
| Visual-parameter metadata, ranges, sections, and genetics ownership            | `src/app/shared/assembly/model-pack/dragon-visual-parameter-registry.ts`               |
| Which sliders the Parts Lab shows (generated from the registry)                | `designer/src/app/parts-lab/parts-lab.page.ts`                                        |
| Anatomy-layer grouping, protection, visibility, and gene badges                | `designer/src/app/parts-lab/part-anatomy-layers.ts`                                   |
| Part catalog — dimensions, colour, mass, sockets, `visualProfile`              | `designer/src/app/assembly-garage/data/assembly-part-definitions.ts`                  |
| Allowed profile ids (`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`)                | `src/app/shared/assembly/model-pack/dragon-model-pack.models.ts`                      |
| Genome → visual parameters                                                     | `src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts`            |
| Classic style → parameters at export                                           | `designer/src/app/dragon-model-pack-export.ts`                                        |
| Complete Mini Dragon assembly added at export                                  | `designer/src/app/mini-dragon-model-export.ts`                                        |
| Published-model assertions                                                     | `scripts/check-dragon-model-compatibility.mjs`                                        |
| **Mini-dragon profile routing**                                                | `src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts`            |
| **Mini-dragon body** — torso, dorsal scales, neck, sockets                     | `src/app/shared/assembly/rendering/mini-dragon-body-mesh.ts`                          |
| **Mini-dragon torso anatomy** — profile and surface sampling                   | `src/app/shared/assembly/rendering/mini-dragon-anatomy.ts`                            |
| **Mini-dragon head orchestration** — cranium, snout, and feature composition   | `src/app/shared/assembly/rendering/mini-dragon-head-mesh.ts`                          |
| **Mini-dragon face** — eyes and cheek tufts                                    | `src/app/shared/assembly/rendering/mini-dragon-face-mesh.ts`                          |
| **Mini-dragon movable head appendages** — independent horn and ear parts       | `src/app/shared/assembly/rendering/mini-dragon-head-appendages.ts`                    |
| **Mini-dragon head ornaments** — crown bumps and side frills                   | `src/app/shared/assembly/rendering/mini-dragon-head-ornaments.ts`                     |
| **Mini-dragon jaw** — lower muzzle, mouth, ember, and milk teeth               | `src/app/shared/assembly/rendering/mini-dragon-jaw-mesh.ts`                           |
| **Mini-dragon limbs** — thigh, shank, paw, toes, joint covers                  | `src/app/shared/assembly/rendering/mini-dragon-limb-mesh.ts`                          |
| **Mini-dragon wings** — membrane, bones, vestigial nub, feather layer          | `src/app/shared/assembly/rendering/mini-dragon-wing-mesh.ts`                          |
| **Mini-dragon tail** — segments, split-tail branches, and inherited tips       | `src/app/shared/assembly/rendering/mini-dragon-tail-mesh.ts`                          |
| **Mini-dragon feathers** — generated cards and deterministic instancing        | `src/app/shared/assembly/rendering/mini-dragon-feathers.ts`                           |
| **Mini-dragon semantic colours and pigment derivation**                        | `src/app/shared/assembly/rendering/mini-dragon-palette.ts`                            |
| **Mini-dragon biological surface and feature materials**                       | `src/app/shared/assembly/rendering/mini-dragon-materials.ts`                          |
| **Mini-dragon part-seeded coat, keratin, membrane, and feather textures**      | `src/app/shared/assembly/rendering/mini-dragon-textures.ts`                           |
| **Mini-dragon mesh, profile, and joint-cover helpers**                         | `src/app/shared/assembly/rendering/mini-dragon-geometry.ts`                           |
| **Mini-dragon visual-parameter readers**                                       | `src/app/shared/assembly/rendering/mini-dragon-visual-parameter-readers.ts`           |
| Mini dragon genome → lesson blueprint                                          | `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.anatomy.ts` |

### The Mini Dragon is included in designer publications

The committed fallback pack still supplies the classic dragon for offline startup. Designer exports
and Firebase publications add a complete connected `mini-dragon` model alongside it. Both species'
profile IDs and parameters are validated by the shared model-pack contract and compatibility check.
The lesson-specific Mini Dragon genome builder remains code-driven because its genes can change which
parts exist, but authored Mini Dragon catalog changes now survive draft storage and publication.

## What a change drags along

| Change                                            | Also update                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A number inside a builder — position, size, angle | **Nothing.** Most edits are this.                                                             |
| Rename or remove a named child mesh               | the factory spec, which looks them up by name                                                 |
| Add a tunable number                              | the visual-parameter registry, the relevant reader, and the style/genetics writer              |
| Add a new `profileId`                             | the factory switch, `SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and the part's `visualProfile` |
| Rename a `parameters` key                         | add a registry migration alias, then update readers and writers before removing the old key    |
| Part dimensions, colour, mass, sockets            | the catalog, not the factory                                                                  |

### Parameter keys are a validated contract

`visualProfile.parameters` keys are read by rendering, written by genetics and designer drafts,
materialised by the pack exporters, and asserted by the compatibility script. The registry in
`dragon-visual-parameter-registry.ts` is the single source of truth for both classic and Mini Dragon
parameters. `dragon-visual-parameters.ts` derives its validator contract from that registry, while
Parts Lab derives its controls from the same metadata. Add ranges, labels, sections, and any legacy
alias there instead of maintaining a second slider list.

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

`backSpikeRows` is the inherited P-locus channel. `P_` builds three complete tall
rows and `pp` builds one complete tall centre row. It is sampled through the body
surface profile so side rows stay seated on every Arena archetype.

The Arena body station keys — `bodyNeckWidth`, `bodyChestWidth`, `bodyChestHeight`,
`bodyWaistWidth`, `bodyBellyDepth`, `bodyHipWidth`, `bodySpineArch`, and
`bodyTailRootWidth` — are per-definition Designer refinements. They layer over the genetics-owned
`bodyArchetype`, and the torso mesh, belly, end sockets, and mounted spike rows sample the same
station contract. The Part Workshop writes these values through either sliders or direct canvas
handles; do not move them into `DragonStyle`, because that would make one Arena body edit reshape
every body type.

The Part Workshop's Anatomy Layers are presentation metadata over this same contract, not a second
parameter source. `part-anatomy-layers.ts` groups canonical keys into one-at-a-time editors, protects
structural layers from being hidden, and marks layers whose preview defaults can be replaced by lesson
gene expression. Add a new renderer key to the shared registry first, then place that key in the
appropriate anatomy layer.

Whole-dragon Parts Lab placement is a separate contract from shape and sockets. Definition dimensions
and parameters answer “what does this catalog part look like?”; snap points answer “where may it
connect?”; `DesignerDragonDraftStore.placementsByContextId` answers “where does this instance sit on
this Arena body type or Mini breed?” Placement is applied to a clone of the Garage preset by
`part-workshop-assembly.ts`, so it cannot leak from Regal to Bulwark or from Fairy to Puggle.

Generated Arena back spikes are the exception to whole-part transforms. The body mesh owns a named
`dragon-back-spike-rows` group and reads `backSpikeOffsetX/Y/Z`, `backSpikePitch/Yaw/Roll`, and
`backSpikePlacementScale`. The Parts Lab stores those as one synthetic placement target and converts
world offsets to body-relative fractions before rendering. Keep the keys registered even though they
have no ordinary slider ranges; the registry still validates every serialized parameter.

Classic head and jaw feature placement is definition-owned rather than assembly-context placement.
Eyes, horns, brow spikes, inherited crest, sex display, Wise regalia, teeth, nostrils, nose horn,
and fangs expose proportional offsets in the visual-parameter registry. Paired anatomy moves
symmetrically: its Z offset changes pair spacing. Tooth rows additionally expose an authored span,
splay, and rake, and the classic jaw size/count controls are per jaw so the lower row can be tuned
without changing the upper row. These controls reshape generated children inside a part; the jaw
hinge itself remains a socket and is still edited in the Snap Workshop.

The isolated Parts Lab also projects registered head/jaw placement, rotation, and scale-like keys as
procedural drag handles. The mapping is semantic and name-based: `*OffsetX/Y/Z`, `*Start`, and
`*Axial` are movement; `*Splay`, `*Rake`, `*Sway`, `*Tilt`, and `*Lean` are rotation; size, length,
radius, width, depth, height, span, and scale keys are resizing. The handle and exact slider write the
same parameter. It is not a Three.js vertex or object transform and must never bypass the canonical
registry.

Classic surface authoring uses `surfaceRelief`, `surfaceRoughness`, `surfaceDetailScale`,
`surfacePatternStrength`, and `surfacePatternScale`. `dragonPaletteForPart` resolves those literal
keys, and `dragon-surface-materials.ts` applies them without mutating cached shared textures. A
non-default detail scale clones the texture wrapper and UV matrix only; canvas pixels remain shared,
and object disposal owns that clone. Membrane veins stay mapped once root-to-tip, so detail scale is
reserved for tiled scale and keratin maps while relief and roughness still apply to membranes.

Gene comparison in the Parts Lab is deliberately non-persistent. Authored, dominant, and recessive
forms are applied to a cloned preview after draft shape and contextual placement are resolved. The
student genetics builders remain authoritative for actual genome-to-phenotype construction.

The horned-head sex switch follows the same non-persistent rule. `applyHeadSexPreview` clones the
isolated or assembled blueprint and overrides `sex` only on selected `dragon-head-horned` instances.
Female and male therefore show their different generated display anatomy without changing the
authored model pack, Designer draft, or student genome.

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
