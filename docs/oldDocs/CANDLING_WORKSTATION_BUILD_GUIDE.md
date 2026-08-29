# Candling Workstation build guide

This guide records the five product decisions required by
`DRAGON_GENETICS_WORKSTATION_RULES.md` for the dedicated Candling Workstation.

1. Scientific goal: students distinguish phenotype evidence from genotype evidence while
   investigating one sealed dragon egg.
2. Manipulable evidence: students choose when to candle, when to take a DNA sample, and when to
   stage and hatch the assigned egg. A host may supply a specific egg; the standalone page assigns
   a deterministic random egg and can issue another.
3. Observable consequence: candling reveals modeled future traits, sampling reveals the focus-gene
   allele pair, and hatching reveals the dragon. Each action changes only its corresponding record.
4. Student-built record: the shared candling bench accumulates the egg's candled trait readout, DNA
   sample, hatch state, and specimen identity throughout the investigation.
5. Shared sources: offspring come from `dragon-inheritance.ts`; the workstation reuses
   `DragonHatcheryStationComponent`, the shared hatchery SVGs, chromosome diagram, and dragon
   assembly renderer. No scientific truth is duplicated in the page shell.
