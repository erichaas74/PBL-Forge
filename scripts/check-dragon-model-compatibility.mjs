import path from 'node:path';
import { build } from 'esbuild';

const workspace = path.resolve(import.meta.dirname, '..');
const result = await build({
  stdin: {
    contents: `
      import { createExpressiveDragonBenchBuild } from './src/app/features/dragon-genetics/simulation/domain/dragon-specimen.profile.ts';
      import { DEFAULT_EXPRESSIVE_DRAGON } from './src/app/features/dragon-genetics/simulation/domain/dragon-expressive-genome.ts';

      function build(sex, tail) {
        const profile = {
          sex,
          genome: { ...DEFAULT_EXPRESSIVE_DRAGON.genome, tail },
        };
        return createExpressiveDragonBenchBuild('compatibility-dragon', profile);
      }

      function descriptor(result) {
        if (result.source.kind !== 'descriptor') throw new Error('Expressive build did not return a descriptor.');
        return result.source.descriptor;
      }

      function parameter(result, profileId, key) {
        const part = descriptor(result).blueprint.parts.find(candidate =>
          candidate.visualProfile?.profileId === profileId);
        if (!part) throw new Error('Missing expressed profile ' + profileId + '.');
        return part.visualProfile?.parameters?.[key];
      }

      const male = build('male', ['K', 'K']);
      const intermediate = build('female', ['K', 'k']);
      const small = build('female', ['k', 'k']);

      if (parameter(male, 'dragon-head-horned', 'sex') !== 'male') {
        throw new Error('Published base model no longer accepts male skull/frill expression.');
      }
      if (parameter(male, 'dragon-tail-club', 'tailClubSpikeCount') !== 10) {
        throw new Error('KK tail club expression must produce 10 spikes.');
      }
      if (parameter(intermediate, 'dragon-tail-club', 'tailClubSpikeCount') !== 5) {
        throw new Error('Kk tail club expression must produce 5 spikes.');
      }
      if (parameter(small, 'dragon-tail-club', 'tailClubSpikeCount') !== 0) {
        throw new Error('kk tail club expression must remain smooth.');
      }

      export default descriptor(male).blueprint.parts.length;
    `,
    resolveDir: workspace,
    sourcefile: 'check-dragon-model-compatibility.entry.ts',
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
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
console.log(`Dragon model compatibility valid across ${module.default} expressed parts.`);

