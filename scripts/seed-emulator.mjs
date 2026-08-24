import net from 'node:net';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';

const projectId = 'demo-pbl-forge';

function waitForPort(host, port, timeoutMs = 120_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Firestore emulator did not start on ${host}:${port}.`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

await Promise.all([
  waitForPort('127.0.0.1', 8080),
  waitForPort('127.0.0.1', 9099)
]);

const demoTeacherUid = await ensureDemoAccount(
  'teacher@pblforge.local',
  'dragon-demo-teacher',
);
const demoStudentUid = await ensureDemoAccount(
  'student@pblforge.local',
  'dragon-demo-student',
);

const projects = [
  {
    id: 'dragon-genetics-lab',
    data: {
      title: 'Dragon Genetics: Breed for the Arena',
      summary: 'Decode heredity, predict offspring, protect genetic diversity, and defend a team-bred dragon in a physics arena.',
      essentialQuestion: 'How are traits passed from parents to offspring, why do siblings vary, and how can evidence guide responsible breeding?',
      status: 'published',
      ownerId: demoTeacherUid,
      subject: ['Life Science', 'Genetics'],
      gradeBand: '7',
      durationMinutes: 900,
      durationLabel: '3 weeks',
      activityCount: 10,
      accent: 'gold',
      experienceType: 'dragon-genetics',
      updatedAt: new Date('2026-07-29T12:00:00Z')
    },
    activities: []
  }
];

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { host: '127.0.0.1', port: 8080 }
});

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const writes = [
      deleteDoc(doc(db, 'projects/mars-habitat')),
      deleteDoc(doc(db, 'projects/watershed-detectives')),
      setDoc(doc(db, `users/${demoTeacherUid}`), {
        displayName: 'Demo Teacher',
        role: 'teacher',
        lastSeenAt: new Date()
      }),
      setDoc(doc(db, `users/${demoStudentUid}`), {
        displayName: 'Demo Student',
        role: 'student',
        lastSeenAt: new Date()
      }),
      setDoc(doc(db, 'classes/default'), {
        title: 'Demo Dragon Genetics class',
        ownerId: demoTeacherUid,
        assignmentId: 'default',
        updatedAt: new Date()
      }),
      setDoc(doc(db, `classes/default/members/${demoStudentUid}`), {
        userId: demoStudentUid,
        role: 'student',
        joinedAt: new Date()
      }),
      setDoc(doc(db, 'dragonGeneticsAssignments/default'), {
        id: 'default',
        ownerId: demoTeacherUid,
        classId: 'default',
        title: 'Dragon Genetics adaptive laboratory',
        defaultLevel: 'grade-7',
        alleleCatalog: {
          availableGeneIds: [
            'wings', 'tail', 'legs',
            'fire', 'horns', 'claws',
            'scales', 'body-color', 'crest',
            'ears', 'fangs', 'spikes'
          ]
        },
        simulationSettings: {},
        journeyPlan: {},
        inquirySettings: {},
        assignmentVersion: 3,
        updatedAtIso: new Date().toISOString(),
        updatedAt: new Date()
      }),
      setDoc(doc(db, `dragonGeneticsAssignments/default/studentOverrides/${demoStudentUid}`), {
        studentId: demoStudentUid,
        updatedAt: new Date()
      })
    ];

    for (const project of projects) {
      writes.push(setDoc(doc(db, `projects/${project.id}`), project.data));
      for (const activity of project.activities) {
        const { id, ...activityData } = activity;
        writes.push(
          setDoc(doc(db, `projects/${project.id}/activities/${id}`), activityData)
        );
      }
    }

    await Promise.all(writes);
  });
  console.log(`Seeded Dragon Genetics in the ${projectId} Firestore emulator.`);
} finally {
  await testEnv.cleanup();
}

async function ensureDemoAccount(email, password) {
  const endpoint = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
  const credentials = {
    email,
    password,
    returnSecureToken: true
  };
  let response = await fetch(`${endpoint}/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    response = await fetch(`${endpoint}/accounts:signInWithPassword?key=demo-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  }

  const result = await response.json();
  if (!response.ok || !result.localId) {
    throw new Error(`Could not seed ${email}: ${result.error?.message ?? response.statusText}`);
  }
  return result.localId;
}
