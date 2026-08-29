import { TestBed } from '@angular/core/testing';
import { DesignerDragonDraftStore } from './designer-dragon-draft.store';
import { applyDesignerDraft, withSnapOffsets } from './designer-part-overrides';
import {
  ASSEMBLY_PART_DEFINITIONS,
  AssemblyPartDefinition,
} from './assembly-garage/data/assembly-part-definitions';

const STORAGE_KEY = 'dragon-designer.draft.v1';

/** A catalog part with authored sockets, so the override path has something to move. */
function socketedDefinition(): AssemblyPartDefinition {
  const definition = ASSEMBLY_PART_DEFINITIONS.find(item =>
    item.family === 'dragon' && item.snapPoints.length > 1);
  if (!definition) throw new Error('No dragon part authors more than one socket.');
  return definition;
}

describe('designer part overrides', () => {
  let draft: DesignerDragonDraftStore;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    draft = TestBed.inject(DesignerDragonDraftStore);
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('returns the authored part when nothing has been tuned', () => {
    const definition = socketedDefinition();
    const applied = applyDesignerDraft(definition, draft);

    expect(applied.dimensions).toEqual(definition.dimensions);
    expect(applied.snapPoints.map(snap => snap.localPosition))
      .toEqual(definition.snapPoints.map(snap => snap.localPosition));
  });

  it('scales authored sockets with a saved size', () => {
    const definition = socketedDefinition();
    const socket = definition.snapPoints[0];

    draft.setDimensions(definition.id, {
      x: definition.dimensions.x * 2,
      y: definition.dimensions.y,
      z: definition.dimensions.z,
    });

    const applied = applyDesignerDraft(definition, draft);

    expect(applied.snapPoints[0].localPosition.x).toBeCloseTo(socket.localPosition.x * 2, 6);
    expect(applied.snapPoints[0].localPosition.y).toBeCloseTo(socket.localPosition.y, 6);
  });

  it('lets a moved socket win over the scaled position', () => {
    const definition = socketedDefinition();
    const moved = { x: 0.5, y: -0.25, z: 0.125 };

    draft.setDimensions(definition.id, {
      x: definition.dimensions.x * 2,
      y: definition.dimensions.y * 2,
      z: definition.dimensions.z * 2,
    });
    draft.setSnapOffset(definition.id, definition.snapPoints[0].id, moved);

    const applied = applyDesignerDraft(definition, draft);

    expect(applied.snapPoints[0].localPosition).toEqual(moved);
    // the sockets nobody touched still ride the resize
    expect(applied.snapPoints[1].localPosition.x)
      .toBeCloseTo(definition.snapPoints[1].localPosition.x * 2, 6);
  });

  it('drops an override back to the authored socket when it is cleared', () => {
    const definition = socketedDefinition();
    const socketId = definition.snapPoints[0].id;

    draft.setSnapOffset(definition.id, socketId, { x: 9, y: 9, z: 9 });
    draft.clearSnapOffset(definition.id, socketId);

    expect(applyDesignerDraft(definition, draft).snapPoints[0].localPosition)
      .toEqual(definition.snapPoints[0].localPosition);
  });

  it('clears every socket on a part at once', () => {
    const definition = socketedDefinition();

    draft.setSnapOffset(definition.id, definition.snapPoints[0].id, { x: 9, y: 9, z: 9 });
    draft.setSnapOffset(definition.id, definition.snapPoints[1].id, { x: 8, y: 8, z: 8 });
    draft.clearSnapOffsets(definition.id);

    expect(draft.snapOffsetsFor(definition.id)).toEqual({});
  });

  it('never mutates the shared catalog definition', () => {
    const definition = socketedDefinition();
    const before = JSON.stringify(definition.snapPoints);

    draft.setSnapOffset(definition.id, definition.snapPoints[0].id, { x: 9, y: 9, z: 9 });
    applyDesignerDraft(definition, draft);

    expect(JSON.stringify(definition.snapPoints)).toBe(before);
  });

  it('keeps body-station tuning scoped to one Arena body definition', () => {
    const regal = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === 'dragon-regal-body')!;
    const bulwark = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === 'dragon-bulwark-body')!;
    const lateralSocket = regal.snapPoints.find(snap =>
      snap.localPosition.x > 0 && Math.abs(snap.localPosition.z) > 0.01)!;

    draft.setParameter(regal.id, 'bodyChestWidth', 1.42);

    const appliedRegal = applyDesignerDraft(regal, draft);
    expect(appliedRegal.visualProfile?.parameters?.['bodyChestWidth']).toBe(1.42);
    expect(Math.abs(appliedRegal.snapPoints.find(snap => snap.id === lateralSocket.id)!.localPosition.z))
      .toBeGreaterThan(Math.abs(lateralSocket.localPosition.z));
    expect(applyDesignerDraft(bulwark, draft).visualProfile?.parameters?.['bodyChestWidth'])
      .toBeUndefined();
  });

  it('lets a hand-placed body socket win over station reshaping', () => {
    const regal = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === 'dragon-regal-body')!;
    const socket = regal.snapPoints.find(snap => Math.abs(snap.localPosition.z) > 0.01)!;
    const moved = { x: 0.7, y: 0.8, z: 0.9 };

    draft.setParameter(regal.id, 'bodyChestWidth', 1.6);
    draft.setSnapOffset(regal.id, socket.id, moved);

    expect(applyDesignerDraft(regal, draft).snapPoints.find(snap => snap.id === socket.id)?.localPosition)
      .toEqual(moved);
  });

  it('can reset one anatomy-layer parameter without clearing the other layers', () => {
    const definition = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === 'dragon-regal-body')!;

    draft.setParameter(definition.id, 'bodyChestWidth', 1.4);
    draft.setParameter(definition.id, 'bodyBellyDepth', 1.3);
    draft.clearParameter(definition.id, 'bodyBellyDepth');

    const parameters = applyDesignerDraft(definition, draft).visualProfile?.parameters;
    expect(parameters?.['bodyChestWidth']).toBe(1.4);
    expect(parameters?.['bodyBellyDepth']).toBeUndefined();
  });

  it('leaves a part alone when it has no offsets', () => {
    const definition = socketedDefinition();
    expect(withSnapOffsets(definition, {})).toBe(definition);
  });
});

describe('DesignerDragonDraftStore persistence', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('reloads saved sockets in a new session', () => {
    TestBed.resetTestingModule();
    TestBed.inject(DesignerDragonDraftStore).setSnapOffset('dragon-foot', 'ankle', {
      x: 0.1,
      y: 0.2,
      z: 0.3,
    });

    TestBed.resetTestingModule();

    expect(TestBed.inject(DesignerDragonDraftStore).snapOffsetsFor('dragon-foot'))
      .toEqual({ ankle: { x: 0.1, y: 0.2, z: 0.3 } });
  });

  it('upgrades a v1 draft instead of discarding the sizes in it', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      style: { wing: {}, body: {}, jaw: {}, head: {}, foot: {}, tailClub: {} },
      dimensionsByDefinitionId: { 'dragon-foot': { x: 1, y: 2, z: 3 } },
    }));
    TestBed.resetTestingModule();

    const store = TestBed.inject(DesignerDragonDraftStore);

    expect(store.dimensionsFor('dragon-foot', { x: 0, y: 0, z: 0 })).toEqual({ x: 1, y: 2, z: 3 });
    expect(store.snapOffsetsFor('dragon-foot')).toEqual({});
  });

  it('ignores a stored socket that is not a vector', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      style: { wing: {}, body: {}, jaw: {}, head: {}, foot: {}, tailClub: {} },
      dimensionsByDefinitionId: {},
      snapPointsByDefinitionId: { 'dragon-foot': { ankle: { x: 'left', y: 2, z: 3 } } },
    }));
    TestBed.resetTestingModule();

    expect(TestBed.inject(DesignerDragonDraftStore).snapOffsetsFor('dragon-foot')).toEqual({});
  });

  it('saves placements independently for each Arena body type or Mini breed', () => {
    const store = TestBed.inject(DesignerDragonDraftStore);
    store.setPlacement('regal-dragon', 'left-wing', {
      offset: { x: 0.2, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 12, z: 0 },
      scale: 1.1,
    });
    store.setPlacement('mini-dragon-fairy', 'mini-left-wing', {
      offset: { x: -0.1, y: 0.3, z: 0 },
      rotationDegrees: { x: 5, y: 0, z: -8 },
      scale: 0.9,
    });
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(DesignerDragonDraftStore);

    expect(reloaded.placementFor('regal-dragon', 'left-wing').offset.x).toBe(0.2);
    expect(reloaded.placementFor('mini-dragon-fairy', 'mini-left-wing').offset.y).toBe(0.3);
    expect(reloaded.placementFor('bulwark-dragon', 'left-wing')).toEqual({
      offset: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    });
  });
});
