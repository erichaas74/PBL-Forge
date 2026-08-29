# PBL Forge documentation

This directory contains the documentation for the app as it exists now. Historical proposals,
completed rollout notes, superseded build guides, and visual prototypes are preserved under
[`oldDocs/`](oldDocs/README.md); they are not current product requirements.

## Current product documents

- [`LESSON_PLAN.md`](LESSON_PLAN.md) — the five shared Dragon Genetics lessons, the two story
  contexts, optional case branches, and the student/teacher flow.
- [`APP_SETUP.md`](APP_SETUP.md) — how the two Angular applications run, route, store data, and
  connect to Firebase.
- [`CODE_ORGANIZATION.md`](CODE_ORGANIZATION.md) — where student, designer, shared, and support code
  belongs.
- [`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md) — authoritative
  product rules for student workstations.
- [`DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md`](DRAGON_GENETICS_WORKSTATION_ARCHITECTURE.md) — the
  Angular, domain, persistence, and host boundaries used by workstations.

## Development and operations

- [`BROWSER_DRIVER.md`](BROWSER_DRIVER.md) — inspect either application in real Chromium.
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) — local emulators, seeded accounts, production connection,
  and deployment boundaries.
- [`PART_WORK_BRIEF.md`](PART_WORK_BRIEF.md) — starting point for dragon-part work.
- [`MESH_EDITING.md`](MESH_EDITING.md) — generated mesh and visual-profile contracts.

## Sources of truth

Documentation describes the implementation; it does not replace it. When checking current
behavior, use these owners:

| Concern | Source of truth |
| --- | --- |
| Default lesson order, questions, and required workstations | `src/app/features/dragon-genetics/lesson-plan/dragon-lesson-plan.models.ts` |
| Public and teacher routes | `src/app/app.routes.ts` |
| Optional cases and their lesson anchors | `src/app/features/dragon-genetics/cases/dragon-case.registry.ts` |
| Focused microscope routes | `src/app/features/dragon-genetics/workstations/genome-microscope/microscope-level-workstations.ts` |
| Build, test, and verification commands | `package.json` |
| Firebase authorization | `firestore.rules` |
| Student workstation product behavior | `DRAGON_GENETICS_WORKSTATION_RULES.md` |

Update the matching current document when one of those contracts changes. New speculative work
belongs in an issue or in `oldDocs/` with an explicit status; it should not be mixed into the
current product documents.
