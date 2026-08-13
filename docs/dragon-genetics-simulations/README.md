# Dragon Genetics simulation build guides

These guides describe the active student laboratories and the scientific intent for future
dedicated instruments. Start with the authoritative
[Dragon Genetics workstation product rules](../DRAGON_GENETICS_WORKSTATION_RULES.md), then use the
[simulation build standard](SIMULATION_BUILD_STANDARD.md) for implementation details.

The routed runtime is documented in
[Adaptive full-page simulation architecture](ADAPTIVE_FULL_PAGE_ARCHITECTURE.md). Assignment level,
deterministic generation, reviewed questions, evidence, and persistence are coordinated by the
adaptive shell.

| Module | Student-facing display   | Current surface                     | Build guide                                 |
| ------ | ------------------------ | ----------------------------------- | ------------------------------------------- |
| 1      | Trait Evidence Analyzer  | Registry-driven generic workstation | [01](01-TRAIT-EVIDENCE-ANALYZER.md)         |
| 2      | Genome Microscope        | Dedicated workstation               | [02](02-GENOME-MICROSCOPE.md)               |
| 4      | Allele Workbench         | Dedicated workstation               | [04](04-ALLELE-WORKBENCH.md)                |
| 5      | Punnett Composer         | Registry-driven generic workstation | [05](05-PUNNETT-COMPOSER.md)                |
| 6      | Incubator Sampler        | Registry-driven generic workstation | [06](06-INCUBATOR-SAMPLER.md)               |
| 8      | DNA Process Lab          | Dedicated workstation               | [08](08-DNA-PROCESS-LAB.md)                 |
| 9      | Island Diversity Manager | Dedicated workstation               | [09](09-DIVERSITY-MANAGER.md)               |
| 10     | Protein & Diet Rescue    | Dedicated workstation               | [10](10-PROTEIN-DIET-RESCUE.md)             |
| Shared | Dragon Hatchery          | Dedicated workstation               | [11](11-DRAGON-HATCHERY.md)                 |
| Arena  | Dragon Arena Combat      | Dedicated experience                | [12](12-DRAGON-ARENA-COMBAT.md)             |
| 13     | Blood Compatibility Lab  | Dedicated workstation               | [13](13-DRAGON-BLOOD-TYPE-COMPATIBILITY.md) |
| 14     | Companion Dragon Show    | Dedicated workstation               | [14](14-COMPANION-SHOW.md)                  |

The Companion Dragon Show is the open-workstation alternative to the arena: same genes, same
breeder, same renderer, but the goal is to establish a pet breed rather than win a duel.

## Source layout

All active feature-specific workstation files live under
[`src/app/features/dragon-genetics/workstations`](../../src/app/features/dragon-genetics/workstations/README.md):

- `allele-workbench/` contains the active allele investigation.
- `companion-show/` contains the breed standard, kennel, litter, bloodline, and registry model.
- `dna-process-lab/` contains DNA comparison, mutation, and repair tools.
- `dragon-hatchery/` contains the complete Hatchery feature slice.
- `genome-microscope/` contains the staged cell-to-allele SVG investigation.
- `simulation-visual/` renders registry-driven stations without a dedicated instrument.
- `shared/` contains the chromosome catalog, DNA catalog, and persistent genetics notebook reused
  by multiple Dragon Genetics workstations.

Generic assembly rendering remains in `src/app/shared/assembly`. Cross-workstation visual contracts
and renderer primitives remain in `src/app/shared/dragon-visuals`. Feature-specific UI must not be
added to those shared packages.

## Code links

- [Canonical workstation boundary](../../src/app/features/dragon-genetics/workstations/README.md)
- [Adaptive simulation registry](../../src/app/features/dragon-genetics/adaptive/dragon-simulation.registry.ts)
- [Routed adaptive host](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts)
- [Shared visual contracts](../../src/app/shared/dragon-visuals/domain/dragon-visual.models.ts)
- [Shared visual boundary](../../src/app/shared/dragon-visuals/README.md)
- [Complete laboratory plan](../DRAGON_GENETICS_VISUAL_LAB_PLAN.md)
