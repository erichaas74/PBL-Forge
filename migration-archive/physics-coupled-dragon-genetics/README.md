# Dragon Genetics Lab

`/game/dragon-genetics` is a student-facing Grade 7 heredity investigation aligned to MS-LS3 and supported by MS-LS1 practices.

## Student flow

1. Mission briefing and driving question
2. Seven mini-lessons plus inherited/acquired trait sort
3. Parent profiles, genotypes, Punnett sample spaces, and probability predictions
4. Deterministic eight-egg hatchery samples with phenotype and 3D assembly inspection
5. Prediction-versus-observation data analysis, sexual/asexual reproduction checkpoint, and claim-evidence-reasoning response
6. Pair-comparison diversity dashboard and final breeding recommendation

The final report can be printed/saved as PDF or downloaded as text. Progress is stored locally under `dragon.geneticsLab.v1`.

## Model boundaries

The classroom layer intentionally uses four fictional single-gene traits with complete dominance. It repeatedly identifies this as a simplified model. Dominance is never framed as strength, health, value, or frequency. The population-diversity score combines modeled allele richness and expected heterozygosity; it is not a medical or individual-fitness score.

The existing continuous dragon genome and phenotype builder remains the game/runtime layer. `dragon-inheritance.ts` maps the classroom genotype to that engine only to generate a matching assembly preview. This keeps instructional genotype evidence explicit without coupling future battle balance to the simplified lesson model.

## Suggested classroom sequence

- Week 1: briefing, mini-lessons, trait sort, and parent profile talk
- Week 2: inheritance predictions, hatchery samples, reproduction checkpoint, and CER explanation
- Week 3: compare candidate pairs, draft a recommendation, peer review, and present to the Genetics Board

## Later extensions

- Teacher dashboard for viewing submissions and exporting class data
- Shared class clutch runs for ratios, percentages, and larger-sample comparisons
- Accessibility read-aloud and multilingual vocabulary supports
- Rubric scoring and standards-tagged feedback
- A separate, optional dragon battle route that consumes saved dragons without changing the genetics assessment criteria
