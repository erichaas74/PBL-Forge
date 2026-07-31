import { AssemblyBlueprint, AssemblyPart } from '../../../../shared/assembly/domain/assembly.models';
import {
  DRAGON_LOCUS_VISUALS,
  applyDragonPhenotype,
  createFounderDragonGenome,
  expressDragonPhenotype,
} from './dragon-phenotype-builder';
import { DragonPhenotype } from './dragon-genetics.models';

function part(id: string, roles: string[]): AssemblyPart {
  return {
    id,
    roles,
    shape: 'box',
    mass: 1,
    dimensions: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 1, z: 0 },
    color: '#556677',
  };
}

function blueprint(): AssemblyBlueprint {
  return {
    parts: [
      part('body', ['core']),
      part('wing', ['wing']),
      part('jaw', ['jaw']),
      part('tail', ['tail']),
    ],
    joints: [],
  };
}

const PHENOTYPE: DragonPhenotype = {
  bodyScale: 1,
  wingSpanScale: 1.5,
  jawScale: 1.4,
  tailScale: 1.3,
  armorDensity: 0.5,
  pigmentHue: 200,
  aggression: 0.5,
  scaleColor: 'hsl(200, 62%, 42%)',
};

describe('applyDragonPhenotype', () => {
  it('stretches each shape locus on the axis its visual entry declares', () => {
    const scaled = applyDragonPhenotype(blueprint(), PHENOTYPE);
    const dimensionsOf = (id: string) => scaled.parts.find(entry => entry.id === id)!.dimensions;

    // The specimen viewer highlights parts using the same table, so if these
    // ever disagree a student is shown a gene highlighting parts it never
    // touched.
    expect(DRAGON_LOCUS_VISUALS['wing-span'].axis).toBe('z');
    expect(dimensionsOf('wing').z).toBeCloseTo(1.5, 5);
    expect(dimensionsOf('wing').x).toBeCloseTo(1, 5);

    expect(DRAGON_LOCUS_VISUALS['jaw-strength'].axis).toBe('x');
    expect(dimensionsOf('jaw').x).toBeCloseTo(1.4, 5);

    expect(DRAGON_LOCUS_VISUALS['tail-length'].axis).toBe('y');
    expect(dimensionsOf('tail').y).toBeCloseTo(1.3, 5);
  });

  it('scales unroled parts by body size alone', () => {
    const scaled = applyDragonPhenotype(blueprint(), { ...PHENOTYPE, bodyScale: 2 });
    const body = scaled.parts.find(entry => entry.id === 'body')!;

    expect(body.dimensions).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('compounds body size with the per-feature axis', () => {
    const scaled = applyDragonPhenotype(blueprint(), { ...PHENOTYPE, bodyScale: 2 });
    const wing = scaled.parts.find(entry => entry.id === 'wing')!;

    expect(wing.dimensions.z).toBeCloseTo(3, 5);
    expect(wing.dimensions.x).toBeCloseTo(2, 5);
  });

  it('repaints every part with the pigment colour', () => {
    const scaled = applyDragonPhenotype(blueprint(), PHENOTYPE);

    for (const entry of scaled.parts) {
      expect(entry.color).toBe(PHENOTYPE.scaleColor);
    }
  });
});

describe('expressDragonPhenotype', () => {
  it('keeps every measurement inside the range the trait meters assume', () => {
    for (let index = 0; index < 24; index += 1) {
      const genome = createFounderDragonGenome(`g-${index}`, {
        'body-size': index / 24,
        'wing-span': (index * 7 % 24) / 24,
        'jaw-strength': (index * 11 % 24) / 24,
        'tail-length': (index * 5 % 24) / 24,
      });
      const phenotype = expressDragonPhenotype(genome);

      expect(phenotype.bodyScale).toBeGreaterThanOrEqual(0.78);
      expect(phenotype.bodyScale).toBeLessThanOrEqual(1.33);
      expect(phenotype.wingSpanScale).toBeGreaterThanOrEqual(0.72);
      expect(phenotype.wingSpanScale).toBeLessThanOrEqual(1.57);
      expect(phenotype.jawScale).toBeLessThanOrEqual(1.43);
      expect(phenotype.tailScale).toBeLessThanOrEqual(1.55);
    }
  });

  it('emits a colour three.js can parse', () => {
    const colour = expressDragonPhenotype(createFounderDragonGenome('g')).scaleColor;

    expect(colour).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });
});
