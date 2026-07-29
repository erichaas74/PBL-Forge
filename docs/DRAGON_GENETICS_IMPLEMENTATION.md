# Dragon Genetics implementation guide

This experience implements the supplied three-week lesson plan and teaching/assessment requirements as a ten-module student journey. It is designed for Grade 7 MS-LS3 heredity and variation, with supporting MS-LS1 reproduction concepts.

## Student route

Open `/dragon-genetics`. Work is saved immediately to local storage and, after the anonymous or district user session is ready, to `dragonLabProgress/{uid}` in Firestore.

Modules unlock in sequence. Local emulator mode includes a teacher-preview navigation switch, but it does not bypass evidence checks, the breeder license, prediction locks, or the official-attempt limit.

| Week | Module | Student evidence | Primary skills |
| --- | --- | --- | --- |
| 1 | 1. Trait Detective | Eight inherited/acquired classifications | GEN-1 |
| 1 | 2. Genome Decoder | Dragon-to-allele information pathway | GEN-2 |
| 1 | 3. Genotype → Phenotype | Phenotype-first and genotype-first evidence | GEN-3 |
| 1 | 4. Trait Rule Lab | Four predict-before-reveal dominance trials | GEN-4 |
| 1 | 5. Breeding Predictor | Four locked Punnett probabilities | GEN-3–5 |
| 2 | 6. Probability vs. Actual | 8-offspring and 100-offspring comparisons | GEN-5, GEN-7 |
| 2 | 7. Sexual vs. Asexual | Two-parent versus clone-style model | GEN-6, GEN-7 |
| 2 | 8. Sibling Variation | Two-sibling allele-path explanation | GEN-5, GEN-7 |
| 2 | 9. Diversity Manager | Data-backed parent-pair recommendation | GEN-8 |
| 3 | 10. License & Arena | License, official crosses, battle, evidence defense | GEN-1–8 |

## Non-negotiable assessment behavior

- Learn and Practice modes provide instruction and feedback. Official mode unlocks only after the individual breeder license.
- The license contains 12 questions spanning every GEN skill. Passing requires at least 9/12 and evidence on every skill; missed skills generate targeted misconception flags and a retake path.
- Every official cross requires four predictions before the offspring are generated.
- Every student/team receives exactly three official breeding opportunities.
- The motivational challenge score is displayed as genetics prediction accuracy 30%, diversity strategy 25%, battle 25%, and evidence 20%.
- Academic mastery is calculated separately from GEN-1–GEN-8 evidence. A battle win cannot replace an unmet science skill.
- The final defense asks students to trace a real champion allele, explain sibling variation, and name a model limitation.

## Genetics and arena connection

The classroom model uses four imaginary, single-gene traits:

- `W/w`: winged versus wingless
- `F/f`: fire breathing versus no fire breathing
- `S/s`: spotted versus solid scales
- `H/h`: horned versus smooth-headed

The imported classic-dragon garage preset is transformed from each offspring genotype. A `ww` dragon has the wing assemblies removed. Other expressed traits change its generated phenotype and physical/combat profile. The imported Three.js/Cannon arena then uses that generated assembly for bite, wing-buffet, and tail-sweep controls. Wingless dragons cannot use the wing-buffet impulse.

The arena remains intentionally multicausal: body traits, student tactics, collisions, and physics all affect the outcome. This makes it useful evidence for a systems explanation without pretending battle rank is biological fitness.

## Teacher dashboard

Open `/teacher/dragon-genetics` while authenticated as a teacher. In local emulator mode, select **Use demo teacher**; the seed script creates that emulator-only account automatically. The dashboard reads `dragonLabProgress` and displays:

- GEN-1–GEN-8 mastery levels per student;
- current module and completion count;
- repeated misconception flags for reteaching;
- license and official-breeding readiness;
- official attempts used; and
- battle outcome in a clearly separate column.

Production teacher access depends on the signed-in user's Firestore document having `role: "teacher"` (or an admin custom claim), as described in `FIREBASE_SETUP.md`.

## Data captured

The saved snapshot includes module and mode, responses, parent selections, pre-reveal predictions, expected/observed batch results, offspring genotypes, sibling evidence, diversity decisions, mastery levels, misconception flags, license results, official breeding history, champion selection, battle outcome, final evidence, individual defense, timestamps, and an event history.

Firestore rules allow a student to read and write only `dragonLabProgress/{their uid}`. Teachers can read student records; students cannot read one another's work. The authorization cases are covered by `npm run test:rules`.

## Classroom launch checklist

1. Run the full local stack with `npm run dev` and open the student route on the devices students will use.
2. Test one complete student record, including a browser refresh, to confirm Firestore persistence.
3. Confirm the teacher account has a `users/{uid}` document with `role: "teacher"` and can open the dashboard.
4. Decide team membership before Week 3; keep license and final defense individual even when breeding and battle are collaborative.
5. Use the dashboard's misconception flags for short targeted reteach before license retakes.
6. Explain before the arena that dominant does not mean stronger, better, healthier, or more common, and that the four-gene model is deliberately simplified.
7. Export or download final lab records before archiving a class.
