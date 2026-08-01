#!/usr/bin/env node
/**
 * Bakes part renders to PNGs so a change to the mesh factory can be *seen*
 * without opening the app.
 *
 * This exists to close the graphics feedback loop. The dragon's anatomy is
 * generated code (`dragon-procedural-mesh.factory.ts`), which is fast to edit
 * and slow to evaluate — you have to build, serve, navigate, and find a dragon
 * carrying the part. This drives `/parts-lab` headlessly instead and writes
 * images you (or an assistant) can look at directly.
 *
 *   node scripts/bake-parts.mjs                      # contact sheet, dragon family
 *   node scripts/bake-parts.mjs --part=dragon-left-wing
 *   node scripts/bake-parts.mjs --family=robot --out=.parts-bake/robot
 *   node scripts/bake-parts.mjs --url=http://localhost:4200
 *
 * Requires the dev server to be running, and playwright available. Output goes
 * to `.parts-bake/` which is gitignored — these are working images, not assets.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const BASE_URL = args.url ?? 'http://localhost:4200';
const FAMILY = args.family ?? 'dragon';
const OUT_DIR = args.out ?? '.parts-bake';
const PART = args.part ?? null;
const TILE = args.tile ?? '176';
/** Retina by default: silhouette flaws hide at 1x. */
const SCALE = Number(args.scale ?? 2);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright is not installed.\n'
    + '  npm install --no-save playwright && npx playwright install chromium',
  );
  process.exit(1);
}

async function save(buffer, name) {
  const path = join(OUT_DIR, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  console.log(`  ${path}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1500, height: 1100 },
  deviceScaleFactor: SCALE,
});

const failures = [];
page.on('pageerror', error => failures.push(error.message));
// The only network call this page makes is Firebase auth, which is refused when
// the emulator is not running. Everything else is a real failure worth failing on.
const EXPECTED_NOISE = /firebase|ERR_CONNECTION_REFUSED/i;
page.on('console', message => {
  if (message.type() === 'error' && !EXPECTED_NOISE.test(message.text())) {
    failures.push(message.text());
  }
});

const query = new URLSearchParams({ family: FAMILY, tile: TILE });
if (PART) query.set('part', PART);
const url = `${BASE_URL}/parts-lab?${query}`;

console.log(`Baking ${PART ?? FAMILY} from ${url}`);
await page.goto(url, { waitUntil: 'networkidle' });

// Tiles are baked one per animation frame through a shared WebGL context, so
// give the sheet a moment to finish before capturing.
await page.waitForSelector('[data-bake="contact-sheet"] img', { timeout: 30_000 });
await page.waitForTimeout(1800);

const tileCount = await page.locator('[data-bake="contact-sheet"] img').count();
console.log(`Rendered ${tileCount} parts.`);

await save(
  await page.locator('[data-bake="contact-sheet"]').screenshot(),
  `${FAMILY}-contact-sheet.png`,
);

if (await page.locator('[data-bake="detail"]').count()) {
  const slug = PART ?? (await page.locator('.lab__tile--active .lab__tile-label').first().textContent())
    ?.trim().toLowerCase().replace(/\s+/g, '-') ?? 'selected';

  await save(await page.locator('[data-bake="stage"]').screenshot(), `${slug}-stage.png`);
  await save(await page.locator('[data-bake="angles"]').screenshot(), `${slug}-angles.png`);
}

// Blank output is the failure mode worth catching: a mesh factory that returns
// null renders an empty stage, and an empty PNG looks like a successful bake.
const coverage = await page.evaluate(() => {
  const image = document.querySelector('[data-bake="contact-sheet"] img');
  if (!image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let opaque = 0;
  for (let index = 3; index < data.length; index += 4) if (data[index] > 8) opaque += 1;
  return opaque / (canvas.width * canvas.height);
});

if (coverage !== null && coverage < 0.01) {
  failures.push(`First tile is essentially blank (${(coverage * 100).toFixed(2)}% covered).`);
}

await browser.close();

if (failures.length) {
  console.error('\nProblems:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nDone.');
