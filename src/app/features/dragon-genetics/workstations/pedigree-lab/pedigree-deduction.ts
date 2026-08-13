import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import {
  BloodlineInvestigation,
  InheritanceModel,
  ModelAlleleSymbols,
  PedigreeAllelePair,
  PedigreeCarrierStatus,
  PedigreeDnaTestRecord,
  PedigreeDragon,
  PedigreeEvidenceSource,
  PedigreeGeneId,
  PedigreePopulation,
  modelAlleleSymbols,
  pedigreeGene,
  tracedAllele,
} from './pedigree-lab.models';

/**
 * Carrier deduction over the pedigree.
 *
 * The engine never reads the archive's genotypes. It reads *observed
 * phenotypes* where a record survives, plus whatever the student has sequenced,
 * and then narrows every dragon's possible genotypes by walking the parent and
 * child constraints to a fixpoint. That is the same reasoning a student does by
 * hand, which is the point: the console cannot know something the pedigree does
 * not support.
 *
 * Everything runs inside the student's chosen {@link InheritanceModel}. Records
 * the model cannot account for come back as contradictions rather than being
 * quietly ignored — choosing between models by looking at what each one fails to
 * explain is the scientific work this workstation exists for.
 */

/** Model-space alleles. `T` is the traced allele, `A` the alternative, `Y` the Y chromosome. */
type ModelAllele = 'T' | 'A' | 'Y';
/** A genotype in model space, alleles sorted so `A|T` and `T|A` are one key. */
export type ModelGenotype = string;

export interface PedigreeContradiction {
  dragonId: string;
  dragonName: string;
  reason: string;
}

export interface DeducedDragonState {
  dragonId: string;
  status: PedigreeCarrierStatus;
  evidence: PedigreeEvidenceSource;
  /** Still-possible genotypes, already written in the student's notation. */
  possibleGenotypes: readonly string[];
  /** The appearance the archive recorded, or null where the record is lost. */
  observedPhenotype: string | null;
  carriesTracedAllele: 'yes' | 'no' | 'unknown';
  /** True once a DNA test has been spent on this dragon. */
  sequenced: boolean;
}

export interface PedigreeDeduction {
  model: InheritanceModel;
  symbols: ModelAlleleSymbols;
  states: ReadonlyMap<string, DeducedDragonState>;
  contradictions: readonly PedigreeContradiction[];
  /** Recorded appearances this model has no genotype for. */
  unexplainedPhenotypes: readonly string[];
  affectedMales: number;
  affectedFemales: number;
}

export interface DeductionRequest {
  population: PedigreePopulation;
  investigation: BloodlineInvestigation;
  model: InheritanceModel;
  dnaTests: readonly PedigreeDnaTestRecord[];
}

const MAX_PASSES = 16;

export function deducePedigree(request: DeductionRequest): PedigreeDeduction {
  const { population, investigation, model } = request;
  const gene = pedigreeGene(investigation.geneId);
  const symbols = modelAlleleSymbols(investigation, model);
  const traced = tracedAllele(investigation);
  const byId = new Map(population.map((dragon) => [dragon.id, dragon]));
  const tests = new Map(
    request.dnaTests
      .filter((test) => test.geneId === investigation.geneId)
      .map((test) => [test.dragonId, test]),
  );

  const contradictions: PedigreeContradiction[] = [];
  const unexplained = new Set<string>();
  const exempt = new Set<string>();
  const possible = new Map<string, Set<ModelGenotype>>();
  const fromPhenotype = new Map<string, Set<ModelGenotype>>();

  let affectedMales = 0;
  let affectedFemales = 0;

  for (const dragon of population) {
    const universe = new Set(modelUniverse(model, dragon.sex));
    const observed = observedPhenotypeOf(dragon, investigation.geneId);
    let narrowed = universe;

    if (observed !== null) {
      const matching = new Set(
        [...universe].filter(
          (genotype) => modelPhenotype(model, genotype, investigation, gene) === observed,
        ),
      );
      if (matching.size === 0) {
        unexplained.add(observed);
      } else {
        narrowed = matching;
      }
      if (observed === investigation.lostPhenotype) {
        if (dragon.sex === 'male') affectedMales += 1;
        else affectedFemales += 1;
      }
    }

    fromPhenotype.set(dragon.id, new Set(narrowed));

    const test = tests.get(dragon.id);
    if (test) {
      const sequenced = toModelGenotype(test.alleles, traced);
      if (!universe.has(sequenced)) {
        contradictions.push({
          dragonId: dragon.id,
          dragonName: dragon.name,
          reason: sequencerConflict(model, test.alleles, dragon.sex),
        });
        exempt.add(dragon.id);
      } else if (!narrowed.has(sequenced)) {
        contradictions.push({
          dragonId: dragon.id,
          dragonName: dragon.name,
          reason: `The sequencer result does not produce the appearance the record describes for ${dragon.name}.`,
        });
        exempt.add(dragon.id);
        narrowed = new Set([sequenced]);
      } else {
        narrowed = new Set([sequenced]);
      }
    }

    possible.set(dragon.id, narrowed);
  }

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let changed = false;
    for (const dragon of population) {
      if (exempt.has(dragon.id)) continue;
      const current = possible.get(dragon.id);
      if (!current) continue;

      const fromParents = new Set(
        [...current].filter((genotype) => consistentWithParents(genotype, dragon, byId, possible, model)),
      );
      if (fromParents.size === 0) {
        contradictions.push({
          dragonId: dragon.id,
          dragonName: dragon.name,
          reason: parentConflictReason(dragon, byId, model),
        });
        exempt.add(dragon.id);
        possible.set(dragon.id, new Set(modelUniverse(model, dragon.sex)));
        changed = true;
        continue;
      }

      const blockingChild = firstUnreachableChild(fromParents, dragon, byId, possible, model);
      if (blockingChild) {
        contradictions.push({
          dragonId: dragon.id,
          dragonName: dragon.name,
          reason: `Under ${readableModel(model)}, no genotype left for ${dragon.name} can produce the ${blockingChild.name} the record describes.`,
        });
        exempt.add(dragon.id);
        possible.set(dragon.id, new Set(modelUniverse(model, dragon.sex)));
        changed = true;
        continue;
      }

      const next = new Set(
        [...fromParents].filter((genotype) =>
          consistentWithOffspring(genotype, dragon, byId, possible, model),
        ),
      );
      if (next.size !== current.size) {
        possible.set(dragon.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const states = new Map<string, DeducedDragonState>();
  for (const dragon of population) {
    const set = possible.get(dragon.id) ?? new Set(modelUniverse(model, dragon.sex));
    const universeSize = modelUniverse(model, dragon.sex).length;
    const phenotypeSet = fromPhenotype.get(dragon.id) ?? new Set<ModelGenotype>();
    const observed = observedPhenotypeOf(dragon, investigation.geneId);
    const sequenced = tests.has(dragon.id);
    const genotypes = [...set].sort();
    const carries = genotypes.every(hasTraced)
      ? 'yes'
      : genotypes.some(hasTraced)
        ? 'unknown'
        : 'no';
    const showsLost = genotypes.every(
      (genotype) => modelPhenotype(model, genotype, investigation, gene) === investigation.lostPhenotype,
    );

    const status: PedigreeCarrierStatus = exempt.has(dragon.id)
      ? 'contradiction'
      : showsLost
        ? 'shows-trait'
        : carries === 'yes'
          ? 'confirmed-carrier'
          : carries === 'no'
            ? 'eliminated'
            : genotypes.length < universeSize || observed !== null
              ? 'possible-carrier'
              : 'unrecorded';

    const evidence: PedigreeEvidenceSource = sequenced
      ? 'dna-test'
      : genotypes.length < phenotypeSet.size
        ? 'pedigree-deduction'
        : observed !== null
          ? 'phenotype-record'
          : 'no-evidence';

    states.set(dragon.id, {
      dragonId: dragon.id,
      status,
      evidence,
      possibleGenotypes: genotypes.map((genotype) => writeGenotype(genotype, symbols)),
      observedPhenotype: observed,
      carriesTracedAllele: carries,
      sequenced,
    });
  }

  return {
    model,
    symbols,
    states,
    contradictions,
    unexplainedPhenotypes: [...unexplained],
    affectedMales,
    affectedFemales,
  };
}

// ---------------------------------------------------------------------------
// Model space
// ---------------------------------------------------------------------------

export function modelUniverse(model: InheritanceModel, sex: DragonSex): readonly ModelGenotype[] {
  if (model === 'x-linked-recessive' && sex === 'male') return ['A|Y', 'T|Y'];
  return ['A|A', 'A|T', 'T|T'];
}

function key(first: ModelAllele, second: ModelAllele): ModelGenotype {
  return first <= second ? `${first}|${second}` : `${second}|${first}`;
}

function alleles(genotype: ModelGenotype): readonly ModelAllele[] {
  return genotype.split('|') as ModelAllele[];
}

function hasTraced(genotype: ModelGenotype): boolean {
  return genotype.includes('T');
}

/**
 * The appearance this genotype produces under the model.
 *
 * The heterozygote is the only interesting row: recessive models hide it,
 * dominant models show it, and incomplete dominance gives it a third appearance
 * of its own. That difference is what makes the three models distinguishable
 * from records alone.
 */
export function modelPhenotype(
  model: InheritanceModel,
  genotype: ModelGenotype,
  investigation: BloodlineInvestigation,
  gene = pedigreeGene(investigation.geneId),
): string {
  const common =
    investigation.lostPhenotype === gene.recessivePhenotype
      ? gene.dominantPhenotype
      : gene.recessivePhenotype;
  const parts = alleles(genotype);
  const tracedCount = parts.filter((allele) => allele === 'T').length;
  const hemizygous = parts.includes('Y');

  switch (model) {
    case 'autosomal-dominant':
      return tracedCount > 0 ? investigation.lostPhenotype : common;
    case 'incomplete-dominance':
      if (tracedCount === 2) return investigation.lostPhenotype;
      if (tracedCount === 1) return gene.heterozygousPhenotype ?? `Intermediate ${gene.name}`;
      return common;
    case 'x-linked-recessive':
      if (hemizygous) return tracedCount === 1 ? investigation.lostPhenotype : common;
      return tracedCount === 2 ? investigation.lostPhenotype : common;
    case 'autosomal-recessive':
      return tracedCount === 2 ? investigation.lostPhenotype : common;
  }
}

/** Which alleles a parent holding this genotype can transmit to a child of this sex. */
export function transmittableModelAlleles(
  model: InheritanceModel,
  genotype: ModelGenotype,
  side: 'mother' | 'father',
  childSex: DragonSex,
): readonly ModelAllele[] {
  const parts = alleles(genotype);
  if (model !== 'x-linked-recessive' || side === 'mother') {
    return parts.filter((allele) => allele !== 'Y');
  }
  return childSex === 'male' ? ['Y'] : parts.filter((allele) => allele !== 'Y');
}

function consistentWithParents(
  genotype: ModelGenotype,
  dragon: PedigreeDragon,
  byId: ReadonlyMap<string, PedigreeDragon>,
  possible: ReadonlyMap<string, ReadonlySet<ModelGenotype>>,
  model: InheritanceModel,
): boolean {
  const mother = dragon.motherId ? byId.get(dragon.motherId) : undefined;
  const father = dragon.fatherId ? byId.get(dragon.fatherId) : undefined;
  if (!mother || !father) return true;
  return childGenotypes(model, possible, mother, father, dragon.sex).has(genotype);
}

function consistentWithOffspring(
  genotype: ModelGenotype,
  dragon: PedigreeDragon,
  byId: ReadonlyMap<string, PedigreeDragon>,
  possible: ReadonlyMap<string, ReadonlySet<ModelGenotype>>,
  model: InheritanceModel,
): boolean {
  return !dragon.offspringIds.some(
    (childId) => !supportsChild(genotype, dragon, childId, byId, possible, model),
  );
}

/**
 * The offspring that no surviving genotype for this dragon can account for.
 *
 * Returned rather than a boolean because the contradiction message has to name
 * the record that actually conflicts — "no genotype left for Kaenor can produce
 * Ivrid" is evidence a student can check; "something is wrong here" is not.
 */
function firstUnreachableChild(
  genotypes: ReadonlySet<ModelGenotype>,
  dragon: PedigreeDragon,
  byId: ReadonlyMap<string, PedigreeDragon>,
  possible: ReadonlyMap<string, ReadonlySet<ModelGenotype>>,
  model: InheritanceModel,
): PedigreeDragon | null {
  for (const childId of dragon.offspringIds) {
    const child = byId.get(childId);
    if (!child) continue;
    const supported = [...genotypes].some((genotype) =>
      supportsChild(genotype, dragon, childId, byId, possible, model),
    );
    if (!supported) return child;
  }
  return null;
}

function supportsChild(
  genotype: ModelGenotype,
  dragon: PedigreeDragon,
  childId: string,
  byId: ReadonlyMap<string, PedigreeDragon>,
  possible: ReadonlyMap<string, ReadonlySet<ModelGenotype>>,
  model: InheritanceModel,
): boolean {
  const child = byId.get(childId);
  if (!child) return true;
  const isMother = child.motherId === dragon.id;
  const partnerId = isMother ? child.fatherId : child.motherId;
  const partner = partnerId ? byId.get(partnerId) : undefined;
  const partnerSet = partner
    ? (possible.get(partner.id) ?? new Set(modelUniverse(model, partner.sex)))
    : new Set(modelUniverse(model, isMother ? 'male' : 'female'));
  const childSet = possible.get(child.id) ?? new Set(modelUniverse(model, child.sex));

  const own = transmittableModelAlleles(model, genotype, isMother ? 'mother' : 'father', child.sex);
  const reachable = new Set<ModelGenotype>();
  for (const partnerGenotype of partnerSet) {
    const partnerAlleles = transmittableModelAlleles(
      model,
      partnerGenotype,
      isMother ? 'father' : 'mother',
      child.sex,
    );
    for (const mine of own) {
      for (const theirs of partnerAlleles) reachable.add(key(mine, theirs));
    }
  }
  return [...childSet].some((candidate) => reachable.has(candidate));
}

function childGenotypes(
  model: InheritanceModel,
  possible: ReadonlyMap<string, ReadonlySet<ModelGenotype>>,
  mother: PedigreeDragon,
  father: PedigreeDragon,
  childSex: DragonSex,
): Set<ModelGenotype> {
  const motherSet = possible.get(mother.id) ?? new Set(modelUniverse(model, mother.sex));
  const fatherSet = possible.get(father.id) ?? new Set(modelUniverse(model, father.sex));
  const reachable = new Set<ModelGenotype>();
  for (const motherGenotype of motherSet) {
    for (const fromMother of transmittableModelAlleles(model, motherGenotype, 'mother', childSex)) {
      for (const fatherGenotype of fatherSet) {
        for (const fromFather of transmittableModelAlleles(model, fatherGenotype, 'father', childSex)) {
          reachable.add(key(fromMother, fromFather));
        }
      }
    }
  }
  return reachable;
}

// ---------------------------------------------------------------------------
// Truth readers — the only two places the archive's own genotypes are touched
// ---------------------------------------------------------------------------

/** The appearance a dragon actually has, reported only where the record survives. */
export function observedPhenotypeOf(
  dragon: PedigreeDragon,
  geneId: PedigreeGeneId,
): string | null {
  if (!dragon.recordedGeneIds.includes(geneId)) return null;
  return truePhenotype(geneId, dragon.genome[geneId]);
}

export function truePhenotype(geneId: PedigreeGeneId, pair: PedigreeAllelePair): string {
  const gene = pedigreeGene(geneId);
  const carriesDominant = pair.includes(gene.dominantAllele);
  if (pair.includes('Y')) {
    return carriesDominant ? gene.dominantPhenotype : gene.recessivePhenotype;
  }
  if (
    gene.inheritance === 'incomplete-dominance' &&
    gene.heterozygousPhenotype &&
    pair[0] !== pair[1]
  ) {
    return gene.heterozygousPhenotype;
  }
  return carriesDominant ? gene.dominantPhenotype : gene.recessivePhenotype;
}

/** A sequenced pair restated in model space, so a DNA result can constrain the model. */
function toModelGenotype(pair: PedigreeAllelePair, traced: string): ModelGenotype {
  const [first, second] = pair.map((allele) =>
    allele === 'Y' ? 'Y' : allele === traced ? 'T' : 'A',
  ) as ModelAllele[];
  return key(first, second);
}

function sequencerConflict(
  model: InheritanceModel,
  pair: PedigreeAllelePair,
  sex: DragonSex,
): string {
  if (pair.includes('Y')) {
    return `The sequencer reports one allele and a Y chromosome at this locus. A ${
      model === 'x-linked-recessive' ? 'diploid' : 'numbered-chromosome'
    } model has no place to put the Y.`;
  }
  return `The sequencer reports two alleles at this locus, but an X-linked model expects a single copy in a ${
    sex === 'male' ? 'male' : 'hemizygous'
  } dragon.`;
}

function parentConflictReason(
  dragon: PedigreeDragon,
  byId: ReadonlyMap<string, PedigreeDragon>,
  model: InheritanceModel,
): string {
  const mother = dragon.motherId ? byId.get(dragon.motherId) : undefined;
  const father = dragon.fatherId ? byId.get(dragon.fatherId) : undefined;
  if (mother && father) {
    return `Under ${readableModel(model)}, ${mother.name} and ${father.name} cannot produce the ${dragon.name} the record describes.`;
  }
  return `Under ${readableModel(model)}, ${dragon.name}'s record cannot be reconciled with the rest of the register.`;
}

function readableModel(model: InheritanceModel): string {
  return model.replace(/-/g, ' ');
}

/**
 * Writes a model genotype in the student's own notation, for example `Ss` or `sY`.
 *
 * Upper case leads, because that is the convention students are reading in every
 * other workstation — and under a dominant hypothesis the traced allele is the
 * upper-case one, so the ordering has to follow the notation rather than the
 * internal token order.
 */
export function writeGenotype(genotype: ModelGenotype, symbols: ModelAlleleSymbols): string {
  const rank = (letter: string): number =>
    letter === 'Y' ? 2 : letter === letter.toUpperCase() ? 0 : 1;
  return alleles(genotype)
    .map((allele) => (allele === 'Y' ? 'Y' : allele === 'T' ? symbols.traced : symbols.alternate))
    .sort((left, right) => rank(left) - rank(right))
    .join('');
}
