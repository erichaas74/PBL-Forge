# Current application setup

PBL Forge is one repository with two separately built Angular 22 applications and a shared runtime.
The student application is the deployed product. Dragon Designer is a private authoring application
used to produce validated dragon model data.

## Applications

| Application | Source | Local URL | Command | Test command |
| --- | --- | --- | --- | --- |
| PBL Forge student app | `src/` | `http://localhost:4200` | `npm start` | `npm run test:ci` |
| Dragon Designer | `designer/` | `http://localhost:4300` | `npm run start:designer` | `npm run test:designer:ci` |

Both applications are standalone-component Angular SPAs. Student code may import the game-neutral
assembly runtime under `src/app/shared/assembly`; it must never import private source from
`designer/` or `assembly-garage`. `npm run check:designer-boundary` enforces that boundary.

## Local modes

Use the smallest mode that matches the work:

```powershell
npm install

# Student UI only. Firebase calls target the configured local emulators,
# but this command does not start or seed them.
npm start

# Student UI plus Auth and Firestore emulators and seeded Dragon Genetics data.
npm run dev

# Private authoring app only.
npm run start:designer
```

`npm run dev` starts the Auth emulator on `9099`, Firestore on `8080`, Emulator UI on `4000`, seeds
the demo assignment and accounts, and then serves the student app. See
[`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) for accounts and deployment details.

## Current student surface

`/dragon-genetics` is the public front door. It presents the Arena and Mini Show contexts, then the
five shared lessons documented in [`LESSON_PLAN.md`](LESSON_PLAN.md). Lessons launch explicit
workstation routes with `path` and `lesson` query parameters. Optional cases use a nested branch
route and return to their anchor lesson.

The app also exposes direct open-lab routes for the active workstations, fourteen focused microscope
levels under `/dragon-genetics/microscope/:level`, and three teacher routes:

- `/teacher` — teacher dashboard;
- `/teacher/lesson-plan` — shared-plan editor and case controls; and
- `/teacher/dragon-test-bench` — renderer/test-bench tools.

During testing, `openTeacherAccess` is enabled in both environment files, so every tester sees the
Teacher dashboard link, passes `teacherAccessGuard`, and can open teacher routes without signing in.
Set the flag to `false` after testing to restore the normal sign-in gate and role-only route access.
Firestore rules continue to protect teacher-only cloud writes regardless of this UI flag.

`/dragon-genetics/explore` is an older project-hub surface retained in the codebase. It is not the
default route and should not own new lesson navigation.

## Runtime ownership

```text
PBL Forge route/page
  ├─ lesson-plan and case orchestration
  ├─ workstation host context (identity, assignment, released catalog)
  ├─ portable workstation component
  │    ├─ scientific domain and models
  │    └─ browser-local repository for most lab records
  └─ shared assembly/dragon rendering

Dragon Designer
  └─ authoring tools → validated model-packs/dragon-model-pack.v1.json
                              ↓
                    PBL Forge shared renderer
```

The student app loads the committed model pack at build/runtime. Designer can also publish reviewed
dragon assets to the dedicated Firestore collection, but no Designer UI or authoring dependency is
shipped in the student bundle.

## Data and persistence

| Data | Current owner |
| --- | --- |
| Signed-in user and role | Firebase Authentication plus `users/{uid}` |
| Class, assignment, released allele catalog, and adaptive settings | Firestore, with local mock fallback where implemented |
| Legacy project/activity progress and genetics notebook sync | Firestore repositories and `dragonLabProgress` rules |
| Default lesson plan | Checked-in TypeScript model |
| Teacher lesson edits and enabled cases | Browser `localStorage` |
| Lesson responses, attached evidence, case plans/outcomes | Browser `localStorage`, keyed by student/path/lesson |
| Most dedicated workstation experiment records | Station-specific browser-local repositories |
| Dragon model pack | Checked-in `model-packs/dragon-model-pack.v1.json` |

Firebase route guards improve navigation, but Firestore rules are the security boundary. Browser
storage is a persistence convenience, not a secure multi-user database.

## Verification

Before considering an app change complete, run:

```powershell
npm run lint
npm run test:ci
npm run test:designer:ci
npm run build
npm run build:designer
```

`npm run verify` adds palette/type ratchets, Firestore rules, and browser accessibility checks, and
therefore needs the emulator/tooling environment. The current known test failure is the
`inquiry-registry.spec.ts` coverage ratchet: `microscope-dragon` has two eligible Grade 7 items and
the spec requires three.

Use [`BROWSER_DRIVER.md`](BROWSER_DRIVER.md) to verify real rendered behavior. For dragon anatomy or
parts, start with [`PART_WORK_BRIEF.md`](PART_WORK_BRIEF.md).
