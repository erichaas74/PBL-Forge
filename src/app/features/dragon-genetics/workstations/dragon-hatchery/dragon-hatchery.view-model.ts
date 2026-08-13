import {
  DragonAnalysisSample,
  DragonEggRecord,
  DragonEggStatusId,
  DragonHatcheryInstrument,
  DragonHatcheryToolId,
  DragonVisualMetric,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
} from '../../../../shared/dragon-visuals/domain/dragon-visual.models';
import {
  StationCopy,
  resolveStationCopy,
} from '../../../../shared/dragon-visuals/displays/shared/station-copy';
import {
  DRAGON_HATCHERY_TARGETS,
  DRAGON_HATCHERY_THEME,
  DragonHatcheryTheme,
} from './dragon-hatchery.theme';

/** One trait row on an egg record. Wording stays empty until the lesson reveals it. */
export interface HatcheryTraitReadout {
  traitId: string;
  geneId: string;
  name: string;
  /** Empty until the egg is examined or hatched. */
  phenotype: string;
  /** `null` until the egg is sampled. */
  genotype: string | null;
  allelePair: readonly [string, string] | null;
  geneIndex: number;
  focus: boolean;
}

export interface HatcheryEggView {
  id: string;
  sampleId: string;
  label: string;
  caption: string;
  position: number;
  status: DragonEggStatusId;
  statusLabel: string;
  examined: boolean;
  sampled: boolean;
  hatched: boolean;
  locked: boolean;
  staged: boolean;
  active: boolean;
  canExamine: boolean;
  canSample: boolean;
  canStage: boolean;
  /** Empty until the phenotype is legible; nothing here leaks a concealed readout. */
  traits: readonly HatcheryTraitReadout[];
  focusTrait: HatcheryTraitReadout | null;
  phenotypeSummary: string;
  genotypeLabel: string | null;
  shellSeed: number;
}

export interface HatcheryToolView {
  id: DragonHatcheryToolId;
  label: string;
  hint: string;
  /** `null` is an unlimited budget. */
  remaining: number | null;
  active: boolean;
  enabled: boolean;
}

export interface HatcheryEvidenceMarkView {
  id: string;
  label: string;
  anchorId: string | null;
  pinned: boolean;
  enabled: boolean;
}

export interface HatcheryParentView {
  id: string;
  label: string;
}

export interface HatcheryCounts {
  total: number;
  examined: number;
  sampled: number;
  hatched: number;
  staged: number;
  available: number;
}

export interface DragonHatcheryViewModel {
  sceneId: string;
  seed: string;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  clutchId: string;
  clutchLabel: string;
  parents: readonly HatcheryParentView[];
  focusGeneId: string | null;
  focusTraitName: string;
  eggs: readonly HatcheryEggView[];
  activeEgg: HatcheryEggView | null;
  stagedEggs: readonly HatcheryEggView[];
  hatchedEggs: readonly HatcheryEggView[];
  tools: readonly HatcheryToolView[];
  counts: HatcheryCounts;
  hatchLimit: number | null;
  hatchSlotsLeft: number | null;
  hatchCommitted: boolean;
  hatchEnabled: boolean;
  toolsEnabled: boolean;
  stagingEnabled: boolean;
  metrics: readonly DragonVisualMetric[];
  evidenceMarks: readonly HatcheryEvidenceMarkView[];
  evidenceMarkId: string | null;
  showHints: boolean;
  summary: string;
  targets: typeof DRAGON_HATCHERY_TARGETS;
}

const ALL_TOOLS: readonly DragonHatcheryToolId[] = ['examine', 'sample', 'hatch'];

const TOOL_TEXT: Readonly<Record<DragonHatcheryToolId, { label: string; hint: string }>> = {
  examine: {
    label: 'Examine',
    hint: 'Candle the shell to read the traits this egg will show.',
  },
  sample: {
    label: 'Sample DNA',
    hint: 'Draw a sample to read the allele pair behind those traits.',
  },
  hatch: {
    label: 'Hatch',
    hint: 'Stage the eggs you choose, then hatch them together.',
  },
};

/**
 * Pure scene-to-display mapping.
 *
 * Two boundary rules are enforced here rather than in the template: an unexamined egg carries
 * no phenotype wording, and an unsampled egg carries no allele pair — so a concealed record
 * cannot leak through the DOM. Hatching reveals what a hatchling shows, never its genotype.
 */
export function buildDragonHatcheryViewModel(
  scene: DragonVisualScene,
  copy: StationCopy = {},
  theme: DragonHatcheryTheme = DRAGON_HATCHERY_THEME,
): DragonHatcheryViewModel | null {
  if (scene.instrument.kind !== 'dragon-hatchery') return null;
  const instrument = scene.instrument;

  const availableTools = instrument.availableToolIds ?? ALL_TOOLS;
  const staged = new Set(instrument.selectedEggIds ?? []);
  const hatchLimit = instrument.hatchLimit ?? null;
  const hatchCommitted = instrument.hatchCommitted ?? false;
  const toolsEnabled = scene.phase === 'manipulate';
  const stagingEnabled =
    !hatchCommitted &&
    availableTools.includes('hatch') &&
    (scene.phase === 'manipulate' || scene.phase === 'reveal');
  const geneCount = theme.chromosome.geneBands.length;

  const eggs = instrument.eggs.map((egg): HatcheryEggView =>
    toEggView({
      egg,
      scene,
      instrument,
      copy,
      geneCount,
      availableTools,
      staged: staged.has(egg.eggId),
      toolsEnabled,
      stagingEnabled,
      hatchLimit,
      stagedCount: staged.size,
    }),
  );

  const counts: HatcheryCounts = {
    total: eggs.length,
    examined: eggs.filter((egg) => egg.examined).length,
    sampled: eggs.filter((egg) => egg.sampled).length,
    hatched: eggs.filter((egg) => egg.hatched).length,
    staged: eggs.filter((egg) => egg.staged).length,
    available: eggs.filter((egg) => !egg.hatched && !egg.locked).length,
  };

  const stagedEggs = eggs.filter((egg) => egg.staged);
  // The hatch "budget" is the tray space still free, not the limit itself.
  const hatchSlotsLeft = hatchLimit === null ? null : Math.max(0, hatchLimit - counts.staged);
  const tools = availableTools.map((toolId): HatcheryToolView => ({
    id: toolId,
    label: TOOL_TEXT[toolId].label,
    hint: TOOL_TEXT[toolId].hint,
    remaining: toolId === 'hatch' ? hatchSlotsLeft : toolBudget(instrument, toolId),
    active: instrument.activeToolId === toolId,
    enabled: toolId === 'hatch' ? stagingEnabled : toolsEnabled,
  }));

  const evidenceMarks = (instrument.evidenceMarks ?? []).map((mark): HatcheryEvidenceMarkView => ({
    id: mark.id,
    label: resolveStationCopy(copy, mark.labelId),
    anchorId: mark.anchorId ?? null,
    pinned: instrument.evidenceMarkId === mark.id,
    enabled: scene.phase === 'explain',
  }));

  const focusGeneId = instrument.focusGeneId ?? null;
  return {
    sceneId: scene.sceneId,
    seed: scene.seed,
    mode: scene.mode,
    phase: scene.phase,
    clutchId: instrument.clutchId,
    clutchLabel: resolveStationCopy(copy, `clutch.${instrument.clutchId}.label`),
    parents: (instrument.parentSampleIds ?? []).map((id) => ({
      id,
      label: scene.samples.find((sample) => sample.id === id)?.label ?? id,
    })),
    focusGeneId,
    focusTraitName: focusGeneId ? focusTraitName(scene, focusGeneId, copy) : '',
    eggs,
    activeEgg: eggs.find((egg) => egg.active) ?? null,
    stagedEggs,
    hatchedEggs: eggs.filter((egg) => egg.hatched),
    tools,
    counts,
    hatchLimit,
    hatchSlotsLeft,
    hatchCommitted,
    hatchEnabled:
      scene.phase === 'reveal' &&
      !hatchCommitted &&
      availableTools.includes('hatch') &&
      stagedEggs.length > 0,
    toolsEnabled,
    stagingEnabled,
    metrics: scene.metrics,
    evidenceMarks,
    evidenceMarkId: instrument.evidenceMarkId ?? null,
    showHints: instrument.showHints ?? false,
    summary: buildSummary({ counts, eggs, phase: scene.phase, hatchLimit, hatchCommitted }),
    targets: DRAGON_HATCHERY_TARGETS,
  };
}

interface EggViewInput {
  egg: DragonEggRecord;
  scene: DragonVisualScene;
  instrument: DragonHatcheryInstrument;
  copy: StationCopy;
  geneCount: number;
  availableTools: readonly DragonHatcheryToolId[];
  staged: boolean;
  toolsEnabled: boolean;
  stagingEnabled: boolean;
  hatchLimit: number | null;
  stagedCount: number;
}

function toEggView(input: EggViewInput): HatcheryEggView {
  const { egg, instrument, copy } = input;
  const sample = input.scene.samples.find((candidate) => candidate.id === egg.sampleId);
  const locked = egg.locked ?? false;
  // Hatching shows what a hatchling looks like. It never reports the alleles behind it.
  const phenotypeVisible = egg.examined || egg.hatched;
  const traits =
    phenotypeVisible && sample
      ? toTraitReadouts(sample, instrument.focusGeneId, egg.sampled, input.geneCount, copy)
      : [];
  const focusTrait = traits.find((trait) => trait.focus) ?? traits[0] ?? null;
  const budgetLeft = (toolId: DragonHatcheryToolId) => toolBudget(instrument, toolId) !== 0;

  return {
    id: egg.eggId,
    sampleId: egg.sampleId,
    label: sample?.label ?? egg.eggId,
    caption: resolveStationCopy(copy, `sample.${egg.sampleId}.caption`),
    position: egg.position,
    status: eggStatus(egg),
    statusLabel: eggStatusLabel(egg),
    examined: egg.examined,
    sampled: egg.sampled,
    hatched: egg.hatched,
    locked,
    staged: input.staged,
    active: instrument.activeEggId === egg.eggId,
    canExamine:
      input.toolsEnabled &&
      input.availableTools.includes('examine') &&
      !egg.examined &&
      !egg.hatched &&
      !locked &&
      budgetLeft('examine'),
    canSample:
      input.toolsEnabled &&
      input.availableTools.includes('sample') &&
      !egg.sampled &&
      !egg.hatched &&
      !locked &&
      budgetLeft('sample'),
    canStage:
      input.stagingEnabled &&
      !egg.hatched &&
      !locked &&
      (input.staged || input.hatchLimit === null || input.stagedCount < input.hatchLimit),
    traits,
    focusTrait,
    phenotypeSummary: traits.map((trait) => trait.phenotype).join(' · '),
    genotypeLabel: egg.sampled ? (focusTrait?.genotype ?? null) : null,
    shellSeed: egg.position,
  };
}

function toTraitReadouts(
  sample: DragonAnalysisSample,
  focusGeneId: string | undefined,
  sampled: boolean,
  geneCount: number,
  copy: StationCopy,
): readonly HatcheryTraitReadout[] {
  return sample.genes.map((gene): HatcheryTraitReadout => {
    const alleles = [gene.allelePair[0].symbol, gene.allelePair[1].symbol] as const;
    return {
      traitId: gene.traitId,
      geneId: gene.geneId,
      name: resolveStationCopy(copy, `trait.${gene.traitId}.name`),
      phenotype: gene.phenotypeId,
      genotype: sampled ? alleles.join('') : null,
      allelePair: sampled ? [alleles[0], alleles[1]] : null,
      geneIndex: gene.chromosomeModel ? (gene.chromosomeModel - 1) % geneCount : 0,
      focus: !!focusGeneId && (gene.geneId === focusGeneId || gene.traitId === focusGeneId),
    };
  });
}

function focusTraitName(scene: DragonVisualScene, focusGeneId: string, copy: StationCopy): string {
  for (const sample of scene.samples) {
    const gene = sample.genes.find(
      (candidate) => candidate.geneId === focusGeneId || candidate.traitId === focusGeneId,
    );
    if (gene) return resolveStationCopy(copy, `trait.${gene.traitId}.name`);
  }
  return focusGeneId;
}

function toolBudget(
  instrument: DragonHatcheryInstrument,
  toolId: DragonHatcheryToolId,
): number | null {
  if (toolId === 'examine') return instrument.examinesRemaining ?? null;
  if (toolId === 'sample') return instrument.samplesRemaining ?? null;
  return instrument.hatchLimit ?? null;
}

export function eggStatus(egg: DragonEggRecord): DragonEggStatusId {
  if (egg.hatched) return 'hatched';
  if (egg.sampled) return 'sampled';
  if (egg.examined) return 'examined';
  return 'intact';
}

function eggStatusLabel(egg: DragonEggRecord): string {
  if (egg.hatched) return 'Hatched';
  if (egg.sampled && egg.examined) return 'Examined · sampled';
  if (egg.sampled) return 'Sampled';
  if (egg.examined) return 'Examined';
  return 'Unopened';
}

function buildSummary(input: {
  counts: HatcheryCounts;
  eggs: readonly HatcheryEggView[];
  phase: DragonVisualPhase;
  hatchLimit: number | null;
  hatchCommitted: boolean;
}): string {
  const { counts } = input;
  const parts = [
    `Clutch of ${counts.total} eggs: ${counts.examined} examined, ${counts.sampled} sampled, ${counts.hatched} hatched.`,
  ];
  const active = input.eggs.find((egg) => egg.active);
  if (active) {
    parts.push(`Egg ${active.position} selected, ${active.statusLabel.toLowerCase()}.`);
    parts.push(
      active.traits.length
        ? `Traits: ${active.phenotypeSummary}.`
        : 'Traits are unread until this egg is examined.',
    );
    parts.push(
      active.genotypeLabel
        ? `Allele pair for the focus gene: ${active.genotypeLabel}.`
        : 'No allele pair has been sampled from this egg.',
    );
  }
  const staged = input.eggs.filter((egg) => egg.staged).map((egg) => egg.position);
  parts.push(
    staged.length
      ? `Hatch tray holds egg${staged.length === 1 ? '' : 's'} ${staged.join(', ')}${input.hatchLimit === null ? '' : ` of ${input.hatchLimit} allowed`}.`
      : 'The hatch tray is empty.',
  );
  if (input.hatchCommitted) parts.push('The hatch is committed.');
  parts.push(`Current step: ${input.phase}.`);
  return parts.join(' ');
}
