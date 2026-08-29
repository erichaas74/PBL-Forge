# 09 - Island Diversity Manager

**Curriculum:** Module 9, population genetics · **Skill:** GEN-8 · **Dedicated route:**
`/dragon-genetics/island-diversity`

The Dragon Archipelago Conservation Station is an open population-genetics investigation. It
replaces the registry-driven Diversity Manager checkpoint experience. Students move freely among
seven islands, collect incomplete field evidence, scan selected dragons, relocate individuals,
protect a breeding pair, and advance one island at a time through multiple generations.

## Required design decisions

| Decision               | Island Diversity Manager answer                                                                                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scientific goal        | Investigate how chance, relatedness, selection, recessive inheritance, migration, and breeding decisions change allele frequencies and population health across generations.                                                                                                                                                                 |
| Manipulable evidence   | Seven island populations, individual dragon field records, limited genotype scans, account-dragon conservation intake, movable dragons, two protected-pair berths, generation controls, allele-frequency readouts, and island timelines.                                                                                                     |
| Observable consequence | Scans reveal previously concealed genotypes and carrier states; relocation immediately changes source and destination population metrics; inherited offspring and natural matings change genotype counts; bottleneck and habitat pressures can remove alleles by chance or selection; and each generation adds a comparable timeline record. |
| Student-built record   | Per-island conservation notes and a persistent archipelago ledger containing scans, relocations, protected pairings, generation outcomes, events, population metrics, and allele-frequency snapshots.                                                                                                                                        |
| Shared sources         | The Account Genetics File supplies student-owned rescue dragons; the Island Diversity domain owns its fictional population-locus catalog, inheritance engine, initial released populations, and metric calculations; and a replaceable repository owns the complete per-student world snapshot and field notes.                              |

## Population model

The workstation uses three independent diploid loci. They are a fictional teaching model and are
not a complete model of real population viability.

- Horn locus: `B` and `b`; `bb` produces blue horns. The trait is neutral in the current habitats.
- Heat-response locus: `H` and `h`; at least one `H` supports heat tolerance on Ash Island.
- Moonfade locus: `D` and `d`; `dd` produces the recessive Moonfade disorder while `Dd` dragons are
  unaffected carriers.

The domain calculates allele frequencies directly from the population records. Its diversity
estimate combines allele retention and observed heterozygosity. Relatedness is a pedigree-line
concentration estimate, not a DNA-wide kinship coefficient. The interface labels both measures as
model estimates.

Initial island conditions make different mechanisms visible:

- Founder's Isle descends from a small founder set and has frequent blue horns by chance.
- Stormbreak begins after a hurricane bottleneck with only twelve survivors.
- Moonmist contains many healthy Moonfade carriers and several affected dragons.
- Twin Horn West and East begin genetically differentiated from one another.
- Ash Island applies survival pressure related to the heat-response locus.
- Sanctuary is a breeding reserve and receives account dragons admitted through conservation
  intake.

## Open interaction and concealment

- Students may visit islands, scan dragons, stage breeding adults, relocate individuals, admit an
  account dragon, save a field note, and advance generations in any scientifically valid order.
- Unscanned field records show phenotype, sex, age, health, and known pedigree only. Their genotype
  and carrier status are not placed in the DOM.
- Dragon relocation uses drag/drop onto an island and an equivalent select-dragon, choose-island
  button path. Protected-pair placement likewise supports drag/drop and click placement.
- A protected pair contributes only part of the next cohort. Other adults reproduce through the
  deterministic wild-population model.
- The map and all scientific diagrams are code driven. Population clusters, alerts, frequency
  bars, and timelines update from the current world state.
- There is no question dock, phase rail, score, required visit order, or single prescribed solution.

## Events and tradeoffs

Generation events are deterministic from the saved world seed so a reload reconstructs the same
outcome. Events change survival or birth conditions through explicit genetic or demographic rules,
not arbitrary points. Moving an unrelated dragon can improve lineage balance while introducing a
recessive allele. Preserving a rare allele can require retaining a healthy carrier and managing its
mates rather than removing that dragon from the population.

## Persistence boundary

`IslandDiversityRepository` stores one schema-versioned world snapshot per student. It persists
research credits, revealed scans, account-dragon admissions, relocations, pair selections,
generations, events, notes, and the metric timeline. Replacing browser storage with a database does
not change the workstation interaction model.

## Completion evidence

Focused tests cover initial island conditions, allele frequencies, recessive carriers and affected
dragons, inheritance, relocation effects, generation changes, account intake, concealed genotypes,
click/drag equivalence, protected-pair behavior, and per-student persistence. Browser acceptance
should cover full-map and narrow layouts, a genotype scan, a relocation tradeoff, a generation
advance, and record restoration after reload.
