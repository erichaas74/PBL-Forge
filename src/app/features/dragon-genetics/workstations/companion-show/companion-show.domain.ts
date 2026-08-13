import { AssemblyBlueprint } from '../../../../shared/assembly/domain/assembly.models';
import { buildMiniDragonBlueprint } from './mini-dragon.anatomy';
import { MiniTrialResult, miniRibbonCount, runMiniShowCard } from './mini-dragon.events';
import {
  MINI_DRAGON_GENES,
  MINI_FOUNDERS,
  MiniCoatPaint,
  MiniGeneDefinition,
  MiniGeneId,
  MiniGenome,
  MiniPhenotypeForm,
  breedMiniGenomes,
  cloneMiniGenome,
  miniCoatPaint,
  miniGene,
  miniIndividualFeatureList,
  miniPhenotypeFormId,
  miniPhenotypeForms,
} from './mini-dragon.genetics';
import {
  BreedStandardTarget,
  CompanionDragon,
  CompanionLitterSize,
  CompanionShowSnapshot,
  LitterRecord,
} from './companion-show.models';

/**
 * How this workstation judges a mini dragon.
 *
 * A breeder compares an animal to a written standard, one visible characteristic
 * at a time. Nothing here reads an allele: `actualLabel` is what the dragon looks
 * like and `targetLabel` is what the student asked for, so every judgement can be
 * checked by looking at the animal on the stand.
 */
export interface StandardMatch {
  geneId: MiniGeneId;
  geneName: string;
  targetLabel: string;
  actualLabel: string;
  matched: boolean;
}

export interface CompanionPup {
  id: string;
  name: string;
  title: string;
  genome: MiniGenome;
  litterId: string;
  generation: number;
  parentIds: readonly [string, string];
  matches: readonly StandardMatch[];
  matchedCount: number;
  meetsStandard: boolean;
  kept: boolean;
}

export interface MaterializedLitter {
  record: LitterRecord;
  pups: readonly CompanionPup[];
  matchedCount: number;
  matchPercent: number;
}

export interface RebuiltKennel {
  kennel: ReadonlyMap<string, CompanionDragon>;
  litters: ReadonlyMap<string, MaterializedLitter>;
}

export interface ConsistencyReport {
  litterCount: number;
  pupCount: number;
  matchedCount: number;
  percent: number;
}

export type BloodlineBand = 'Unrelated' | 'Distant' | 'Related' | 'Close' | 'Very close';

export interface BloodlineReport {
  /** Coefficient of relationship between the two proposed parents, as a percentage. */
  relatednessPercent: number;
  /** Expected inbreeding coefficient of this pairing's young, as a percentage. */
  inbreedingPercent: number;
  band: BloodlineBand;
  summary: string;
  sharedAncestorNames: readonly string[];
}

/** A node in the kennel pedigree. Founder lines carry a null `parentIds`. */
export interface PedigreeNode {
  id: string;
  generation: number;
  parentIds: readonly [string, string] | null;
}

// ---------------------------------------------------------------------------
// Breed standard.
// ---------------------------------------------------------------------------

export function standardGenes(): readonly MiniGeneDefinition[] {
  return MINI_DRAGON_GENES;
}

export function standardFormsFor(geneId: MiniGeneId): readonly MiniPhenotypeForm[] {
  return miniPhenotypeForms(geneId);
}

export function standardTargetLabel(target: BreedStandardTarget): string {
  return (
    miniPhenotypeForms(target.geneId).find((form) => form.id === target.formId)?.label ?? ''
  );
}

export function standardMatches(
  genome: MiniGenome,
  targets: readonly BreedStandardTarget[],
): readonly StandardMatch[] {
  return targets.map((target) => {
    const actual = miniPhenotypeForms(target.geneId).find(
      (form) => form.id === miniPhenotypeFormId(target.geneId, genome),
    );
    return {
      geneId: target.geneId,
      geneName: miniGene(target.geneId).name,
      targetLabel: standardTargetLabel(target),
      actualLabel: actual?.label ?? '',
      matched: actual?.id === target.formId,
    };
  });
}

export function meetsStandard(
  genome: MiniGenome,
  targets: readonly BreedStandardTarget[],
): boolean {
  return targets.length > 0 && standardMatches(genome, targets).every((match) => match.matched);
}

/**
 * Whether two standards describe the same animal.
 *
 * Litter evidence is only comparable when it was gathered against the standard
 * being registered — otherwise a student could cite a run bred toward a different
 * target and call it consistency. Order does not matter; the set of gene/form
 * pairs does.
 */
export function sameStandard(
  left: readonly BreedStandardTarget[],
  right: readonly BreedStandardTarget[],
): boolean {
  if (left.length !== right.length) return false;
  const rightKeys = new Set(right.map(targetKey));
  return left.every((target) => rightKeys.has(targetKey(target)));
}

function targetKey(target: BreedStandardTarget): string {
  return `${target.geneId}:${target.formId}`;
}

// ---------------------------------------------------------------------------
// Appearance and show card.
// ---------------------------------------------------------------------------

export function companionPaint(dragon: { genome: MiniGenome; id: string }): MiniCoatPaint {
  return miniCoatPaint(dragon.genome, dragon.id);
}

export function companionAssembly(dragon: { genome: MiniGenome; id: string }): AssemblyBlueprint {
  return buildMiniDragonBlueprint(dragon.genome, dragon.id);
}

export function companionFeatures(
  individualId: string,
): readonly { label: string; value: string }[] {
  return miniIndividualFeatureList(individualId);
}

export function companionShowCard(genome: MiniGenome): readonly MiniTrialResult[] {
  return runMiniShowCard(genome);
}

export function companionRibbons(genome: MiniGenome): number {
  return miniRibbonCount(genome);
}

// ---------------------------------------------------------------------------
// Litters.
// ---------------------------------------------------------------------------

const COMPANION_NAMES: readonly string[] = [
  'Biscuit', 'Pip', 'Mochi', 'Clover', 'Tinder', 'Marlow', 'Nutmeg', 'Waffle',
  'Juniper', 'Pumpkin', 'Sable', 'Fig', 'Bramble', 'Poppy', 'Comet', 'Truffle',
  'Willow', 'Nimbus', 'Barley', 'Saffron', 'Pebble', 'Maple', 'Cocoa', 'Fern',
  'Wren', 'Hazel', 'Sprout', 'Dandelion', 'Custard', 'Bracken', 'Quill', 'Toffee',
  'Rook', 'Plum', 'Sorrel', 'Mistle', 'Acorn', 'Peach', 'Pikelet', 'Sorbet',
];

export function whelpLitter(
  dam: CompanionDragon,
  sire: CompanionDragon,
  targets: readonly BreedStandardTarget[],
  runNumber: number,
  size: CompanionLitterSize,
  whelpedAtIso = new Date().toISOString(),
): MaterializedLitter {
  const record: LitterRecord = {
    id: `litter-${runNumber}`,
    runNumber,
    generation: Math.max(dam.generation, sire.generation) + 1,
    parentIds: [dam.id, sire.id],
    size,
    targets: targets.map((target) => ({ ...target })),
    keptPupIds: [],
    whelpedAtIso,
  };
  return materializeLitter(record, dam, sire);
}

/**
 * Rebuilds a litter's young from the record alone. Reload produces the same
 * young, with the same genomes, coats, and names, as the day they were whelped.
 */
export function materializeLitter(
  record: LitterRecord,
  dam: CompanionDragon,
  sire: CompanionDragon,
): MaterializedLitter {
  const nameSeed = stableHash(record.id);
  const pups = Array.from({ length: record.size }, (_, index): CompanionPup => {
    const id = `${record.id}-pup-${index + 1}`;
    const genome = breedMiniGenomes(
      dam.genome,
      sire.genome,
      `${dam.id}:${sire.id}:${record.runNumber}:${index}`,
    );
    const matches = standardMatches(genome, record.targets);
    return {
      id,
      name: COMPANION_NAMES[(nameSeed + index * 7) % COMPANION_NAMES.length],
      title: `Generation ${record.generation}`,
      genome,
      litterId: record.id,
      generation: record.generation,
      parentIds: [dam.id, sire.id],
      matches,
      matchedCount: matches.filter((match) => match.matched).length,
      meetsStandard: matches.length > 0 && matches.every((match) => match.matched),
      kept: record.keptPupIds.includes(id),
    };
  });

  const matchedCount = pups.filter((pup) => pup.meetsStandard).length;
  return {
    record,
    pups,
    matchedCount,
    matchPercent: pups.length ? Math.round((100 * matchedCount) / pups.length) : 0,
  };
}

export function pupToCompanion(pup: CompanionPup): CompanionDragon {
  return {
    id: pup.id,
    name: pup.name,
    title: pup.title,
    genome: cloneMiniGenome(pup.genome),
    origin: 'bred',
    generation: pup.generation,
    parentIds: [pup.parentIds[0], pup.parentIds[1]],
    litterId: pup.litterId,
  };
}

export function founderToCompanion(founderId: string): CompanionDragon | null {
  const founder = MINI_FOUNDERS.find((candidate) => candidate.id === founderId);
  if (!founder) return null;
  return {
    id: founder.id,
    name: founder.name,
    title: founder.title,
    genome: cloneMiniGenome(founder.genome),
    origin: 'founder',
    generation: 0,
    parentIds: null,
    litterId: null,
  };
}

/**
 * Replays the saved kennel: adopted founders first, then every litter in the
 * order it was whelped, so a kept pup can become the parent of a later litter
 * exactly as it did during the session.
 */
export function rebuildKennel(snapshot: CompanionShowSnapshot): RebuiltKennel {
  const kennel = new Map<string, CompanionDragon>();
  for (const founderId of snapshot.kennelFounderIds) {
    const founder = founderToCompanion(founderId);
    if (founder) kennel.set(founder.id, founder);
  }

  const litters = new Map<string, MaterializedLitter>();
  for (const record of snapshot.litters) {
    const dam = kennel.get(record.parentIds[0]);
    const sire = kennel.get(record.parentIds[1]);
    if (!dam || !sire) continue;
    const litter = materializeLitter(record, dam, sire);
    litters.set(record.id, litter);
    for (const pup of litter.pups) {
      if (pup.kept) kennel.set(pup.id, pupToCompanion(pup));
    }
  }

  return { kennel, litters };
}

export function litterConsistency(
  litters: readonly MaterializedLitter[],
  targets: readonly BreedStandardTarget[],
): ConsistencyReport {
  const comparable = litters.filter((litter) => sameStandard(litter.record.targets, targets));
  const pupCount = comparable.reduce((total, litter) => total + litter.pups.length, 0);
  const matchedCount = comparable.reduce((total, litter) => total + litter.matchedCount, 0);
  return {
    litterCount: comparable.length,
    pupCount,
    matchedCount,
    percent: pupCount ? Math.round((100 * matchedCount) / pupCount) : 0,
  };
}

// ---------------------------------------------------------------------------
// Bloodline.
// ---------------------------------------------------------------------------

/**
 * Kinship coefficient between two kennel dragons, from the pedigree alone.
 *
 * This is the standard recursion: the probability that an allele drawn from each
 * animal is identical by descent. It reads no genome on purpose — a breeder's
 * inbreeding warning has to come from the family tree, and computing it from
 * genotypes would hand the student the hidden alleles the whole workstation asks
 * them to infer from breeding results.
 *
 * Founder lines are treated as unrelated to each other, which is the usual
 * convention when no ancestry is recorded above them.
 */
export function kinshipCoefficient(
  leftId: string,
  rightId: string,
  nodes: ReadonlyMap<string, PedigreeNode>,
): number {
  const memo = new Map<string, number>();

  const kinship = (left: string, right: string): number => {
    const key = left < right ? `${left}|${right}` : `${right}|${left}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    // Recursion always walks toward older animals, so a real pedigree terminates.
    // The sentinel only matters if stored parentage were ever cyclic.
    memo.set(key, 0);

    const leftNode = nodes.get(left);
    const rightNode = nodes.get(right);
    if (!leftNode || !rightNode) return 0;

    let value = 0;
    if (left === right) {
      value = leftNode.parentIds
        ? 0.5 * (1 + kinship(leftNode.parentIds[0], leftNode.parentIds[1]))
        : 0.5;
    } else {
      const expandLeft =
        leftNode.generation === rightNode.generation
          ? Boolean(leftNode.parentIds)
          : leftNode.generation > rightNode.generation;
      if (expandLeft && leftNode.parentIds) {
        value =
          0.5 * (kinship(leftNode.parentIds[0], right) + kinship(leftNode.parentIds[1], right));
      } else if (rightNode.parentIds) {
        value =
          0.5 * (kinship(left, rightNode.parentIds[0]) + kinship(left, rightNode.parentIds[1]));
      }
    }

    memo.set(key, value);
    return value;
  };

  return kinship(leftId, rightId);
}

export function ancestorIds(
  id: string,
  nodes: ReadonlyMap<string, PedigreeNode>,
): ReadonlySet<string> {
  const found = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const current = nodes.get(queue.pop() as string);
    if (!current?.parentIds) continue;
    for (const parentId of current.parentIds) {
      if (found.has(parentId)) continue;
      found.add(parentId);
      queue.push(parentId);
    }
  }
  return found;
}

export function pedigreeNodes(
  kennel: ReadonlyMap<string, CompanionDragon>,
): ReadonlyMap<string, PedigreeNode> {
  return new Map(
    [...kennel.values()].map((dragon) => [
      dragon.id,
      { id: dragon.id, generation: dragon.generation, parentIds: dragon.parentIds },
    ]),
  );
}

export function bloodlineReport(
  dam: CompanionDragon,
  sire: CompanionDragon,
  kennel: ReadonlyMap<string, CompanionDragon>,
): BloodlineReport {
  const nodes = pedigreeNodes(kennel);
  const inbreeding = kinshipCoefficient(dam.id, sire.id, nodes);
  const inbreedingPercent = Math.round(inbreeding * 1000) / 10;
  const relatednessPercent = Math.round(inbreeding * 2000) / 10;

  const damLine = new Set([dam.id, ...ancestorIds(dam.id, nodes)]);
  const sireLine = new Set([sire.id, ...ancestorIds(sire.id, nodes)]);
  const sharedAncestorNames = [...damLine]
    .filter((id) => sireLine.has(id))
    .map((id) => kennel.get(id)?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 4);

  const band = bloodlineBand(inbreedingPercent);
  return {
    relatednessPercent,
    inbreedingPercent,
    band,
    summary: BLOODLINE_SUMMARIES[band],
    sharedAncestorNames,
  };
}

const BLOODLINE_SUMMARIES: Readonly<Record<BloodlineBand, string>> = {
  Unrelated: 'No shared ancestor is recorded for this pair in your kennel.',
  Distant: 'These two share an ancestor several generations back.',
  Related: 'These two share recent ancestry. Repeating this kind of pairing narrows the bloodline.',
  Close:
    'These two are closely related. Their young are likely to inherit the same allele twice at some genes.',
  'Very close':
    'This is a full-sibling or parent-offspring pairing. Any hidden form in the line has a strong chance of appearing.',
};

function bloodlineBand(inbreedingPercent: number): BloodlineBand {
  if (inbreedingPercent <= 0) return 'Unrelated';
  if (inbreedingPercent < 3.125) return 'Distant';
  if (inbreedingPercent < 6.25) return 'Related';
  if (inbreedingPercent < 25) return 'Close';
  return 'Very close';
}

/** How many of the adopted founder lines are still represented in the kennel. */
export function founderLinesRepresented(
  kennel: ReadonlyMap<string, CompanionDragon>,
): number {
  const nodes = pedigreeNodes(kennel);
  const founders = new Set<string>();
  for (const dragon of kennel.values()) {
    if (!dragon.parentIds) {
      founders.add(dragon.id);
      continue;
    }
    for (const ancestorId of ancestorIds(dragon.id, nodes)) {
      if (kennel.get(ancestorId)?.parentIds === null) founders.add(ancestorId);
    }
  }
  return founders.size;
}

export function kennelGenerations(kennel: ReadonlyMap<string, CompanionDragon>): number {
  return Math.max(0, ...[...kennel.values()].map((dragon) => dragon.generation));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
