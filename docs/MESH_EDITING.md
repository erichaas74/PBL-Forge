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

## What a change drags along

| Change | Also update |
| --- | --- |
| A number inside a builder — position, size, angle | **Nothing.** Most edits are this. |
| Rename or remove a named child mesh | the factory spec, which looks them up by name |
| Add a tunable number | the style interface + `DEFAULT_DRAGON_STYLE`, then `STYLE_CONTROLS` for a slider |
| Add a new `profileId` | the factory switch, `SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS`, and the part's `visualProfile` |
| Rename a `parameters` key | four files — see the warning below |
| Part dimensions, colour, mass, sockets | the catalog, not the factory |

### The parameters keys are a silent contract

`visualProfile.parameters` keys are read by the factory, **written** by the
genetics code, materialised by the pack exporter, and asserted by the
compatibility script. Renaming one throws no error: `visualNumber` falls back to
its default, and the part quietly stops responding to its genes. The current
keys:

```text
backSpikeCount backSpikeScale browLength browRidge camber cheek clawScale cranium
crestScale dihedral earShape eyeAxial eyeColor fangScale fingerSag hornLength
hornRadius muzzleDepth muzzleDrop muzzleWidth scallop sex spikeCount spikeHeight
spikeLean spikeLength spikeRadius spikeSpread tailClubSpikeCount tailClubSpikeScale
talonCount talonLength talonRadius toothCount toothHeight toothRadius toothStart
```

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
