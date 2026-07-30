# Dragon visual display implementations

This directory is the implementation home for the independent laboratory station renderers. Build
one folder per `DragonVisualSceneKind`; keep reusable SVG loading, semantic binding, animation
playback, and accessibility helpers at this level.

Before implementing a station, follow the [simulation build standard](../../../../../docs/dragon-genetics-simulations/SIMULATION_BUILD_STANDARD.md)
and its [station-specific guide](../../../../../docs/dragon-genetics-simulations/README.md).

Renderers may import the shared visual domain, visual pack, teaching sequence, and signal bridge.
They must not import Dragon Genetics lessons, stores, Firestore, routing, assessment, or arena code.

`shared/` holds the helpers every station reuses: copy resolution, reduced-motion detection, the
declarative teaching-sequence player, the glyph renderer, and the chromosome diagram
(`chromosome-diagram.ts` / `chromosome-pair.component.ts`) that draws alleles and genotypes for
every station that shows them.

Station folders correspond to these contract kinds:

- `trait-inspector` — built ([station README](trait-inspector/README.md))
- `genome-microscope` - built ([station README](genome-microscope/README.md))
- `genotype-scanner` — built ([station README](genotype-scanner/README.md))
- `allele-switchboard` - built ([station README](allele-switchboard/README.md))
- `dragon-hatchery` — built, shared by several modules ([station README](dragon-hatchery/README.md))
- `punnett-composer`
- `incubator-sampler`
- `reproduction-comparison`
- `sibling-tracer`
- `diversity-manager`
- `evidence-replay`
