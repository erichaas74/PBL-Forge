import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildDragonModelPack,
  dragonModelPackPath,
} from './dragon-model-pack-builder.mjs';

const workspace = path.resolve(import.meta.dirname, '..');
const outputPath = dragonModelPackPath(workspace);
const pack = await buildDragonModelPack(workspace);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(`Generated ${path.relative(workspace, outputPath)} with ${pack.models.length} model.`);
console.log(`Validated pack: ${pathToFileURL(outputPath).href}`);
