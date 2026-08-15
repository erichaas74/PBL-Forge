import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import { LOCAL_WORKSTATION_STUDENT_ID } from './dragon-workstation-context.models';

export interface AlleleExperimentRecord {
  id: string;
  geneId: string;
  pairKey: string;
  alleleIds: [string, string];
  genotype: string;
  phenotype: string;
  testedAtIso: string;
}

export interface AlleleGeneDiscovery {
  geneId: string;
  traitId: string;
  dominantAlleleId: string;
  recessiveAlleleId: string;
  solvedAtIso: string;
}

export interface GeneticsNotebookSnapshot {
  schemaVersion: 1;
  studentId: string;
  assignmentId: string;
  experiments: AlleleExperimentRecord[];
  discoveries: Record<string, AlleleGeneDiscovery>;
  updatedAtIso: string;
}

export type DiscoveryClaimStatus = 'solved' | 'incorrect' | 'incomplete-evidence';

export interface DiscoveryClaimResult {
  status: DiscoveryClaimStatus;
  notebook: GeneticsNotebookSnapshot;
}

export function createEmptyGeneticsNotebook(
  studentId = LOCAL_WORKSTATION_STUDENT_ID,
  assignmentId = 'default',
): GeneticsNotebookSnapshot {
  return {
    schemaVersion: 1,
    studentId,
    assignmentId,
    experiments: [],
    discoveries: {},
    updatedAtIso: new Date(0).toISOString(),
  };
}

export function allelePairKey(pairIds: readonly [string, string]): string {
  return [...pairIds].sort().join('|');
}

export function requiredExperimentKeys(gene: AlleleVaultGene): string[] {
  const [first, second] = gene.alleleIds;
  return [
    allelePairKey([first, first]),
    allelePairKey([first, second]),
    allelePairKey([second, second]),
  ];
}

export function experimentsForGene(
  notebook: GeneticsNotebookSnapshot,
  geneId: string,
): AlleleExperimentRecord[] {
  return notebook.experiments.filter((experiment) => experiment.geneId === geneId);
}

export function completedExperimentCount(
  notebook: GeneticsNotebookSnapshot,
  gene: AlleleVaultGene,
): number {
  const testedKeys = new Set(experimentsForGene(notebook, gene.id).map((item) => item.pairKey));
  return requiredExperimentKeys(gene).filter((key) => testedKeys.has(key)).length;
}

export function recordAlleleExperiment(
  notebook: GeneticsNotebookSnapshot,
  gene: AlleleVaultGene,
  alleles: readonly AlleleVaultAllele[],
  pairIds: readonly [string, string],
  phenotype: string,
  now = new Date(),
): GeneticsNotebookSnapshot {
  const pair = pairIds.map((id) => alleles.find((allele) => allele.id === id));
  if (pair.some((allele) => !allele || allele.geneId !== gene.id)) return notebook;

  const pairKey = allelePairKey(pairIds);
  const experiment: AlleleExperimentRecord = {
    id: `${gene.id}:${pairKey}`,
    geneId: gene.id,
    pairKey,
    alleleIds: [pairIds[0], pairIds[1]],
    genotype: pair.map((allele) => allele?.sampleCode ?? '').join(' × '),
    phenotype,
    testedAtIso: now.toISOString(),
  };
  const experiments = [
    ...notebook.experiments.filter((item) => item.id !== experiment.id),
    experiment,
  ];
  return {
    ...notebook,
    experiments,
    updatedAtIso: experiment.testedAtIso,
  };
}

export function evaluateDiscoveryClaim(
  notebook: GeneticsNotebookSnapshot,
  gene: AlleleVaultGene,
  alleles: readonly AlleleVaultAllele[],
  traitId: string,
  dominantAlleleId: string,
  recessiveAlleleId: string,
  now = new Date(),
): DiscoveryClaimResult {
  if (completedExperimentCount(notebook, gene) < requiredExperimentKeys(gene).length) {
    return { status: 'incomplete-evidence', notebook };
  }

  const dominant = alleles.find(
    (allele) => allele.geneId === gene.id && allele.dominance === 'dominant',
  );
  const recessive = alleles.find(
    (allele) => allele.geneId === gene.id && allele.dominance === 'recessive',
  );
  if (
    traitId !== gene.id ||
    dominantAlleleId !== dominant?.id ||
    recessiveAlleleId !== recessive?.id
  ) {
    return { status: 'incorrect', notebook };
  }

  const solvedAtIso = now.toISOString();
  return {
    status: 'solved',
    notebook: {
      ...notebook,
      discoveries: {
        ...notebook.discoveries,
        [gene.id]: {
          geneId: gene.id,
          traitId,
          dominantAlleleId,
          recessiveAlleleId,
          solvedAtIso,
        },
      },
      updatedAtIso: solvedAtIso,
    },
  };
}

export function mergeGeneticsNotebooks(
  local: GeneticsNotebookSnapshot,
  remote: GeneticsNotebookSnapshot | null,
): GeneticsNotebookSnapshot {
  if (!remote) return local;
  const experiments = new Map<string, AlleleExperimentRecord>();
  for (const experiment of [...local.experiments, ...remote.experiments]) {
    const current = experiments.get(experiment.id);
    if (!current || experiment.testedAtIso > current.testedAtIso) {
      experiments.set(experiment.id, experiment);
    }
  }
  const discoveries = { ...local.discoveries };
  for (const [geneId, discovery] of Object.entries(remote.discoveries)) {
    if (!discoveries[geneId] || discovery.solvedAtIso > discoveries[geneId].solvedAtIso) {
      discoveries[geneId] = discovery;
    }
  }
  return {
    ...local,
    assignmentId: remote.assignmentId || local.assignmentId,
    experiments: [...experiments.values()],
    discoveries,
    updatedAtIso:
      local.updatedAtIso >= remote.updatedAtIso ? local.updatedAtIso : remote.updatedAtIso,
  };
}

export function normalizeGeneticsNotebook(
  value: unknown,
  studentId: string,
): GeneticsNotebookSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<GeneticsNotebookSnapshot>;
  if (candidate.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    studentId,
    assignmentId: typeof candidate.assignmentId === 'string' ? candidate.assignmentId : 'default',
    experiments: Array.isArray(candidate.experiments)
      ? candidate.experiments.filter(isCurrentExperimentRecord)
      : [],
    discoveries:
      candidate.discoveries && typeof candidate.discoveries === 'object'
        ? Object.fromEntries(
            Object.entries(candidate.discoveries).filter(
              (entry): entry is [string, AlleleGeneDiscovery] =>
                isCurrentGeneDiscovery(entry[0], entry[1]),
            ),
          )
        : {},
    updatedAtIso:
      typeof candidate.updatedAtIso === 'string'
        ? candidate.updatedAtIso
        : new Date(0).toISOString(),
  };
}

function isExperimentRecord(value: unknown): value is AlleleExperimentRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AlleleExperimentRecord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.geneId === 'string' &&
    typeof candidate.pairKey === 'string' &&
    Array.isArray(candidate.alleleIds) &&
    candidate.alleleIds.length === 2 &&
    candidate.alleleIds.every((id) => typeof id === 'string') &&
    typeof candidate.genotype === 'string' &&
    typeof candidate.phenotype === 'string' &&
    typeof candidate.testedAtIso === 'string'
  );
}

function isCurrentExperimentRecord(value: unknown): value is AlleleExperimentRecord {
  if (!isExperimentRecord(value)) return false;
  const gene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === value.geneId);
  return !!gene && value.alleleIds.every((alleleId) => gene.alleleIds.includes(alleleId));
}

function isGeneDiscovery(value: unknown): value is AlleleGeneDiscovery {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AlleleGeneDiscovery>;
  return (
    typeof candidate.geneId === 'string' &&
    typeof candidate.traitId === 'string' &&
    typeof candidate.dominantAlleleId === 'string' &&
    typeof candidate.recessiveAlleleId === 'string' &&
    typeof candidate.solvedAtIso === 'string'
  );
}

function isCurrentGeneDiscovery(geneId: string, value: unknown): value is AlleleGeneDiscovery {
  if (!isGeneDiscovery(value) || value.geneId !== geneId || value.traitId !== geneId) return false;
  const gene = ALLELE_VAULT_GENES.find((candidate) => candidate.id === geneId);
  if (!gene) return false;
  const dominant = ALLELE_VAULT_ALLELES.find(
    (allele) => allele.geneId === gene.id && allele.dominance === 'dominant',
  );
  const recessive = ALLELE_VAULT_ALLELES.find(
    (allele) => allele.geneId === gene.id && allele.dominance === 'recessive',
  );
  return value.dominantAlleleId === dominant?.id && value.recessiveAlleleId === recessive?.id;
}
