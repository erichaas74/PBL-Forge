import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workstationRoot = path.resolve(
  process.cwd(),
  'src/app/features/dragon-genetics/workstations',
);
const entries = await readdir(workstationRoot, { withFileTypes: true });
const failures = [];
let anchorCount = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const directory = path.join(workstationRoot, entry.name);
  const files = await readdir(directory);
  const manifestName = files.find((file) => file.endsWith('.manifest.ts'));
  if (!manifestName) continue;

  const manifest = await readFile(path.join(directory, manifestName), 'utf8');
  const anchors = [...manifest.matchAll(/anchorId:\s*'([^']+)'/g)].map((match) => match[1]);
  const templates = files.filter((file) => file.endsWith('.html'));
  const markup = (
    await Promise.all(templates.map((file) => readFile(path.join(directory, file), 'utf8')))
  ).join('\n');
  const attached = new Set(
    [...markup.matchAll(/data-guide-anchors="([^"]+)"/g)].flatMap((match) =>
      match[1].split(/\s+/).filter(Boolean),
    ),
  );

  for (const anchor of new Set(anchors)) {
    anchorCount += 1;
    if (!attached.has(anchor)) failures.push(`${entry.name}: ${anchor}`);
  }
}

if (failures.length) {
  console.error(`Missing ${failures.length} workstation guide anchor(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${anchorCount} workstation guide anchors.`);
}
