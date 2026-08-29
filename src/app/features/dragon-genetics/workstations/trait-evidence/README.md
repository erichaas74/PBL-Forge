# Trait Evidence investigation

This workstation follows `docs/DRAGON_GENETICS_WORKSTATION_RULES.md`. It is an open-order field
investigation, not a scripted lesson or embedded quiz.

## Required pre-build decisions

1. **Scientific goal:** Determine how inherited anatomy and abilities, innate protective reflexes,
   and learned command responses each contribute to a dragon's fighting performance.
2. **Manipulable evidence:** Students choose any released dragon and investigation, select rendered
   body parts, replay combat demonstrations, run command and flame-flash trials, flip specimen
   cards, select chromosome pairs on the card backs, and cite hatch, family, training, or trial
   records.
3. **Observable consequence:** The real specimen renderer demonstrates horn charge, tail sweep, and
   fire breath. Command training changes whether a dragon performs a response. A fire flash drives
   a synchronized recoil and code-driven close-up in which the eyelids and nostril covers close.
4. **Student-built record:** Students save revisable evidence claims under inherited anatomy or
   ability, innate reflex, learned response, or needs more evidence. The snapshot persists per
   student and continues to feed project progress.
5. **Shared sources:** Dragon anatomy and phenotype use `createExpressiveDragonBenchBuild`; ability
   poses and combat numbers use the shared assembly renderer, ability catalog, combat profile, and
   specimen assay; card backs use the shared cell model, chromosome-pair builder, allele catalog,
   and expressive phenotype rules; persistence uses `TraitEvidenceRepository`.

## Interaction structure

The Academy Field Deck is a specimen selector and compact record, not a progression rail. After
choosing a dragon, students can investigate anatomy, abilities, reflexes, and commands in any useful
order. A supported field report needs evidence from inherited, innate, and learned observations,
but no individual experiment is locked behind another.

Each card front mounts that specimen's real three-dimensional assembly canvas. Its back shows the
same complete genome used to build the specimen: selecting any chromosome pair changes the compact
gene, genotype, inheritance, and expressed-trait readout below the shared nucleus view.

The cards use the shared physical-deck navigator. The selected specimen stays centered; exposed
previous and next cards can be selected directly, and the same selection can be changed with a
horizontal swipe or Left/Right Arrow without changing the card data or investigation state.

The card treatment in this workstation is the pilot for the account-wide proposal in
`docs/oldDocs/DRAGON_CARD_DECK_ROLLOUT.md` (historical rollout note).
