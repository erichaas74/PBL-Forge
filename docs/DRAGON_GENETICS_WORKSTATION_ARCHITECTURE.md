# Dragon Genetics workstation architecture and portability audit

**Audit date:** 2026-08-15  
**Product contract:** [`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md)

This is the implementation contract for keeping workstation science, app state, markup, and visual
design independent. It also explains how to embed a workstation in another Angular host without
silently creating a second source of truth.

## The Angular boundary

```text
route/page container
  └─ DragonWorkstationContextService
       ├─ SessionService                 current student identity
       └─ DragonAdaptiveStore            assignment, released catalog, notebook
            ↓ explicit signal inputs
standalone workstation component
  ├─ component.html                      structure and accessible interaction
  ├─ component.scss/css                  component-scoped visual design
  ├─ component.ts                        view state and UI event orchestration
  ├─ domain.ts                           pure scientific rules
  ├─ models.ts                           serializable contracts
  └─ repository.ts                       device/database persistence boundary
            ↓ typed outputs
route/page container                     app progress sync and navigation
```

The page is the app-aware container. A workstation component must not inject `SessionService`, read
route parameters, or decide which teacher records are released. It receives those values through
inputs. App progress publishing and navigation remain in the page.

This is deliberately not a rule that every component must be "dumb." A large laboratory is a
feature component and may own transient selection, drag, animation, and instrument state. Scientific
calculations belong in domain files, persistent state belongs behind a repository, and app identity
belongs in the host context.

## Sources of truth

| Concern                                   | Owner                                                      | Workstation access                                                                            |
| ----------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Signed-in or local student identity       | `DragonWorkstationContextService.studentId`                | Required `studentId` input                                                                    |
| Local identity fallback and normalization | `dragon-workstation-context.models.ts`                     | Shared helper; never repeat the literal in runtime workstation code                           |
| Assignment and released allele records    | `DragonAdaptiveStore`, exposed by the context service      | `availableGenes` and `availableAlleles` inputs                                                |
| Genetics notebook                         | `DragonAdaptiveStore.geneticsNotebook`                     | `notebook` input to presentational notebook/workbench UI                                      |
| Chromosome geometry and loci              | `shared/dragon-chromosome.catalog.ts`                      | Import the catalog; do not restate bands or loci                                              |
| Cell/chromosome navigation                | `shared/cell-chromosome-viewport.component.*`              | Pass `CellChromosomeViewportItem[]`; keep domain-to-view adaptation in the owning workstation |
| Allele DNA                                | `shared/dragon-gene-dna.catalog.ts` and the allele catalog | Import or receive released records                                                            |
| Classic dragon inheritance                | `simulation/domain/dragon-inheritance.ts`                  | Import domain definitions                                                                     |
| Account dragons/chromosomes               | `AccountGeneticsLibraryService`                            | Inject the shared library using the required student ID                                       |
| Workstation records                       | The station's repository                                   | Inject the repository; do not call `localStorage` from a component                            |
| App progress/Firestore sync               | Routed page or project facade                              | Typed component output only                                                                   |

The DNA comparison workstation was the one active component still reading `localStorage` directly.
It now uses `DnaComparisonRepository`, and its public data contracts live in
`dna-process.models.ts` rather than in an Angular component file.

## Audit result by active workstation

| Workstation         | Angular input boundary                                                           | Shared/persistent truth                                         | Audit status                                                        |
| ------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| Allele Workbench    | released genes, released alleles, notebook, feedback; emits interactions         | assignment catalog + shared notebook                            | Separated                                                           |
| Blood Compatibility | required student ID                                                              | account library + blood repository/domain                       | Separated                                                           |
| Companion Show      | required student ID, optional goal; emits snapshots                              | mini-dragon domain + show repository                            | Separated; component is large but domain/persistence are outside it |
| DNA Process Lab     | required student ID, optional goal/case/chromosome/catalog; emits tool selection | released catalog + DNA comparison repository                    | Separated in this audit                                             |
| Dragon Hatchery     | required student ID, optional deterministic seed                                 | account library + breeding repository + meiosis/hatchery domain | Structurally separated; product-contract issue remains below        |
| Genome Microscope   | released genes, released alleles, chromosome labels; emits model selection       | assignment catalog + chromosome catalog                         | Separated and presentational                                        |
| Incubator Sampler   | required student ID, optional goal                                               | account library + sampler repository/domain                     | Separated                                                           |
| Island Diversity    | required student ID; emits stored worlds                                         | account library + island repository/domain                      | Separated                                                           |
| Pedigree Lab        | required student ID, optional goal/investigation ID                              | pedigree repository/domain/population/layout                    | Separated                                                           |
| Protein Rescue      | required student ID                                                              | account library + rescue repository/models                      | Separated                                                           |
| Punnett Composer    | required student ID, optional goal; emits saved crosses                          | account library + composer repository/models                    | Separated                                                           |
| Trait Evidence      | required student ID; emits snapshots                                             | evidence content/domain/repository                              | Separated                                                           |

All Angular components and routed pages under `workstations/` now use external `.html` and
`.scss`/`.css` files. Angular's default emulated encapsulation keeps one workstation stylesheet from
selecting another workstation's internal DOM. The `check:workstations` command enforces external
templates/styles, forbids direct session coupling outside the context adapter, checks linked files,
and rejects component-owned `local-student` input defaults.

## Moving a workstation within this app

1. Import the standalone workstation component, not its routed `*.page.ts` host.
2. Get app-owned values from `DragonWorkstationContextService` in the new container.
3. Pass a stable `studentId`. It is required for every stateful workstation.
4. Pass released catalogs and notebook state when the component exposes those inputs. Do not pass
   the complete built-in catalog when the assignment releases only a subset.
5. Handle typed outputs in the container for navigation or app progress sync.
6. Keep the station folder together. Its HTML and SCSS are part of the component, while its domain,
   models, content, and repository files are the science/persistence boundary.
7. Run `npm run check:workstations`, the station specs, and `npm run build`.

Example container:

```ts
import { Component, inject } from '@angular/core';
import { DragonWorkstationContextService } from './workstations/shared/dragon-workstation-context.service';
import { DragonDnaRepairLabComponent } from './workstations/dna-process-lab/dragon-dna-repair-lab.component';

@Component({
  imports: [DragonDnaRepairLabComponent],
  template: `
    <app-dragon-dna-repair-lab
      [studentId]="context.studentId()"
      [genes]="context.availableGenes()"
      [alleles]="context.availableAlleles()"
    />
  `,
})
export class ExampleWorkstationHost {
  readonly context = inject(DragonWorkstationContextService);
}
```

The inline template in this small example is acceptable for documentation; routed workstation
implementations in this repository must use external HTML and CSS.

## Moving a workstation to another Angular application

Copy the station folder and only the shared runtime dependencies it imports. Do not copy a routed
page or `DragonWorkstationContextService`; those are PBL Forge adapters. In the destination app:

- provide the required `studentId` from that app's identity/session layer;
- replace repository implementations if browser-local persistence is not appropriate;
- provide released catalog/notebook data through inputs;
- bring the shared assembly or DNA visual components used by the station;
- supply the global design tokens from `src/styles.scss`, or define equivalent CSS custom
  properties in the destination theme; and
- preserve click/select alternatives for every drag operation.

Repository classes are `providedIn: 'root'`, so no additional provider is needed when moving a
station inside PBL Forge. Outside this app, keep the same repository API and substitute storage at
the dependency-injection boundary instead of rewriting component behavior.

## Remaining audit findings

These are product/cleanup findings, not hidden architecture dependencies:

1. **Dragon Hatchery still violates the open-workstation contract.** Its active surface contains
   numbered setup sections, a phase rail, and `Step 1` through `Step 5` narration. That is scripted
   guidance forbidden by the authoritative workstation rules. Its science and file boundaries are
   now isolated, but the interaction must be redesigned as an open-order instrument before it can
   pass the product rejection checklist.
2. **Genome Microscope still runs inside the registry question shell.** The component itself is a
   portable visual instrument, but the current route adds a phase rail and question dock. Treat
   that route as temporary assessment scaffolding, not the reference architecture for a dedicated
   workstation.
3. **Loose prototype files remain in the active folder.** The standalone HTML prototypes and old
   Markdown plans at the root of `workstations/` are not imported by the Angular app. Move them to
   `migration-archive/` or `docs/` in a dedicated cleanup change so the active source tree describes
   runtime code only.
4. **Several UI orchestrators remain large.** Pedigree, meiosis, and companion-show components have
   pure domain and repository layers already, but their view-state files are still long. Split them
   by actual instrument subpanels only when those subpanels need independent tests or reuse; do not
   create a shared visual mega-component or move station-specific CSS into global styles.
