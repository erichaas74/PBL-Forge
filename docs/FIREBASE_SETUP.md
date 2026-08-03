# Firebase setup and launch walkthrough

Everything through local development is already configured. The remaining steps require your own Google/Firebase account and district decisions.

## 1. Run the completed local foundation

From `C:\Users\erich\Desktop\PBL-Forge`:

```powershell
npm install
npm run dev
```

Open http://localhost:4200. The catalog should show **Design a Mars Habitat** and **Watershed Detectives**. Open a project, complete an activity, and submit it. Saved responses appear in the Emulator UI at http://localhost:4000 under Firestore → `submissions`.

The local build uses a disposable anonymous student account. Production does not enable anonymous sign-in automatically.

## 2. Create separate Firebase projects

In the [Firebase Console](https://console.firebase.google.com/), create two projects with your actual naming convention:

- `pbl-forge-dev` for connected development and pilot testing
- `pbl-forge-prod` for real student use

Do not share one Firestore database between development and production. When Firestore asks for a location, select the region closest to the school population and keep the same region for future server-side services.

Analytics is not required. Leave it disabled until the district has explicitly approved the data collection.

## 3. Register the production web app

In `pbl-forge-prod`:

1. Select **Project settings → Your apps → Web**.
2. Register the app as `PBL Forge Web`.
3. Copy the public Firebase configuration object.
4. Replace every `REPLACE_WITH_...` value in `src/environments/environment.production.ts`.

Firebase web configuration values are public identifiers, not secrets. Never add a service-account JSON file, private key, or Admin SDK credential to the Angular application.

## 4. Enable Authentication

In **Authentication → Sign-in method**:

1. Enable Google if the district uses Google Workspace.
2. Set a support email controlled by the school or project owner.
3. Add the final Hosting/custom domain under **Authorized domains**.
4. Do not enable anonymous authentication for production unless you deliberately want unsigned student sessions.

Before broad use, confirm the district policy for student accounts, retention, and parent consent. Store only the minimum student information required for the learning experience.

## 5. Create Firestore

In **Firestore Database**:

1. Create the database in production mode.
2. Do not paste permissive starter rules into the console.
3. Deploy the checked-in `firestore.rules` and `firestore.indexes.json` from the CLI.

The current rule model provides these boundaries:

- Anyone can read published project content.
- Drafts are visible only to their owner or an administrator.
- Only users with a trusted `teacher` role can create projects.
- Students can create and update only their own submissions.
- A project owner can read submissions associated with their project.
- Everything unmatched is denied.

Teacher roles must be assigned by trusted server/admin tooling—not by a browser form. The next backend milestone should provide a controlled invitation or role-assignment workflow.

## 6. Connect the Firebase CLI

Java 17 is installed on this machine, so the scripts currently invoke Firebase CLI 14.27 externally. When you install JDK 21, update the pinned CLI version in `package.json` to the current supported release.

Log in and add project aliases:

```powershell
npm run firebase -- login
npm run firebase -- use --add
```

Choose the development project and name the alias `dev`. Run `use --add` again, choose production, and name it `prod`.

Verify the selected target before every deployment:

```powershell
npm run firebase -- use
```

## 7. Deploy a development preview

Select the development alias, build, and deploy:

```powershell
npm run firebase -- use dev
npm run deploy
```

For a temporary Hosting preview URL:

```powershell
npm run build
npm run firebase -- hosting:channel:deploy pilot-1
```

Preview URLs are public URLs. Firestore rules and Authentication must protect private data even when a URL is difficult to guess.

## 8. Production readiness checklist

Before selecting the production alias:

- Run `npm run verify` successfully.
- Pilot with teacher-owned test accounts and synthetic student data.
- Review Firestore rules with the exact queries used by the teacher dashboard.
- Decide how classes and membership invitations are provisioned.
- Establish a term-end submission deletion/export process.
- Add Google Cloud budget alerts and monitor Firestore reads and writes.
- Register App Check with reCAPTCHA Enterprise, observe metrics, then enable enforcement.
- Add a custom domain and confirm the Authentication authorized-domain entry.
- Confirm keyboard, screen-reader, Chromebook, and shared-device behavior.
- Keep persistent Firestore disk caching disabled on shared student computers.

Then deploy:

```powershell
npm run firebase -- use prod
npm run deploy
```

## 9. Recommended next implementation milestone

Build the teacher publishing workflow around immutable versions:

```text
projects/{projectId}
projects/{projectId}/versions/{versionId}
projects/{projectId}/activities/{activityId}
assignments/{assignmentId}
submissions/{studentId_assignmentId_activityId}
```

A trusted callable Cloud Function should validate a draft, create an immutable published version, and assign teacher/admin roles. Add Cloud Storage only when projects need images, audio, or downloads; do not store large files or executable HTML/JavaScript in Firestore.
