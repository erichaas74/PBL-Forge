#!/usr/bin/env node
/**
 * Keeps the two copies of the Berk palette honest.
 *
 * `src/styles.scss` owns the palette as CSS custom properties; almost all of
 * the app reads it from there. `src/app/shared/design/berk-palette.ts` owns the
 * same colours as TypeScript values, because SVG presentation attributes and
 * three.js materials cannot resolve `var()`.
 *
 * Two sources of truth is a compromise the platform forces, not one we chose.
 * This is the ratchet that stops them drifting: every key in BERK must exist as
 * the matching `--kebab-case` custom property in styles.scss with the same
 * value. Add a colour to one and this fails until you add it to the other.
 *
 * BERK_INSTRUMENT and BERK_TRAIT_BANDS are deliberately NOT checked — they are
 * derived values (base tokens lifted for legibility on a dark console) that
 * exist only in TypeScript and have no CSS counterpart.
 */
import { readFileSync } from 'node:fs';

const scss = readFileSync('src/styles.scss', 'utf8');
const ts = readFileSync('src/app/shared/design/berk-palette.ts', 'utf8');

/** Pulls the `--name: #value;` pairs out of the `:root` block. */
function readCssTokens(source) {
  const root = source.slice(source.indexOf(':root'), source.indexOf('\n}'));
  const tokens = new Map();
  for (const match of root.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens.set(match[1], match[2].toLowerCase());
  }
  return tokens;
}

/** Pulls the `name: '#value',` pairs out of the BERK object literal. */
function readTsTokens(source) {
  const start = source.indexOf('export const BERK = {');
  const block = source.slice(start, source.indexOf('} as const;', start));
  const tokens = new Map();
  for (const match of block.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{3,8})'/g)) {
    tokens.set(match[1], match[2].toLowerCase());
  }
  return tokens;
}

const camelToKebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

const cssTokens = readCssTokens(scss);
const tsTokens = readTsTokens(ts);
const problems = [];

if (tsTokens.size === 0) {
  problems.push('Could not parse any colours out of BERK — has the export shape changed?');
}

for (const [name, value] of tsTokens) {
  const cssName = camelToKebab(name);
  const cssValue = cssTokens.get(cssName);

  if (cssValue === undefined) {
    problems.push(`BERK.${name} has no --${cssName} in styles.scss`);
  } else if (cssValue !== value) {
    problems.push(`BERK.${name} is ${value} but --${cssName} is ${cssValue}`);
  }
}

if (problems.length > 0) {
  console.error('Berk palette is out of sync:\n');
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  console.error('\nUpdate both src/styles.scss and src/app/shared/design/berk-palette.ts.');
  process.exit(1);
}

console.log(`Berk palette in sync across ${tsTokens.size} colours.`);
