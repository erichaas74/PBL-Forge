import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildDragonModelPack,
  dragonModelPackPath,
} from './dragon-model-pack-builder.mjs';

const workspace = path.resolve(import.meta.dirname, '..');
const outputPath = dragonModelPackPath(workspace);
const [committed, generated] = await Promise.all([
  readFile(outputPath, 'utf8'),
  buildDragonModelPack(workspace),
]);
const expected = `${JSON.stringify(generated, null, 2)}\n`;

if (committed !== expected) {
  throw new Error(
    'model-packs/dragon-model-pack.v1.json is stale. Run npm run generate:dragon-pack and commit the result.',
  );
}

console.log('Published dragon model pack matches the current Designer preset and default style.');
