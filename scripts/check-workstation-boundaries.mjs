import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workstationRoot = join(repoRoot, 'src', 'app', 'features', 'dragon-genetics', 'workstations');
const contextService = join(workstationRoot, 'shared', 'dragon-workstation-context.service.ts');
const chromosomeViewport = join(workstationRoot, 'shared', 'cell-chromosome-viewport.component.ts');
const failures = [];

for (const file of walk(workstationRoot)) {
  if (extname(file) !== '.ts' || file.endsWith('.spec.ts')) continue;
  const source = readFileSync(file, 'utf8');
  const label = relative(repoRoot, file).replaceAll('\\', '/');

  if (file !== contextService && source.includes('SessionService')) {
    failures.push(`${label}: workstation code must receive app identity through inputs/context.`);
  }

  if (/\binput\(\s*['"]local-student['"]/.test(source)) {
    failures.push(`${label}: studentId must be an explicit input, not a component-owned default.`);
  }

  if (file === chromosomeViewport && /\bfrom\s+['"]\.\.\//.test(source)) {
    failures.push(`${label}: shared viewport must not import a workstation-specific domain model.`);
  }

  if (!/\.(?:component|page)\.ts$/.test(file) || !source.includes('@Component(')) continue;

  if (/\btemplate\s*:/.test(source)) {
    failures.push(`${label}: move the Angular template to the component's .html file.`);
  }
  if (/\bstyles\s*:/.test(source)) {
    failures.push(`${label}: move Angular styles to the component's .scss/.css file.`);
  }

  verifyLinkedFile(source, file, label, 'templateUrl', failures);
  verifyLinkedFile(source, file, label, 'styleUrl', failures);
}

if (failures.length) {
  console.error(`Workstation boundary check failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    'Workstation boundaries valid: external HTML/CSS and app context separation enforced.',
  );
}

function verifyLinkedFile(source, componentFile, label, property, errors) {
  const match = source.match(new RegExp(`${property}\\s*:\\s*['"]([^'"]+)['"]`));
  if (!match) {
    errors.push(`${label}: @Component must declare ${property}.`);
    return;
  }
  const linkedFile = resolve(dirname(componentFile), match[1]);
  if (!existsSync(linkedFile)) {
    errors.push(`${label}: ${property} target does not exist: ${match[1]}.`);
  }
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(child);
    else yield child;
  }
}
