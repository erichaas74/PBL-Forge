import { AssemblyGarageStore } from './assembly-garage.store';

describe('AssemblyGarageStore', () => {
  let store: AssemblyGarageStore;

  beforeEach(() => {
    store = new AssemblyGarageStore();
  });

  it('starts with a valid starter assembly and joint draft', () => {
    expect(store.partCount()).toBe(2);
    expect(store.jointCount()).toBe(1);
    expect(store.canCreateJoint()).toBeTrue();
    expect(store.jointDraft().parentPartId).toBeTruthy();
    expect(store.jointDraft().childPartId).toBeTruthy();
  });

  it('creates a joint from selected snap points', () => {
    const parts = store.state().parts;

    store.setDraftPart('parent', parts[0].id);
    store.setDraftSnap('parent', 'x-positive');
    store.setDraftPart('child', parts[1].id);
    store.setDraftSnap('child', 'x-negative');
    store.updateJointDraftType('fixed');
    store.createJointFromDraft();

    const created = store.state().joints.at(-1);

    expect(store.jointCount()).toBe(2);
    expect(created?.type).toBe('fixed');
    expect(created?.pivotOnParent).toEqual({ x: 0.8, y: 0, z: 0 });
    expect(created?.pivotOnChild.x).toBeCloseTo(-0.14, 5);
  });

  it('removes joints connected to a deleted part', () => {
    const selectedPartId = store.state().parts[0].id;

    store.selectPart(selectedPartId);
    store.removeSelectedPart();

    expect(store.state().parts.some(part => part.id === selectedPartId)).toBeFalse();
    expect(store.state().joints.some(joint =>
      joint.parentPartId === selectedPartId || joint.childPartId === selectedPartId,
    )).toBeFalse();
  });

  it('auto-attaches a one-socket part when it snaps to its only valid joint point', () => {
    store.loadAssemblyState({
      parts: [
        {
          id: 'car-chassis',
          label: 'Chassis',
          shape: 'box',
          mass: 4,
          dimensions: { x: 2, y: 0.4, z: 1 },
          position: { x: 0, y: 1, z: 0 },
          color: '#ef4444',
          snapPoints: [
            {
              id: 'front-left-wheel-socket',
              label: 'Front left wheel socket',
              localPosition: { x: 0.7, y: -0.1, z: -0.55 },
              mateIds: ['wheel-hub'],
              singleUse: true,
            },
          ],
        },
        {
          id: 'front-left-wheel',
          label: 'Front left wheel',
          shape: 'sphere',
          mass: 0.5,
          dimensions: { x: 0.28, y: 0.28, z: 0.28 },
          position: { x: 0.72, y: 0.92, z: -0.54 },
          color: '#111827',
          snapPoints: [
            {
              id: 'wheel-hub',
              label: 'Wheel hub',
              localPosition: { x: 0, y: 0, z: 0 },
              mateIds: ['front-left-wheel-socket'],
              singleUse: true,
            },
          ],
          attachment: {
            parentPartId: 'car-chassis',
            parentSnapId: 'front-left-wheel-socket',
            childSnapId: 'wheel-hub',
            jointType: 'hinge',
            axis: { x: 0, y: 0, z: 1 },
          },
        },
      ],
      joints: [],
      isSimulating: false,
    });

    const didSnap = store.snapPartToNearest('front-left-wheel');
    const wheel = store.state().parts.find(part => part.id === 'front-left-wheel');
    const joint = store.state().joints[0];

    expect(didSnap).toBeTrue();
    expect(wheel?.position).toEqual({ x: 0.7, y: 0.9, z: -0.55 });
    expect(store.jointCount()).toBe(1);
    expect(joint.type).toBe('hinge');
    expect(joint.parentPartId).toBe('car-chassis');
    expect(joint.childPartId).toBe('front-left-wheel');
    expect(joint.pivotOnParent).toEqual({ x: 0.7, y: -0.1, z: -0.55 });
    expect(joint.pivotOnChild).toEqual({ x: 0, y: 0, z: 0 });
    expect(joint.axis).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('imports valid assembly JSON and rejects invalid joint references', () => {
    const validJson = JSON.stringify({
      parts: [
        {
          id: 'part-a',
          shape: 'box',
          mass: 1,
          dimensions: { x: 1, y: 1, z: 1 },
          position: { x: 0, y: 1, z: 0 },
          color: '#2f80ed',
        },
        {
          id: 'part-b',
          shape: 'sphere',
          mass: 1,
          dimensions: { x: 0.5, y: 0.5, z: 0.5 },
          position: { x: 1, y: 1, z: 0 },
          color: '#2a9d8f',
        },
      ],
      joints: [],
      isSimulating: true,
    });

    store.loadAssemblyJson(validJson);

    expect(store.partCount()).toBe(2);
    expect(store.state().isSimulating).toBeFalse();

    const invalidJson = JSON.stringify({
      parts: [
        {
          id: 'part-a',
          shape: 'box',
          mass: 1,
          dimensions: { x: 1, y: 1, z: 1 },
          position: { x: 0, y: 1, z: 0 },
          color: '#2f80ed',
        },
      ],
      joints: [
        {
          id: 'joint-bad',
          type: 'hinge',
          parentPartId: 'part-a',
          childPartId: 'missing-part',
          pivotOnParent: { x: 0, y: 0, z: 0 },
          pivotOnChild: { x: 0, y: 0, z: 0 },
          axis: { x: 0, y: 1, z: 0 },
        },
      ],
      isSimulating: false,
    });

    expect(() => store.loadAssemblyJson(invalidJson)).toThrowError(/missing part/i);
  });
});
