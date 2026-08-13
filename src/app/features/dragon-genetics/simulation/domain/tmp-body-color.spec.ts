import { DEFAULT_EXPRESSIVE_DRAGON, normalizeGenomeForSex } from './dragon-expressive-genome';
import { createExpressiveDragonBenchBuild } from './dragon-specimen.profile';

function buildWith(pair: [string, string]) {
  const profile = normalizeGenomeForSex(
    {
      sex: 'female',
      genome: { ...DEFAULT_EXPRESSIVE_DRAGON.genome, 'body-color': pair as never },
    },
    'female',
  );
  return createExpressiveDragonBenchBuild('bench-dragon', profile);
}

describe('TEMP body-color repaint', () => {
  it('paints BB and bb differently', () => {
    const dominant = buildWith(['B', 'B']);
    const recessive = buildWith(['b', 'b']);
    const colorsOf = (b: ReturnType<typeof buildWith>) =>
      b.source.kind === 'descriptor'
        ? [...new Set(b.source.descriptor.blueprint.parts.map(p => p.color))]
        : [];
    console.log('BB colors', colorsOf(dominant));
    console.log('bb colors', colorsOf(recessive));
    expect(colorsOf(dominant)).not.toEqual(colorsOf(recessive));
  });
});
