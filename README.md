# PBL Forge

PBL Forge is an Angular/Firebase learning application centered on a Grade 7 Dragon Genetics
experience. Students choose an Arena or Mini Show breeding context, complete the same five core
genetics lessons, investigate scientific models in open workstations, and can take optional
evidence-driven field cases.

The repository also contains Dragon Designer, a private Angular authoring app for procedural dragon
parts and validated model packs. Designer source is never shipped in or imported by the student app.

Start with the [documentation index](docs/README.md), the
[current lesson plan](docs/LESSON_PLAN.md), and the [application setup](docs/APP_SETUP.md).
Historical proposals and superseded build notes are preserved in
[docs/oldDocs](docs/oldDocs/README.md).

## Start locally

Prerequisites: a supported Node version from `package.json`, npm, and Java for Firebase emulators.

```powershell
npm install
npm run dev
```

- Student app: http://localhost:4200
- Firebase Emulator UI: http://localhost:4000
- Firestore emulator: `127.0.0.1:8080`
- Authentication emulator: `127.0.0.1:9099`

Open Dragon Genetics at http://localhost:4200/dragon-genetics. The guarded teacher dashboard is at
http://localhost:4200/teacher and the shared-plan editor is at
http://localhost:4200/teacher/lesson-plan.

To run only one Angular application:

```powershell
npm start                 # student app on 4200
npm run start:designer    # private Designer on 4300
```

## Applications and boundaries

| Application | Source | Purpose |
| --- | --- | --- |
| PBL Forge | `src/` | Student lessons, workstations, cases, teacher surfaces, and Firebase integration |
| Dragon Designer | `designer/` | Local/private mesh, part, preset, and model-pack authoring |

Shared assembly code lives in `src/app/shared/assembly`. Reviewed Designer output is committed as
`model-packs/dragon-model-pack.v1.json`. `npm run check:designer-boundary` prevents the student app
from importing private authoring code.

## Verification

```powershell
npm run lint
npm run test:ci
npm run test:designer:ci
npm run build
npm run build:designer
```

`npm run verify` runs the complete suite, including Firestore rules and accessibility checks. See
[APP_SETUP.md](docs/APP_SETUP.md#verification) for the known pre-existing test note.

## Key commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start emulators, seed Dragon Genetics data, and serve the student app |
| `npm start` | Serve only the student Angular app |
| `npm run start:designer` | Serve Dragon Designer on port 4300 |
| `npm run browse -- <args>` | Drive and inspect a real Chromium session |
| `npm run seed` | Reseed running Auth/Firestore emulators |
| `npm run generate:dragon-pack` | Regenerate the baseline committed model pack |
| `npm run check:model-packs` | Validate published model-pack data |
| `npm run build` | Run student boundaries/asset checks and build PBL Forge |
| `npm run build:designer` | Validate the pack and build Designer |
| `npm run test:rules` | Run Firestore authorization tests |
| `npm run deploy` | Build and deploy Hosting plus Firestore configuration |

Firebase configuration, local accounts, current persistence boundaries, and production gaps are
documented in [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).
