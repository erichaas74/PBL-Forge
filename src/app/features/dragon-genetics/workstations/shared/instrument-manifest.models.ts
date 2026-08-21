/**
 * What a workstation declares about itself.
 *
 * A manifest is a *capability declaration*, not content. It says which addressable parts of the
 * real instrument a student can operate, so that authored inquiry items can bind to a capability
 * instead of to a workstation id. It holds no prompts, no answers, and no lesson text.
 *
 * This file lives in the workstation layer on purpose: each workstation owns the vocabulary of its
 * own configuration. `inquiry/` reads these; nothing here may import from `inquiry/` or `journey/`.
 */

/**
 * The shared probe vocabulary. A probe id means the same thing in every instrument that declares
 * it, which is what lets one authored item run in several labs.
 *
 * Renaming an entry breaks authored content, so `instrument-manifest.spec.ts` asserts that every
 * probe referenced by the inquiry bank is still declared by at least one instrument.
 */
export const PROBE_IDS = [
  // GEN-1 — inherited versus acquired
  'trait.observe',
  'trait.evidence-source',
  'trait.inherited-vs-acquired',
  // GEN-2 — genome organization
  'genome.hierarchy',
  'chromosome.pair',
  'gene.locus',
  'chromatin.packing',
  // GEN-3 — alleles and phenotype
  'allele.pair',
  'allele.compare',
  'genotype.to.phenotype',
  // GEN-4 — inheritance patterns
  'meiosis.stage',
  'gamete.ploidy',
  'gamete.select',
  'cross.predict',
  'offspring.ratio',
  'offspring.sample',
  // GEN-5 — pedigree evidence
  'pedigree.trace',
  'pedigree.carrier',
  'pedigree.sequence',
  // GEN-6 — DNA and proteins
  'dna.sequence',
  'dna.replicate',
  'dna.transcribe',
  'rna.translate',
  'dna.mutate',
  'dna.repair',
  'protein.product',
  'protein.shape',
  'enzyme.substrate',
  'gene.to.trait',
  // GEN-7 — multiple alleles
  'multiple.alleles',
  'antiserum.test',
  'donor.compatibility',
  // GEN-8 — population diversity
  'population.scan',
  'population.metric',
  'population.intervene',
  'selection.rationale',
  'trial.outcome',
] as const;

export type ProbeId = (typeof PROBE_IDS)[number];

/** What operating a probe produces, which is what an item can be written against. */
export type ProbeYield = 'selection' | 'comparison' | 'measurement' | 'record';

export interface InstrumentProbe {
  id: ProbeId;
  yields: ProbeYield;
  /**
   * A real element inside the real instrument. Guided hosts anchor an option to it, and hints name
   * an actual place a student can look instead of a symbol on a generic diagram.
   */
  anchorId?: string;
}

/**
 * `investigation` is the dedicated open workstation: inquiry is resolved for it but renders
 * entirely outside the instrument, so no prompt, option, or correctness state ever reaches the lab.
 * `guided` is a module host that has explicitly opted in and may render items anchored into the
 * instrument. A workstation that does not list `guided` can never be sent inquiry UI.
 */
export type WorkstationSessionMode = 'investigation' | 'guided';

export interface InstrumentManifest {
  id: string;
  title: string;
  route: string;
  sessionModes: readonly WorkstationSessionMode[];
  probes: readonly InstrumentProbe[];
  /** Record types this instrument persists, for probe-item predicates to read later. */
  emits: readonly string[];
}

export function instrumentProbeIds(manifest: InstrumentManifest): readonly ProbeId[] {
  return manifest.probes.map((probe) => probe.id);
}

export function probeAnchor(manifest: InstrumentManifest, probeId: ProbeId): string | null {
  return manifest.probes.find((probe) => probe.id === probeId)?.anchorId ?? null;
}

export function isProbeId(value: string): value is ProbeId {
  return (PROBE_IDS as readonly string[]).includes(value);
}
