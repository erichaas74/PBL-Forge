import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-pbl-forge-rules';
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8')
  }
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

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/teacher-1'), { role: 'teacher' });
    await setDoc(doc(db, 'users/student-1'), { role: 'student' });
    await setDoc(doc(db, 'users/student-2'), { role: 'student' });
    await setDoc(doc(db, 'projects/published-project'), {
      title: 'Published',
      status: 'published',
      ownerId: 'teacher-1'
    });
    await setDoc(doc(db, 'projects/draft-project'), {
      title: 'Draft',
      status: 'draft',
      ownerId: 'teacher-1'
    });
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
    await assertSucceeds(setDoc(doc(db, 'projects/teacher-project'), {
      title: 'Teacher project',
      status: 'draft',
      ownerId: 'teacher-1'
    }));
  });

  await test('a student cannot create a project', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(setDoc(doc(db, 'projects/student-project'), {
      title: 'Student project',
      status: 'draft',
      ownerId: 'student-1'
    }));
  });

  const submission = {
    studentId: 'student-1',
    projectId: 'published-project',
    activityId: 'activity-1',
    response: { selectedOptionId: 'a' },
    status: 'in-progress',
    updatedAt: new Date()
  };

  await test('a student can create their own submission', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'submissions/student-1_activity-1'), submission));
  });

  await test('another student cannot read the submission', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(getDoc(doc(db, 'submissions/student-1_activity-1')));
  });

  await test('the owning teacher can read the submission', async () => {
    const db = testEnv.authenticatedContext('teacher-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'submissions/student-1_activity-1')));
  });

  await test('a student cannot transfer a submission to another user', async () => {
    const db = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(updateDoc(doc(db, 'submissions/student-1_activity-1'), {
      studentId: 'student-2'
    }));
  });

  const dragonProgress = {
    studentId: 'student-1',
    projectId: 'dragon-genetics-lab',
    snapshot: { schemaVersion: 3, activeModule: 1 },
    activeModule: 1,
    completedModules: [],
    mastery: {},
    misconceptionFlags: [],
    licensePassed: false,
    officialAttemptsUsed: 0,
    championId: null,
    battleResult: null,
    updatedAt: new Date()
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

  await test('a student cannot write a Dragon Genetics record for another student', async () => {
    const db = testEnv.authenticatedContext('student-2').firestore();
    await assertFails(setDoc(doc(db, 'dragonLabProgress/student-1-copy'), {
      ...dragonProgress,
      studentId: 'student-1'
    }));
  });

  console.log(`\n${passed} Firestore security-rule tests passed.`);
} finally {
  await testEnv.cleanup();
}
