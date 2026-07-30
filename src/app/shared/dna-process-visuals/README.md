# Reusable DNA and RNA process visuals

These standalone Angular components keep molecular animations, diagrams, questions, and explanations reusable instead of tying them to one Module 2 scene.

- `DnaReplicationAnimationComponent` separates both original DNA strands and constructs both complementary strands base by base.
- `DnaTranscriptionAnimationComponent` moves RNA polymerase along the DNA template and constructs a single mRNA strand with uracil.
- `DnaMutationAnimationComponent` reuses the same base-pair ladder for insertion, deletion, substitution, and mismatch repair.
- `DnaProcessQuestionComponent` chooses the correct animation from a `DnaProcessQuestion` data object and adds an explanation question, feedback, and a science-boundary note.
- `DNA_PROCESS_QUESTION_BANK` contains the six Module 2 examples and can be extended for later DNA/RNA questions.

To add a new question, add a `DnaProcessQuestion` object to a lesson question bank and render it with:

```html
<app-dna-process-question [question]="question" />
```

Valid process modes are `replication`, `transcription`, `insertion`, `deletion`, `substitution`, and `repair`. Supply a DNA `sequence`, question options, the correct option ID, and an explanation. Mutation questions may also supply `mutationBase`.
