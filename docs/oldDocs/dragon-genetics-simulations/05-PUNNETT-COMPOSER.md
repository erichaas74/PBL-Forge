# 05 - Punnett Composer

**Curriculum:** Module 5, Breeding Predictor · **Skill:** GEN-5 ·
**Contract:** `punnett-composer`

This dedicated workstation follows
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](../DRAGON_GENETICS_WORKSTATION_RULES.md). It is an open
inheritance investigation, not the earlier registry-driven question screen.

## Required pre-build decision

1. **Scientific goal:** Determine how one allele from each parent combines in possible offspring.
2. **Manipulable evidence:** Students may load any available dragon or chromosome record into
   either parent bay, change the focus locus, and drag or select either parent's gametes into the
   corresponding column or row boxes.
3. **Observable consequence:** Each offspring cell remains incomplete until both of its axes are
   loaded. It then displays the resulting genotype and exposes allele origin and predicted
   phenotype in its inspector. The complete grid produces counts and probabilities.
4. **Student-built record:** Students may save any completed cross. Saved records retain both
   parent identities, the locus, and the genotype and phenotype counts and restore on the device
   for the current student.
5. **Shared sources:** Founder dragons and trait inheritance come from
   `simulation/domain/dragon-inheritance.ts`; chromosome identity and geometry remain in the
   shared chromosome catalog; the reusable account file derives each chromosome record from its
   dragon's genome; local account and cross repositories provide the replaceable mock persistence
   boundary.

## Investigation surface

- The account Genetics File opens at the upper-left and exposes the current user's dragon and
  chromosome records. It is shared UI intended for other workstations that need specimen access.
- A dragon record loads the selected parent bay. A chromosome record loads its dragon into that
  bay and focuses the chromosome's modeled locus.
- Parent 1 gametes occupy the two column boxes and Parent 2 gametes occupy the two row boxes.
- Drag-and-drop and select-then-place change the same state.
- All four offspring cells are buttons and can be examined before or after completion.
- Replacing a parent, changing the locus, or clearing the square is allowed in any order and never
  removes saved cross records.

## Persistence

During the mock-data period, the account library begins with released founder records and merges
student dragons stored under `pbl-forge.dragon-genetics.account-library.v1.<studentId>`.
Chromosome records are derived rather than stored as duplicate scientific truth. Punnett state and
saved crosses use `pbl-forge.dragon-genetics.punnett-composer.v1.<studentId>`.

## Acceptance checks

- The dedicated route has no question dock, phase rail, fixed sequence, or Continue button.
- A cell shows a genotype only after its column and row gametes are loaded.
- Every gamete and account-record drag has a click/keyboard-equivalent path.
- Parent-source meaning uses labels and P1/P2 token styling in addition to color.
- All four cells expose their source alleles and current completion state to assistive technology.
- Counts and percentages are derived from the four cells and cannot be saved while incomplete.
- Reloading restores the current cross and saved cross records for the current student.
