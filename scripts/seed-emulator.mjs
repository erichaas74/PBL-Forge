import net from 'node:net';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

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

const demoTeacherUid = await ensureDemoTeacherAccount();

const projects = [
  {
    id: 'dragon-genetics-lab',
    data: {
      title: 'Dragon Genetics: Breed for the Arena',
      summary: 'Decode heredity, predict offspring, protect genetic diversity, and defend a team-bred dragon in a physics arena.',
      essentialQuestion: 'How are traits passed from parents to offspring, why do siblings vary, and how can evidence guide responsible breeding?',
      status: 'published',
      ownerId: 'demo-teacher',
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
  },
  {
    id: 'mars-habitat',
    data: {
      title: 'Design a Mars Habitat',
      summary: 'Balance human needs, limited resources, and a hostile environment to propose a livable Mars base.',
      essentialQuestion: 'How can we design a habitat that keeps a crew healthy and productive on Mars?',
      status: 'published',
      ownerId: 'demo-teacher',
      subject: ['Science', 'Engineering'],
      gradeBand: '6–8',
      durationMinutes: 55,
      activityCount: 3,
      accent: 'coral',
      updatedAt: new Date('2026-07-15T12:00:00Z')
    },
    activities: [
      {
        id: 'systems-check',
        order: 1,
        type: 'choice',
        title: 'Systems thinking check',
        prompt: 'Which system should the crew protect first during a sudden habitat power shortage?',
        options: [
          { id: 'life-support', label: 'Life support and oxygen circulation' },
          { id: 'science-lab', label: 'The science laboratory' },
          { id: 'exercise', label: 'The exercise equipment' }
        ],
        correctOptionId: 'life-support',
        explanation: 'Life support is the critical dependency: without breathable air, every other system becomes irrelevant.'
      },
      {
        id: 'resource-match',
        order: 2,
        type: 'matching',
        title: 'Match needs to systems',
        prompt: 'Connect each crew need to the habitat system that best supports it.',
        left: [
          { id: 'water', label: 'Reliable drinking water' },
          { id: 'food', label: 'Fresh food production' },
          { id: 'radiation', label: 'Radiation protection' }
        ],
        right: [
          { id: 'recycling', label: 'Water recycling loop' },
          { id: 'greenhouse', label: 'Hydroponic greenhouse' },
          { id: 'regolith', label: 'Regolith shielding' }
        ],
        correctMatches: {
          water: 'recycling',
          food: 'greenhouse',
          radiation: 'regolith'
        }
      },
      {
        id: 'design-reflection',
        order: 3,
        type: 'reflection',
        title: 'Defend a design decision',
        prompt: 'Choose one habitat feature you would prioritize. Explain the evidence behind your choice and one tradeoff it creates.',
        minWords: 25
      }
    ]
  },
  {
    id: 'watershed-detectives',
    data: {
      title: 'Watershed Detectives',
      summary: 'Use field observations and community evidence to trace what is affecting a local stream.',
      essentialQuestion: 'How can evidence help a community improve the health of its watershed?',
      status: 'published',
      ownerId: 'demo-teacher',
      subject: ['Earth Science', 'Civics'],
      gradeBand: '5–8',
      durationMinutes: 40,
      activityCount: 2,
      accent: 'teal',
      updatedAt: new Date('2026-07-18T12:00:00Z')
    },
    activities: [
      {
        id: 'evidence-check',
        order: 1,
        type: 'choice',
        title: 'Choose the strongest evidence',
        prompt: 'Which observation gives the strongest direct evidence of erosion upstream?',
        options: [
          { id: 'sediment', label: 'A sediment plume appears after rainfall' },
          { id: 'clouds', label: 'The sky is cloudy during sampling' },
          { id: 'traffic', label: 'More cars use a nearby road' }
        ],
        correctOptionId: 'sediment',
        explanation: 'A sediment plume directly connects rainfall and soil movement into the stream.'
      },
      {
        id: 'community-response',
        order: 2,
        type: 'reflection',
        title: 'Recommend a response',
        prompt: 'Recommend one action the community should test first. Identify the evidence you would collect to decide whether it worked.',
        minWords: 30
      }
    ]
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
      setDoc(doc(db, 'users/demo-teacher'), {
        displayName: 'Demo Teacher',
        role: 'teacher',
        lastSeenAt: new Date()
      }),
      setDoc(doc(db, `users/${demoTeacherUid}`), {
        displayName: 'Demo Teacher',
        role: 'teacher',
        lastSeenAt: new Date()
      }),
      setDoc(doc(db, 'dragonGeneticsAssignments/default'), {
        id: 'default',
        ownerId: demoTeacherUid,
        classId: 'default',
        title: 'Dragon Genetics adaptive laboratory',
        defaultLevel: 'grade-7',
        simulationSettings: {},
        studentOverrides: {},
        assignmentVersion: 1,
        updatedAtIso: new Date().toISOString(),
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
  console.log(`Seeded ${projects.length} projects in the ${projectId} Firestore emulator.`);
} finally {
  await testEnv.cleanup();
}

async function ensureDemoTeacherAccount() {
  const endpoint = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
  const credentials = {
    email: 'teacher@pblforge.local',
    password: 'dragon-demo-teacher',
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
    throw new Error(`Could not seed the local teacher account: ${result.error?.message ?? response.statusText}`);
  }
  return result.localId;
}
