import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const workspace = path.resolve(import.meta.dirname, '..');
const result = await build({
  stdin: {
    contents: `
      import { createExpressiveDragonBenchBuild } from './src/app/features/dragon-genetics/simulation/domain/dragon-specimen.profile.ts';
      import { DEFAULT_EXPRESSIVE_DRAGON } from './src/app/features/dragon-genetics/simulation/domain/dragon-expressive-genome.ts';
      import { SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS } from './src/app/shared/assembly/model-pack/dragon-model-pack.models.ts';
      import { DRAGON_VISUAL_PARAMETER_CONTRACT } from './src/app/shared/assembly/model-pack/dragon-visual-parameters.ts';

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

      export default {
        expressedPartCount: descriptor(male).blueprint.parts.length,
        supportedProfiles: SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS,
        parameterContract: DRAGON_VISUAL_PARAMETER_CONTRACT,
      };
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
const factorySource = await readFile(
  path.join(workspace, 'src/app/shared/assembly/rendering/dragon-procedural-mesh.factory.ts'),
  'utf8',
);
const renderingDirectory = path.join(workspace, 'src/app/shared/assembly/rendering');
const renderingSources = await Promise.all(
  (await readdir(renderingDirectory))
    .filter(name => name.startsWith('dragon-') && name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .map(name => readFile(path.join(renderingDirectory, name), 'utf8')),
);

const implementedProfiles = new Set(
  [...factorySource.matchAll(/case '([^']+)':/g)]
    .map(match => match[1])
    .filter(profileId => profileId.startsWith('dragon-')),
);
const supportedProfiles = new Set(module.default.supportedProfiles);
assertSameSet('renderer profiles', implementedProfiles, supportedProfiles);

const readParameters = new Set(
  renderingSources
    .flatMap(source => [...source.matchAll(/visual(?:Number|String|Flag)\(part, '([^']+)'/g)])
    .map(match => match[1]),
);
const contractedParameters = new Set(
  Object.values(module.default.parameterContract).flatMap(contract => Object.keys(contract)),
);
assertSameSet('visual parameter keys', readParameters, contractedParameters);

console.log(
  `Dragon model compatibility valid across ${module.default.expressedPartCount} expressed parts, ` +
  `${supportedProfiles.size} renderer profiles, and ${contractedParameters.size} visual parameters.`,
);

function assertSameSet(label, actual, expected) {
  const missing = [...expected].filter(value => !actual.has(value));
  const undocumented = [...actual].filter(value => !expected.has(value));
  if (!missing.length && !undocumented.length) return;
  throw new Error(
    `${label} drifted. Missing implementation: ${missing.join(', ') || 'none'}. ` +
    `Missing contract: ${undocumented.join(', ') || 'none'}.`,
  );
}
