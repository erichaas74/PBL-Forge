import { Injectable, signal } from '@angular/core';
import { Vector3Data } from '@pbl/assembly/domain/assembly.models';
import { readStoredJson, writeStoredJson } from '@pbl/assembly/persistence/json-local-storage';
import { DEFAULT_DRAGON_STYLE, DragonStyle } from '@pbl/assembly/rendering/dragon-style';

/** Moved sockets for one definition, keyed by snap point id. */
export type SnapOffsetMap = Record<string, Vector3Data>;

interface DesignerDragonDraftV2 {
  schemaVersion: 2;
  style: DragonStyle;
  dimensionsByDefinitionId: Record<string, Vector3Data>;
  snapPointsByDefinitionId: Record<string, SnapOffsetMap>;
}

const STORAGE_KEY = 'dragon-designer.draft.v1';
const EMPTY_OFFSETS: SnapOffsetMap = {};

/** Local designer draft. Published student data still crosses only through a model pack. */
@Injectable({ providedIn: 'root' })
export class DesignerDragonDraftStore {
  private readonly draft = signal<DesignerDragonDraftV2>(readDraft());

  readonly style = () => cloneStyle(this.draft().style);

  setStyle(style: DragonStyle): void {
    this.draft.update((current) => ({ ...current, style: cloneStyle(style) }));
    this.persist();
  }

  dimensionsFor(definitionId: string, fallback: Vector3Data): Vector3Data {
    return { ...(this.draft().dimensionsByDefinitionId[definitionId] ?? fallback) };
  }

  setDimensions(definitionId: string, dimensions: Vector3Data): void {
    this.draft.update((current) => ({
      ...current,
      dimensionsByDefinitionId: {
        ...current.dimensionsByDefinitionId,
        [definitionId]: { ...dimensions },
      },
    }));
    this.persist();
  }

  /**
   * Sockets moved away from the authored position, by snap point id.
   *
   * Absolute part-local positions rather than deltas: a socket that was dragged
   * onto a jaw hinge belongs at that point, and should not drift the next time
   * the part's dimensions change.
   */
  snapOffsetsFor(definitionId: string): SnapOffsetMap {
    return this.draft().snapPointsByDefinitionId[definitionId] ?? EMPTY_OFFSETS;
  }

  setSnapOffset(definitionId: string, snapPointId: string, localPosition: Vector3Data): void {
    this.draft.update((current) => ({
      ...current,
      snapPointsByDefinitionId: {
        ...current.snapPointsByDefinitionId,
        [definitionId]: {
          ...current.snapPointsByDefinitionId[definitionId],
          [snapPointId]: { ...localPosition },
        },
      },
    }));
    this.persist();
  }

  clearSnapOffset(definitionId: string, snapPointId: string): void {
    const offsets = this.draft().snapPointsByDefinitionId[definitionId];

    if (!offsets || !(snapPointId in offsets)) {
      return;
    }

    const { [snapPointId]: removed, ...rest } = offsets;
    void removed;
    this.writeSnapOffsets(definitionId, rest);
  }

  clearSnapOffsets(definitionId: string): void {
    this.writeSnapOffsets(definitionId, {});
  }

  resetStyle(): void {
    this.setStyle(DEFAULT_DRAGON_STYLE);
  }

  private writeSnapOffsets(definitionId: string, offsets: SnapOffsetMap): void {
    this.draft.update((current) => {
      const next = { ...current.snapPointsByDefinitionId };

      if (Object.keys(offsets).length) {
        next[definitionId] = offsets;
      } else {
        delete next[definitionId];
      }

      return { ...current, snapPointsByDefinitionId: next };
    });
    this.persist();
  }

  private persist(): void {
    writeStoredJson(STORAGE_KEY, this.draft());
  }
}

/**
 * Reads either schema. v1 predates socket editing and is upgraded in place
 * rather than discarded — a designer mid-way through sizing a dragon should not
 * lose that work to a schema bump.
 */
function readDraft(): DesignerDragonDraftV2 {
  const fallback = emptyDraft();
  return readStoredJson(STORAGE_KEY, fallback, (value) => {
    if (!isRecord(value) || !isRecord(value['style'])) return emptyDraft();
    const version = value['schemaVersion'];
    if (version !== 1 && version !== 2) return emptyDraft();

    const candidate = value as unknown as Partial<DesignerDragonDraftV2>;
    return {
      schemaVersion: 2,
      style: cloneStyle(candidate.style as DragonStyle),
      dimensionsByDefinitionId: readVectorMap(candidate.dimensionsByDefinitionId),
      snapPointsByDefinitionId: readSnapMaps(candidate.snapPointsByDefinitionId),
    };
  });
}

function readVectorMap(value: unknown): Record<string, Vector3Data> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, Vector3Data] => isVector(entry[1]))
      .map(([id, vector]) => [id, { ...vector }]),
  );
}

function readSnapMaps(value: unknown): Record<string, SnapOffsetMap> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([id, offsets]): [string, SnapOffsetMap] => [id, readVectorMap(offsets)])
      .filter(([, offsets]) => Object.keys(offsets).length),
  );
}

function emptyDraft(): DesignerDragonDraftV2 {
  return {
    schemaVersion: 2,
    style: cloneStyle(DEFAULT_DRAGON_STYLE),
    dimensionsByDefinitionId: {},
    snapPointsByDefinitionId: {},
  };
}

function cloneStyle(style: DragonStyle): DragonStyle {
  return {
    wing: { ...style.wing },
    body: { ...style.body },
    jaw: { ...style.jaw },
    head: { ...style.head },
    foot: { ...style.foot },
    grasp: { ...style.grasp },
    joint: { ...style.joint },
    tailClub: { ...style.tailClub },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVector(value: unknown): value is Vector3Data {
  return (
    isRecord(value) &&
    typeof value['x'] === 'number' &&
    Number.isFinite(value['x']) &&
    typeof value['y'] === 'number' &&
    Number.isFinite(value['y']) &&
    typeof value['z'] === 'number' &&
    Number.isFinite(value['z'])
  );
}
