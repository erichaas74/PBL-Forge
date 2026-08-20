# Reusable DNA and RNA process visuals

These standalone Angular components keep molecular animations, diagrams, questions, and explanations reusable instead of tying them to one Module 2 scene.

- `DnaReplicationAnimationComponent` separates both original DNA strands and constructs both complementary strands base by base.
- `DnaTranscriptionAnimationComponent` moves RNA polymerase along the DNA template and constructs a single mRNA strand with uracil.
- `RnaTranslationAnimationComponent` lets students play or scrub a ribosome across mRNA codons while matching tRNA anticodons and building the resulting amino-acid chain.
- `NUCLEOBASE_CHEMISTRY` is the shared A/C/G/T/U source for molecular formulae, ring families, atoms, covalent bonds, and pairing behavior.
- `NucleobaseMoleculeComponent` renders any catalog base as an accessible code-driven SVG structural model, with reusable compact and caption-free modes.
- `_nucleotide-connectors.scss` gives every base tile a complementary keyed edge: rounded A tabs fit T/U sockets, while T-shaped C tabs fit G sockets. Facing strands flip the same geometry instead of duplicating shapes.
- `DnaMutationAnimationComponent` reuses the same base-pair ladder for insertion, deletion, substitution, and mismatch repair.
- `DnaProcessQuestionComponent` chooses the correct animation from a `DnaProcessQuestion` data object and adds an explanation question, feedback, and a science-boundary note.
- `DNA_PROCESS_QUESTION_BANK` contains the six Module 2 examples and can be extended for later DNA/RNA questions.

To add a new question, add a `DnaProcessQuestion` object to a lesson question bank and render it with:

```html
<app-dna-process-question [question]="question" />
```

Valid process modes are `replication`, `transcription`, `insertion`, `deletion`, `substitution`, and `repair`. Supply a DNA `sequence`, question options, the correct option ID, and an explanation. Mutation questions may also supply `mutationBase`.
