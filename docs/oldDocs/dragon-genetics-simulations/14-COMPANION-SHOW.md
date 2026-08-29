# 14 — Mini Dragon Show

**Curriculum:** selective breeding, inheritance patterns, breeding true, inbreeding ·
**Routes:** `/dragon-genetics/companion-show` (kennel) ·
`/dragon-genetics/mini-dragon-training` (training ground) ·
`/dragon-genetics/mini-dragon-arena` (show arena) ·
`/dragon-genetics/mini-dragon-pedigree` (pedigree lab)

## Why this exists

Module 12 sends a student's dragon into the [arena](12-DRAGON-ARENA-COMBAT.md) to fight. That is a
good final challenge for some students and the wrong one for others. The Mini Dragon Show is the
open-workstation counterpart: establish a pet breed instead of winning a duel.

It is built on a **separate species**. The lab dragon is a scaled reptile with four genes that all
behave the same way — one dominant allele is enough, and the heterozygote is invisible. A breeding
program on that genome replays one Punnett square six times. The domesticated mini dragon is its own
animal with its own anatomy and its own six loci, chosen so that a student writing a breed standard
meets a *different* inheritance relationship at each one.

The science that makes it more than dress-up: **two dragons that both meet a visible standard can
still produce young that do not.** A student cannot see the hidden allele, so the only way to
establish a breed is to accumulate breeding evidence. Pushing consistency up invites breeding close
relatives, which the bloodline meter reads straight off the pedigree. The final show makes a second
distinction explicit: inherited anatomy creates natural aptitude, but learned cue responses belong
to one trained animal and are never passed to its young.

## Four rooms, one programme

The module is a single breeding programme seen from four stations rather than one long page. A
student writes a standard and breeds in the **kennel**, teaches cues in the **training ground**,
traces a hidden recessive in the **pedigree lab**, and is judged in the **show arena**.

Splitting it this way is not only about page length. Each room states one claim and holds the
evidence for it, and the claims are easier to separate when the rooms are: practice recorded in the
training ground never reaches the young bred in the kennel, and the arena's score is visibly half
from one room and half from the other.

The state does not split. `mini-dragon-kennel.store.ts` owns the whole programme as one
`CompanionShowSnapshot` under one repository key, so a dragon trained in one room is the same dragon
entered in the ring in another, and saved progress and the capstone sync are unchanged by the split.

## The species

### Anatomy

A cat-sized round-scaled quadruped: a short barrel with cute scale rows and baby dorsal bumps, an oversized neotenous skull,
huge forward-set eyes, a stub snout, tufted ears, curling horns, short legs with soft paws and toe
beans, a plumed tail, and small rounded wings that some genotypes lose.

Six procedural profiles, all new, in
[`mini-dragon-procedural-mesh.factory.ts`](../../src/app/shared/assembly/rendering/mini-dragon-procedural-mesh.factory.ts):
`mini-dragon-body`, `-head`, `-leg`, `-wing`, `-tail`, `-tail-plume`. The module shares **no** builder,
silhouette module, palette, or texture with the classic dragon factory. Its hide uses no tiled
texture maps: the readable scale surface is built from rounded geometry and baby-safe bumps. The
inherited plumage layer is the exception, using tiny procedurally generated albedo and alpha maps on
bounded instanced cards rather than a costly simulated fur coat.

Its parameter keys are all `mini`-prefixed (`miniDorsalBumps`, `miniFeatherCoverage`,
`miniHornCurl`, `miniWingSpread`, `miniEmberColor`, …) so the two species' silent
`visualProfile.parameters` contracts cannot collide.

Both factories are asked in `three-assembly-mesh.factory.ts`; neither answers for the other's profile
ids, and a spec asserts that.

### The twenty-four genes

| Gene | Pattern | Visible forms | Channel on the animal |
| --- | --- | --- | --- |
| Back scales | complete dominance (baby-bumpy recessive) | Smooth rows · Baby-bumpy spike rows | three rounded scale rows down the back |
| Feather coverage | **incomplete dominance** | Full mantle · Feathered fringe · Scale-only | one instanced alpha-card layer on the torso and each functional wing |
| Horns | complete dominance (curled dominant) | Curled · Straight | the arc a horn sweeps |
| Wings | **incomplete dominance** | Broad · Small · Vestigial | wing size, collapsing to a furred nub |
| Coat pattern | **codominance** | Ash · Ash-and-gold · Gold | coat colour, both at once in patches |
| Ember | **multiple alleles** (rose > blue > pale) | Rose · Blue · Pale | eye and throat glow |
| Size | complete dominance (teacup recessive) | Standard · Teacup | body *proportions*, not scale |
| Ears | **incomplete dominance** | Sail · Petal · Button | ear height changes by roughly 4× |
| Muzzle | **incomplete dominance** | Storybook · Round short · Button-pug | the entire face projection |
| Leg length | **incomplete dominance** | Stilt · Medium · Waddler | standing height changes by roughly 3× |
| Tail form | **multiple alleles** | Star club · Twin long tails · Twin-fork paddle · Soft pom | one shared base can branch into two complete articulated tails, in addition to three distinct tip forms |
| Head crest | **codominance** | Crown · Crown-and-frill · Side frill | crown bumps and petal frills can appear together |
| Body frame | **incomplete dominance** | Noodle · Balanced · Dumpling | torso length, height, and width |
| Brow plates | **incomplete dominance** | Crowned · Soft · Smooth | paired armor pads above the eyes |
| Whiskers | **incomplete dominance** | Long · Short · None | curved facial whiskers |
| Chin tuft | complete dominance (plume dominant) | Plume · Smooth | a distinct feathered chin cluster |
| Dewlap | **incomplete dominance** | Full · Half · None | a velvet throat sail |
| Neck ruff | **codominance** | Mane · Mane-and-petal · Petal | a textured collar with both forms visible together |
| Shoulder plates | complete dominance (shield dominant) | Shield · Soft | paired shoulder armor |
| Belly scutes | **incomplete dominance** | Broad · Pebbled · Soft | ventral plate size and coverage |
| Flank fins | **incomplete dominance** | Sail · Petal · None | paired side fins along the torso |
| Hip fins | **incomplete dominance** | Sail · Petal · None | paired rear-body fins |
| Tail sail | **incomplete dominance** | Ribbon · Ridge · None | a webbed sail following the tail |

Every gene gets a different *kind* of visual change, so no two can be confused for one another.

Size deliberately alters proportions rather than overall scale: the specimen viewer frames whatever
it is given, so an animal that is merely smaller renders identically to a large one and the gene
would be invisible. A teacup is a relatively larger head on shorter legs, which is both what small
breeds look like and something that survives auto-framing.

Coat colour is a trait here rather than identity, because the codominant locus owns it. Individual
variation therefore rides on saturation and lightness only: two gold littermates differ, neither can
be mistaken for ash, and no jitter leaks a genotype.

### The founding population

Six founders, chosen so the pool is a workable puzzle rather than a random draw: every allele of
every gene is present, all three wing, plumage, and ember forms are visible among the founders
so the ladders can be discovered by looking, and the recessive baby-bumpy rows and teacup size are
carried by smooth-backed standard-sized founders, so they must be bred out of hiding.

### Society divisions, training yard, and show ring

The Society publishes three show divisions. Each names a fixed combination of four visible forms
that judges seek. The student's own breed standard remains independent, so students can align both
goals or accept a tradeoff. Division definitions reference the shared phenotype catalog.

Every kennel dragon can practice four learned cue responses in any order: follow the course pennant,
weave marker posts, settle on the judge's bench, and open its ember display on a lantern cue. Practice
records belong to one individual. The motions run on the real articulated specimen model, and none
of them changes a genome, a litter, or a descendant.

The final judge card is exactly **50 points inherited + 50 points trained**. The inherited half is
25 points for matching the division combination and 25 points for natural aptitude in the trials
below. The trained half comes from the four practiced cue responses.

Four judged trials, which is what this species has instead of combat abilities. Each is a second,
independent read-out of the genome, and none of them names a gene:

| Trial | Reads | Outcomes (ribbon first) |
| --- | --- | --- |
| Flight trial | wings | Soars · Hovers · Grounded |
| Agility run | size **and** coat | Nimble · Brisk · Heavy |
| Cold endurance | coat | Endures · Withdraws |
| Ember display | ember | Rose flare · Blue flare · Faint glow |

Cold endurance rewards protective bumpy scale rows and the agility run punishes their drag, so no companion takes every
ribbon and a breed standard has to commit to something. The agility run reads two loci precisely so
that at least one trial cannot be predicted from a single visible characteristic.

## Required pre-build decision

1. **Scientific goal:** Determine how inherited traits and learned training each shape a champion
   mini dragon.
2. **Manipulable evidence:** Students choose which characteristics enter the standard and which form
   each takes, adopt founders, pair any two kennel dragons, choose a litter size, whelp repeatedly,
   keep or release each young dragon, re-open any past litter, select a Society division, train any
   kennel dragon at any cue station, enter a representative in the show ring, and choose which
   litters count as evidence.
3. **Observable consequence:** Each litter renders as named young judged against the standard it was
   bred to; the kennel, generation count, and founder-line count change with what is kept; the
   bloodline meter re-reads the pedigree for every pairing; the real model performs learned cues;
   the judge card separates inherited and trained points; and the breeds-true figure moves with the
   litters the student cites.
4. **Student-built record:** The breed standard, show division, kennel, every litter with its match
   counts, per-dragon practice history, frozen show runs, cited evidence set, breeder statement, and
   submitted registry entries all persist.
5. **Shared sources:** Founders, loci, and phenotype labels come from `mini-dragon.genetics.ts`; the
   animal is built by `mini-dragon.anatomy.ts` and drawn by the shared specimen renderer; trials come
   from `mini-dragon.events.ts`; divisions and judging come from `mini-dragon.show.ts`; learned poses
   use the shared specimen motion system; persistence is user-scoped local storage.

## Open investigation behavior

- The standard is empty at first. Choosing a form adds it; choosing the same form again removes it.
  Any subset of the twenty-four genes is a legal standard.
- Either parent stand accepts a click on a founder's `Parent 1` / `Parent 2` button, a drag of a
  founder card, a drag of a kennel card, or the same buttons on a kennel card. Every drag has a
  button equivalent.
- Litter sizes are 4, 6, 8, and 12. A pairing can be repeated as often as the student wants.
- Keeping a young dragon adds it to the kennel and makes it available as a parent, which is how the
  program advances a generation. Releasing one removes it and clears it from any pairing.
- Any past litter can be re-opened in the nursery from the breeding record.
- Changing the standard releases the cited evidence, and litters bred to a different standard cannot
  be cited. Evidence is only comparable within one standard.
- Optional breeder prompts stay collapsed and are never graded.

## Judging and bloodline model

**Breed match** compares a dragon's visible form to the student standard, gene by gene. **Show
conformation** separately compares it to the fixed target combination for the chosen Society
division. Nothing uses a cuteness score invented by the component.

**Show judging** reports both halves separately. Inherited points are recalculated from the genome
and selected division. Training points come only from that dragon's practice records. A show run
freezes the numeric result but stores no copy of the genome.

**Breeds true** is the share of young, across the litters the student cites, that met every
characteristic in the standard. It is computed from the student's own records and is zero until they
cite something.

**Bloodline** is the kinship coefficient between the two proposed parents, computed by the standard
recursion over the kennel pedigree and reported as the pair's shared ancestry (`2f`) and the expected
inbreeding of their young (`f`). It reads no genome at all: an inbreeding warning has to come from
the family tree, and deriving it from genotypes would hand students the hidden alleles the
workstation asks them to infer. Founder lines are treated as unrelated, so full siblings read 50%
shared ancestry and 25% young inbreeding.

## Individual features

Ear tufts, eye size, snout length, tail plume, and toe count are hashed off each dragon's id — stable
for one animal, unpredictable from its parents. They exist because a pet workstation needs young that
look like individuals, and they are labelled on the surface as *not one of the thirteen inherited genes*
so no student reads inheritance out of an ear. Biological sex is deliberately absent: the model has
no sex-linked gene, and the workstation rules forbid treating sex as a cosmetic toggle.

## Registry

`Record this breed` unlocks only when the student's own records carry it: a breed name, at least one
characteristic in the standard, a kennel dragon chosen as the representative that meets the standard,
a Society division, practice in all four learned skills for that representative, a current 50/50
show run, three generations bred, at least two cited litters, and a written breeder statement. The
evidence list shows which are met at all times.

## Persistence

Per student: breed name, standard, Society division, adopted founder ids, current pairing, litter
size, every litter record (parents, run number, size, the standard it was bred to, kept young), the
next run number, the chosen representative, per-dragon training sessions, frozen show runs, cited
litters, the breeder statement, and registry entries.

The kennel is never stored. It is rebuilt on load by replaying adopted founders and then every litter
in order through the deterministic breeder, so a saved program cannot drift from the inheritance
model that produced it.

The Rare Trait Pedigree Hunt traces the three hidden complete-dominance forms directly from the gene
catalog: baby-bumpy spike rows, straight horns, and teacup size. Students compare visible family outcomes,
flag possible sources, keep promising offspring, and move them into either breeding stand. Evidence
labels distinguish a dragon that shows the form, a parent proven by affected offspring, a close-family
clue, and an unresolved record. The activity never displays genotype symbols or a hidden answer key.

The storage key is `...companion-show.v4`. Version 3 programs migrate with an empty rare-trait hunt,
and Version 2 mini-dragon kennels migrate with empty training and show records. Version 1 held a breeding program for the four-gene lab dragon; there is no mapping
from "winged" to a coat, a horn curl, or an ember, so a v1 payload is ignored rather than migrated.

## What this species does not share

Because the mini dragon is a different animal with a different genome, its companions are **not**
loadable in the Pedigree Lab, Punnett Composer, Hatchery, or Incubator Sampler — those read the
account genetics file, which holds four-gene lab dragons. The Society register replaces the account
file inside this workstation. That is the deliberate cost of a separate species; if cross-lab
specimens are wanted later, the account library would need a species field rather than the mini
dragon bending back onto the lab dragon's four loci.

## Acceptance checks

- No question dock, phase rail, numbered directions, answer colors, score, or Continue button.
- No allele, genotype, Punnett square, or predicted probability appears anywhere on the surface.
- A litter cannot be whelped until two different kennel dragons are paired.
- Every litter size produces the requested number of young.
- Standard labels come from the gene catalog, not from workstation copy.
- The incomplete-dominance locus shows three visible forms and the codominant locus shows both
  colours on one animal.
- A heterozygous and a homozygous parent at a completely dominant locus are indistinguishable.
- Keeping a young dragon raises the generation count; releasing it clears it from any pairing.
- Litters bred to a different standard cannot be cited as evidence.
- Full siblings read 25% expected inbreeding for their young, from pedigree alone.
- No genome takes every ribbon on the show card.
- Every published division target resolves through the shared phenotype catalog.
- Training a dragon never changes its genome or any descendant.
- Every learned cue moves the real mini-dragon rig and returns it to rest.
- Back-scale labels drive a dedicated dorsal-scale part: smooth rows stay rounded and the
  baby-bumpy form grows short, rounded spike rows down the back.
- The six expanded genes change major silhouettes: ear height, muzzle projection, standing height,
  tail-tip geometry, crest parts, and torso proportions.
- Rounded joint balls cover the attachment ends of the neck, jaw, legs, wings, tail links, and tail
  tip so a pose cannot expose empty space between parts.
- The championship routine moves the representative's real neck, head, jaw, wings, legs, and tail,
  then returns the rig to rest.
- A judged show run contains at most 50 inherited points and at most 50 trained points.
- Offspring begin with no training records even when both parents are ring-ready.
- Rare-trait choices come from the shared genetics catalog rather than duplicate labels.
- Pedigree evidence uses visible parents, littermates, and offspring without exposing genotypes.
- A flagged recorded offspring can be kept and moved directly into a breeding stand.
- Registration stays locked until every evidence line is met.
- Reloading restores the standard, division, kennel, litters, training, show runs, citations, and registry.
- Every rendered specimen uses the mini dragon profiles and the shared specimen renderer.
