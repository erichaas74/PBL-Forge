import {
  enzymeBodyPath,
  enzymeMoleculeGeometry,
  foldedProteinPath,
  noise,
  residueChainPath,
} from './dragon-protein.geometry';

const CHAIN = [0.7, 1.06, 1.24, 0.86, 1.16, 0.7, 1.12, 1.06];
const OTHER_CHAIN = [1.24, 0.7, 0.86, 1.16, 1.06, 1.12, 0.7, 1.24];

/** Pulls the numeric coordinates out of a path so geometry can be measured. */
function points(path: string): { x: number; y: number }[] {
  const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const pairs: { x: number; y: number }[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    pairs.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return pairs;
}

describe('dragon protein geometry', () => {
  it('is deterministic, so a residue chain always folds to the same shape', () => {
    expect(foldedProteinPath(CHAIN, 42)).toBe(foldedProteinPath(CHAIN, 42));
    expect(enzymeBodyPath(CHAIN, 42)).toBe(enzymeBodyPath(CHAIN, 42));
    expect(noise(7)).toBe(noise(7));
    expect(noise(7)).toBeGreaterThanOrEqual(0);
    expect(noise(7)).toBeLessThan(1);
  });

  it('gives different chains different shapes', () => {
    expect(foldedProteinPath(CHAIN, 42)).not.toBe(foldedProteinPath(OTHER_CHAIN, 42));
    expect(enzymeBodyPath(CHAIN, 42)).not.toBe(enzymeBodyPath(OTHER_CHAIN, 42));
    expect(enzymeMoleculeGeometry(CHAIN, 42).joined).not.toBe(
      enzymeMoleculeGeometry(OTHER_CHAIN, 42).joined,
    );
  });

  it('closes the folded silhouette and keeps it inside the shared protein viewBox', () => {
    const path = foldedProteinPath(CHAIN, 42);

    expect(path.startsWith('M')).toBeTrue();
    expect(path.endsWith('Z')).toBeTrue();
    for (const point of points(path)) {
      expect(Math.abs(point.x)).toBeLessThanOrEqual(90);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(50);
    }
  });

  /*
   * The lock-and-key claim the enzyme bench makes rests on this: the two
   * fragments are cut along one shared seam, so they interlock at the same
   * point and tile back into the joined molecule.
   */
  it('cuts both fragments along one shared seam', () => {
    const geometry = enzymeMoleculeGeometry(CHAIN, 42);
    const fragmentA = points(geometry.fragmentA);
    const fragmentB = points(geometry.fragmentB);
    const seamLength = 8;

    expect(fragmentA.slice(0, seamLength)).toEqual(fragmentB.slice(0, seamLength));
    expect(fragmentA[0]).toEqual({ x: 0, y: -37 });
    expect(fragmentA[seamLength - 1]).toEqual({ x: 0, y: 37 });
  });

  it('puts each fragment on its own side of the seam', () => {
    const geometry = enzymeMoleculeGeometry(CHAIN, 42);
    const outerA = points(geometry.fragmentA).slice(8);
    const outerB = points(geometry.fragmentB).slice(8);

    expect(outerA.every((point) => point.x <= 0)).toBeTrue();
    expect(outerB.every((point) => point.x >= 0)).toBeTrue();
  });

  it('makes the joined molecule span both fragments', () => {
    const geometry = enzymeMoleculeGeometry(CHAIN, 42);
    const joined = points(geometry.joined);
    const left = Math.min(...joined.map((point) => point.x));
    const right = Math.max(...joined.map((point) => point.x));

    expect(left).toBeLessThan(0);
    expect(right).toBeGreaterThan(0);
    expect(geometry.joined.endsWith('Z')).toBeTrue();
  });

  it('draws an enzyme body wide enough to hold a docked molecule', () => {
    const body = points(enzymeBodyPath(CHAIN, 42));
    const molecule = points(enzymeMoleculeGeometry(CHAIN, 42).joined);
    const spread = (shape: { x: number; y: number }[]) =>
      Math.max(...shape.map((point) => point.x)) - Math.min(...shape.map((point) => point.x));

    // The cavity is cut at 0.62 scale, so the body must clear that comfortably.
    expect(spread(body)).toBeGreaterThan(spread(molecule) * 0.62 * 1.8);
    expect(enzymeBodyPath(CHAIN, 42).endsWith('Z')).toBeTrue();
  });

  it('returns an open backbone for the residue chain and nothing for an empty one', () => {
    const backbone = residueChainPath(CHAIN, 42);

    expect(backbone.startsWith('M')).toBeTrue();
    expect(backbone).not.toContain('Z');
    expect(backbone.match(/L/g)?.length).toBe(CHAIN.length - 1);
    expect(residueChainPath([], 42)).toBe('');
  });
});
