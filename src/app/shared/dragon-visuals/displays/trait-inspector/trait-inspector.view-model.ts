import {
  DragonEvidenceSourceId,
  DragonTraitCategory,
  DragonTraitPlacement,
  DragonTraitPlacementStatus,
  DragonVisualMode,
  DragonVisualPhase,
  DragonVisualScene,
  TraitInspectorInstrument,
} from '../../domain/dragon-visual.models';
import { StationCopy, resolveStationCopy } from '../shared/station-copy';
import {
  TRAIT_INSPECTOR_TARGETS,
  TRAIT_INSPECTOR_THEME,
  TraitInspectorCategoryStyle,
  TraitInspectorGlyph,
  TraitInspectorSourceStyle,
  TraitInspectorTheme,
  trayTargetId,
} from './trait-inspector.theme';

export const TRAIT_CATEGORY_ORDER: readonly DragonTraitCategory[] = [
  'inherited',
  'learned',
  'environmental',
];

export const EVIDENCE_SOURCE_ORDER: readonly DragonEvidenceSourceId[] = [
  'gene-record',
  'training-log',
  'environment-log',
];

export type TraitInspectorCardState = 'queued' | 'active' | 'placed';

export interface TraitInspectorCardView {
  id: string;
  position: number;
  total: number;
  title: string;
  detail: string;
  state: TraitInspectorCardState;
  tray: DragonTraitCategory | null;
  status: DragonTraitPlacementStatus | null;
  revealed: boolean;
  /** Only populated once the lesson reveals the placement. */
  revealedCategory: DragonTraitCategory | null;
  /** Only populated once revealed, or in a mode that shows source hints. */
  sourceId: DragonEvidenceSourceId | null;
  pinnedClueId: string | null;
  clueStatus: DragonTraitPlacementStatus | null;
  highlighted: boolean;
  disabled: boolean;
  draggable: boolean;
}

export interface TraitInspectorClueView {
  id: string;
  text: string;
  sourceId: DragonEvidenceSourceId;
  pinned: boolean;
  selectable: boolean;
  status: DragonTraitPlacementStatus | null;
}

export interface TraitInspectorSourceView {
  id: DragonEvidenceSourceId;
  targetId: string;
  title: string;
  caption: string;
  accent: string;
  glyph: TraitInspectorGlyph;
  clues: readonly TraitInspectorClueView[];
  active: boolean;
}

export interface TraitInspectorTrayView {
  id: DragonTraitCategory;
  targetId: string;
  title: string;
  caption: string;
  style: TraitInspectorCategoryStyle;
  cards: readonly TraitInspectorCardView[];
  count: number;
  enabled: boolean;
  predicted: boolean;
}

export interface TraitInspectorPredictionOption {
  id: DragonTraitCategory;
  title: string;
  caption: string;
  style: TraitInspectorCategoryStyle;
  locked: boolean;
}

export interface TraitInspectorTraceView {
  observationId: string;
  sourceId: DragonEvidenceSourceId;
  tray: DragonTraitCategory;
  status: DragonTraitPlacementStatus;
  accent: string;
}

export interface TraitInspectorViewModel {
  sceneId: string;
  seed: string;
  mode: DragonVisualMode;
  phase: DragonVisualPhase;
  sample: { id: string; label: string; caption: string; glyph: TraitInspectorGlyph };
  cards: readonly TraitInspectorCardView[];
  activeCard: TraitInspectorCardView | null;
  sources: readonly TraitInspectorSourceView[];
  trays: readonly TraitInspectorTrayView[];
  predictionOptions: readonly TraitInspectorPredictionOption[];
  predictionEnabled: boolean;
  lockedPrediction: DragonTraitCategory | null;
  trace: TraitInspectorTraceView | null;
  placedCount: number;
  totalCount: number;
  progressPercent: number;
  showSourceHints: boolean;
  summary: string;
  targets: typeof TRAIT_INSPECTOR_TARGETS;
}

/**
 * Pure mapping from the semantic scene to everything the station draws.
 *
 * Two boundary rules are enforced here rather than in the template: an observation's true
 * category and source path stay hidden until the lesson marks the placement revealed, and
 * no verdict is computed from scene data — `status` always comes from the lesson.
 */
export function buildTraitInspectorViewModel(
  scene: DragonVisualScene,
  copy: StationCopy = {},
  theme: TraitInspectorTheme = TRAIT_INSPECTOR_THEME,
): TraitInspectorViewModel | null {
  if (scene.instrument.kind !== 'trait-inspector') return null;
  const instrument: TraitInspectorInstrument = scene.instrument;
  const placements = new Map(
    (instrument.placements ?? []).map(placement => [placement.observationId, placement]),
  );
  const activeId = instrument.activeObservationId ?? null;
  const showSourceHints = instrument.showSourceHints ?? false;
  const total = instrument.observations.length;

  const cards = instrument.observations.map((observation, index): TraitInspectorCardView => {
    const placement = placements.get(observation.id);
    const revealed = placement?.revealed ?? false;
    return {
      id: observation.id,
      position: index + 1,
      total,
      title: resolveStationCopy(copy, observation.labelId),
      detail: resolveStationCopy(copy, observation.detailLabelId),
      state: placement ? 'placed' : observation.id === activeId ? 'active' : 'queued',
      tray: placement?.tray ?? null,
      status: placement?.status ?? null,
      revealed,
      revealedCategory: revealed ? observation.category : null,
      sourceId: revealed || showSourceHints ? observation.sourceId ?? null : null,
      pinnedClueId: placement?.pinnedClueId ?? null,
      clueStatus: placement?.clueStatus ?? null,
      highlighted: scene.selection.highlightedIds.includes(observation.id),
      disabled: scene.selection.disabledIds.includes(observation.id),
      draggable: !placement && observation.id === activeId && scene.phase === 'manipulate',
    };
  });

  const activeCard = cards.find(card => card.id === activeId) ?? null;
  const activeObservation = instrument.observations.find(observation => observation.id === activeId);
  const activePlacement = activeId ? placements.get(activeId) ?? null : null;
  const revealedSourceId = activePlacement?.revealed ? activeObservation?.sourceId ?? null : null;

  const visibleClueIds = new Set(activeObservation?.clueIds ?? []);
  const clueSelectable = scene.phase === 'explain' && !!activePlacement;
  const clues = (instrument.clues ?? []).filter(clue => visibleClueIds.has(clue.id));

  const sources = EVIDENCE_SOURCE_ORDER.map((sourceId): TraitInspectorSourceView => {
    const style: TraitInspectorSourceStyle = theme.sources[sourceId];
    return {
      id: sourceId,
      targetId: TRAIT_INSPECTOR_TARGETS.evidenceSource,
      title: resolveStationCopy(copy, `source.${sourceId}.title`),
      caption: resolveStationCopy(copy, `source.${sourceId}.caption`),
      accent: style.accent,
      glyph: style.glyph,
      active: revealedSourceId === sourceId,
      clues: clues
        .filter(clue => clue.sourceId === sourceId)
        .map(clue => ({
          id: clue.id,
          text: resolveStationCopy(copy, clue.labelId),
          sourceId,
          pinned: activePlacement?.pinnedClueId === clue.id,
          selectable: clueSelectable,
          status: activePlacement?.pinnedClueId === clue.id
            ? activePlacement.clueStatus ?? null
            : null,
        })),
    };
  });

  const traysEnabled = scene.phase === 'manipulate' && !!activeCard && !activePlacement;
  const trays = TRAIT_CATEGORY_ORDER.map((category): TraitInspectorTrayView => {
    const trayCards = cards.filter(card => card.tray === category);
    return {
      id: category,
      targetId: trayTargetId(category),
      title: resolveStationCopy(copy, `tray.${category}.title`),
      caption: resolveStationCopy(copy, `tray.${category}.caption`),
      style: theme.categories[category],
      cards: trayCards,
      count: trayCards.length,
      enabled: traysEnabled && !scene.selection.disabledIds.includes(trayTargetId(category)),
      predicted: instrument.lockedPrediction === category,
    };
  });

  const predictionOptions = TRAIT_CATEGORY_ORDER.map((category): TraitInspectorPredictionOption => ({
    id: category,
    title: resolveStationCopy(copy, `tray.${category}.title`),
    caption: resolveStationCopy(copy, `prediction.${category}.caption`),
    style: theme.categories[category],
    locked: instrument.lockedPrediction === category,
  }));

  const placedCount = cards.filter(card => card.state === 'placed').length;

  return {
    sceneId: scene.sceneId,
    seed: scene.seed,
    mode: scene.mode,
    phase: scene.phase,
    sample: {
      id: instrument.sampleId,
      label: resolveStationCopy(copy, `sample.${instrument.sampleId}.label`),
      caption: resolveStationCopy(copy, `sample.${instrument.sampleId}.caption`),
      glyph: theme.sampleGlyph,
    },
    cards,
    activeCard,
    sources,
    trays,
    predictionOptions,
    predictionEnabled: scene.phase === 'predict' && !!activeCard,
    lockedPrediction: instrument.lockedPrediction ?? null,
    trace: buildTrace(activePlacement, revealedSourceId, theme),
    placedCount,
    totalCount: total,
    progressPercent: total ? Math.round((100 * placedCount) / total) : 0,
    showSourceHints,
    summary: buildSummary({ activeCard, placedCount, total, sources, phase: scene.phase, mode: scene.mode }),
    targets: TRAIT_INSPECTOR_TARGETS,
  };
}

function buildTrace(
  placement: DragonTraitPlacement | null,
  sourceId: DragonEvidenceSourceId | null,
  theme: TraitInspectorTheme,
): TraitInspectorTraceView | null {
  if (!placement?.revealed || !sourceId) return null;
  return {
    observationId: placement.observationId,
    sourceId,
    tray: placement.tray,
    status: placement.status,
    accent: theme.sources[sourceId].accent,
  };
}

function buildSummary(input: {
  activeCard: TraitInspectorCardView | null;
  placedCount: number;
  total: number;
  sources: readonly TraitInspectorSourceView[];
  phase: DragonVisualPhase;
  mode: DragonVisualMode;
}): string {
  const parts: string[] = [];
  const { activeCard } = input;
  if (activeCard) {
    parts.push(`Observation ${activeCard.position} of ${activeCard.total}: ${activeCard.title}.`);
    if (activeCard.tray) parts.push(`Placed in the ${activeCard.tray} tray.`);
    if (activeCard.revealedCategory) {
      const source = input.sources.find(item => item.id === activeCard.sourceId);
      parts.push(`Evidence path revealed: recorded by the ${source?.title ?? 'source instrument'}, classified as ${activeCard.revealedCategory}.`);
    }
    if (activeCard.pinnedClueId) parts.push('An evidence clue is pinned.');
  } else {
    parts.push('No observation is open.');
  }
  parts.push(`Current step: ${input.phase}. ${input.placedCount} of ${input.total} observations placed.`);
  return parts.join(' ');
}
