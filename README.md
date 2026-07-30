# PBL Forge

PBL Forge is an Angular and Firebase foundation for delivering project-based learning experiences to students. It includes a Firestore-backed project catalog, sequenced activity player, response saving, teacher dashboards, local demo data, and tested deny-by-default security rules. The featured Dragon Genetics experience is a complete three-week Grade 7 heredity PBL with genetics simulation, official breeding, and a physics arena.

Active application code lives under `src/app`; reusable assembly, garage, arena, and creation-library code is under `src/app/shared`. Historical standalone and migration implementations remain outside `src` and are not compiled. See [Code organization](docs/CODE_ORGANIZATION.md) and the [Dragon Genetics visual laboratory plan](docs/DRAGON_GENETICS_VISUAL_LAB_PLAN.md).

## Start locally

Prerequisites on this machine are already satisfied: Node 22, npm, and Java 17.

```powershell
npm install
npm run dev
```

The first run can take a minute while Firebase downloads its local emulator assets.

- Student app: http://localhost:4200
- Firebase Emulator UI: http://localhost:4000
- Firestore emulator: `127.0.0.1:8080`
- Authentication emulator: `127.0.0.1:9099`

`npm run dev` starts both emulators, seeds three projects, and starts Angular. No cloud Firebase account is used.

Open the Dragon Genetics experience directly at http://localhost:4200/dragon-genetics. Its teacher dashboard is at http://localhost:4200/teacher/dragon-genetics.

## Verify the project

```powershell
npm run build
npm run test:ci
npm run test:rules
```

Or run the full sequence:

```powershell
npm run verify
```

## Key commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the complete local stack with demo content |
| `npm run seed` | Reseed a running Firestore emulator |
| `npm run build` | Create an optimized production build |
| `npm run test:ci` | Run Angular tests in headless Chrome |
| `npm run test:rules` | Run Firestore authorization tests |
| `npm run firebase -- <command>` | Run the pinned Firebase CLI with credential-safe logging |
| `npm run deploy` | Validate config, build, and deploy Hosting plus Firestore |

## Architecture

```text
Angular SPA ── Firebase Hosting
     ├─────── Firebase Authentication
     ├─────── Cloud Firestore (projects, activities, submissions, dragonLabProgress)
     └─────── Cloud Storage later (media only)
```

The browser never receives Admin SDK credentials. Firestore rules, rather than Angular route guards, enforce authorization.

See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for the account setup and production launch walkthrough.

See [docs/DRAGON_GENETICS_IMPLEMENTATION.md](docs/DRAGON_GENETICS_IMPLEMENTATION.md) for the instructional sequence, assessment model, data captured, and classroom launch checklist.
