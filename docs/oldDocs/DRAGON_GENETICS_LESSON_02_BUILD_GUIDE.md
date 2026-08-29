# Dragon Genetics Lesson 2: Breeding Dragons

Lesson 2 is one shared investigation presented through two story contexts:

- **Dragon Arena:** breed full-size dragons while looking for traits useful in a strong fighting dragon.
- **Mini Dragon Show:** breed mini dragons while looking for traits useful in a cute, well-trained show dragon.

The scientific question and student prompts remain identical in both paths. Only the specimens and story goal change.

## Investigation structure

1. Students choose two parents from several example dragons.
2. Students select one visible trait to follow.
3. Students hatch a sample of offspring in the incubator.
4. The incubator sorts offspring into visible-trait buckets and shows the number in each bucket.
5. Students repeat with different parents, traits, or sample sizes and use the batch ledger as evidence.
6. Students return to the lesson page to record observations and make a claim about how traits pass from parents to offspring.

This is intentionally an open workstation. There is no required click sequence, scored quiz, or completion gate.

## Adaptable lesson-plan record

The shared lesson lives in `src/app/features/dragon-genetics/lesson-plan/dragon-lesson-plan.models.ts`. Teachers can adjust its title, goal, guide, workstation label, and written questions from `/teacher/lesson-plan`; published changes are stored on that device without requiring Firebase.

## Workstation contract

- **Scientific goal:** notice patterns in how parent traits appear among offspring.
- **Manipulable evidence:** parent pairing, observed trait, and sample size.
- **Visible consequence:** every offspring is counted in a labeled phenotype bucket.
- **Student record:** the incubator batch ledger plus the shared lesson notebook responses.
- **Shared sources:** full-size breeding uses the existing Dragon Genetics model; mini breeding uses the existing mini-dragon genomes and phenotype rules.
