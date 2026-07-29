import { spawn } from 'node:child_process';

const firebaseCliVersion = '14.27.0';
const environment = { ...process.env };
const npmCliPath = process.env.npm_execpath;

if (!npmCliPath) {
  console.error('Run this helper through an npm script so it can locate npm safely.');
  process.exit(1);
}

// Firebase debug logs can record the child environment. This credential is not
// needed by Firebase and must never be copied into those logs.
delete environment.OPENAI_API_KEY;

const child = spawn(
  process.execPath,
  [
    npmCliPath,
    'exec',
    '--yes',
    `--package=firebase-tools@${firebaseCliVersion}`,
    '--',
    'firebase',
    ...process.argv.slice(2)
  ],
  {
    env: environment,
    stdio: 'inherit'
  }
);

child.once('error', (error) => {
  console.error('Firebase CLI could not be started.', error);
  process.exitCode = 1;
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
