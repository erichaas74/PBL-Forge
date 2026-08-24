import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = process.env.PBL_FORGE_BASE_URL ?? 'http://localhost:4200';
const checks = [
  {
    name: 'signed-out access',
    prepare: async (page) => {
      await page.goto(`${baseUrl}/dragon-genetics`);
      await page.locator('.access-gate').waitFor();
    },
  },
  {
    name: 'student learning paths',
    prepare: async (page) => {
      await page.goto(`${baseUrl}/dragon-genetics`);
      await page.getByRole('button', { name: 'Continue as demo student' }).click();
      await page.locator('.path-grid').waitFor();
    },
  },
  {
    name: 'teacher dashboard',
    prepare: async (page) => {
      await page.goto(`${baseUrl}/dragon-genetics`);
      await page.getByRole('button', { name: 'Continue as demo teacher' }).click();
      await page.getByRole('link', { name: 'Teacher dashboard' }).click();
      await page.getByRole('heading', { name: 'Who needs attention?' }).waitFor();
    },
  },
];

await waitForServer(`${baseUrl}/dragon-genetics`);
const browser = await chromium.launch({ headless: true });
let violationCount = 0;

try {
  for (const check of checks) {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await check.prepare(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (!results.violations.length) {
        console.log(`✓ ${check.name}`);
        continue;
      }
      violationCount += results.violations.length;
      console.error(`✗ ${check.name}: ${results.violations.length} AXE violation(s)`);
      for (const violation of results.violations) {
        console.error(`  ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes) console.error(`    ${node.target.join(' ')}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (violationCount) {
  throw new Error(`${violationCount} accessibility violation(s) found.`);
}
console.log(`${checks.length} AXE WCAG AA checks passed.`);

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The app and emulators are still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}
