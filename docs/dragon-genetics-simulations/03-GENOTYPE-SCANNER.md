# 03 - Genotype Scanner

**Curriculum:** Module 3, Genotype / Phenotype Reveal · **Skill:** GEN-3

**Contracts:** `genotype-scanner`, with the dedicated `dragon-hatchery` investigation

**Runtime status:** registry-driven scanner plus dedicated Hatchery

## Teaching purpose

Students distinguish an observable phenotype from the allele pair that forms a genotype. They use
egg and family evidence to learn that each offspring receives one allele from each parent, and that
the same dominant phenotype can be consistent with more than one genotype.

## Investigation model

The Genotype Scanner supplies the comparison model and reviewed questions. The Dragon Hatchery is
the dedicated specimen investigation: students examine parent dragons, inspect eggs, sample alleles,
and hatch selected offspring without exposing genotype merely from appearance.

## Current implementation

| Concern                            | Source                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genotype Scanner definition        | [`adaptive/dragon-simulation.registry.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation.registry.ts)                                                                                                                                       |
| Genotype Scanner renderer          | [`workstations/simulation-visual/`](../../src/app/features/dragon-genetics/workstations/simulation-visual/dragon-simulation-visual.component.ts)                                                                                                                |
| Routed host and persistence wiring | [`adaptive/dragon-simulation-experience.page.ts`](../../src/app/features/dragon-genetics/adaptive/dragon-simulation-experience.page.ts)                                                                                                                         |
| Hatchery workstation               | [`workstations/dragon-hatchery/`](../../src/app/features/dragon-genetics/workstations/dragon-hatchery/README.md)                                                                                                                                                |
| Hatchery scene adapter             | [`dragon-hatchery-scene.adapter.ts`](../../src/app/features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery-scene.adapter.ts)                                                                                                                      |
| Hatchery records and content       | [`dragon-hatchery.models.ts`](../../src/app/features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery.models.ts) and [`dragon-hatchery-content.ts`](../../src/app/features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery-content.ts) |

The old meiosis quiz, specialized scanner renderer, scanner station, and duplicate Hatchery copies
were removed. The active Hatchery files now stay together in one feature directory.

## Extension boundary

Change reviewed scanner models and questions in the registry. Keep Hatchery content, records,
adapter, view model, renderer, and station together in `workstations/dragon-hatchery/`. A future
dedicated scanner belongs in `workstations/genotype-scanner/`.

## Acceptance targets

- Genotypes remain hidden until the investigation performs the appropriate test.
- A phenotype label never implies strength, value, health, or frequency.
- More than one genotype may support the same dominant phenotype.
- Hatchery concealment rules prevent unopened records from leaking answer-bearing text.
- Keyboard interaction does not require dragging.
