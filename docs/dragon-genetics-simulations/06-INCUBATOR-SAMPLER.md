# 06 - Phenotype Incubator Sampler

**Curriculum:** Module 6, visible inheritance across samples and generations · **Skill:** GEN-7 ·
**Route:** `/dragon-genetics/incubator-sampler`

## Workstation contract

The Incubator Sampler is a phenotype-only breeding and observation instrument. Students select two
account dragons, choose one visible trait, produce offspring batches, and sort hatchlings by the
visible form they show. Every hatchling in a selected phenotype bucket can join the balanced
breeding pool for the next generation.

The surface does not display or name allele pairs, genotypes, Punnett squares, expected Mendelian
percentages, or reasons that an outcome appeared. Internal inheritance stays in the shared Hatchery
breeder; the sampler exposes only observable evidence.

## Required pre-build decision

1. **Scientific goal:** Investigate how visible inherited traits appear and change across offspring
   and generations.
2. **Manipulable evidence:** Students can choose two released account dragons, choose a visible trait,
   change batch size, repeat a cross, and breed all offspring from a phenotype bucket as a later
   population.
3. **Observable consequence:** Eggs move through the forge, hatch at staggered times, pass the
   selected visible-trait scanner, sort into dynamically labelled buckets, and update counts and
   percentages.
4. **Student-built record:** Every completed batch adds a generation row with the parent IDs, visible
   phenotype counts and percentages, and any offspring later chosen for breeding.
5. **Shared sources:** Parent availability comes from `AccountGeneticsLibraryService`; trait and
   phenotype labels come from `DRAGON_TRAITS`; offspring come from `breedLabClutch`; parent and
   hatchling inspection uses the shared specimen renderer; persistence is user-scoped local storage.

## Open investigation behavior

- Both parent selectors reuse the Hatchery's account dragon file in dragon-only mode.
- Parent cards show the real assembly renderer, parent name, and visible characteristics only.
- Trait choices are generated from the shared dragon trait catalog.
- Supported sample sizes are 4, 8, 12, 25, 50, and 100 offspring.
- A student may repeat the current pair at the current generation with any sample size.
- The most recent bucket with at least two offspring can become the next breeding pool.
- Every pool member contributes as evenly as the requested clutch size permits. The shared breeder
  distributes all possible mate pairings evenly, then uses each pairing's hidden inherited state
  and complete Punnett outcomes to produce the observable ratios. For example, hidden `Ww × ww`
  inheritance allocates 1:1, while breeding its winged `Ww` offspring allocates hidden `Ww × Ww`
  outcomes 1:2:1. Those internal symbols and proportions never appear on the student surface.
- Breeding a bucket advances the lineage by one generation while preserving earlier batch rows.
- `New observation` clears the current comparison and unlocks the original parent and trait choices.
- Optional observational prompts stay collapsed and are not graded.

## Animation and accessibility

The central machine preserves the supplied hatchery reference's dark forge, raised center conveyor,
staggered eggs, mid-belt hatch, mechanical splitter, branch belts, and physical receiving bins. A
real 3D specimen porthole shows the hatchling currently being scanned; compact bucket tokens show
population size without opening dozens of WebGL contexts.

Every account dragon can be selected by button or dragged to a parent station. Starting a batch and
breeding a bucket use native buttons. Labels, counts, text, and shapes carry every result in addition
to color. Reduced-motion mode completes the same experiment without waiting for the transport
animation.

## Persistence

The sampler saves, per student:

- original parent IDs and every ID in the current breeding pool;
- selected visible trait and batch size;
- generation and deterministic run number;
- phenotype label for each offspring;
- counts and percentages in each phenotype bucket; and
- IDs of every offspring selected for a later breeding pool.

On reload, the workstation rebuilds the same hidden offspring through the shared deterministic
breeder, then restores the visible batch history. No scientific catalog or phenotype rule is copied
into the component.

The corrected Punnett-balanced model uses the `v2` local persistence key. Earlier `v1` observations
remain untouched in local storage but are not loaded as evidence because their sampled inheritance
could contain the incorrect ratios that this model replaces.

## Acceptance checks

- No dedicated question dock, phase rail, numbered directions, answer colors, score, or Continue
  button appears.
- No allele, genotype, or expected-outcome information appears anywhere on the workstation.
- The incubator cannot run until two different parents are loaded.
- Every supported sample size produces the requested number of offspring.
- Bucket names and the history columns come from the selected trait's visible phenotype labels.
- Counts add to the batch size and percentages describe that batch.
- A bucket with fewer than two offspring cannot supply a breeding population.
- Choosing **Breed these for more hatchlings** selects the whole valid bucket and immediately
  breeds the selected clutch size as the next generation while preserving history.
- Parent contribution within a bucket pool differs by no more than one opportunity per clutch;
  hidden inheritance is allocated from all four Punnett cells as closely as clutch size permits and
  is never displayed.
- Reloading restores parents, visible results, later-generation selection, and current settings.
- Parent and inspection canvases use the existing assembly renderer.
