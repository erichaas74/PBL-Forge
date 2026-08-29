# PBL Forge code organization

The workspace contains two Angular applications. Student-facing PBL Forge code lives under
`src/app`; private dragon authoring tools live under `designer/src/app`.

## Student application

The current public lesson flow is owned by these Dragon Genetics folders:

- `lesson-plan/` — the executable shared lesson document, path-choice and lesson pages, and the
  teacher editor. Public lesson URLs are
  `/dragon-genetics/path/:pathId/lesson/:lessonId`.
- `cases/` — optional field-case definitions, case state/outcome rules, and the nested branch page.
- `orchestration/` — lesson launch context, evidence attachment, and host shells that connect a
  portable workstation to lesson/case state.
- `workstations/` — active student laboratory instruments, grouped by scientific domain. Cross-lab
  chromosome, DNA, notebook, account-genetics, and host-context code lives in
  `workstations/shared/`.
- `simulation/` — classic-dragon inheritance, phenotype generation, and simplified genome models.
- `capstones/` — capstone mission surfaces such as the Dragon Arena.

The older `journey/`, `adaptive/`, `project/`, and `inquiry/` folders still support retained hub,
assignment, notebook, and legacy progress behavior. They are not the current public lesson-routing
layer. Do not add new lesson navigation to a dynamic simulation fallback or `/journey/**`; add an
explicit route in `src/app/app.routes.ts` and attach the workstation through the shared lesson plan.

Other `src/app/features/` folders contain generic project/catalog/activity surfaces that predate the
current Dragon Genetics front door.

## Shared student runtime

- `src/app/shared/assembly/` — game-neutral assembly contracts, cloning, physics, persistence helpers,
  generated dragon anatomy, Three.js rendering, and viewport primitives shared with Designer.
- `src/app/shared/assembly-arena/` — reusable battle physics, rendering, strategies, and controls.
- `src/app/shared/creation-library/` — built-in and browser-local assembly/move/scenario assets.
- `src/app/shared/dragon-visuals/` — cross-workstation scientific and renderer primitives. It must
  not own lesson, assessment, routing, or station-specific persistence.
- `src/app/core/firebase/` — Firebase providers, identity/role handling, repositories, and guards.

Shared runtime code must not import historical prototypes or private Designer source.

## Dragon Designer

- `designer/src/app/parts-lab/` — mesh, surface, and proportion authoring.
- `designer/src/app/assembly-garage/` — part, joint, physics, JSON, preset, and model-pack authoring.
- `designer/src/app/dragon-garage.page.ts` — dragon-only Garage host.
- `model-packs/dragon-model-pack.v1.json` — committed and validated data consumed by PBL Forge.

Designer may import `src/app/shared/assembly`. PBL Forge must never import from `designer/**` or
`assembly-garage`; `npm run check:designer-boundary` enforces the one-way boundary. Publishing a
model means validating and committing the pack (or intentionally publishing through the Designer
asset repository), not importing authoring code into the student app.

## Workstation folder contract

A routed workstation normally contains:

```text
workstations/<station>/
  <station>.page.ts/.html/.scss       app-aware route container
  <station>.component.ts/.html/.scss portable investigation surface
  <station>.models.ts                 serializable contracts
  <station>.domain.ts                 pure scientific rules
  <station>.repository.ts             persistence boundary
  <station>.manifest.ts               instrument capabilities, when used
  *.spec.ts                           domain, component, and repository coverage
```

Small stations do not need empty files merely to match this shape, but identity, routing, and app
progress stay in the page/host; scientific truth stays in domain/catalog files; persistent state
stays behind a repository.

Before changing a student workstation, read
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md). For implementation
boundaries and moving a workstation, read
[`DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md`](DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md).

## Non-runtime folders

- `public/` — static files copied into the browser build.
- `scripts/` — Firebase, seeding, browser driving, asset checks, and verification tooling.
- `model-packs/` — reviewed build-time artifacts from Designer.
- `docs/` — current product/development documentation.
- `docs/oldDocs/` — historical proposals, old build notes, prototypes, and references; never a
  current implementation contract.
