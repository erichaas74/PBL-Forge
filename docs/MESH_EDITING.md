# Editing dragon meshes

The dragon's anatomy is **generated code**, not authored art. There are no model
files: every part is built at render time from `part.dimensions`, `part.color`,
and a set of style numbers. This is the map of what lives where, and what a
change drags along with it.

## Handing the code to another assistant

```powershell
node scripts/mesh-briefing.mjs                     # the factory alone (~13.6k tokens)
node scripts/mesh-briefing.mjs --include=head      # + skull silhouette
node scripts/mesh-briefing.mjs --include=head,wing
node scripts/mesh-briefing.mjs --include=all       # everything (~25k tokens)
```

Writes `.briefing/dragon-mesh-briefing.md` — the rules, the ripple table, the
file map, and the current source in one pasteable document. It is generated
rather than committed, because a hand-copied 1,400-line file is stale as soon as
someone edits the real one.

Include only what the job needs. The silhouette of a head or a wing lives in its
**profile module**, not in the factory, so an assistant given only the factory
will try to reshape a skull by scaling primitives and get nowhere.

## Where everything lives

There are **two** procedural species. Everything below describes the classic dragon. The
domesticated mini dragon of the Mini Dragon Show is a separate animal in
`src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts`, sharing no builder,
silhouette, palette, or texture with it — see the table row at the end of the map.

| Concern | Path |
| --- | --- |
| **All part geometry** — every `build*` function, `DEFAULT_DRAGON_STYLE`, the `profileId` switch | `src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.ts` |
| Body silhouette | `src/app/shared/assembly/rendering/dragon-body-profile.ts` |
| Skull silhouette, jaw mount | `src/app/shared/assembly/rendering/dragon-head-profile.ts` |
| Wing planform | `src/app/shared/assembly/rendering/dragon-wing-profile.ts` |
| Surface textures (scale, horn, keratin tiles) | `src/app/shared/assembly/rendering/dragon-textures.ts` |
| Mesh tests | `src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.spec.ts` |
| Which sliders the Parts Lab shows (`STYLE_CONTROLS`) | `designer/src/app/parts-lab/parts-lab.page.ts` |
| Part catalog — dimensions, colour, mass, sockets, `visualProfile` | `designer/src/app/assembly-garage/data/assembly-part-definitions.ts` |
| Allowed profile ids (`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`) | `src/app/shared/assembly/model-pack/dragon-model-pack.models.ts` |
| Genome → visual parameters | `src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts` |
| Style → parameters at export | `designer/src/app/dragon-model-pack-export.ts` |
| Published-model assertions | `scripts/check-dragon-model-compatibility.mjs` |
| **Mini dragon** — all six of its builders, its own palette, materials, and profile ids | `src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts` |
| Mini dragon genome → blueprint (no published pack involved) | `src/app/features/dragon-genetics/workstations/companion-show/mini-dragon.anatomy.ts` |

### The mini dragon is not in the model pack

The classic dragon is stamped from `model-packs/dragon-model-pack.v1.json`, validated against
`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and rescaled per genome. The mini dragon is assembled part
by part in code instead, because its genes change *which parts exist* and their proportions relative
to each other — a uniform rescale of one authored skeleton cannot express that. It therefore needs no
pack entry and no supported-profile-id registration, and `npm run build` does not check it. Its
parameter keys are all `mini`-prefixed so the two species' `parameters` contracts stay disjoint.

## What a change drags along

| Change | Also update |
| --- | --- |
| A number inside a builder — position, size, angle | **Nothing.** Most edits are this. |
| Rename or remove a named child mesh | the factory spec, which looks them up by name |
| Add a tunable number | the style interface + `DEFAULT_DRAGON_STYLE`, then `STYLE_CONTROLS` for a slider |
| Add a new `profileId` | the factory switch, `SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and the part's `visualProfile` |
| Rename a `parameters` key | four files — see the warning below |
| Part dimensions, colour, mass, sockets | the catalog, not the factory |

### Parameter keys are a validated contract

`visualProfile.parameters` keys are read by the factory, **written** by the
genetics code, materialised by the pack exporter, and asserted by the
compatibility script. The profile-specific schema in
`dragon-visual-parameters.ts` rejects unknown or mistyped keys at the model-pack
boundary, and the compatibility check compares that schema with every key read
by the factory. The current keys:

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
out rather than spread, because the style names it `joint.ball` and the factory
reads a flat `jointBall` — and the balls are seated on the **pivot**, not on the
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

1. Add the field to the style interface and `DEFAULT_DRAGON_STYLE`.
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
