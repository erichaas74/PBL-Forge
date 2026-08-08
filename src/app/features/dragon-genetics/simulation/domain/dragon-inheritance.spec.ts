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

    // horns -> skull silhouette
    expect(headProfileOf(horned.assembly)).toBe('dragon-head-horned');
    expect(headProfileOf(hornless.assembly)).toBe('dragon-head-snout');
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
