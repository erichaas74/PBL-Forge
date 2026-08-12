import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const workspace = path.resolve(import.meta.dirname, '..');
const studentRoot = path.join(workspace, 'src');
const failures = [];

for (const file of await sourceFiles(studentRoot)) {
  const source = await readFile(file, 'utf8');
  const relative = path.relative(workspace, file);
  const importPattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g;
  for (const match of source.matchAll(importPattern)) {
    const target = match[2].replaceAll('\\', '/');
    if (target.includes('designer/') || target.includes('assembly-garage')) {
      failures.push(`${relative}: forbidden student import "${target}"`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Designer boundary valid: student source has no designer imports.');
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(absolute));
    else if (entry.name.endsWith('.ts')) files.push(absolute);
  }
  return files;
}

