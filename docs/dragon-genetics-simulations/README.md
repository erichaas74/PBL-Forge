# Dragon Genetics simulation build guides

This folder is the build specification for the nine active independent laboratory displays. Each
simulation consumes semantic genetics data from the shared visual contract and teaches one
scientific model. Laboratory instruments never depend on dragon body artwork; the assembled
dragon remains a separate arena concern.

Start with [Simulation build standard](SIMULATION_BUILD_STANDARD.md), then use the station guide
for the display being implemented.

The current student runtime is the routed, adaptive full-page platform described in
[Adaptive full-page simulation architecture](ADAPTIVE_FULL_PAGE_ARCHITECTURE.md). It provides a
dedicated route, visual instrument, embedded checkpoints, deterministic per-student generation, and
Grade 7 through AP Biology assignment levels for all nine core simulations, the shared Hatchery, and
the Arena evidence experience.

| Module | Student-facing display                    | Scene contract kind       | Build guide                                                   |
| ------ | ----------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| 1      | Trait Evidence Analyzer                   | `trait-inspector`         | [01 - Trait Evidence Analyzer](01-TRAIT-EVIDENCE-ANALYZER.md) |
| 2      | Genome Microscope                         | `genome-microscope`       | [02 - Genome Microscope](02-GENOME-MICROSCOPE.md)             |
| 3      | Genotype Scanner                          | `genotype-scanner`        | [03 - Genotype Scanner](03-GENOTYPE-SCANNER.md)               |
| 4      | Allele Workbench                          | `allele-switchboard`      | [04 - Allele Workbench](04-ALLELE-WORKBENCH.md)               |
| 5      | Punnett Composer                          | `punnett-composer`        | [05 - Punnett Composer](05-PUNNETT-COMPOSER.md)               |
| 6      | Incubator Sampler                         | `incubator-sampler`       | [06 - Incubator Sampler](06-INCUBATOR-SAMPLER.md)             |
| 7      | Reproduction Comparison                   | `reproduction-comparison` | [07 - Reproduction Comparison](07-REPRODUCTION-COMPARISON.md) |
| 8      | DNA Replication, Mutation, and Repair Lab | `dna-process-lab`         | [08 - DNA Process Lab](08-DNA-PROCESS-LAB.md)                 |
| 9      | Diversity Manager                         | `diversity-manager`       | [09 - Diversity Manager](09-DIVERSITY-MANAGER.md)             |

One further instrument belongs to no single module:

| Module | Student-facing display | Scene contract kind | Build guide                                   |
| ------ | ---------------------- | ------------------- | --------------------------------------------- |
| Shared | Dragon Hatchery        | `dragon-hatchery`   | [11 - Dragon Hatchery](11-DRAGON-HATCHERY.md) |

Stations 1 through 4 and the shared hatchery retain their specialized renderer implementations.
All nine active core stations also run through the adaptive full-page visual shell; the specialized guides
remain the reference when a station graduates from the shared adaptive visual grammar to a bespoke
instrument renderer.
Stations that show alleles or genotypes share one chromosome drawing, defined in
[`displays/shared/chromosome-diagram.ts`](../../src/app/shared/dragon-visuals/displays/shared/chromosome-diagram.ts)
from [`docs/allelle-diagram.html`](../allelle-diagram.html).

## Code links

- [Display implementation boundary](../../src/app/shared/dragon-visuals/displays/README.md)
- [Scene and instrument contracts](../../src/app/shared/dragon-visuals/domain/dragon-visual.models.ts)
- [Teaching-sequence contract](../../src/app/shared/dragon-visuals/domain/teaching-sequence.models.ts)
- [Visual-pack and SVG asset contract](../../src/app/shared/dragon-visuals/domain/visual-pack.models.ts)
- [Visual signal bridge](../../src/app/shared/dragon-visuals/state/dragon-visual.bridge.ts)
- [Feature-to-visual adapter](../../src/app/features/dragon-genetics/visual-adapter/dragon-visual-scene.adapter.ts)
- [Complete laboratory plan](../DRAGON_GENETICS_VISUAL_LAB_PLAN.md)

## Source interpretation

The supplied display descriptions establish the station names, science focus, and visual mood.
References to dragon models, body parts, or miniature hatchlings inside instruments are intentionally
translated into phenotype labels, sample IDs, allele records, eggs, plots, and inheritance paths.
This follows the product rule that the scientific display analyzes genetics without rendering the
dragon itself.
