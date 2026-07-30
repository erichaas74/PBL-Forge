# 10 - Evidence Replay

**Curriculum:** Module 10, Final Arena and Station E, Pedigrees · **Skills:** GEN-1 through GEN-8 ·
**Contract:** `evidence-replay`

## Teaching purpose

Students reconstruct a real prediction, cross, result, and inheritance claim using saved evidence.
The replay supports the final defense and teacher review while keeping scientific mastery separate
from the arena outcome.

## Scene inputs

- saved trial IDs and `activeTrialId`;
- parent, offspring, and generation relationships resolved by lesson data;
- predictions, outcomes, misconception corrections, and evidence marks; and
- champion selection and arena outcome as separately labeled timeline events.

## Display model

Use a multi-generation pedigree with conventional shapes, sample IDs, and trait-state symbols.
Beside it, show a chronological evidence log comparing the student's prediction, actual data, and
the simplified scientific model. Use validation labels only when backed by lesson scoring; never
invent accuracy scores or bake checkmarks into artwork.

## Student sequence

1. Select a saved trial from the evidence timeline.
2. Reconstruct its parent cross and prediction.
3. Trace a champion allele through the pedigree.
4. Compare predicted and observed evidence.
5. Pin evidence to a final claim and identify one model limitation.

Learn/review mode permits narrated replay. Practice defense provides evidence prompts. Official
defense locks the chosen evidence with the response. Reteach jumps directly to the misconception's
source trial before presenting an equivalent comparison.

## Semantic targets and events

Targets: `trial-timeline`, `pedigree-node`, `relationship-line`, `active-trial`,
`saved-prediction`, `observed-result`, `scientific-model`, `arena-event`, `evidence-mark`,
`model-limitation`.

Emit `specimen-selected`, `hotspot-selected`, `evidence-pinned`, and checkpoint events. Save evidence
references and response text through lesson logic, not inside the renderer.

## Acceptance checks

- Replay reconstructs from compact data and deterministic seeds, not screenshots.
- Pedigree symbols include a visible legend and accessible descriptions.
- Genetics evidence, diversity strategy, tactics, and battle outcome remain separate categories.
- Teachers and students see the same scientific reconstruction for a given trial.
