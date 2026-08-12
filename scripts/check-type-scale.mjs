#!/usr/bin/env node
/**
 * Guards the type scale floor.
 *
 * This app is read on Chromebooks at arm's length and off projectors from the
 * back of a classroom. The station stylesheets had drifted to a 0.52-0.62rem
 * body — 8 to 10 CSS pixels — which neither audience can read, and the drift
 * happened one plausible-looking declaration at a time. This is the ratchet
 * that stops it happening again.
 *
 * The rule: no literal font-size below --text-xs (0.75rem / 12px). Use the
 * scale tokens in the owning application's global stylesheet instead. If a layout seems to need smaller
 * type, the layout is too dense — fix the layout.
 *
 * SVG `font-size` in user units is deliberately NOT checked: it scales with the
 * viewBox, so the rendered size depends on the container and no static
 * threshold is meaningful. Those carry a comment recording the effective size.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** Matches literal rem/px font sizes; var(--token) and clamp() pass through. */
const REM = /font-size:\s*(0?\.\d+|\d+(?:\.\d+)?)rem/g;
const PX = /font-size:\s*(\d+(?:\.\d+)?)px/g;

const MIN_REM = 0.75;
const MIN_PX = 12;

const files = execSync('git ls-files --cached --others --exclude-standard "src/*.scss" "src/*.css" "src/**/*.scss" "src/**/*.css" "designer/*.scss" "designer/*.css" "designer/**/*.scss" "designer/**/*.css"', {
  encoding: 'utf8',
})
  .split('\n')
  .map(line => line.trim())
  .filter(file => Boolean(file) && existsSync(file));

const violations = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    for (const match of line.matchAll(REM)) {
      if (Number.parseFloat(match[1]) < MIN_REM) {
        violations.push(`${file}:${index + 1}  ${match[0]}  (min ${MIN_REM}rem)`);
      }
    }
    for (const match of line.matchAll(PX)) {
      if (Number.parseFloat(match[1]) < MIN_PX) {
        violations.push(`${file}:${index + 1}  ${match[0]}  (min ${MIN_PX}px)`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`Type scale floor violated in ${violations.length} place(s):\n`);
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  console.error('\nUse a scale token: --text-xs | --text-sm | --text-base | --text-md | --text-lg | --text-xl | --text-2xl');
  process.exit(1);
}

console.log(`Type scale floor holds across ${files.length} stylesheets.`);
