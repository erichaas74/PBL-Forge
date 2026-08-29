# Current Dragon Genetics lesson plan

**Implementation status:** five core lessons are published by default, plus optional work: two extra
lessons open by default, one extra lesson a teacher opens, and the two field commissions. Both student paths use the
same lesson order, learning goals, questions, and workstation list.

The code-owned default is `DEFAULT_DRAGON_LESSON_PLAN` in
`src/app/features/dragon-genetics/lesson-plan/dragon-lesson-plan.models.ts`. This document explains
that model in teacher-facing language; the TypeScript model remains the executable source of truth.

## The lesson shape

Students first choose what they are breeding toward:

| Context | Student goal | Specimens |
| --- | --- | --- |
| Dragon Arena | Breed a strong fighting dragon using genetics evidence. | Full-size dragons |
| Mini Dragon Show | Breed a cute, well-trained show dragon using genetics evidence. | Mini dragons |

The context changes the story purpose and, where a workstation supports it, the specimens. It does
not create a second curriculum. A lesson launched in either context uses the same scientific goal,
questions, and ordered core investigation.

## Published core lessons

| Lesson | Learning goal | Required investigation | Evidence students use |
| --- | --- | --- | --- |
| 1. Meet the Dragons | Distinguish inherited characteristics from learned behaviors using observations and records. | Mystery Pair Investigation | Compared traits, behavior trials, and notebook observations |
| 2. Breeding Dragons | Use offspring counts to investigate how visible traits pass from parents to offspring. | Breeding Incubator | Phenotype-bucket counts from repeated crosses and different sample sizes |
| 3. Where Do Genes Live? | Locate genes inside chromosomes and connect chromosomes to the nucleus and cell. | Cell-to-Gene Microscope | The nested cell → nucleus → chromosome → gene relationship and selected loci |
| 4. Allele Experiments | Use complete allele-pair evidence to determine dominant and recessive phenotype expression. | Allele Workbench | Outcomes from all three diploid pairings for a selected gene |
| 5. Meiosis and Dragon Eggs | Explain how meiosis, crossing over, and gamete selection create a new chromosome combination. | Meiosis Hatchery | Parent chromosomes, crossing-over changes, selected gametes, and the fertilized egg |

Each core lesson currently contains four written-response questions. Responses are reflection and
explanation work on the lesson page; formal question UI is not embedded in a dedicated workstation.
That separation is required by
[`DRAGON_GENETICS_WORKSTATION_RULES.md`](DRAGON_GENETICS_WORKSTATION_RULES.md).

## Optional work

All optional work — extra lessons and field commissions — is listed together as **Extra lessons and
commissions** on the student home page and on each path index. Nothing here takes a position in the
numbered path or blocks a lesson, and none of it appears inside the lesson it relates to.

### Extra lessons

An extra lesson is a full lesson with its own guide, workstation, and written questions. It is
offered from its anchor lesson's page as well as the optional-work list, and a teacher opens or
closes it with the same publish switch used for core lessons.

| Extra lesson | Anchor lesson | Investigation | Open by default |
| --- | --- | --- | --- |
| Reading a Pedigree | Meiosis and Dragon Eggs | Pedigree Lab (`frost-scale`) | yes |
| Choosing Between Inheritance Models | Meiosis and Dragon Eggs | Pedigree Lab (`stonewake-tail`) | yes |
| Locating a Gene on a Chromosome | Meiosis and Dragon Eggs | Pedigree Lab (`duskmere-eye`) | no — a teacher opens it |

Design detail in [`PEDIGREE_LAB_LESSON_PLAN.md`](PEDIGREE_LAB_LESSON_PLAN.md).

### Field commissions

Two non-blocking cases return to Lesson 4 when complete. They are enabled by default and can be
disabled under that lesson in the teacher lesson-plan editor; students reach them from the
optional-work list, not from the lesson page.

| Case | Investigation | Student decision |
| --- | --- | --- |
| The Dragon in the Ash | Emergency Healing Station (`blood-type-lab`) | Recommend a donor using patient and donor blood-test evidence while preserving scarce universal-donor stock. |
| The Food That Steals Fire | Dracose Response Unit (`protein-rescue`) | Trace both gene copies through protein function and patient response, then recommend a supported diet. |

Cases are applications of lesson science, not extra required lessons. A student accepts the
commission, investigates in the routed workstation, attaches evidence, commits to a diagnosis and
recommendation, sees the model outcome, and may revise. Skipping a case does not block Lesson 5.

## Student route flow

```text
/dragon-genetics
  → choose arena or mini-show
  → /dragon-genetics/path/:pathId
  → /dragon-genetics/path/:pathId/lesson/:lessonId
       ├─ required workstation route with ?path=...&lesson=...
       └─ optional /branch/:caseId → case workstation → return to lesson
```

The older project hub still exists at `/dragon-genetics/explore`, but it is not the current lesson
front door. New lesson navigation belongs in `lesson-plan/` and explicit routes in `app.routes.ts`,
not in the older `journey/` or adaptive registry navigation.

## Teacher controls and current limits

The guarded `/teacher/lesson-plan` page can:

- add, reorder, publish, and unpublish lessons, including opening or closing an extra lesson;
- edit lesson titles, learning goals, and student guide text;
- attach or remove any focused microscope workstation; and
- enable or disable the registered optional cases.

The current editor does not edit the built-in question prompts, remove a lesson, or replace a core
workstation. Those values can exist in the document model, but changing them currently requires a
code change. Teacher edits are stored only in that browser's `localStorage`; they are not yet a
shared class plan in Firestore.

## Persistence reality

The current lesson experience is local-first:

- the teacher-edited lesson document is browser-local;
- written lesson responses are stored per student, path, and lesson on the device;
- attached lesson evidence and case progress are browser-local and keyed by student identity;
- workstation repositories persist their own experiment records locally unless their code
  explicitly uses the Firebase-backed adaptive store; and
- Firebase supplies signed-in identity and released assignment/catalog data, but it does not yet
  publish or synchronize the shared lesson document and case records across devices.

This makes the complete flow usable with the local mock/emulator setup. It also means clearing site
data, switching browsers, or using another device can remove or hide lesson and workstation records.
Do not describe these records as teacher-synchronized until a Firestore repository replaces the
local implementations.

## Changing the curriculum

When changing the default plan:

1. Update `DEFAULT_DRAGON_LESSON_PLAN` and its normalization/spec tests.
2. Add or change explicit routes in `src/app/app.routes.ts` when a workstation is involved.
3. Keep the two paths scientifically identical unless the product model is intentionally changed.
4. Keep formal questions on the lesson page and investigations inside workstations.
5. Update this document and the route/lesson-plan specs in the same change.
