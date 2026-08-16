import path from 'node:path';
import { build } from 'esbuild';

/** Builds the canonical pack in memory so generation and freshness checks agree. */
export async function buildDragonModelPack(workspace) {
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
          packVersion: '1.1.0',
          style: DEFAULT_DRAGON_STYLE,
        });
      `,
      resolveDir: workspace,
      sourcefile: 'dragon-model-pack-builder.entry.ts',
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
  const bundledModule = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
  return bundledModule.default;
}

export function dragonModelPackPath(workspace) {
  return path.join(workspace, 'model-packs', 'dragon-model-pack.v1.json');
}
