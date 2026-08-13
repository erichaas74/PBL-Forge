# Dragon Genetics workstation product rules

**Status: authoritative. Read this before designing, rebuilding, or reviewing any student
workstation.**

When another plan or older build guide conflicts with this document, this document wins. The
Allele Workbench is the current reference for the intended investigation style. Registry-driven
quiz screens are temporary scaffolds, not a design pattern for dedicated workstations.

## Product intent

A Dragon Genetics workstation is a laboratory instrument for student-led investigation. It gives
students a scientific goal, specimens or data they can manipulate, and observable results they can
compare. Students should develop an explanation by looking, testing, rearranging, and recording
evidence.

A workstation is **not** a quiz page decorated to look like a laboratory.

The intended experience is:

```text
scientific goal
      ↓
choose any available specimen, gene, chromosome, or tool
      ↓
manipulate and compare the model in any useful order
      ↓
observe repeatable results
      ↓
record a claim, chart entry, or evidence result when ready
```

The student decides which experiment to run next. The interface does not prescribe a lesson script.

## What the workstation must provide

### One scientific goal

Show a concise goal describing what the student is trying to understand or determine. Examples:

- Determine how two allele samples affect an observable trait.
- Find where genes are located in the dragon genome.
- Determine what evidence distinguishes genotype from phenotype.
- Compare how chromosome and DNA records differ between specimens.

The goal is not a sequence of directions. It does not tell students which sample to choose first or
which result they should find.

### A complete investigation surface

The important scientific objects must be present together so students can form relationships among
them. Depending on the workstation, this may include:

- available chromosomes and genes;
- draggable allele or DNA samples;
- reference specimens and comparison positions;
- a chromosome, cell, DNA, egg, or inheritance model;
- an existing assembled dragon when phenotype is the evidence being observed;
- a chart, notebook, or evidence area that records discoveries; and
- compact instrument readouts produced by student actions.

The main visual model should dominate the workspace. Controls support the investigation rather than
competing with it.

### Open-order interaction

Students may choose released records and operate available tools in any order that remains
scientifically valid. They may repeat tests, replace samples, compare different combinations, and
return to earlier evidence without restarting a scripted sequence.

The workstation may enforce scientific prerequisites. For example, a phenotype cannot appear
until two allele samples are loaded. That is a model constraint, not a prescribed step order.

### Direct manipulation

When students are moving a scientific object, drag-and-drop should be the primary spatial
interaction. Examples include moving alleles into homologous chromosome positions, placing DNA
samples into comparison slots, sorting evidence, or staging eggs.

Every drag-and-drop action must also support this equivalent path:

1. select the object;
2. select its destination.

The click alternative is required for keyboard, touch, motor accessibility, and unreliable browser
drag behavior. It must create the same state change and evidence record as dragging.

### Discovery through visible consequences

The model should respond to what the student actually changed:

- chromosome bands and loci remain consistent across workstations;
- loaded allele samples remain visually distinguishable;
- the real assembly renderer shows the resulting dragon when phenotype is relevant;
- DNA differences appear at their actual positions;
- homologous chromosomes retain the same gene locations;
- repeated experiments produce consistent results from the same inputs; and
- incomplete or untested states remain visibly incomplete instead of displaying an answer.

The workstation provides evidence. It does not narrate the conclusion before the student can
discover it.

### A student-built record

When the science calls for a conclusion, students construct it from their experiments. Use a
genetics chart, comparison record, notebook entry, claim builder, or saved evidence set inside the
laboratory. The record should persist and be available in other relevant workstations.

Saving a discovery may require sufficient evidence, but it must not turn the workstation into a
multiple-choice quiz. Incorrect claims may remain revisable while preserving the experiment record
that led to them.

## What must not be built

### No question dock or question panel

Do not place an embedded multiple-choice panel beside or below a dedicated workstation. Do not
reserve part of the laboratory layout for generated questions, answer buttons, correctness colors,
scores, or a `Continue` button.

If formal assessment is required, it belongs outside the open workstation or in a separately
requested assessment experience. The laboratory itself collects authentic evidence from actions,
comparisons, and student-built claims.

### No scripted steps

Do not build:

- numbered directions on the main workstation;
- Observe / Predict / Manipulate / Reveal / Explain phase rails;
- Next-step gates whose only purpose is to force a fixed order;
- one-action-at-a-time tours;
- scripted narration that tells students what to notice;
- a required worked example before the tools unlock; or
- a lesson shell that advances the student after one expected click.

Optional help may exist in a closed Guide or Hints panel. It must not occupy the main laboratory,
and opening it must not change or reset the investigation.

### No answer leakage

Do not pre-label unknown alleles as dominant or recessive. Do not expose trait names, allele
letters, genotypes, or outcomes that students are expected to determine. Use neutral sample codes
such as `CH1-G1a` and `CH1-G1b` until evidence supports a student record.

An unloaded or untested scientific object should use a neutral placeholder. It should not show the
colored or labeled solved state.

### No fake or disconnected visuals

Do not add decorative scientific imagery that cannot respond to data. Do not generate a new dragon
image when the test bench and assembly renderer already create the dragon model. Do not use a
raster chromosome, cell, or DNA illustration when the scientific parts must be selected, moved,
recolored, counted, or zoomed.

Use code-driven SVG for controllable scientific diagrams. Use the real assembly renderer for a
dragon. If phenotype is not evidence for the investigation, do not include a dragon merely as
decoration.

### No duplicated scientific truth

Do not create a second hard-coded list of chromosomes, genes, allele sequences, phenotypes, or
student discoveries inside a component. Workstations must load shared catalog and notebook data.
Changing a source record must update every workstation that displays it.

### No drag-only interaction

Never make successful drag-and-drop the only way to complete an operation. Do not resize or replace
the dragged source element during a drag. A drag preview must not cause layout shifts, overflow its
container, or make nearby controls jump.

## Allele Workbench reference behavior

The Allele Workbench demonstrates the target pattern:

- The teacher-controlled catalog determines which chromosomes and genes are available.
- Chromosomes contain unique, non-repeating gene sets.
- Students freely choose a chromosome and gene.
- Neutral allele samples can be dragged or selected into Reference Sample A and B.
- A loaded reference chromosome reveals the appropriate code-driven band and sample pattern.
- Loading two alleles causes the existing dragon assembly renderer to show the resulting phenotype.
- Students may test every unique allele combination in any order and repeat a test.
- The genetics chart is built from the student's accumulated observations.
- Solved gene records persist in the Genetics Notebook and are available across workstations.
- The main surface has no question dock, phase rail, scripted task order, or required `Continue`
  action.

New dedicated workstations should reproduce this **investigation structure**, not copy the Allele
Workbench layout or pretend every scientific model is an allele comparison.

## Scientific source-of-truth rules

- Teacher settings determine which records are released; components do not invent availability.
- A gene belongs to one defined chromosome and does not reappear on another chromosome.
- Homologous chromosomes show the same genes at the same loci while allowing different alleles.
- Chromosome length, centromere, bands, loci, and colors come from the shared chromosome catalog.
- Allele DNA comes from the shared gene DNA catalog.
- Phenotype rendering uses the expressive-genome and assembly source used by the dragon test bench.
- Student experiments and discoveries use the shared persistent notebook or another explicitly
  shared record model.
- Sex-linked investigations include a data-driven sex-chromosome model and do not treat biological
  sex as a cosmetic toggle.

## Text and guidance rules

Main-workstation text should be limited to:

- the scientific goal;
- names or neutral IDs needed to operate the instrument;
- current specimen, selection, measurement, or test state;
- results produced by the current experiment; and
- labels needed to build or review the student's record.

Explanations, procedures, hints, and background reading belong in an optional panel that is closed
by default. Labels should identify instruments and data, not command a sequence with wording such
as "Step 1," "Next," or "Now choose."

## Persistence and mock-data behavior

The workstation must function with the local mock repository and no live database. During the mock
period:

- teacher-released records come from one replaceable mock assignment source;
- experiments and discoveries persist on the device under the current student identity;
- refreshing or opening another workstation restores the relevant record;
- switching to a database later should replace the repository implementation, not the workstation
  interaction model; and
- no component should contain temporary mock answers that must later be removed manually.

## Accessibility and responsive behavior

- Every movable item has a native-button select-and-place alternative.
- Selected and loaded states use labels, shapes, patterns, or symbols in addition to color.
- Scientific SVGs have accessible names and summaries based on their input data.
- Focus order follows the physical laboratory layout, not a hidden lesson script.
- Panels restack on smaller screens without losing the selected specimens or experiment state.
- Reduced-motion mode preserves every scientific result without requiring animation.
- Controls and labels remain readable on student Chromebooks and touch devices.

## Required pre-build decision

Before writing a new dedicated workstation, record these five items in its build guide:

1. **Scientific goal:** What relationship should students discover?
2. **Manipulable evidence:** What can students choose, move, compare, test, or measure?
3. **Observable consequence:** What changes because of those actions?
4. **Student-built record:** What claim, chart, notebook entry, or evidence set will persist?
5. **Shared sources:** Which existing catalogs, renderers, and persistence models supply the data?

If those answers describe only reading text and choosing an answer, the proposed surface is not a
workstation and should not be built as one.

## Rejection checklist

Reject a workstation implementation if any answer is **yes**:

- Is there a question dock or multiple-choice panel attached to the laboratory?
- Does the main surface contain numbered steps or a phase rail?
- Must students follow one predetermined action order?
- Does the interface reveal the conclusion before students test the model?
- Are drag operations missing a click/keyboard equivalent?
- Are chromosome, gene, DNA, phenotype, or notebook records duplicated locally?
- Is a static or generated image substituting for a model that must respond to data?
- Is a fake dragon used instead of the existing assembly renderer?
- Is a dragon included even though phenotype is not evidence?
- Does refreshing or changing workstations discard a completed experiment or discovery?
- Could a student finish by clicking answers without investigating the scientific model?

If any answer is yes, revise the design before implementation or review approval.
