#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const assetRoot = 'public/assets';
const maximumBytes = 750 * 1024;
const oversized = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(path);
    } else if (entry.isFile()) {
      const { size } = await stat(path);
      if (size > maximumBytes) oversized.push({ path: relative('.', path), size });
    }
  }
}

await inspect(assetRoot);

if (oversized.length > 0) {
  console.error('Static assets exceed the 750 kB delivery budget:');
  for (const asset of oversized) {
    console.error(`  ${asset.path}: ${(asset.size / 1024).toFixed(1)} kB`);
  }
  process.exit(1);
}

console.log('Static assets fit within the 750 kB delivery budget.');
