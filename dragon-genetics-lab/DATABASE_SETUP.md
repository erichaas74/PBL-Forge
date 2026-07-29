# New database and app setup

The lab currently runs without a backend. Create the new cloud project only after choosing the authentication and classroom data model. Do not copy credentials from the physics application.

## Recommended order

1. Create a new Firebase (or other backend) project owned by the genetics product.
2. Register a new web app and enable only the services this app needs.
3. Add sign-in and decide how teachers, classes, assignments, and student sessions are identified.
4. Install the backend SDK in this folder, not in the physics app.
5. Implement a new `DragonLabRepository` adapter.
6. Replace the two persistence providers in `src/app/app.config.ts`.
7. Add authorization rules and emulator tests before using real student data.
8. Add hosting configuration, build, preview, and then deploy the new app.

## Repository contract

Every backend adapter implements three operations:

```ts
interface DragonLabRepository {
  load(sessionId: string): Promise<DragonLabSnapshot | null>;
  save(sessionId: string, snapshot: DragonLabSnapshot): Promise<void>;
  clear(sessionId: string): Promise<void>;
}
```

The fixed development session id, `local-student`, is also provided in `app.config.ts`. Replace it with a value derived from the signed-in student and the assigned lab. Do not use a display name or email address as a document id.

## Suggested document model

Start with one document for each student attempt:

```text
dragonLabSessions/{sessionId}
  studentUid: string
  classId: string
  assignmentId: string
  status: "in-progress" | "submitted"
  schemaVersion: 1
  snapshot: DragonLabSnapshot
  createdAt: server timestamp
  updatedAt: server timestamp
  submittedAt: server timestamp | null
```

Keep teacher-authored assignments and student-owned attempts separate. This makes it easier to prevent students from editing instructions or reading classmates' work.

## Minimum authorization rules

- A student can create and read only a session whose `studentUid` matches their authenticated uid.
- A student can update only allowed snapshot/status fields on their own session.
- A teacher can read sessions only for classes where a server-controlled membership record grants access.
- Client writes cannot assign teacher/admin roles or change ownership fields.
- Submitted work should either become immutable for students or create an auditable revision.

Use the provider's local emulator to test allowed and denied access. UI route guards are not database security.

## Firebase adapter outline

After adding a brand-new AngularFire configuration, create (for example) `FirestoreDragonLabRepository` and implement the contract with one document per session. Use server timestamps for metadata, but keep `snapshot` JSON-only. The genetics domain contains no Firebase types, so Firestore `Timestamp` values should never enter the view model or Angular `date` pipe.

Then change the provider:

```ts
{ provide: DRAGON_LAB_REPOSITORY, useClass: FirestoreDragonLabRepository }
```

Keep `LocalDragonLabRepository` available for development and offline demonstrations.

## Data migration note

Browser storage belongs to a web origin. A newly hosted domain cannot automatically read progress saved by the physics app. If existing student progress matters, add an explicit export/import workflow before switching domains. If the lab has not been released to students, begin with clean sessions in the new database.

## Deployment checklist

- Production build passes.
- Database rules tests pass for student and teacher roles.
- No secret/admin credential is shipped in the browser bundle.
- Direct navigation to the app URL returns `index.html` (SPA rewrite).
- A student can resume on a second device after signing in.
- Submission status and teacher read access are verified.
- Privacy, retention, and deletion policies for student work are documented.
