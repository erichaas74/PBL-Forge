import {
  MOLECULE_BOX,
  PROTEIN_CONNECTOR_TYPES,
  enzymeShapeSet,
  foldedProteinPath,
  noise,
  residueChainPath,
  socketPlatePath,
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
    expect(enzymeShapeSet(CHAIN, 42).enzyme).toBe(enzymeShapeSet(CHAIN, 42).enzyme);
    expect(noise(7)).toBe(noise(7));
    expect(noise(7)).toBeGreaterThanOrEqual(0);
    expect(noise(7)).toBeLessThan(1);
  });

  it('gives different chains different shapes', () => {
    const first = enzymeShapeSet(CHAIN, 42);
    const second = enzymeShapeSet(OTHER_CHAIN, 42);

    expect(foldedProteinPath(CHAIN, 42)).not.toBe(foldedProteinPath(OTHER_CHAIN, 42));
    expect(first.enzyme).not.toBe(second.enzyme);
    expect(first.product).not.toBe(second.product);
  });

  /*
   * The whole lock-and-key claim rests on this: all four shapes are cut from
   * one line, so the product is the exact negative of the active site and the
   * two substrates are the exact halves of the product.
   */
  it('cuts every shape from one active-site contour', () => {
    const set = enzymeShapeSet(CHAIN, 42);
    const contour = set.contour;

    expect(contour[0].x).toBe(0);
    expect(contour[contour.length - 1].x).toBe(MOLECULE_BOX.width);
    expect(PROTEIN_CONNECTOR_TYPES).toContain(set.connector);

    // The enzyme walks the contour left to right from its first point...
    for (const point of contour.slice(1)) {
      expect(set.enzyme).toContain(`L ${point.x} ${point.y}`);
    }
    // ...and the product walks the very same line back, from its last point.
    for (const point of contour.slice(0, -1)) {
      expect(set.product).toContain(`L ${point.x} ${point.y}`);
    }
    expect(set.enzyme).toContain(`V ${MOLECULE_BOX.height}`);
    expect(set.product).toContain(`V ${contour[contour.length - 1].y}`);
  });

  it('holds the contour level where the two substrates meet', () => {
    const set = enzymeShapeSet(CHAIN, 42);
    const middle = set.contour.filter((point) => point.x === 80);

    expect(middle.length).toBe(1);
    expect(middle[0].y).toBe(46);
    // Both substrates end on that shared midpoint, which is what lets them join.
    expect(set.substrateA).toContain('H 80');
    expect(set.substrateB).toContain('M 80 0');
  });

  it('splits the product into a left and a right substrate on one connector', () => {
    for (const connector of PROTEIN_CONNECTOR_TYPES) {
      const set = [CHAIN, OTHER_CHAIN, [1, 1, 1, 1, 1, 1, 1, 1]]
        .map((chain, index) => enzymeShapeSet(chain, index * 17))
        .find((candidate) => candidate.connector === connector);
      if (!set) continue;

      const left = points(set.substrateA);
      const right = points(set.substrateB);

      expect(left.every((point) => point.x <= 108)).toBeTrue();
      expect(right.every((point) => point.x >= 52)).toBeTrue();
      expect(set.substrateA).not.toBe(set.substrateB);
    }
  });

  it('keeps every lock-and-key shape inside the molecule box', () => {
    const set = enzymeShapeSet(CHAIN, 42);

    for (const path of [set.enzyme, set.product, set.substrateA, set.substrateB]) {
      expect(path.endsWith('Z')).toBeTrue();
      for (const point of points(path)) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(MOLECULE_BOX.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(MOLECULE_BOX.height);
      }
    }
  });

  it('punches a receptor socket that is the exact negative of its molecule', () => {
    const set = enzymeShapeSet(CHAIN, 42);
    const socket = socketPlatePath(set.product);

    expect(socket.startsWith(`M 0 0 H ${MOLECULE_BOX.width} V ${MOLECULE_BOX.height} H 0 Z`)).toBeTrue();
    expect(socket.endsWith(set.product)).toBeTrue();
    // Any molecule can be punched out, including a single released fragment.
    expect(socketPlatePath(set.substrateB)).toContain(set.substrateB);
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

  it('returns an open backbone for the residue chain and nothing for an empty one', () => {
    const backbone = residueChainPath(CHAIN, 42);

    expect(backbone.startsWith('M')).toBeTrue();
    expect(backbone).not.toContain('Z');
    expect(backbone.match(/L/g)?.length).toBe(CHAIN.length - 1);
    expect(residueChainPath([], 42)).toBe('');
  });
});
