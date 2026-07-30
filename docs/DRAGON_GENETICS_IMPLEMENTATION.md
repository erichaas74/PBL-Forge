# Dragon Genetics implementation guide

The laboratory visual redesign and per-question simulation coverage plan is documented in [DRAGON_GENETICS_VISUAL_LAB_PLAN.md](DRAGON_GENETICS_VISUAL_LAB_PLAN.md).
Detailed renderer and teaching specifications are indexed in the
[Dragon Genetics simulation build guides](dragon-genetics-simulations/README.md).

This experience implements the supplied three-week lesson plan and teaching/assessment requirements as a ten-module student journey. It is designed for Grade 7 MS-LS3 heredity and variation, with supporting MS-LS1 reproduction concepts.

## Student route

Open `/dragon-genetics`. Work is saved immediately to local storage and, after the anonymous or district user session is ready, to `dragonLabProgress/{uid}` in Firestore.

Schema-v2 trial records are migrated without discarding prior responses. Their module completion is revalidated from Module 1 so the newly required diagnostic, weekly mastery checks, genotype predictions, peer review, and reflection cannot be bypassed.

Modules unlock in sequence. Local emulator mode includes a teacher-preview navigation switch, but it does not bypass evidence checks, the breeder license, prediction locks, or the official-attempt limit.

| Week | Module | Student evidence | Primary skills |
| --- | --- | --- | --- |
| 1 | 1. Trait Detective | Impossible Hatchling diagnostic, rotating role, eight classifications, misconception correction | GEN-1 |
| 1 | 2. Genome Decoder | Dragon-to-allele pathway plus four-question quick check | GEN-2 |
| 1 | 3. Genotype → Phenotype | Phenotype-first and genotype-first evidence | GEN-3 |
| 1 | 4. Trait Rule Lab | Four Allele Workbench construction, prediction, expression-trace, and rule-evidence records | GEN-4 |
| 1 | 5. Breeding Predictor | Four locked genotype/phenotype distributions plus 10-question Week 1 mastery | GEN-1–5 |
| 2 | 6. Probability vs. Actual | 8-offspring and 100-offspring comparisons | GEN-5, GEN-7 |
| 2 | 7. Sexual vs. Asexual | Two-parent versus clone-style model | GEN-6, GEN-7 |
| 2 | 8. Sibling Variation | Two-sibling allele-path explanation | GEN-5, GEN-7 |
| 2 | 9. Diversity Manager | Two-strategy comparison, parent-pair evidence, peer review, 12-question Week 2 mastery | GEN-3–8 |
| 3 | 10. License & Arena | License, official crosses, battle, evidence defense, five-part reflection | GEN-1–8 |

## Non-negotiable assessment behavior

- Learn and Practice modes provide instruction and feedback. Official mode unlocks only after the individual breeder license.
- Week 1 requires at least 8/10, evidence on GEN-1–GEN-4, and at least 75% combined genotype/phenotype prediction accuracy. Week 2 requires at least 9/12, evidence on GEN-3–GEN-8, the balanced diversity recommendation, and a peer review.
- The license contains 12 questions spanning every GEN skill. Passing requires at least 9/12 and evidence on every skill; missed skills generate targeted misconception flags and a retake path.
- Every practice and official cross requires genotype-distribution and phenotype-probability predictions for all four genes before offspring are generated.
- Every student/team receives exactly three official breeding opportunities.
- The motivational challenge score is displayed as genetics prediction accuracy 30%, diversity strategy 25%, battle 25%, and evidence 20%.
- Academic mastery is calculated separately from GEN-1–GEN-8 evidence. A battle win cannot replace an unmet science skill.
- The final defense asks students to trace a real champion allele, explain sibling variation, and name a model limitation.
- The final submission also requires all five individual reflection prompts and produces a downloadable full lab report.

Recommended academic grading remains separate from the motivational challenge score: completion checks 20%, weekly deliverables 25%, individual mastery 25%, final challenge evidence 15%, and final write-up/reflection 15%. Leaderboard rank is not a grade category.

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
- Week 1 and Week 2 mastery-check scores and pass status;
- repeated misconception flags for reteaching;
- license and official-breeding readiness;
- official attempts used; and
- battle outcome in a clearly separate column.

Production teacher access depends on the signed-in user's Firestore document having `role: "teacher"` (or an admin custom claim), as described in `FIREBASE_SETUP.md`.

## Data captured

The saved snapshot includes module and mode, mission diagnostic, rotating role, responses, parent selections, genotype and phenotype predictions, weekly mastery checks, expected/observed batch results, offspring genotypes, sibling evidence, diversity strategy, peer review, mastery levels, misconception flags, license results, official breeding history, champion selection, battle outcome, final evidence, individual defense, five reflection responses, timestamps, and an event history.

Firestore rules allow a student to read and write only `dragonLabProgress/{their uid}`. Teachers can read student records; students cannot read one another's work. The authorization cases are covered by `npm run test:rules`.

## Classroom launch checklist

1. Run the full local stack with `npm run dev` and open the student route on the devices students will use.
2. Test one complete student record, including a browser refresh, to confirm Firestore persistence.
3. Confirm the teacher account has a `users/{uid}` document with `role: "teacher"` and can open the dashboard.
4. Decide team membership before Week 3; keep license and final defense individual even when breeding and battle are collaborative.
5. Use the dashboard's misconception flags for short targeted reteach before license retakes.
6. Explain before the arena that dominant does not mean stronger, better, healthier, or more common, and that the four-gene model is deliberately simplified.
7. Export or download final lab records before archiving a class.
