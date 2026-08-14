import {
  DragonIdentityPaint,
  createEducationalAssembly,
  createVisualGenome,
} from './dragon-inheritance';
import { DragonLabGenome } from './dragon-lab.models';

/**
 * The genotype-to-animal bridge.
 *
 * These lock the one invariant the whole hatchery rests on — a heterozygote is
 * indistinguishable from a homozygous dominant — and the four separate visual
 * channels that let a student tell the modelled genes apart from one another.
 */

const EMBER: DragonIdentityPaint = { color: '#d94841', accentColor: '#ffb45e' };
const TIDE: DragonIdentityPaint = { color: '#3679b8', accentColor: '#73d5e8' };

function genome(overrides: Partial<DragonLabGenome> = {}): DragonLabGenome {
  return {
    wings: ['W', 'w'],
    fire: ['F', 'f'],
    scales: ['S', 's'],
    horns: ['H', 'h'],
    ...overrides,
  };
}

function build(id: string, lab: DragonLabGenome, identity?: DragonIdentityPaint) {
  return createEducationalAssembly(lab, createVisualGenome(id, lab, 0, identity), identity);
}

function headProfileOf(assembly: { parts: { visualProfile?: { profileId: string } }[] }): string {
  const head = assembly.parts.find(part => part.visualProfile?.profileId.startsWith('dragon-head-'));
  return head?.visualProfile?.profileId ?? 'none';
}

function hornLengthOf(assembly: {
  parts: { visualProfile?: { profileId: string; parameters?: Record<string, unknown> } }[];
}): number | undefined {
  const head = assembly.parts.find(part => part.visualProfile?.profileId.startsWith('dragon-head-'));
  const hornLength = head?.visualProfile?.parameters?.['hornLength'];
  return typeof hornLength === 'number' ? hornLength : undefined;
}

/**
 * Everything about a part that a student can *see*.
 *
 * Deliberately wider than colour. A visual channel is free to be added through
 * `visualProfile.parameters` — the scale pattern is — and a comparison that only
 * looked at `color` would wave through a new channel that leaked zygosity
 * through a parameter instead.
 */
function visibleSurfaceOf(assembly: {
  parts: {
    color: string;
    roles?: readonly string[];
    dimensions: { x: number; y: number; z: number };
    visualProfile?: { profileId: string; parameters?: Record<string, unknown> };
  }[];
}) {
  return assembly.parts.map(part => ({
    color: part.color,
    roles: [...(part.roles ?? [])],
    // Size is a visual channel like any other, and the one the `F` gene owns —
    // it reaches the animal by rescaling the jaw parts rather than through a
    // parameter, so a surface comparison that skipped `dimensions` would be
    // blind to the single gene most important to keep un-leaked.
    dimensions: { ...part.dimensions },
    profileId: part.visualProfile?.profileId,
    parameters: { ...(part.visualProfile?.parameters ?? {}) },
  }));
}

describe('dragon inheritance bridge', () => {
  it('renders a heterozygote identically to a homozygous dominant', () => {
    // The lesson's central claim. If these ever diverge, the phenotype is
    // leaking the genotype and every Punnett prediction becomes guessable
    // by looking at the animal instead of reasoning about the cross.
    const heterozygous = build('same-id', genome({ wings: ['W', 'w'], horns: ['H', 'h'] }), EMBER);
    const homozygous = build('same-id', genome({ wings: ['W', 'W'], horns: ['H', 'H'] }), EMBER);

    expect(homozygous.assembly.parts.length).toBe(heterozygous.assembly.parts.length);
    expect(headProfileOf(homozygous.assembly)).toBe(headProfileOf(heterozygous.assembly));
    expect(homozygous.assembly.parts.map(part => part.color))
      .toEqual(heterozygous.assembly.parts.map(part => part.color));
  });

  // Per gene, so a failure names the leaking locus instead of just saying the
  // dragons differ. Each case is `Xx` against `XX`, which must be identical
  // down to the last visible parameter; `xx` is expected to differ and is what
  // proves the comparison is actually sensitive to this gene at all.
  const dominantPairs: { trait: keyof DragonLabGenome; hom: [string, string]; het: [string, string]; rec: [string, string] }[] = [
    { trait: 'wings', hom: ['W', 'W'], het: ['W', 'w'], rec: ['w', 'w'] },
    { trait: 'fire', hom: ['F', 'F'], het: ['F', 'f'], rec: ['f', 'f'] },
    { trait: 'scales', hom: ['S', 'S'], het: ['S', 's'], rec: ['s', 's'] },
    { trait: 'horns', hom: ['H', 'H'], het: ['H', 'h'], rec: ['h', 'h'] },
  ];

  for (const { trait, hom, het, rec } of dominantPairs) {
    it(`hides zygosity of the ${trait} gene across every visible channel`, () => {
      const homozygous = build('same-id', genome({ [trait]: hom }), EMBER);
      const heterozygous = build('same-id', genome({ [trait]: het }), EMBER);
      const recessive = build('same-id', genome({ [trait]: rec }), EMBER);

      expect(visibleSurfaceOf(heterozygous.assembly)).toEqual(visibleSurfaceOf(homozygous.assembly));
      // Guards the guard: if the recessive also matched, this test would pass
      // for a channel that had simply stopped being expressed.
      expect(visibleSurfaceOf(recessive.assembly)).not.toEqual(visibleSurfaceOf(homozygous.assembly));
    });
  }

  it('selects the patterned scale albedo from the scales phenotype', () => {
    const patternOf = (assembly: {
      parts: { visualProfile?: { parameters?: Record<string, unknown> } }[];
    }) => assembly.parts.map(part => part.visualProfile?.parameters?.['scalePattern']);

    const spotted = build('d', genome({ scales: ['S', 's'] }), EMBER).assembly;
    const solid = build('d', genome({ scales: ['s', 's'] }), EMBER).assembly;

    expect(patternOf(spotted).every(value => value === 1)).toBe(true);
    expect(patternOf(solid).every(value => value === 0)).toBe(true);
  });

  it('gives each modelled gene its own visual channel', () => {
    const winged = build('d', genome({ wings: ['W', 'w'] }), EMBER);
    const wingless = build('d', genome({ wings: ['w', 'w'] }), EMBER);
    const horned = build('d', genome({ horns: ['H', 'h'] }), EMBER);
    const hornless = build('d', genome({ horns: ['h', 'h'] }), EMBER);

    // wings -> parts present or absent
    const wingCount = (parts: { roles?: readonly string[] }[]) =>
      parts.filter(part => part.roles?.includes('wing')).length;
    expect(wingCount(winged.assembly.parts)).toBeGreaterThan(0);
    expect(wingCount(wingless.assembly.parts)).toBe(0);

    // horns -> the skull's horns, retracted to nothing on a hornless dragon.
    // There is one head profile now, so the trait rides its horn lengths.
    expect(headProfileOf(horned.assembly)).toBe('dragon-head-horned');
    expect(headProfileOf(hornless.assembly)).toBe('dragon-head-horned');
    expect(hornLengthOf(horned.assembly)).toBeGreaterThan(0);
    expect(hornLengthOf(hornless.assembly)).toBe(0);
  });

  it('shows scale pattern as two tones and a solid dragon as one', () => {
    const spotted = build('d', genome({ scales: ['S', 's'] }), EMBER);
    const solid = build('d', genome({ scales: ['s', 's'] }), EMBER);

    expect(new Set(solid.assembly.parts.map(part => part.color)))
      .toEqual(new Set([EMBER.color]));

    const spottedTones = new Set(spotted.assembly.parts.map(part => part.color));
    expect(spottedTones.has(EMBER.color)).toBeTrue();
    expect(spottedTones.has(EMBER.accentColor)).toBeTrue();
  });

  it('paints each dragon in its own identity colour', () => {
    // Two dragons with the *same* genotype must still be told apart: colour is
    // identity, not a trait readout. This is what the old scales-driven
    // pigment broke.
    const shared = genome({ scales: ['s', 's'] });
    const ember = build('ember', shared, EMBER);
    const tide = build('tide', shared, TIDE);

    expect(ember.assembly.parts[0].color).toBe(EMBER.color);
    expect(tide.assembly.parts[0].color).toBe(TIDE.color);
  });

  it('still builds a dragon when no identity is supplied', () => {
    // Anonymous genotypes — a Punnett cell, a predicted outcome — have no card
    // colour and must fall back to the engine's own pigment rather than throw.
    const anonymous = build('anon', genome());

    expect(anonymous.assembly.parts.length).toBeGreaterThan(0);
    expect(anonymous.assembly.parts.every(part => typeof part.color === 'string')).toBeTrue();
  });

  it('keeps unmodelled variation stable for a given dragon', () => {
    // Body size and tail length are individual variation, not genes. They must
    // not drift between renders of the same animal, or a student comparing two
    // views of one dragon sees a change the model cannot explain.
    const first = createVisualGenome('steady', genome(), 0, EMBER);
    const second = createVisualGenome('steady', genome(), 0, EMBER);

    expect(second.loci['body-size']).toEqual(first.loci['body-size']);
    expect(second.loci['tail-length']).toEqual(first.loci['tail-length']);
  });

  it('carries the identity hue into the engine genome', () => {
    // The engine keeps a scalar approximation so arena tinting and thumbnail
    // accents land in the right family; exact colour comes from the repaint.
    const red = createVisualGenome('r', genome(), 0, EMBER).loci['pigment-hue'];
    const blue = createVisualGenome('b', genome(), 0, TIDE).loci['pigment-hue'];

    expect(red.maternal.value).not.toBeCloseTo(blue.maternal.value, 2);
  });
});
