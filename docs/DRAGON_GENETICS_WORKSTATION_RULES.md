# Dragon Genetics workstation product rules

**Status: authoritative. Read this before designing, rebuilding, or reviewing any student
workstation.**

When an archived plan or old build guide conflicts with this document, this document wins. A
dedicated workstation is an open scientific investigation, not a scripted quiz screen.

## Product intent

A workstation gives students one scientific goal, specimens or data they can manipulate, observable
consequences they can compare, and a record they can build from evidence. The student decides which
valid experiment to run next.

```text
scientific goal
  → choose an available specimen, gene, chromosome, sample, or tool
  → manipulate and compare the model in any scientifically valid order
  → observe repeatable consequences
  → save evidence, a chart entry, or a revisable claim when ready
```

The interface may enforce a scientific prerequisite—for example, two allele copies are required to
express a diploid phenotype. It must not turn that prerequisite into a prescribed lesson script.

## Required qualities

### One scientific goal

Show a concise goal describing the relationship students are trying to understand or determine. A
goal is not a list of directions and does not reveal the expected conclusion.

### A complete investigation surface

Keep the important scientific objects together so students can form relationships among them. The
main model should dominate the workspace. Controls, readouts, notebook areas, and optional help
support the investigation rather than competing with it.

### Open-order interaction

Students can choose released records and tools in any order that remains scientifically valid. They
can repeat tests, replace samples, compare combinations, and return to earlier evidence without
restarting a fixed sequence.

### Direct manipulation with an equivalent alternative

Use drag-and-drop as the primary interaction when students are spatially moving a scientific
object. Every drag action must have an equivalent select-object, select-destination path that makes
the same state change and evidence record. Keyboard, touch, motor accessibility, and unreliable
browser dragging must not prevent investigation.

### Discovery through visible consequences

The model responds to what the student actually changes. Shared chromosome bands and loci remain
consistent, allele and DNA samples remain distinguishable, sequence differences appear at their
real positions, and phenotype uses the real assembly renderer when phenotype is evidence.
Incomplete or untested states remain visibly incomplete.

### A student-built record

Students construct a chart, notebook entry, comparison, claim, saved cross, or evidence set from
their experiments. Persistent records remain revisable and available to other relevant surfaces.
Requiring enough evidence to save a conclusion is acceptable; replacing investigation with answer
selection is not.

## Prohibited patterns

### No embedded question dock

Do not attach multiple-choice questions, correctness colors, scores, generated prompts, or a
`Continue` gate to a dedicated workstation. Formal reflection and assessment belong on the lesson
page or in a separately requested assessment surface.

### No scripted steps

Do not build numbered main-surface directions, Observe/Predict/Manipulate/Reveal phase rails,
one-action tours, fixed-order gates, required worked examples, or narration that tells students
what to notice. Optional help may live in a closed Guide or Hints panel and must not change or reset
the investigation.

### No answer leakage

Do not pre-label unknown samples as dominant/recessive or reveal genotypes, outcomes, trait names,
or allele letters students are meant to determine. Use neutral sample identifiers until student
evidence supports a saved record.

### No fake or disconnected visuals

Scientific visuals that must respond to data are code-driven. Use SVG/canvas/Three.js as appropriate
and the existing assembly renderer for dragons. Do not substitute static imagery for selectable,
movable, countable, or zoomable scientific state. Do not include a decorative dragon when phenotype
is not evidence.

### No duplicated scientific truth

Do not hard-code a second chromosome, gene, DNA, allele, phenotype, or notebook catalog inside a
component. Use the shared catalogs, inheritance domain, released assignment records, and persistent
student record models.

### No drag-only operation

Never make a successful drag the only completion path. Drag previews must not resize sources, shift
the layout, overflow their container, or make nearby controls jump.

## Scientific source-of-truth rules

- Teacher/assignment settings determine which records are released.
- A gene belongs to one defined chromosome; homologs share loci while allowing different alleles.
- Chromosome geometry, bands, loci, and colors come from the shared chromosome catalog.
- Allele DNA comes from the shared gene DNA and allele catalogs.
- Phenotype rendering uses the same expressive-genome and assembly sources as the test bench.
- Experiments and discoveries use a shared notebook or an explicitly owned station repository.
- Sex-linked investigations use a data-driven sex-chromosome model rather than a cosmetic toggle.
- The same inputs produce consistent scientific results unless randomness is an explicit, seeded
  part of the model.

## Text, accessibility, and responsive behavior

Main-workstation text is limited to the scientific goal, identifiers needed to operate the
instrument, current state, results produced by student actions, and record-building labels.
Procedures and background reading belong in optional help.

- Every movable item has a native-button select-and-place alternative.
- Selection and loaded states use labels, shapes, patterns, or symbols in addition to color.
- Scientific visuals have accessible names and data-derived summaries.
- Focus order follows the physical laboratory, not a hidden script.
- Panels restack without losing selections or experiment state.
- Reduced motion preserves every result without requiring animation.
- Controls and labels remain readable on Chromebooks, projectors, and touch devices.

## Persistence behavior

The workstation must function with local repositories and no live database. Records are keyed by
the current student identity, survive refresh, and restore when a relevant workstation reopens.
Switching to Firestore later should replace a repository implementation, not the scientific
interaction model. Components must not contain temporary mock answers that later need manual
removal.

## Required design note

Before building a new dedicated workstation, record these five decisions in its folder README, the
implementation change, or another current design note:

1. **Scientific goal:** What relationship should students discover?
2. **Manipulable evidence:** What can students choose, move, compare, test, or measure?
3. **Observable consequence:** What changes because of those actions?
4. **Student-built record:** What claim, chart, notebook entry, or evidence set persists?
5. **Shared sources:** Which catalogs, renderers, domains, and repositories supply the data?

If the answers describe only reading text and choosing an answer, the proposed surface is not a
workstation.

## Rejection checklist

Reject or revise an implementation if any answer is yes:

- Is a question dock or multiple-choice panel attached to the laboratory?
- Does the main surface contain numbered steps or a phase rail?
- Must students follow one predetermined action order?
- Does the interface reveal the conclusion before students test the model?
- Is a drag operation missing a click/keyboard equivalent?
- Are chromosome, gene, DNA, phenotype, or notebook records duplicated locally?
- Is a static/generated image substituting for a model that must respond to data?
- Is a fake dragon used instead of the assembly renderer?
- Is a dragon present even though phenotype is not evidence?
- Does refresh or workstation navigation discard a completed record?
- Could a student finish by clicking answers without investigating the model?
