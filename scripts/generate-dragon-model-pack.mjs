import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const workspace = path.resolve(import.meta.dirname, '..');
const outputPath = path.join(workspace, 'model-packs', 'dragon-model-pack.v1.json');

const result = await build({
  stdin: {
    contents: `
      import { CLASSIC_DRAGON_TEST_PRESET } from './designer/src/app/assembly-garage/data/presets/classic-dragon-test.ts';
      import { createDragonModelPack } from './designer/src/app/dragon-model-pack-export.ts';
      import { DEFAULT_DRAGON_STYLE } from './src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.ts';

      export default createDragonModelPack(CLASSIC_DRAGON_TEST_PRESET.state, {
        modelId: 'classic-dragon',
        label: CLASSIC_DRAGON_TEST_PRESET.name,
        description: CLASSIC_DRAGON_TEST_PRESET.description,
        packVersion: '1.0.0',
        style: DEFAULT_DRAGON_STYLE,
      });
    `,
    resolveDir: workspace,
    sourcefile: 'generate-dragon-model-pack.entry.ts',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  write: false,
  logLevel: 'silent',
});

const source = result.outputFiles[0].text;
const bundledModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const pack = bundledModule.default;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(`Generated ${path.relative(workspace, outputPath)} with ${pack.models.length} model.`);
console.log(`Validated pack: ${pathToFileURL(outputPath).href}`);
