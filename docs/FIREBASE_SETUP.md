# Firebase setup and deployment

PBL Forge is configured for a local demo project and the production Firebase project
`pbl-forge`. Firebase supplies authentication, roles, assignment/catalog records, legacy project
progress, published dragon assets, and hosting. The current shared lesson plan, lesson responses,
case progress, and most workstation records are browser-local; see
[`LESSON_PLAN.md`](LESSON_PLAN.md#persistence-reality).

## Local emulator stack

From the repository root:

```powershell
npm install
npm run dev
```

This starts Auth on `127.0.0.1:9099`, Firestore on `127.0.0.1:8080`, the Emulator UI on
`http://localhost:4000`, seeds Dragon Genetics records, and serves the student app at
`http://localhost:4200`.

The seed creates:

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `teacher@pblforge.local` | `dragon-demo-teacher` |
| Student | `student@pblforge.local` | `dragon-demo-student` |

It also creates the default class, assignment, released allele catalog, student override, and one
published `dragon-genetics-lab` project. Emulator data is disposable unless emulator import/export
is added separately.

`npm start` serves only Angular. The development environment still points Firebase calls at the
emulators, so use `npm run dev` whenever identity or Firestore behavior matters.

## Configuration that is already checked in

- `src/environments/environment.ts` uses the `demo-pbl-forge` emulator project.
- `src/environments/environment.production.ts` contains the public web configuration for
  `pbl-forge` and disables emulator connections.
- `.firebaserc` selects `pbl-forge` as the default deployment target.
- `firebase.json` configures Firestore rules/indexes, SPA Hosting rewrites, cache/security headers,
  and emulator ports.
- `scripts/firebase-cli.mjs` runs pinned `firebase-tools@14.27.0` and removes the unrelated
  `OPENAI_API_KEY` from the child environment before Firebase debug logging.

Firebase web configuration values are public identifiers. Never add a service-account JSON file,
private key, or Admin SDK credential to either Angular application.

## Authentication and authorization

Production supports Google sign-in through the current session service. A signed-in user's public
profile and role are read from `users/{uid}`. New browser-created profiles receive the `student`
role; teacher/admin roles must be assigned by trusted administrative tooling.

The temporary `openTeacherAccess` environment flag currently opens teacher navigation to every
tester, including guests. This does not grant a teacher role: `firestore.rules` remains the authorization
boundary for cloud data. The rules cover users, classes/members, projects/activities, submissions,
Dragon Genetics assignments and overrides, progress, simulation runs, and published designer
assets. Everything unmatched is denied.

## Rules testing

Run the isolated Firestore rules suite with:

```powershell
npm run test:rules
```

The command starts the Firestore emulator for the test process. `npm run verify` also runs this suite
after both apps build and test.

## Deploying

The default target is the production project, so verify the selected project before deployment:

```powershell
npm run firebase -- use
npm run verify
npm run deploy
```

`npm run deploy` builds the student app and deploys Hosting plus Firestore rules/indexes. Hosting
serves `dist/pbl-forge/browser` and rewrites client routes to `index.html`.

For a non-production Firebase project, register a web app, add an alias with
`npm run firebase -- use --add`, and use a deliberate environment configuration for that project.
Do not point a development alias at the production Firestore database. A Hosting preview channel is
still public and must rely on Authentication and Firestore rules, not URL secrecy.

## Production readiness gaps

Before using real student data, confirm district policy for accounts, retention, consent, and
shared-device behavior. The current app also needs an intentional cloud repository/publishing design
for teacher lesson-plan changes, lesson responses, case records, and workstation-local records if
students must continue across browsers or devices.

Operationally, also establish:

- a trusted teacher/admin invitation and role-assignment process;
- class membership provisioning and removal;
- term-end export/deletion procedures;
- App Check rollout and monitoring;
- budget/read monitoring and a separate non-production Firebase project; and
- keyboard, screen-reader, Chromebook, projector, and shared-device verification.
