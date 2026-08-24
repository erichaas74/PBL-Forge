import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-pbl-forge-rules';
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8'),
  },
});

let passed = 0;

async function test(name, work) {
  try {
    await work();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function assignmentData(id = 'default', ownerId = 'teacher-1', classId = 'class-1') {
  const now = new Date();
  return {
    id,
    ownerId,
    classId,
    title: 'Adaptive genetics',
    defaultLevel: 'grade-7',
    alleleCatalog: { availableGeneIds: ['wings', 'fire', 'horns', 'scales'] },
    simulationSettings: {},
    journeyPlan: {},
    inquirySettings: {},
    assignmentVersion: 1,
    updatedAtIso: now.toISOString(),
    updatedAt: now,
  };
}

function simulationRunData(overrides = {}) {
  const now = new Date();
  return {
    schemaVersion: 1,
    studentId: 'student-1',
    simulationId: 'trait-evidence',
    assignmentId: 'default',
    assignmentVersion: 1,
    contentVersion: 1,
    level: 'grade-7',
    hintsAllowed: true,
    seed: 'fixed-seed',
    attemptNumber: 1,
    currentQuestionIndex: 0,
    questionIds: [],
    responses: [],
    complete: false,
    score: 0,
    startedAtIso: now.toISOString(),
    updatedAtIso: now.toISOString(),
    updatedAt: now,
    ...overrides,
  };
}

try {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/teacher-1'), { role: 'teacher' });
    await setDoc(doc(db, 'users/teacher-2'), { role: 'teacher' });
    await setDoc(doc(db, 'users/student-1'), { role: 'student' });
    await setDoc(doc(db, 'users/student-2'), { role: 'student' });
    await setDoc(doc(db, 'projects/published-project'), {
      title: 'Published',
      status: 'published',
      ownerId: 'teacher-1',
    });
    await setDoc(doc(db, 'projects/draft-project'), {
      title: 'Draft',
      status: 'draft',
      ownerId: 'teacher-1',
    });
    await setDoc(doc(db, 'classes/class-1'), { ownerId: 'teacher-1', title: 'Class 1' });
    await setDoc(doc(db, 'classes/class-1/members/student-1'), { joinedAt: new Date() });
    await setDoc(doc(db, 'classes/class-2'), { ownerId: 'teacher-2', title: 'Class 2' });
    await setDoc(doc(db, 'classes/class-2/members/student-2'), { joinedAt: new Date() });
    await setDoc(
      doc(db, 'dragonGeneticsAssignments/default'),
      assignmentData(),
    );
  });

  await test('any visitor can read a published project', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'projects/published-project')));
  });

  await test('a visitor cannot read a draft project', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'projects/draft-project')));
  });

  await test('a teacher can create a project they own', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'projects/teacher-project'), {
        title: 'Teacher project',
        status: 'draft',
        ownerId: 'teacher-1',
      }),
    );
  });

  await test('a student cannot create a project', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      setDoc(doc(db, 'projects/student-project'), {
        title: 'Student project',
        status: 'draft',
        ownerId: 'student-1',
      }),
    );
  });

  await test('a teacher cannot transfer project ownership', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'projects/draft-project'), { ownerId: 'teacher-2' }),
    );
  });

  await test('a teacher cannot transfer class ownership', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertFails(updateDoc(doc(db, 'classes/class-1'), { ownerId: 'teacher-2' }));
  });

  const submission = {
    studentId: 'student-1',
    projectId: 'published-project',
    activityId: 'activity-1',
    response: { selectedOptionId: 'a' },
    status: 'in-progress',
    updatedAt: new Date(),
  };

  await test('a student can create their own submission', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'submissions/student-1_published-project_activity-1'), submission),
    );
  });

  await test('a student cannot evade uniqueness with an arbitrary submission id', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(setDoc(doc(db, 'submissions/arbitrary-id'), submission));
  });

  await test('another student cannot read the submission', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(getDoc(doc(db, 'submissions/student-1_published-project_activity-1')));
  });

  await test('the owning teacher can read the submission', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'submissions/student-1_published-project_activity-1')));
  });

  await test('a student cannot transfer a submission to another user', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'submissions/student-1_published-project_activity-1'), {
        studentId: 'student-2',
      }),
    );
  });

  const dragonProgress = {
    studentId: 'student-1',
    projectId: 'dragon-genetics-lab',
    experienceSchemaVersion: 4,
    assignmentId: 'default',
    teacherId: 'teacher-1',
    completedSimulationIds: [],
    simulationLevels: {},
    simulationScores: {},
    updatedAt: new Date(),
  };

  await test('a student can create their own Dragon Genetics record', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'dragonLabProgress/student-1'), dragonProgress));
  });

  await test('another student cannot read a Dragon Genetics record', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(getDoc(doc(db, 'dragonLabProgress/student-1')));
  });

  await test('a teacher can read a student Dragon Genetics record', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'dragonLabProgress/student-1')));
  });

  await test('an unrelated teacher cannot read a Dragon Genetics record', async () => {
    const db = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(getDoc(doc(db, 'dragonLabProgress/student-1')));
  });

  await test('a student cannot write a Dragon Genetics record for another student', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(
      setDoc(doc(db, 'dragonLabProgress/student-1-copy'), {
        ...dragonProgress,
        studentId: 'student-1',
      }),
    );
  });

  await test('a student cannot forge an unrelated teacher assignment link', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(
      setDoc(doc(db, 'dragonLabProgress/student-2'), {
        ...dragonProgress,
        studentId: 'student-2',
        teacherId: 'teacher-2',
      }),
    );
  });

  await test('progress rejects unknown fields and out-of-range scores', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        arbitraryClaim: true,
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        simulationScores: { 'trait-evidence': 101 },
      }),
    );
  });

  await test('a student can persist their genetics research chart', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        geneticsNotebook: {
          schemaVersion: 1,
          studentId: 'student-1',
          assignmentId: 'default',
          experiments: [],
          discoveries: {},
          updatedAtIso: new Date().toISOString(),
        },
      }),
    );
  });

  await test('a student cannot put another student id in their genetics research chart', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        geneticsNotebook: {
          schemaVersion: 1,
          studentId: 'student-2',
          assignmentId: 'default',
          experiments: [],
          discoveries: {},
          updatedAtIso: new Date().toISOString(),
        },
      }),
    );
  });

  await test('a student can publish a compact capstone progress summary', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        capstoneProgress: {
          schemaVersion: 1,
          selectedPathId: 'dragon-arena',
          arena: {
            status: 'complete',
            selectedChampionId: 'champion-1',
            trialCount: 1,
            winCount: 1,
            bestScore: 87,
            bestRemainingHealthPercent: 62,
            latestAtIso: new Date().toISOString(),
          },
        },
      }),
    );
  });

  await test('a student can publish compact dedicated-workstation progress', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'dragonLabProgress/student-1'), {
        activityProgress: {
          'trait-evidence': {
            status: 'complete',
            evidenceCount: 3,
            latestAtIso: new Date().toISOString(),
          },
        },
      }),
    );
  });

  await test('a teacher can create an adaptive assignment they own', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'dragonGeneticsAssignments/teacher-assignment'),
        assignmentData('teacher-assignment'),
      ),
    );
  });

  await test('a student can read the assigned adaptive configuration', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'dragonGeneticsAssignments/default')));
  });

  await test('a student outside the assigned class cannot read its configuration', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(getDoc(doc(db, 'dragonGeneticsAssignments/default')));
  });

  await test('a student cannot rewrite an adaptive assignment', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'dragonGeneticsAssignments/default'), {
        defaultLevel: 'ap-biology',
      }),
    );
  });

  await test('the owning teacher can create a student override', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'dragonGeneticsAssignments/default/studentOverrides/student-1'), {
        studentId: 'student-1',
        defaultLevel: 'grade-8',
        simulationLevels: { 'trait-evidence': 'grade-8' },
        updatedAt: new Date(),
      }),
    );
  });

  await test('a student can read only their own assignment override', async () => {
    const ownDb = testEnv.authenticatedContext('student-1').firestore();
    const otherDb = testEnv.authenticatedContext('student-2').firestore();
    const override = doc(
      ownDb,
      'dragonGeneticsAssignments/default/studentOverrides/student-1',
    );
    await assertSucceeds(getDoc(override));
    await assertFails(
      getDoc(
        doc(otherDb, 'dragonGeneticsAssignments/default/studentOverrides/student-1'),
      ),
    );
  });

  await test('a student cannot write their own assignment override', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      updateDoc(doc(db, 'dragonGeneticsAssignments/default/studentOverrides/student-1'), {
        defaultLevel: 'ap-biology',
      }),
    );
  });

  await test('a teacher can publish Dragon Garage assets', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'publishedDragonAssets/current'), {
      schemaVersion: 1,
      versionId: 'v1',
      modelPack: { schemaVersion: 1, rendererContractVersion: 1, models: [{}] },
      arenaScenario: { id: 'dragon-duel-ring' },
      publishedBy: 'teacher-1',
      publishedAt: new Date(),
      releaseNotes: 'Initial version',
    }));
  });

  await test('a teacher can create but cannot rewrite an immutable Dragon asset version', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    const payload = {
      schemaVersion: 1,
      versionId: 'immutable-v1',
      modelPack: { schemaVersion: 1, rendererContractVersion: 1, models: [{}] },
      arenaScenario: { id: 'dragon-duel-ring' },
      publishedBy: 'teacher-1',
      publishedAt: new Date(),
      releaseNotes: '',
    };
    await assertSucceeds(setDoc(doc(db, 'dragonAssetVersions/immutable-v1'), payload));
    await assertFails(updateDoc(doc(db, 'dragonAssetVersions/immutable-v1'), { releaseNotes: 'rewrite' }));
  });

  await test('a student cannot publish Dragon Garage assets', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(setDoc(doc(db, 'publishedDragonAssets/current'), {
      schemaVersion: 1,
      versionId: 'student-v1',
      modelPack: { schemaVersion: 1, rendererContractVersion: 1, models: [{}] },
      arenaScenario: { id: 'dragon-duel-ring' },
      publishedBy: 'student-1',
      publishedAt: new Date(),
      releaseNotes: '',
    }));
  });

  await test('the public app can read published Dragon Garage assets', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'publishedDragonAssets/current')));
  });

  await test('a student can create their own deterministic simulation run', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'dragonLabProgress/student-1/simulationRuns/trait-evidence'), {
        ...simulationRunData(),
      }),
    );
  });

  await test('a simulation run rejects an invalid score and unknown fields', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(
      setDoc(
        doc(db, 'dragonLabProgress/student-1/simulationRuns/genome-microscope'),
        simulationRunData({
          simulationId: 'genome-microscope',
          score: 120,
          arbitraryClaim: true,
        }),
      ),
    );
  });

  await test('an unrelated student cannot read a simulation run', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(getDoc(doc(db, 'dragonLabProgress/student-1/simulationRuns/trait-evidence')));
  });

  await test('the assigned teacher can read a simulation run', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(
      getDoc(doc(db, 'dragonLabProgress/student-1/simulationRuns/trait-evidence')),
    );
  });

  console.log(`\n${passed} Firestore security-rule tests passed.`);
} finally {
  await testEnv.cleanup();
}
