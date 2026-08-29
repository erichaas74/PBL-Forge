import {
  AssemblyPartDefinition,
  resizePartDefinition,
} from './assembly-garage/data/assembly-part-definitions';
import { DesignerDragonDraftStore, SnapOffsetMap } from './designer-dragon-draft.store';
import {
  DEFAULT_DRAGON_BODY_STATIONS,
  DragonBodyStationParameters,
  sampleDragonBodyBellyDepth,
  sampleDragonBodyCenterY,
  sampleDragonBodyStationHeight,
  sampleDragonBodyStationWidth,
} from '@pbl/assembly/rendering/dragon-body-profile';

/**
 * The one place a catalog part picks up the designer's local edits.
 *
 * Both the Garage parts panel and the dragon preset builder stamp parts from
 * the same catalog, and both have to see the same tuned part or the preset and
 * the panel disagree about what a leg measures. Anything the Parts Lab or the
 * Snap Workshop saves lands here.
 *
 * Order matters: resize first, then seat body sockets on any tuned stations,
 * then let an explicitly moved socket override both. A socket someone placed
 * by hand stays exactly where they put it.
 */
export function applyDesignerDraft(
  definition: AssemblyPartDefinition,
  draft: DesignerDragonDraftStore,
): AssemblyPartDefinition {
  const resized = resizePartDefinition(
    definition,
    draft.dimensionsFor(definition.id, definition.dimensions),
  );
  const parameters = draft.parametersFor(definition.id, definition.visualProfile?.parameters);
  const stationed = withBodyStationSockets(resized, parameters);

  return withVisualParameters(
    withSnapOffsets(stationed, draft.snapOffsetsFor(definition.id)),
    parameters,
  );
}

function withVisualParameters(
  definition: AssemblyPartDefinition,
  parameters: Record<string, string | number | boolean>,
): AssemblyPartDefinition {
  if (!definition.visualProfile || !Object.keys(parameters).length) return definition;
  return { ...definition, visualProfile: { ...definition.visualProfile, parameters } };
}

export function withSnapOffsets(
  definition: AssemblyPartDefinition,
  offsets: SnapOffsetMap,
): AssemblyPartDefinition {
  if (!Object.keys(offsets).length) {
    return definition;
  }

  return {
    ...definition,
    snapPoints: definition.snapPoints.map(snapPoint => {
      const moved = offsets[snapPoint.id];
      return moved ? { ...snapPoint, localPosition: { ...moved } } : snapPoint;
    }),
  };
}

/** Keeps body-owned sockets seated when a per-body station changes the torso surface. */
export function withBodyStationSockets(
  definition: AssemblyPartDefinition,
  parameters: Readonly<Record<string, string | number | boolean>>,
): AssemblyPartDefinition {
  if (definition.visualProfile?.profileId !== 'dragon-body') return definition;
  const stations = bodyStations(parameters);
  const archetype = typeof parameters['bodyArchetype'] === 'string'
    ? parameters['bodyArchetype']
    : 'classic';
  const dims = definition.dimensions;

  return {
    ...definition,
    snapPoints: definition.snapPoints.map(snapPoint => {
      const axial = snapPoint.localPosition.x / Math.max(dims.x, 1e-6);
      const defaultCenter = sampleDragonBodyCenterY(
        axial,
        archetype,
        DEFAULT_DRAGON_BODY_STATIONS,
      ) * dims.y;
      const stationCenter = sampleDragonBodyCenterY(axial, archetype, stations) * dims.y;
      const relativeY = snapPoint.localPosition.y - defaultCenter;
      const belly = relativeY < 0 ? sampleDragonBodyBellyDepth(axial, stations) : 1;

      return {
        ...snapPoint,
        localPosition: {
          x: snapPoint.localPosition.x,
          y: stationCenter
            + relativeY * sampleDragonBodyStationHeight(axial, stations) * belly,
          z: snapPoint.localPosition.z * sampleDragonBodyStationWidth(axial, stations),
        },
      };
    }),
  };
}

function bodyStations(
  parameters: Readonly<Record<string, string | number | boolean>>,
): DragonBodyStationParameters {
  const number = (key: string, fallback: number): number => {
    const value = parameters[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };
  return {
    neckWidth: number('bodyNeckWidth', 1),
    chestWidth: number('bodyChestWidth', 1),
    chestHeight: number('bodyChestHeight', 1),
    waistWidth: number('bodyWaistWidth', 1),
    bellyDepth: number('bodyBellyDepth', 1),
    hipWidth: number('bodyHipWidth', 1),
    spineArch: number('bodySpineArch', 0),
    tailRootWidth: number('bodyTailRootWidth', 1),
  };
}
