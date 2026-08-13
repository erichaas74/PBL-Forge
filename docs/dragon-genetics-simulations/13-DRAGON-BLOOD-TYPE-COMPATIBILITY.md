# Dragon Blood Type Compatibility Lab

The Emergency Healing Station is an open clinical-genetics investigation. Students load an injured
dragon from the account Genetics File, test patient and donor blood with anti-Flame and anti-Tide
sera, compare marker evidence to a three-allele inheritance model, and stage a donor in the Healing
Chamber. The station has no question dock, numbered procedure, score, or forced lesson sequence.

## Required design decisions

| Decision               | Emergency Healing Station answer                                                                                                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scientific goal        | Investigate how three alleles create four blood-marker phenotypes through codominance and how marker evidence determines safe red-cell compatibility.                                                                                                                                                       |
| Manipulable evidence   | Account dragons, neutral patient and donor blood samples, anti-Flame and anti-Tide reagents, reaction wells, donor records, finite donor units in challenge mode, and the Healing Chamber.                                                                                                                  |
| Observable consequence | Matching antiserum produces visible agglutination; nonmatching serum remains smooth. A donor whose surface markers are all present in the recipient remains dispersed in the chamber, while an unfamiliar donor marker produces antibody binding and cell clumping.                                         |
| Student-built record   | A persistent emergency record containing patient and donor test evidence, derived phenotypes and possible genotypes, every attempted transfusion, supply constraints, the selected donor, and the student's compatibility explanation.                                                                      |
| Shared sources         | The account Genetics File supplies patient identities; this workstation's blood catalog owns the fictional blood-locus, clinic-donor, and donor-constraint truth; the compatibility domain owns marker reactions and transfusion outcomes; and a replaceable repository owns per-student emergency records. |

## Teaching model

This is a fictional, deliberately simplified red-cell model. It does not model Rh factors,
crossmatching, plasma compatibility, or real transfusion practice.

The blood locus has three alleles:

- `F` produces the Flame surface marker;
- `T` produces the Tide surface marker; and
- `o` produces no surface marker.

`F` and `T` are codominant, so genotype `FT` visibly carries both markers. Both marker-producing
alleles are expressed over `o` in this model.

| Marker phenotype | Surface markers | Possible genotypes |
| ---------------- | --------------- | ------------------ |
| Flame            | Flame           | `FF`, `Fo`         |
| Tide             | Tide            | `TT`, `To`         |
| Dual             | Flame and Tide  | `FT`               |
| Clear            | none            | `oo`               |

For the modeled red-cell transfusion, a donor is compatible only when every marker on the donor's
cells is already present on the recipient's cells. A Clear donor therefore has no unfamiliar marker
in this model. A Dual donor can be used only for a Dual recipient.

## Open interaction and concealment

- The account Genetics File remains at the upper-left. An account dragon or one of its chromosome
  records can be selected and loaded, or dragged directly into the patient bay.
- Patient and donor samples use neutral identity codes until both serum tests have been run. No
  hidden genotype, phenotype, or compatibility answer is placed in the DOM.
- Students may test patient and donor samples in any order, repeat serum tests, replace the active
  specimen, compare prior wells, and try another donor after a reaction.
- Reagent drag/drop and donor drag/drop each have a select-then-destination button path that calls
  the same state transition.
- The chamber requires patient and donor marker evidence before authorization. That is a scientific
  prerequisite, not a lesson step.
- Compatibility is shown as cell behavior, not a correctness badge or score.

## Challenge mode

Challenge mode is optional and does not add a countdown. It applies finite blood units, recovery
restrictions, and breeding-value notes to the donor roster. An attempted transfusion consumes one
available unit, so students must choose among genetically compatible donors while preserving scarce
or high-value animals when possible. Standard mode leaves supplies reusable for unrestricted
investigation.

## Persistence boundary

`BloodCompatibilityRepository` stores schema-versioned emergency records locally under the current
student identity. It restores saved evidence after refresh and keeps mock-device persistence out of
the component so a future database implementation can replace the repository without rewriting the
scientific instrument.

## Completion evidence

Focused tests cover all genotype-to-phenotype mappings, agglutination, the full compatibility
matrix, a compatible donor for every patient, neutral sample states, click/drag equivalence,
challenge-unit consumption, and per-student persistence. Browser acceptance should cover the full
lab, narrow stacking, keyboard-accessible destinations, reduced motion, a stable transfusion, and
an incompatible clumping reaction.
