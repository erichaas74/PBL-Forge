import {
  DragonScannerOptionKind,
  DragonScannerOptionStatusId,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../domain/dragon-visual.models';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import {
  GENOTYPE_SCANNER_TARGETS,
  GENOTYPE_SCANNER_THEME,
  GenotypeScannerTheme,
} from './genotype-scanner.theme';

export interface ScannerOptionView {
  id: string;
  kind: DragonScannerOptionKind;
  /** Drawn on the chromosome graphic for genotype options. */
  alleles: readonly [string, string] | null;
  label: string;
  /** `homozygous dominant`, `heterozygous`, … shown only when the mode allows hints. */
  zygosity: string;
  selected: boolean;
  enabled: boolean;
  status: DragonScannerOptionStatusId | null;
}

export interface ScannerEvidenceMarkView {
  id: string;
  label: string;
  anchorId: string | null;
  pinned: boolean;
  enabled: boolean;
}

export interface ScannerSampleView {
  id: string;
  label: string;
  caption: string;
  geneIndex: number;
  /** Populated only once the lesson reveals the scan. */
  allelePair: readonly [string, string] | null;
  genotypeLabel: string;
  phenotype: string;
}

export interface GenotypeScannerViewModel {
  sceneId: string;
  seed: string;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  sample: ScannerSampleView;
  comparison: ScannerSampleView | null;
  geneId: string;
  geneIndex: number;
  concealed: DragonScannerOptionKind;
  genotypeConcealed: boolean;
  phenotypeConcealed: boolean;
  phenotypeText: string;
  optionKind: DragonScannerOptionKind;
  options: readonly ScannerOptionView[];
  selectedCount: number;
  selectionEnabled: boolean;
  selectionLocked: boolean;
  scanEnabled: boolean;
  revealed: boolean;
  evidenceMarks: readonly ScannerEvidenceMarkView[];
  evidenceMarkId: string | null;
  showHints: boolean;
  summary: string;
  targets: typeof GENOTYPE_SCANNER_TARGETS;
}

const CONCEALED_TEXT = '— — —';

/**
 * Pure scene-to-display mapping.
 *
 * Two boundary rules are enforced here rather than in the template: the scanned allele pair and
 * the concealed readout stay out of the view model until the lesson sets `genotypeRevealed`, and
 * option verdicts are only ever the lesson-supplied `optionStatuses`.
 */
export function buildGenotypeScannerViewModel(
  scene: DragonVisualScene,
  copy: StationCopy = {},
  theme: GenotypeScannerTheme = GENOTYPE_SCANNER_THEME,
): GenotypeScannerViewModel | null {
  if (scene.instrument.kind !== 'genotype-scanner') return null;
  const instrument = scene.instrument;
  const sample = scene.samples.find(candidate => candidate.id === instrument.sampleId);
  if (!sample) return null;

  const revealed = instrument.genotypeRevealed;
  const concealed = instrument.concealed ?? 'genotype';
  const optionKind = instrument.optionKind ?? 'genotype';
  const showHints = instrument.showHints ?? false;
  const statuses = new Map(
    (instrument.optionStatuses ?? []).map(status => [status.optionId, status.status]),
  );
  const selectedIds = new Set(instrument.selectedOptionIds ?? []);
  const selectionLocked = instrument.selectionLocked ?? false;
  const geneCount = theme.chromosome.geneBands.length;

  const sampleView = toSampleView(scene, instrument.sampleId, copy, revealed, concealed, geneCount);
  if (!sampleView) return null;
  const comparison = instrument.comparisonSampleId
    ? toSampleView(scene, instrument.comparisonSampleId, copy, revealed, concealed, geneCount)
    : null;

  const options = (instrument.options ?? []).map((option): ScannerOptionView => ({
    id: option.id,
    kind: option.kind,
    alleles: option.alleles ?? null,
    label: option.kind === 'genotype'
      ? option.alleles?.join('') ?? option.id
      : resolveStationCopy(copy, option.labelId),
    zygosity: showHints && option.alleles ? zygosityLabel(option.alleles) : '',
    selected: selectedIds.has(option.id),
    enabled: scene.phase === 'predict' && !selectionLocked
      && !scene.selection.disabledIds.includes(option.id),
    status: statuses.get(option.id) ?? null,
  }));

  const evidenceMarks = (instrument.evidenceMarks ?? []).map((mark): ScannerEvidenceMarkView => ({
    id: mark.id,
    label: resolveStationCopy(copy, mark.labelId),
    anchorId: mark.anchorId ?? null,
    pinned: instrument.evidenceMarkId === mark.id,
    enabled: scene.phase === 'explain',
  }));

  const phenotypeConcealed = concealed === 'phenotype' && !revealed;
  const genotypeConcealed = concealed === 'genotype' && !revealed;

  return {
    sceneId: scene.sceneId,
    seed: scene.seed,
    mode: scene.mode,
    phase: scene.phase,
    sample: sampleView,
    comparison,
    geneId: instrument.focusGeneId,
    geneIndex: sampleView.geneIndex,
    concealed,
    genotypeConcealed,
    phenotypeConcealed,
    phenotypeText: phenotypeConcealed ? CONCEALED_TEXT : sampleView.phenotype,
    optionKind,
    options,
    selectedCount: options.filter(option => option.selected).length,
    selectionEnabled: scene.phase === 'predict' && !selectionLocked,
    selectionLocked,
    scanEnabled: scene.phase === 'manipulate' && !revealed,
    revealed,
    evidenceMarks,
    evidenceMarkId: instrument.evidenceMarkId ?? null,
    showHints,
    summary: buildSummary({
      sample: sampleView,
      phenotypeConcealed,
      genotypeConcealed,
      options,
      phase: scene.phase,
      comparison,
    }),
    targets: GENOTYPE_SCANNER_TARGETS,
  };
}

function toSampleView(
  scene: DragonVisualScene,
  sampleId: string,
  copy: StationCopy,
  revealed: boolean,
  concealed: DragonScannerOptionKind,
  geneCount: number,
): ScannerSampleView | null {
  if (scene.instrument.kind !== 'genotype-scanner') return null;
  const sample = scene.samples.find(candidate => candidate.id === sampleId);
  if (!sample) return null;
  const focusGeneId = scene.instrument.focusGeneId;
  const gene = sample.genes.find(candidate =>
    candidate.geneId === focusGeneId || candidate.traitId === focusGeneId) ?? sample.genes[0];
  const allelePair = gene
    ? [gene.allelePair[0].symbol, gene.allelePair[1].symbol] as const
    : null;
  const geneIndex = gene?.chromosomeModel ? (gene.chromosomeModel - 1) % geneCount : 0;
  const genotypeVisible = revealed || concealed !== 'genotype';

  return {
    id: sample.id,
    label: sample.label,
    caption: resolveStationCopy(copy, `sample.${sample.id}.caption`),
    geneIndex,
    allelePair: genotypeVisible && allelePair ? [allelePair[0], allelePair[1]] : null,
    genotypeLabel: genotypeVisible && allelePair ? allelePair.join('') : CONCEALED_TEXT,
    phenotype: gene?.phenotypeId ?? '',
  };
}

function zygosityLabel(alleles: readonly [string, string]): string {
  if (alleles[0] !== alleles[1]) return 'heterozygous';
  return alleles[0] === alleles[0].toUpperCase()
    ? 'homozygous dominant'
    : 'homozygous recessive';
}

function buildSummary(input: {
  sample: ScannerSampleView;
  phenotypeConcealed: boolean;
  genotypeConcealed: boolean;
  options: readonly ScannerOptionView[];
  phase: DragonVisualPhase;
  comparison: ScannerSampleView | null;
}): string {
  const parts = [`Sample ${input.sample.label}.`];
  parts.push(input.phenotypeConcealed
    ? 'Phenotype readout is shielded.'
    : `Phenotype readout: ${input.sample.phenotype}.`);
  parts.push(input.genotypeConcealed
    ? 'Allele pair is shielded.'
    : `Scanned allele pair: ${input.sample.genotypeLabel}.`);
  const selected = input.options.filter(option => option.selected).map(option => option.label);
  parts.push(selected.length
    ? `Selected: ${selected.join(', ')}.`
    : 'No records selected yet.');
  if (input.comparison) {
    parts.push(`Comparison sample ${input.comparison.label} shows ${input.comparison.phenotype} with genotype ${input.comparison.genotypeLabel}.`);
  }
  parts.push(`Current step: ${input.phase}.`);
  return parts.join(' ');
}
