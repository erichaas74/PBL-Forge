import {
  InstrumentManifest,
  isProbeId,
  ProbeId,
} from '../workstations/shared/instrument-manifest.models';
import { TRAIT_EVIDENCE_MANIFEST } from '../workstations/trait-evidence/trait-evidence.manifest';
import { GENOME_MICROSCOPE_MANIFEST } from '../workstations/genome-microscope/genome-microscope.manifest';
import { MICROSCOPE_LEVEL_MANIFESTS } from '../workstations/genome-microscope/microscope-level-workstations';
import { ALLELE_WORKBENCH_MANIFEST } from '../workstations/allele-workbench/allele-workbench.manifest';
import { PUNNETT_COMPOSER_MANIFEST } from '../workstations/punnett-composer/punnett-composer.manifest';
import { INCUBATOR_SAMPLER_MANIFEST } from '../workstations/incubator-sampler/incubator-sampler.manifest';
import { DNA_PROCESS_LAB_MANIFEST } from '../workstations/dna-process-lab/dna-process-lab.manifest';
import { DRAGON_HATCHERY_MANIFEST } from '../workstations/dragon-hatchery/dragon-hatchery.manifest';
import { ISLAND_DIVERSITY_MANIFEST } from '../workstations/island-diversity/island-diversity.manifest';
import { ISLAND_EXPEDITION_MANIFEST } from '../workstations/island-expedition/island-expedition.manifest';
import { VIKING_BREEDING_MANIFEST } from '../workstations/viking-breeding/viking-breeding.manifest';
import { PEDIGREE_LAB_MANIFEST } from '../workstations/pedigree-lab/pedigree-lab.manifest';
import { BLOOD_COMPATIBILITY_MANIFEST } from '../workstations/blood-compatibility/blood-compatibility.manifest';
import { PROTEIN_RESCUE_MANIFEST } from '../workstations/protein-rescue/protein-rescue.manifest';
import { CANDLING_WORKSTATION_MANIFEST } from '../workstations/candling-workstation/candling-workstation.manifest';
import { COMPANION_SHOW_MANIFEST } from '../workstations/companion-show/companion-show.manifest';
import { MINI_DRAGON_TRAINING_MANIFEST } from '../workstations/mini-dragon-training/mini-dragon-training.manifest';
import { MINI_DRAGON_ARENA_MANIFEST } from '../workstations/mini-dragon-arena/mini-dragon-arena.manifest';
import { MINI_DRAGON_PEDIGREE_MANIFEST } from '../workstations/mini-dragon-pedigree/mini-dragon-pedigree.manifest';

/**
 * Every addressable instrument, aggregated from the manifests each workstation owns.
 *
 * The Dragon Arena is declared here rather than in `workstations/` because it is a routed
 * experience, not a workstation, and has no workstation folder to own a manifest file.
 */
const DRAGON_ARENA_MANIFEST: InstrumentManifest = {
  id: 'dragon-arena',
  title: 'Dragon Arena',
  route: '/dragon-genetics/dragon-arena',
  sessionModes: ['investigation'],
  probes: [
    { id: 'trial.outcome', yields: 'measurement', anchorId: 'trial-readout' },
    { id: 'selection.rationale', yields: 'record', anchorId: 'champion-card' },
    { id: 'genotype.to.phenotype', yields: 'comparison', anchorId: 'contender-panel' },
  ],
  emits: ['arena.trials'],
};

export const INSTRUMENT_MANIFESTS: readonly InstrumentManifest[] = [
  TRAIT_EVIDENCE_MANIFEST,
  GENOME_MICROSCOPE_MANIFEST,
  ...MICROSCOPE_LEVEL_MANIFESTS,
  ALLELE_WORKBENCH_MANIFEST,
  PUNNETT_COMPOSER_MANIFEST,
  INCUBATOR_SAMPLER_MANIFEST,
  DNA_PROCESS_LAB_MANIFEST,
  DRAGON_HATCHERY_MANIFEST,
  ISLAND_DIVERSITY_MANIFEST,
  ISLAND_EXPEDITION_MANIFEST,
  VIKING_BREEDING_MANIFEST,
  PEDIGREE_LAB_MANIFEST,
  BLOOD_COMPATIBILITY_MANIFEST,
  PROTEIN_RESCUE_MANIFEST,
  CANDLING_WORKSTATION_MANIFEST,
  COMPANION_SHOW_MANIFEST,
  MINI_DRAGON_TRAINING_MANIFEST,
  MINI_DRAGON_ARENA_MANIFEST,
  MINI_DRAGON_PEDIGREE_MANIFEST,
  DRAGON_ARENA_MANIFEST,
];

/**
 * Adaptive simulation ids that do not match their instrument id. `diversity-manager` is the
 * registry-driven name for the Island Diversity workstation.
 */
const SIMULATION_ID_ALIASES: Readonly<Record<string, string>> = {
  'diversity-manager': 'island-diversity',
};

const BY_ID = new Map(INSTRUMENT_MANIFESTS.map((manifest) => [manifest.id, manifest]));

export function instrumentManifest(id: string | null | undefined): InstrumentManifest | null {
  if (!id) return null;
  return BY_ID.get(SIMULATION_ID_ALIASES[id] ?? id) ?? null;
}

export function instrumentProbes(id: string | null | undefined): readonly ProbeId[] {
  return instrumentManifest(id)?.probes.map((probe) => probe.id) ?? [];
}

export function instrumentAnchor(id: string, probeId: ProbeId): string | null {
  return instrumentManifest(id)?.probes.find((probe) => probe.id === probeId)?.anchorId ?? null;
}

/** Instruments that may render inquiry UI inside the instrument itself. */
export function supportsGuidedMode(id: string | null | undefined): boolean {
  return instrumentManifest(id)?.sessionModes.includes('guided') ?? false;
}

/** Every instrument that can host an item requiring this probe. */
export function instrumentsWithProbe(probeId: ProbeId): readonly InstrumentManifest[] {
  return INSTRUMENT_MANIFESTS.filter((manifest) =>
    manifest.probes.some((probe) => probe.id === probeId),
  );
}

export function assertValidInstrumentRegistry(): void {
  const seen = new Set<string>();
  for (const manifest of INSTRUMENT_MANIFESTS) {
    if (seen.has(manifest.id)) throw new Error(`Duplicate instrument manifest ${manifest.id}.`);
    seen.add(manifest.id);
    if (!manifest.sessionModes.length) {
      throw new Error(`Instrument ${manifest.id} declares no session mode.`);
    }
    if (!manifest.probes.length) throw new Error(`Instrument ${manifest.id} declares no probe.`);
    const probeIds = new Set<string>();
    for (const probe of manifest.probes) {
      if (!isProbeId(probe.id)) {
        throw new Error(`Instrument ${manifest.id} declares unknown probe ${probe.id}.`);
      }
      if (probeIds.has(probe.id)) {
        throw new Error(`Instrument ${manifest.id} declares probe ${probe.id} twice.`);
      }
      probeIds.add(probe.id);
    }
  }
  for (const [alias, target] of Object.entries(SIMULATION_ID_ALIASES)) {
    if (!BY_ID.has(target)) {
      throw new Error(`Instrument alias ${alias} points at unknown instrument ${target}.`);
    }
  }
}

assertValidInstrumentRegistry();
