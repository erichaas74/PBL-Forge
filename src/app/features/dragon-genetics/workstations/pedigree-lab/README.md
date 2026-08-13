# Pedigree Lab

Students are dragon genealogists hunting an allele that stopped being *visible* generations ago.
They read the historical register, choose an inheritance model, deduce who must be carrying the
allele, spend a small sequencing budget on the dragons the pedigree cannot settle, and breed a pair
of living descendants to bring the appearance back.

Governed by [`docs/DRAGON_GENETICS_WORKSTATION_RULES.md`](../../../../../../docs/DRAGON_GENETICS_WORKSTATION_RULES.md).

## Required pre-build decisions

1. **Scientific goal.** Determine which living dragons still carry an allele that stopped being
   visible generations ago — and therefore that a phenotype disappearing is not the same as an
   allele disappearing.
2. **Manipulable evidence.** The bloodline under investigation, the inheritance model being tested,
   which branch of the pedigree is open and how deep, which dragon is inspected, which dragons are
   sequenced (budgeted), which carrier call is recorded, and which two living dragons are staged for
   breeding.
3. **Observable consequence.** Every dragon's status and possible genotypes are re-deduced from the
   whole register under the chosen model; records the model cannot explain are named; a sequencing
   result collapses one dragon's possibilities and can contradict the model outright; a clutch
   hatches egg by egg against the student's own prediction.
4. **Student-built record.** The gene notebook (sequenced dragons, carrier calls with reasons, a
   written hypothesis), the breeding board authorisation, and the clutch log — all persisted per
   student per investigation.
5. **Shared sources.** Genes come from `EXPRESSIVE_DRAGON_TRAITS`; the inspector renders the real
   assembly renderer through `createExpressiveDragonBenchBuild`; persistence follows the same
   device-local repository pattern as the other workstations.

## Files

| File | Owns |
| --- | --- |
| `pedigree-lab.models.ts` | Record shapes, the five archive loci, status vocabulary, model notation |
| `pedigree-population.ts` | The authored lineage and the deterministic archive built from it |
| `pedigree-deduction.ts` | Carrier deduction and contradiction reporting under a chosen model |
| `pedigree-lab.domain.ts` | Descent walks, kinship, bloodline statistics, breeding |
| `pedigree-layout.ts` | Canvas geometry: generation rows, sibships, union lines |
| `pedigree-lab.repository.ts` | Per-student investigation state on the device |
| `dragon-pedigree-lab.component.*` | The instrument |
| `dragon-pedigree-lab.page.ts` | Route host at `/dragon-genetics/pedigree-lab` |

## Two decisions worth knowing about

**The workstation never states the inheritance pattern.** Students pick one of four models and the
console reports which records that model cannot explain. Allele notation follows the *student's*
hypothesis — under a recessive model the traced allele is written lower case, under a dominant model
upper case — so capitalisation cannot leak the answer before anyone has looked at a record. A
sequencing result is reported as the sequencer found it, which is why testing a male at the Duskmere
eye locus contradicts every autosomal model: there is a Y where the model has no room for one.

**No dragon holds an allele its parents could not have transmitted.** Only the founders and the
outsiders who married in carry an authored genotype; everyone else is bred from their recorded
parents. Where the written history depends on an outcome (Ivrid must be the unbanded dragon the
chronicle describes), `require` pins it by *choosing which parental allele was transmitted*, never by
inventing one, and `pedigree-population.spec.ts` fails if a pin is unreachable from the parents.

## Extending the archive

Add dragons to `FOUNDERS` (with an explicit `generation` for anyone marrying into a later row) and
`UNIONS`. Add an investigation to `BLOODLINE_INVESTIGATIONS`; its `lostPhenotype` must be one of the
gene's own phenotype labels, and the traced allele is derived from it rather than declared. Run the
specs — they check descent consistency, that each hunted appearance is genuinely absent from the
living register, and that a carrier × carrier cross still hatches close to a quarter homozygotes.
