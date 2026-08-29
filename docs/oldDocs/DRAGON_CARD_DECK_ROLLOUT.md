# Personal Dragon Card Deck rollout

## Product idea

Give every student-owned, bred, hatched, or assigned dragon a collectible fantasy battle card. The
visual direction should have the energy of an ornate dueling card: metallic frame, portrait window,
rank mark, compact stat strip, catalog number, and a dramatic flippable back. It must use original
PBL Forge artwork, names, iconography, proportions, and card layout rather than copying another
game's logo or exact trade dress.

The student's cards live in a persistent **Dragon Deck**. A card catalog shows collected cards,
undiscovered silhouettes, filters, saved lineages, and where each dragon came from. Trait Evidence
established the visual language; the same selector now reads the Account Genetics Library anywhere
a workstation chooses a whole dragon.

## Non-negotiable data rules

- A card references one canonical dragon identity. It does not contain a second hard-coded genome.
- Portraits use the live shared assembly renderer for visible workstation cards. A future catalog
  may use renderer-captured thumbnails for offscreen pages, but never a separate decorative dragon.
- Chromosomes and gene readouts resolve through the shared cell model, chromosome-pair builder,
  allele catalog, and expressive phenotype rules; cards do not carry their own locus truth.
- Phenotype labels come from the expressive-genome and shared phenotype sources.
- Battle statistics come from `assaySpecimen` and the shared combat profile used by the arena.
- Parentage comes from hatchery/incubator records. Discovery labels come from the Genetics Notebook.
- A card refreshes when its underlying dragon record changes; workstations never patch card stats.
- Card rarity or decoration must not imply that one genotype is biologically superior. Cosmetic
  editions may be rare; scientific and combat measurements remain explicit data.

## Proposed shared model

Create a versioned `DragonCardRecord` in `workstations/shared` with references rather than copied
truth:

```ts
interface DragonCardRecord {
  schemaVersion: 1;
  cardId: string;
  ownerStudentId: string;
  dragonRecordId: string;
  acquiredFrom: 'starter' | 'hatchery' | 'incubator' | 'assignment' | 'achievement';
  acquiredAtIso: string;
  cosmeticEditionId: string;
  favorite: boolean;
}
```

Resolve the card view model at runtime from the dragon record, renderer, assay, phenotype catalog,
and notebook. Store only ownership, acquisition, cosmetic edition, ordering, and favorite state on
the card record.

## Card faces

### Front

- Dragon name and original academy series mark
- Live three-dimensional dragon canvas for each visible workstation card
- Battle role derived from available abilities
- Arena rating with its model/context clearly named
- Power, durability, protection, and versatility from the shared assay
- Stable catalog number and lineage mark

### Back

- Shared cell/nucleus view with selectable homologous chromosome pairs
- Gene, genotype, inheritance pattern, and expressed trait readout for the selected chromosome
- Parentage and generation
- Sex chromosome model where scientifically relevant
- Tests completed, supported claims, and workstation discoveries
- Acquisition story and date
- Link or action to open the full dragon record

Gene visibility follows the host investigation. A complete specimen record such as Trait Evidence
may expose the full readout; discovery workstations must still hide locked genes or outcomes.
Flipping a card must never leak an answer that its host investigation expects the student to infer.

## Deck and catalog experience

- Grid and binder views with search, trait, lineage, generation, and source filters
- Workstation selection uses the shared physical-deck navigator: one centered active card, a more
  visible angled next card, a smaller previous-card peek, and deeper cards stacked behind.
- Selecting an exposed card, using Left/Right Arrow, or swiping at least the shared gesture
  threshold brings that card forward with the same semantic selection event.
- The deck wraps naturally across roughly 2–10 cards and narrows its cards and offsets before an
  angled neighbor can create viewport overflow.
- Front/back flip with a visible button, keyboard support, and reduced-motion fallback
- Favorite and reorder controls; no drag-only interactions
- Empty slots may communicate collection scope but should not pressure students with purchases or
  randomized rewards
- Offline/local mock persistence first, with a repository interface that can later use Firestore
- Account Genetics Library should become the read surface for cards across workstations

## Suggested rollout order

1. **Trait Evidence pilot:** flippable specimen cards with assay-derived stats and evidence counts.
2. **Hatchery and Incubator:** show parent cards during selection and award a card when a persistent
   dragon record is created.
3. **Genome Microscope and Punnett Composer:** use compact cards for selecting already-owned dragons
   and expose the same clickable chromosome back. Keep the scientific model as the dominant surface.
4. **Arena:** choose combatants from the deck and update battle-history readouts without changing
   the underlying genome.
5. **Pedigree and companion workstations:** link cards to lineage nodes and show-specific records.
6. **Dragon Genetics home:** add the full binder/catalog and a compact “recent cards” shelf.

## Shared component plan

Use one reusable card face and one deck navigator. The card accepts a resolved, read-only view model
and emits semantic actions such as select, flip, favorite, and open record. It must not know which
workstation hosts it. Use CSS custom properties for cosmetic editions and keep the scientific
content DOM-identical across editions.

The shared implementation is split into `DragonFlipCardComponent` for the canonical live
dragon/genome faces, `FannedCardDeckComponent` for layout, click, keyboard, and swipe navigation,
and `DragonCardDeckSelectorComponent` for resolving Account Genetics Library records into those two
views. Trait Evidence, Punnett Composer, Genome Microscope, Dragon Hatchery, Incubator Sampler,
Blood Compatibility, Protein Rescue, Island Diversity intake, and Arena account selection consume
these shared pieces rather than carrying their own card or carousel behavior.

Punnett Composer presents two sex-filtered instances: an XX female deck assigned only to Parent 1
and an XY male deck assigned only to Parent 2. Test mode keeps the same two positions but substitutes
the canonical heterozygous XX and XY reference cells.

Before the wider rollout, add contract tests proving that Hatchery, Test Bench, Arena, and the card
resolver report the same phenotype and combat values for the same dragon record.

## Accessibility and performance

- Front and back are real text, not text baked into an image.
- Flip state is announced with `aria-pressed`; hidden faces are removed from the accessibility tree.
- Every card action has a native button and visible focus state.
- Reduced motion changes faces immediately without a 3D rotation.
- Small workstation decks mount a live renderer in every visible card. Larger binder/catalog views
  must paginate or virtualize before they create dozens of WebGL contexts, and should suspend
  offscreen canvases. Renderer-captured thumbnails are acceptable only for those offscreen catalog
  pages and must come from the same canonical dragon build.
