# Dragon Genetics workstation architecture

**Product contract:**
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md)

This is the current implementation boundary for keeping scientific rules, app identity, lesson/case
orchestration, persistence, markup, and visual design separable.

## Angular boundary

```text
routed *.page or orchestration host
  ├─ reads route and query parameters
  ├─ DragonWorkstationContextService
  │    ├─ SessionService              current student identity
  │    ├─ DragonAdaptiveStore         assignment, released catalog, notebook
  │    └─ AccountGeneticsLibrary      student-owned dragons and records
  ├─ lesson/case evidence repository
  └─ passes explicit inputs
          ↓
standalone workstation component
  ├─ external HTML and SCSS/CSS       accessible interaction and scoped design
  ├─ component TypeScript             transient view/instrument state
  ├─ domain TypeScript                pure scientific rules
  ├─ models TypeScript                serializable contracts
  └─ station repository               browser-local persistence boundary
          ↓ typed outputs
routed page/orchestration host         evidence capture, app progress, navigation
```

The page or host is app-aware. A portable workstation component does not read route parameters,
choose the signed-in user, or decide which teacher records are released. It receives stable values
through inputs and emits typed scientific records or interaction events.

A workstation component is not required to be a passive presentation component. A lab may own
transient selections, drag state, animation, cameras, and instrument controls. Pure calculations
belong in domain files, durable records behind repositories, and cross-app identity in the host.

## Current sources of truth

| Concern | Owner | Workstation access |
| --- | --- | --- |
| Student identity and local fallback | `DragonWorkstationContextService` and `dragon-workstation-context.models.ts` | Required `studentId` input |
| Assignment and released allele records | `DragonAdaptiveStore` | `availableGenes` / `availableAlleles` inputs |
| Shared genetics notebook | `DragonAdaptiveStore.geneticsNotebook` | Notebook input or shared adapter |
| Student-owned dragon/chromosome records | `AccountGeneticsLibraryService` | Host-provided identity or explicit library access in station service |
| Chromosome geometry and loci | `workstations/shared/dragon-chromosome.catalog.ts` | Shared import; never restated locally |
| Allele DNA and released samples | shared DNA/allele catalogs plus assignment release | Shared import or host input |
| Classic inheritance and phenotype | `simulation/domain/` | Shared domain import |
| Mini-dragon inheritance and anatomy | `workstations/companion-show/` plus shared mini renderer | Mini-species domain import |
| Workstation experiment records | station repository | Repository API, normally browser-local today |
| Lesson evidence and case progress | `orchestration/` and `cases/` repositories | Host capture/output boundary |
| App progress/Firestore sync | routed page, adaptive store, or project facade | Typed component output only |

## Lesson and case launch context

Core lesson links pass `path` and `lesson` query parameters to an explicit workstation route. The
routed page reads those parameters and lets an investigation attach supported evidence back to the
lesson record.

Case links use
`/dragon-genetics/path/:pathId/lesson/:lessonId/branch/:caseId`. The case page owns acceptance,
committed plans, model outcomes, revision, and return navigation. It launches the same portable
workstation with case/branch context; the workstation does not own the story route.

Directly opening a workstation route remains supported. In that mode it uses the current student
context and station repository without requiring a lesson or case.

## Persistence boundary

Most station repositories currently use the safe JSON `localStorage` helper and key records by a
normalized student ID. Components should not add new direct `localStorage` access: keep storage
normalization, schema migration, and corrupt-data fallback in a repository.

Some older components still access browser storage directly. Treat those as migration debt, not a
pattern. A future Firestore implementation should keep the same station-facing repository contract
so scientific interaction code does not change when synchronization is added.

## Mechanical checks

`npm run check:workstations` enforces key boundaries under `workstations/`:

- routed and workstation components use external templates and styles;
- workstation components do not couple directly to the session service;
- linked component files exist; and
- stateful stations do not silently default to a shared `local-student` identity.

The TypeScript boundary check separately prevents student code from importing Designer authoring
source. Product rules such as open-order investigation, no question dock, and accessible
select-and-place alternatives still require component tests and browser inspection.

## Moving or embedding a workstation

Inside PBL Forge:

1. Import the workstation component, not its routed `*.page.ts` host.
2. Read identity, assignment, and released catalogs in the new container.
3. Pass a stable `studentId` and only the released data the station expects.
4. Handle typed outputs in the container for evidence, navigation, or progress.
5. Keep station HTML, styles, domain, models, and repository together.
6. Run `npm run check:workstations`, station specs, and `npm run build`.

In another Angular application, copy the station folder and only the shared runtime dependencies it
imports. Replace the host context and repository implementation at their boundaries. Preserve CSS
tokens, keyboard/select alternatives for drag interactions, and the scientific catalogs used by the
station. Do not copy PBL Forge routes, lesson orchestration, or `DragonWorkstationContextService` as
if they were part of the instrument.
