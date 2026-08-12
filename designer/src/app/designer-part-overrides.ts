import {
  AssemblyPartDefinition,
  resizePartDefinition,
} from './assembly-garage/data/assembly-part-definitions';
import { DesignerDragonDraftStore, SnapOffsetMap } from './designer-dragon-draft.store';

/**
 * The one place a catalog part picks up the designer's local edits.
 *
 * Both the Garage parts panel and the dragon preset builder stamp parts from
 * the same catalog, and both have to see the same tuned part or the preset and
 * the panel disagree about what a leg measures. Anything the Parts Lab or the
 * Snap Workshop saves lands here.
 *
 * Order matters: the resize scales the authored sockets with the part, then an
 * explicitly moved socket overrides its scaled position. A socket someone
 * placed by hand stays where they put it.
 */
export function applyDesignerDraft(
  definition: AssemblyPartDefinition,
  draft: DesignerDragonDraftStore,
): AssemblyPartDefinition {
  const resized = resizePartDefinition(
    definition,
    draft.dimensionsFor(definition.id, definition.dimensions),
  );

  return withSnapOffsets(resized, draft.snapOffsetsFor(definition.id));
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
