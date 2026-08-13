# 08 - DNA Replication, Mutation, and Repair Lab

**Adaptive route:** `dna-process-lab`

## Workstation decision record

| Product decision           | DNA comparison laboratory                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scientific goal**        | Determine how two DNA records differ, how mutation changes those differences, and whether a selected repair restores sequence agreement.                                                                                                              |
| **Manipulable evidence**   | Students independently load any two released gene samples or two modeled chromosome homologs, select any aligned base or gap, introduce substitutions, insertions, or deletions, and try replacement, insertion, or excision repairs.                 |
| **Observable consequence** | The aligned sequence viewer marks every difference at its actual position, reports similarity and change-type counts, animates the molecular change, and immediately recomputes the comparison after mutation or repair.                              |
| **Student-built record**   | Students save comparison snapshots and the laboratory automatically records mutation and repair trials, including the difference count before and after each action. Records persist for the current student on the device.                           |
| **Shared sources**         | Released genes and neutral sample IDs come from the Allele Vault catalog, DNA comes from the shared dragon-gene DNA catalog, chromosome geometry comes from the shared chromosome catalog, and availability comes from the adaptive assignment store. |

## Purpose

This is an open DNA comparison laboratory, not a sequence of evidence questions. Its central
instrument aligns two student-selected records at either gene or chromosome scope. Students may
inspect naturally occurring differences, create controlled mutations, try repairs, swap samples,
and repeat comparisons in any useful order.

The chromosome scope represents all released, modeled gene records on a chromosome in locus order.
The base count shown by the instrument is therefore the modeled catalog record, not the literal
size of a biological chromosome.

## Visual direction

Use the light comparison bench, chromosome overview, aligned base blocks, difference markers, and
side-by-side sample loading established by
[`dna_comparison_workstation.html`](../../src/app/features/dragon-genetics/workstations/dna_comparison_workstation.html).
Use the nucleotide colors, strand rails, paired-base blocks, insertion/deletion/substitution
choreography, and moving repair complex established by
[`dna_mutations_animations.html`](../../src/app/features/dragon-genetics/workstations/dna_mutations_animations.html).

The active workstation is in
[`workstations/dna-process-lab/`](../../src/app/features/dragon-genetics/workstations/dna-process-lab/).
It uses the released catalog supplied by the student's resolved adaptive assignment settings and
persists the student's comparison record locally under the current student identity.
