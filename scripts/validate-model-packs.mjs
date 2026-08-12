import path from 'node:path';
import { build } from 'esbuild';

const workspace = path.resolve(import.meta.dirname, '..');

const result = await build({
  stdin: {
    contents: `
      import pack from './model-packs/dragon-model-pack.v1.json';
      import { parseDragonModelPack } from './src/app/shared/assembly/model-pack/dragon-model-pack.validation.ts';
      export default parseDragonModelPack(pack);
    `,
    resolveDir: workspace,
    sourcefile: 'validate-model-packs.entry.ts',
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
console.log(`Validated ${pack.packId}@${pack.packVersion}: ${pack.models.length} dragon model.`);

