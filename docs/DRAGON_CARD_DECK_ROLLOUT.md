# Personal Dragon Card Deck rollout

## Product idea

Give every student-owned, bred, hatched, or assigned dragon a collectible fantasy battle card. The
visual direction should have the energy of an ornate dueling card: metallic frame, portrait window,
rank mark, compact stat strip, catalog number, and a dramatic flippable back. It must use original
PBL Forge artwork, names, iconography, proportions, and card layout rather than copying another
game's logo or exact trade dress.

The student's cards live in a persistent **Dragon Deck**. A card catalog shows collected cards,
undiscovered silhouettes, filters, saved lineages, and where each dragon came from. This is a later
cross-workstation feature; Trait Evidence is the first visual pilot.

## Non-negotiable data rules

- A card references one canonical dragon identity. It does not contain a second hard-coded genome.
- Portraits use a thumbnail from the shared assembly renderer or a deterministic representation of
  that same dragon build.
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
- Real dragon portrait or renderer-derived thumbnail
- Battle role derived from available abilities
- Arena rating with its model/context clearly named
- Power, durability, protection, and versatility from the shared assay
- Stable catalog number and lineage mark

### Back

- Observable traits and unlocked Genetics Notebook discoveries
- Parentage and generation
- Sex chromosome model where scientifically relevant
- Tests completed, supported claims, and workstation discoveries
- Acquisition story and date
- Link or action to open the full dragon record

Unknown genes, allele labels, or outcomes remain hidden until the student has legitimately unlocked
them. Flipping a card must never leak an investigation answer.

## Deck and catalog experience

- Grid and binder views with search, trait, lineage, generation, and source filters
- Front/back flip with a visible button, keyboard support, and reduced-motion fallback
- Favorite and reorder controls; no drag-only interactions
- Empty slots may communicate collection scope but should not pressure students with purchases or
  randomized rewards
- Offline/local mock persistence first, with a repository interface that can later use Firestore
- Account Genetics Library should become the read surface for cards across workstations

## Suggested rollout order

1. **Trait Evidence pilot:** flippable specimen cards with assay-derived stats and evidence counts.
2. **Hatchery and Incubator:** award a card when a persistent dragon record is created; show parent
   cards during selection.
3. **Allele Workbench and Punnett Composer:** use compact cards only for selecting already-owned
   dragons or parents. Keep chromosomes and evidence as the dominant scientific surface.
4. **Arena:** choose combatants from the deck and update battle-history readouts without changing
   the underlying genome.
5. **Pedigree and companion workstations:** link cards to lineage nodes and show-specific records.
6. **Dragon Genetics home:** add the full binder/catalog and a compact “recent cards” shelf.

## Shared component plan

Build one reusable `DragonCardComponent` and one `DragonDeckComponent`. The card accepts a resolved,
read-only view model and emits semantic actions such as select, flip, favorite, and open record. It
must not know which workstation hosts it. Use CSS custom properties for cosmetic editions and keep
the scientific content DOM-identical across editions.

Before the wider rollout, add contract tests proving that Hatchery, Test Bench, Arena, and the card
resolver report the same phenotype and combat values for the same dragon record.

## Accessibility and performance

- Front and back are real text, not text baked into an image.
- Flip state is announced with `aria-pressed`; hidden faces are removed from the accessibility tree.
- Every card action has a native button and visible focus state.
- Reduced motion changes faces immediately without a 3D rotation.
- Catalog virtualization or pagination begins before large student decks create dozens of WebGL
  contexts. Prefer stored renderer thumbnails in catalog grids and mount a live renderer only in a
  selected-card detail view.
