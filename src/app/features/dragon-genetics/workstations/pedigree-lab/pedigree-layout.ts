import { PedigreeDragon, PedigreePopulation } from './pedigree-lab.models';

/**
 * Where every dragon sits on the pedigree canvas.
 *
 * Generation is the row — that is the one thing a pedigree chart must never get
 * wrong, because reading down the page is reading forward in time. Within a row,
 * a dragon is placed under the midpoint of its parents so sibships stay together
 * and the descent lines do not cross more than the family actually does. A mate
 * who married in has no parents to sit under, so it is parked beside the dragon
 * it mated with.
 */

export const PEDIGREE_NODE_SPACING = 128;
export const PEDIGREE_ROW_HEIGHT = 152;
const CANVAS_MARGIN = 80;

export interface PedigreeNodeLayout {
  dragonId: string;
  generation: number;
  x: number;
  y: number;
}

export interface PedigreeUnionLayout {
  id: string;
  motherId: string;
  fatherId: string;
  motherX: number;
  fatherX: number;
  parentY: number;
  childY: number;
  childXs: readonly number[];
  childIds: readonly string[];
}

export interface PedigreeGenerationRow {
  generation: number;
  y: number;
  label: string;
  count: number;
}

export interface PedigreeLayout {
  nodes: readonly PedigreeNodeLayout[];
  unions: readonly PedigreeUnionLayout[];
  rows: readonly PedigreeGenerationRow[];
  positions: ReadonlyMap<string, PedigreeNodeLayout>;
  width: number;
  height: number;
}

export interface PedigreeLayoutRequest {
  population: PedigreePopulation;
  focusId: string;
  /** How many generations of parents to open above the focus dragon. */
  ancestorDepth: number;
  /** How many generations of offspring to open below it. */
  descendantDepth: number;
}

export function visiblePedigreeIds(request: PedigreeLayoutRequest): ReadonlySet<string> {
  const byId = new Map(request.population.map((dragon) => [dragon.id, dragon]));
  const focus = byId.get(request.focusId);
  const visible = new Set<string>();
  if (!focus) return visible;
  visible.add(focus.id);

  let frontier = [focus];
  for (let depth = 0; depth < request.ancestorDepth; depth += 1) {
    const next: PedigreeDragon[] = [];
    for (const dragon of frontier) {
      for (const parentId of [dragon.motherId, dragon.fatherId]) {
        const parent = parentId ? byId.get(parentId) : undefined;
        if (!parent || visible.has(parent.id)) continue;
        visible.add(parent.id);
        next.push(parent);
      }
    }
    frontier = next;
  }

  frontier = [focus];
  for (let depth = 0; depth < request.descendantDepth; depth += 1) {
    const next: PedigreeDragon[] = [];
    for (const dragon of frontier) {
      for (const childId of dragon.offspringIds) {
        const child = byId.get(childId);
        if (!child || visible.has(child.id)) continue;
        visible.add(child.id);
        next.push(child);
      }
    }
    frontier = next;
  }

  // Both parents of any visible dragon whose other parent is missing, so a
  // descent line never drops out of an empty space.
  for (const id of [...visible]) {
    const dragon = byId.get(id);
    if (!dragon) continue;
    for (const parentId of [dragon.motherId, dragon.fatherId]) {
      if (parentId && visible.has(parentId)) {
        const partnerId = parentId === dragon.motherId ? dragon.fatherId : dragon.motherId;
        if (partnerId && byId.has(partnerId)) visible.add(partnerId);
      }
    }
  }

  return visible;
}

export function layoutPedigree(request: PedigreeLayoutRequest): PedigreeLayout {
  const visible = visiblePedigreeIds(request);
  const dragons = request.population.filter((dragon) => visible.has(dragon.id));

  const generations = [...new Set(dragons.map((dragon) => dragon.generation))].sort(
    (left, right) => left - right,
  );
  const placed = new Map<string, number>();
  const rowMembers = new Map<number, PedigreeDragon[]>();

  for (const generation of generations) {
    const members = dragons.filter((dragon) => dragon.generation === generation);
    const wanted = new Map<string, number>();

    // A sibship is laid out as one block centred on its parents' midpoint. This
    // is the whole point of the pass: centring each row on the canvas instead
    // left the descent line dropping into empty space whenever a row happened to
    // be wider or narrower than the one above it.
    const sibships = new Map<string, PedigreeDragon[]>();
    for (const dragon of members) {
      const parents = [dragon.motherId, dragon.fatherId].filter(
        (id): id is string => !!id && placed.has(id),
      );
      if (!parents.length) continue;
      const key = [...parents].sort().join('|');
      sibships.set(key, [...(sibships.get(key) ?? []), dragon]);
    }

    const inSibship = new Set([...sibships.values()].flat().map((dragon) => dragon.id));
    const claimed = new Set<string>();
    for (const [key, group] of sibships) {
      const midpoint = average(key.split('|').map((id) => placed.get(id) as number));
      const siblings = [...group].sort(
        (left, right) => left.birthYear - right.birthYear || left.id.localeCompare(right.id),
      );

      // Each sibling takes a slot, and anyone who married into the family takes
      // the next slot along — that is where a spouse belongs on a pedigree chart,
      // and reserving the slot up front is what stops siblings being shoved apart
      // later and dragging the sibship out from under its parents.
      const slots: { dragon: PedigreeDragon; sibling: boolean }[] = [];
      for (const sibling of siblings) {
        slots.push({ dragon: sibling, sibling: true });
        for (const mateId of sibling.mateIds) {
          const mate = members.find((candidate) => candidate.id === mateId);
          // Only someone who married in: a mate with their own parents on the
          // canvas belongs to their own sibship block.
          if (!mate || claimed.has(mate.id) || inSibship.has(mate.id)) continue;
          claimed.add(mate.id);
          slots.push({ dragon: mate, sibling: false });
        }
      }

      // The block is centred on the *siblings*, not on every slot, so the descent
      // line lands in the middle of the sibship bar rather than beside a spouse.
      const centre = average(
        slots.map((slot, index) => (slot.sibling ? index : -1)).filter((index) => index >= 0),
      );
      slots.forEach((slot, index) => {
        wanted.set(slot.dragon.id, midpoint + (index - centre) * PEDIGREE_NODE_SPACING);
      });
    }

    // Anyone still unplaced married someone from an older row, so they sit beside
    // that mate instead.
    for (const dragon of members) {
      if (wanted.has(dragon.id)) continue;
      const mateX = dragon.mateIds
        .map((mateId) => wanted.get(mateId) ?? placed.get(mateId))
        .find((value): value is number => value !== undefined);
      if (mateX !== undefined) wanted.set(dragon.id, mateX + PEDIGREE_NODE_SPACING * 0.6);
    }

    const ordered = [...members].sort((left, right) => {
      const leftWanted = wanted.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightWanted = wanted.get(right.id) ?? Number.POSITIVE_INFINITY;
      return (
        leftWanted - rightWanted ||
        left.birthYear - right.birthYear ||
        left.id.localeCompare(right.id)
      );
    });

    // One sweep left to right: take the position each dragon wants unless a
    // neighbour is already there, in which case take the first free slot. Blocks
    // that fit keep their alignment; blocks that collide give way to the left.
    let cursor = Number.NEGATIVE_INFINITY;
    for (const dragon of ordered) {
      const want = wanted.get(dragon.id) ?? (cursor === Number.NEGATIVE_INFINITY ? 0 : cursor);
      const x = Math.max(want, cursor + PEDIGREE_NODE_SPACING);
      placed.set(dragon.id, x);
      cursor = x;
    }
    rowMembers.set(generation, ordered);
  }

  const allX = [...placed.values()];
  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 0;
  const offset = CANVAS_MARGIN - minX;
  const width = maxX - minX + CANVAS_MARGIN * 2;
  const height = generations.length * PEDIGREE_ROW_HEIGHT + CANVAS_MARGIN * 1.5;

  const nodes: PedigreeNodeLayout[] = [];
  const rows: PedigreeGenerationRow[] = [];
  generations.forEach((generation, rowIndex) => {
    const members = rowMembers.get(generation) ?? [];
    // A full margin above the first row, so its generation label and rule have
    // somewhere to live instead of being clipped off the top of the canvas.
    const y = CANVAS_MARGIN + rowIndex * PEDIGREE_ROW_HEIGHT;
    rows.push({ generation, y, label: `Generation ${generation}`, count: members.length });
    for (const dragon of members) {
      nodes.push({
        dragonId: dragon.id,
        generation,
        x: (placed.get(dragon.id) as number) + offset,
        y,
      });
    }
  });

  const positions = new Map(nodes.map((node) => [node.dragonId, node]));

  const unions = new Map<string, PedigreeUnionLayout>();
  for (const dragon of dragons) {
    const mother = dragon.motherId ? positions.get(dragon.motherId) : undefined;
    const father = dragon.fatherId ? positions.get(dragon.fatherId) : undefined;
    const child = positions.get(dragon.id);
    if (!mother || !father || !child) continue;
    const id = `${dragon.motherId}|${dragon.fatherId}`;
    const existing = unions.get(id);
    if (existing) {
      unions.set(id, {
        ...existing,
        childXs: [...existing.childXs, child.x],
        childIds: [...existing.childIds, dragon.id],
      });
      continue;
    }
    unions.set(id, {
      id,
      motherId: dragon.motherId as string,
      fatherId: dragon.fatherId as string,
      motherX: mother.x,
      fatherX: father.x,
      parentY: mother.y,
      childY: child.y,
      childXs: [child.x],
      childIds: [dragon.id],
    });
  }

  return {
    nodes,
    unions: [...unions.values()],
    rows,
    positions,
    width,
    height,
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

/** Standard pedigree notation: males are squares, females circles. */
export function pedigreeSymbol(dragon: PedigreeDragon): 'square' | 'circle' {
  return dragon.sex === 'male' ? 'square' : 'circle';
}

/** Fixes `byId` lookups the layout needs, without every caller rebuilding the map. */
export function indexPopulation(
  population: PedigreePopulation,
): ReadonlyMap<string, PedigreeDragon> {
  return new Map(population.map((dragon) => [dragon.id, dragon]));
}
