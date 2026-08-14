#!/usr/bin/env node
/**
 * Drives the app in a real browser from the command line.
 *
 * This exists so a change to the UI can be *seen* and *operated* rather than
 * reasoned about. `bake-parts.mjs` already closed that loop for part renders,
 * but only for one page and only for screenshots — anything interactive (a
 * slider, a drag on a canvas, a panel that scrolls) had no way to be checked
 * short of a human opening the browser.
 *
 * It is a plain CLI on purpose: no editor integration and no MCP server, so any
 * assistant that can run a shell command can use it, and so can a person.
 *
 *   node scripts/browser.mjs http://localhost:4300/parts-lab "shot lab"
 *
 *   node scripts/browser.mjs http://localhost:4300/snap-workshop \
 *     "wait .shop__stage" "sleep 1200" "shot before" \
 *     "drag .shop__stage@620,300 @700,260" "shot after"
 *
 *   node scripts/browser.mjs --serve=designer /snap-workshop "shot it"
 *
 * Screenshots land in `.browse/` (gitignored). Console errors and uncaught
 * exceptions are reported at the end and fail the run, because a silent console
 * error is exactly the thing a screenshot will not show you.
 *
 * STEPS
 *   wait <selector>              wait for it to be visible
 *   waittext <text...>           wait for the text to appear
 *   sleep <ms>                   let animation or a render loop settle
 *   click <target>               click (see TARGETS)
 *   dblclick <target>            double click
 *   hover <target>               hover
 *   drag <target> <target>       press, move in steps, release — real pointer events
 *   type <selector> <text...>    fill a text input
 *   set <selector> <value>       set a value and fire input/change (range, number, select)
 *   press <key> | press <sel> <key>
 *   scroll <selector> <dy>       wheel over an element
 *   shot [name] [selector]       screenshot the page, or one element
 *   text <selector>              print its text
 *   count <selector>             print how many match
 *   eval <js...>                 evaluate in the page and print the result
 *   assert <js...>               fail the run if it is falsy
 *   goto <url>                   navigate again
 *
 * A selector with spaces in it is fine. Steps that take only a selector rejoin
 * the tail, and anywhere else quote it: `set ".panel input" 0.4`.
 *
 * TARGETS
 *   .selector                    the element's centre
 *   .selector@120,80             120px right and 80px down from its top-left
 *   .selector@50%,50%            the same, as a fraction of its box
 *   @700,260                     reuses the previous target's element
 *
 * FLAGS
 *   --serve=designer|app         start the dev server first, stop it after
 *   --headed                     show the browser
 *   --dark                       emulate a dark-themed browser
 *   --forced-colors              emulate Windows high contrast
 *   --reduced-motion             emulate prefers-reduced-motion; also required
 *                                to screenshot one element of a page whose
 *                                specimen viewers are running their idle loop
 *   --slow=250                   slow each interaction down, to watch it
 *   --viewport=1600x1000
 *   --scale=2                    device pixel ratio for screenshots
 *   --out=.browse
 *   --timeout=15000              per-step timeout
 *   --until=load|networkidle     navigation wait (default domcontentloaded)
 *   --allow-errors               do not fail on console errors
 *   --keep-open                  leave the browser open until Enter (with --headed)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';

const rawArgs = process.argv.slice(2);
const flags = {};
const positionals = [];

for (const arg of rawArgs) {
  if (arg.startsWith('--')) {
    const [key, value = 'true'] = arg.slice(2).split('=');
    flags[key] = value;
  } else {
    positionals.push(arg);
  }
}

const SERVERS = {
  designer: { script: 'start:designer', origin: 'http://localhost:4300' },
  app: { script: 'start', origin: 'http://localhost:4200' },
};

const server = flags.serve ? SERVERS[flags.serve] : null;

if (flags.serve && !server) {
  console.error(`Unknown --serve target "${flags.serve}". Use: ${Object.keys(SERVERS).join(', ')}`);
  process.exit(2);
}

const [target, ...steps] = positionals;

if (!target) {
  console.error('Usage: node scripts/browser.mjs <url|path> [step ...]');
  console.error('Run with no arguments for the step reference at the top of this file.');
  process.exit(2);
}

/**
 * Git Bash rewrites an argument that starts with `/` into a Windows path, so
 * `/snap-workshop` arrives as `C:/Program Files/Git/snap-workshop`. Undo it
 * rather than making every caller remember. Writing the path without its
 * leading slash avoids the mangling in the first place.
 */
function unmanglePath(value) {
  const mangled = /^[A-Za-z]:[\\/].*?[\\/]Git[\\/](.*)$/.exec(value);
  return mangled ? `/${mangled[1].replaceAll('\\', '/')}` : value;
}

const path = unmanglePath(target);
const url = /^https?:\/\//.test(path)
  ? path
  : `${server?.origin ?? 'http://localhost:4200'}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * `domcontentloaded`, not `networkidle`: the main app holds a Firestore
 * long-poll open, so the network is never idle and a navigation waiting for it
 * times out on a page that has been up and interactive the whole time. Wait for
 * what you actually need with an explicit `wait` step.
 */
const READY_STATE = flags.until ?? 'domcontentloaded';
const OUT_DIR = flags.out ?? '.browse';
const TIMEOUT = Number(flags.timeout ?? 15_000);
const SCALE = Number(flags.scale ?? 2);
const [width, height] = (flags.viewport ?? '1600x1000').split('x').map(Number);

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

// ---------------------------------------------------------------------------
// Dev server
// ---------------------------------------------------------------------------

let serverProcess = null;

async function reachable(target) {
  try {
    await fetch(target, { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(origin, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await reachable(origin)) return true;
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  return false;
}

function stopServer() {
  if (!serverProcess) return;
  const { pid } = serverProcess;
  serverProcess = null;
  if (!pid) return;

  // ng serve spawns children, so on Windows the tree has to go with it.
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
    }
  }
}

if (server) {
  if (await reachable(server.origin)) {
    console.log(`Using the dev server already on ${server.origin}`);
  } else {
    console.log(`Starting ${server.script} …`);
    serverProcess = spawn('npm', ['run', server.script], {
      stdio: 'ignore',
      shell: true,
      detached: process.platform !== 'win32',
    });

    if (!await waitForServer(server.origin, 180_000)) {
      stopServer();
      console.error(`The dev server never came up on ${server.origin}.`);
      process.exit(1);
    }

    console.log(`Dev server is up on ${server.origin}`);
  }
}

process.on('exit', stopServer);
process.on('SIGINT', () => { stopServer(); process.exit(130); });

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

const browser = await chromium.launch({
  headless: flags.headed === undefined,
  slowMo: Number(flags.slow ?? 0),
});
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: SCALE,
  // `--dark` reproduces the class of bug where a control takes its text colour
  // from the browser's theme while its background comes from the stylesheet.
  colorScheme: flags.dark !== undefined ? 'dark' : 'light',
  forcedColors: flags['forced-colors'] !== undefined ? 'active' : 'none',
  // Two jobs. It exercises the reduced-motion path, which is a real branch in
  // the specimen renderer rather than a CSS nicety. And it is how you screenshot
  // a *single element* on a page that runs an ambient loop: the specimen
  // viewers breathe continuously, and an element screenshot waits for the
  // element to settle, so without this `shot name .viewport__stage` times out.
  reducedMotion: flags['reduced-motion'] !== undefined ? 'reduce' : 'no-preference',
});

page.setDefaultTimeout(TIMEOUT);

/**
 * Firebase is refused when the emulator is not running, which says nothing
 * about the page. Everything else on the error channel is worth failing on.
 */
const EXPECTED_NOISE = /firebase|ERR_CONNECTION_REFUSED|net::ERR_/i;
const consoleErrors = [];
const pageErrors = [];

page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !EXPECTED_NOISE.test(message.text())) {
    consoleErrors.push(message.text());
  }
});

const shots = [];
let shotIndex = 0;
let lastSelector = null;

async function save(buffer, name) {
  const file = name.endsWith('.png') ? name : `${name}.png`;
  const path = join(OUT_DIR, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  shots.push(path);
  return path;
}

/** `.sel`, `.sel@12,34`, `.sel@50%,50%`, or `@12,34` for the previous element. */
async function resolveTarget(token) {
  const [selectorPart, offsetPart] = splitTarget(token);
  const selector = selectorPart || lastSelector;

  if (!selector) throw new Error(`No element for "${token}" and no previous target.`);
  lastSelector = selector;

  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`"${selector}" has no box on screen.`);

  if (!offsetPart) {
    return { locator, selector, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  const [rawX, rawY] = offsetPart.split(',');
  return {
    locator,
    selector,
    x: box.x + resolveOffset(rawX, box.width),
    y: box.y + resolveOffset(rawY, box.height),
  };
}

function splitTarget(token) {
  const at = token.indexOf('@');
  if (at === -1) return [token, null];
  return [token.slice(0, at), token.slice(at + 1)];
}

function resolveOffset(raw, extent) {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) throw new Error(`Bad offset "${raw}".`);
  return raw.trim().endsWith('%') ? (value / 100) * extent : value;
}

/**
 * Writes through the native setter so a framework that listens for `input`
 * sees it. `fill()` cannot drive a range input at all, and assigning `.value`
 * from a script fires nothing.
 */
async function setValue(selector, value) {
  await page.locator(selector).first().evaluate((element, next) => {
    const prototype = element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter ? setter.call(element, next) : (element.value = next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/**
 * Splits a step into words, keeping a quoted run together. Descendant
 * selectors have spaces in them, so `click ".panel .chip"` has to survive as
 * one token — and an unquoted tail is rejoined for the verbs that take nothing
 * but a selector, so `click .panel .chip` works too.
 */
function tokenizeStep(step) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;

  for (let match = pattern.exec(step); match; match = pattern.exec(step)) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
}

async function runStep(step) {
  const [verb, ...rest] = tokenizeStep(step.trim());
  const joined = rest.join(' ');
  // `eval`/`assert`/`waittext` take the tail verbatim: tokenizing strips the
  // quotes, which silently rewrites any JS with a string literal in it.
  const raw = step.trim().replace(/^\S+\s*/, '');

  switch (verb) {
    case 'goto':
      await page.goto(unmanglePath(rest[0]), { waitUntil: READY_STATE });
      return rest[0];

    case 'wait':
      await page.locator(joined).first().waitFor({ state: 'visible' });
      lastSelector = joined;
      return 'visible';

    case 'waittext':
      await page.getByText(raw, { exact: false }).first().waitFor({ state: 'visible' });
      return 'visible';

    case 'sleep':
      await page.waitForTimeout(Number(rest[0]));
      return `${rest[0]}ms`;

    case 'click':
    case 'dblclick':
    case 'hover': {
      const spot = await resolveTarget(joined);
      if (verb === 'hover') await page.mouse.move(spot.x, spot.y);
      else await page.mouse[verb === 'dblclick' ? 'dblclick' : 'click'](spot.x, spot.y);
      return `${spot.selector} at ${Math.round(spot.x)},${Math.round(spot.y)}`;
    }

    case 'drag': {
      const from = await resolveTarget(rest[0]);
      const to = await resolveTarget(rest[1]);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      // Interpolated: a handler that only listens for pointermove needs to see
      // more than the endpoints, and a single jump reads as a teleport.
      await page.mouse.move(to.x, to.y, { steps: 24 });
      await page.mouse.up();
      return `${Math.round(from.x)},${Math.round(from.y)} → ${Math.round(to.x)},${Math.round(to.y)}`;
    }

    case 'type':
      await page.locator(rest[0]).first().fill(rest.slice(1).join(' '));
      return 'filled';

    case 'set':
      await setValue(rest[0], rest.slice(1).join(' '));
      return rest.slice(1).join(' ');

    case 'press':
      if (rest.length > 1) await page.locator(rest[0]).first().press(rest[1]);
      else await page.keyboard.press(rest[0]);
      return rest.at(-1);

    case 'scroll': {
      const spot = await resolveTarget(rest[0]);
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.wheel(0, Number(rest[1] ?? 400));
      return `${rest[1] ?? 400}px`;
    }

    case 'shot': {
      const name = rest[0] ?? `shot-${++shotIndex}`;
      const selector = rest[1];
      const buffer = selector
        ? await page.locator(selector).first().screenshot()
        : await page.screenshot({ fullPage: flags.fullpage !== undefined });
      return await save(buffer, name);
    }

    case 'text':
      return (await page.locator(joined).first().innerText()).trim();

    case 'count':
      return String(await page.locator(joined).count());

    case 'eval':
      return JSON.stringify(await page.evaluate(`(() => (${raw}))()`));

    case 'assert': {
      const value = await page.evaluate(`(() => (${raw}))()`);
      if (!value) throw new Error(`assert failed: ${raw}`);
      return 'ok';
    }

    default:
      throw new Error(`Unknown step "${verb}".`);
  }
}

console.log(`\n${url}`);
let failed = null;

try {
  await page.goto(url, { waitUntil: READY_STATE });

  for (const step of steps) {
    const result = await runStep(step);
    console.log(`  → ${step}${result ? `  ·  ${result}` : ''}`);
  }
} catch (error) {
  failed = error instanceof Error ? error.message : String(error);
  console.error(`  ✗ ${failed}`);

  try {
    console.error(`    state saved to ${await save(await page.screenshot(), 'failure')}`);
  } catch {
    // The page may be gone; the message above is what matters.
  }
}

if (flags['keep-open'] !== undefined && flags.headed !== undefined) {
  console.log('\nBrowser is open. Press Enter to close.');
  await new Promise(resolve => process.stdin.once('data', resolve));
}

await browser.close();
stopServer();

if (shots.length) {
  console.log(`\nScreenshots (${shots.length}):`);
  for (const shot of shots) console.log(`  ${shot}`);
}

const problems = [...pageErrors.map(text => `uncaught: ${text}`), ...consoleErrors];

if (problems.length) {
  console.error(`\nConsole problems (${problems.length}):`);
  for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
}

if (failed || (problems.length && flags['allow-errors'] === undefined)) {
  process.exit(1);
}

console.log('\nDone.');
