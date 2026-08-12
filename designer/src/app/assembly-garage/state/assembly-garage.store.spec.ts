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

  describe('resizing a part', () => {
    beforeEach(() => {
      store.loadAssemblyState({
        parts: [
          {
            id: 'chassis',
            definitionId: 'car-chassis',
            shape: 'box',
            mass: 4,
            dimensions: { x: 2, y: 0.4, z: 1 },
            position: { x: 0, y: 1, z: 0 },
            color: '#ef4444',
            snapPoints: [
              { id: 'socket', label: 'Wheel socket', localPosition: { x: 1, y: -0.2, z: 0 } },
            ],
          },
          {
            id: 'wheel',
            shape: 'sphere',
            mass: 0.5,
            dimensions: { x: 0.3, y: 0.3, z: 0.3 },
            position: { x: 1, y: 0.8, z: 0 },
            color: '#111827',
            snapPoints: [{ id: 'hub', label: 'Hub', localPosition: { x: -0.3, y: 0, z: 0 } }],
          },
          {
            id: 'hubcap',
            shape: 'cylinder',
            mass: 0.1,
            dimensions: { x: 0.1, y: 0.05, z: 0.1 },
            position: { x: 1.35, y: 0.8, z: 0 },
            color: '#94a3b8',
          },
        ],
        joints: [
          {
            id: 'axle',
            type: 'hinge',
            parentPartId: 'chassis',
            childPartId: 'wheel',
            pivotOnParent: { x: 1, y: -0.2, z: 0 },
            pivotOnChild: { x: -0.3, y: 0, z: 0 },
            axis: { x: 0, y: 0, z: 1 },
          },
          {
            id: 'cap',
            type: 'fixed',
            parentPartId: 'wheel',
            childPartId: 'hubcap',
            pivotOnParent: { x: 0.3, y: 0, z: 0 },
            pivotOnChild: { x: -0.05, y: 0, z: 0 },
            axis: { x: 1, y: 0, z: 0 },
          },
        ],
        isSimulating: false,
      });
      store.selectPart('chassis');
    });

    it('carries authored snap points and joint pivots with the new size', () => {
      store.updateSelectedPartDimensions({ x: 4, y: 0.8, z: 1 });

      const chassis = store.state().parts.find(part => part.id === 'chassis');
      const joint = store.state().joints[0];

      expect(chassis?.dimensions).toEqual({ x: 4, y: 0.8, z: 1 });
      expect(chassis?.snapPoints?.[0].localPosition).toEqual({ x: 2, y: -0.4, z: 0 });
      expect(joint.pivotOnParent).toEqual({ x: 2, y: -0.4, z: 0 });
    });

    it('leaves the parts and pivots it did not resize alone', () => {
      store.updateSelectedPartDimensions({ x: 4, y: 0.4, z: 1 });

      const wheel = store.state().parts.find(part => part.id === 'wheel');

      expect(wheel?.dimensions).toEqual({ x: 0.3, y: 0.3, z: 0.3 });
      expect(wheel?.snapPoints?.[0].localPosition).toEqual({ x: -0.3, y: 0, z: 0 });
      expect(store.state().joints[0].pivotOnChild).toEqual({ x: -0.3, y: 0, z: 0 });
    });

    it('scales geometry when a single axis is edited', () => {
      store.updateSelectedPartVector('dimensions', 'x', 1);

      expect(store.state().parts[0].snapPoints?.[0].localPosition.x).toBe(0.5);
      expect(store.state().joints[0].pivotOnParent.x).toBe(0.5);
    });

    it('keeps the current size when an axis is set to zero or negative', () => {
      store.updateSelectedPartDimensions({ x: 0, y: -1, z: 2 });

      const chassis = store.state().parts.find(part => part.id === 'chassis');

      expect(chassis?.dimensions).toEqual({ x: 2, y: 0.4, z: 2 });
      expect(chassis?.snapPoints?.[0].localPosition).toEqual({ x: 1, y: -0.2, z: 0 });
    });

    it('pulls the whole chain below the resized part back onto its pivots', () => {
      store.updateSelectedPartDimensions({ x: 4, y: 0.8, z: 1 });

      const wheel = store.state().parts.find(part => part.id === 'wheel');
      const hubcap = store.state().parts.find(part => part.id === 'hubcap');

      // chassis 0,1,0 + moved pivot 2,-0.4,0 - the wheel's own pivot -0.3,0,0
      expect(wheel?.position.x).toBeCloseTo(2.3, 6);
      expect(wheel?.position.y).toBeCloseTo(0.6, 6);
      expect(wheel?.position.z).toBeCloseTo(0, 6);

      // and the grandchild rides along on the wheel it is fixed to
      expect(hubcap?.position.x).toBeCloseTo(2.65, 6);
      expect(hubcap?.position.y).toBeCloseTo(0.6, 6);
    });

    it('leaves the assembly closed when a resize does not move a pivot', () => {
      store.updateSelectedPartDimensions({ x: 2, y: 0.4, z: 2 });

      const wheel = store.state().parts.find(part => part.id === 'wheel');

      // z-only growth: the axle pivot has z 0, so nothing below it needs to move
      expect(wheel?.position.x).toBeCloseTo(1.3, 6);
      expect(wheel?.position.y).toBeCloseTo(0.8, 6);
    });

    it('honours a rotated child when it pulls it back onto the pivot', () => {
      store.loadAssemblyState({
        parts: [
          {
            id: 'root',
            shape: 'box',
            mass: 1,
            dimensions: { x: 1, y: 1, z: 1 },
            position: { x: 0, y: 0, z: 0 },
            color: '#2f80ed',
          },
          {
            id: 'arm',
            shape: 'box',
            mass: 1,
            dimensions: { x: 1, y: 1, z: 1 },
            position: { x: 2, y: 0, z: 0 },
            color: '#f59e0b',
            // a quarter turn about +Y, so the child's local +X points down -Z
            rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
          },
        ],
        joints: [
          {
            id: 'shoulder',
            type: 'hinge',
            parentPartId: 'root',
            childPartId: 'arm',
            pivotOnParent: { x: 0.5, y: 0, z: 0 },
            pivotOnChild: { x: 1, y: 0, z: 0 },
            axis: { x: 0, y: 1, z: 0 },
          },
        ],
        isSimulating: false,
      });
      store.selectPart('root');

      store.updateSelectedPartDimensions({ x: 2, y: 1, z: 1 });

      const arm = store.state().parts.find(part => part.id === 'arm');

      // pivot moves to x 1; the child's local +X pivot now points at -Z, so the
      // arm sits at x 1, z +1 rather than x 0 as an unrotated child would.
      expect(arm?.position.x).toBeCloseTo(1, 6);
      expect(arm?.position.y).toBeCloseTo(0, 6);
      expect(arm?.position.z).toBeCloseTo(1, 6);
    });

    it('stops walking when the joints form a cycle', () => {
      store.loadAssemblyState({
        parts: [
          {
            id: 'a',
            shape: 'box',
            mass: 1,
            dimensions: { x: 1, y: 1, z: 1 },
            position: { x: 0, y: 0, z: 0 },
            color: '#2f80ed',
          },
          {
            id: 'b',
            shape: 'box',
            mass: 1,
            dimensions: { x: 1, y: 1, z: 1 },
            position: { x: 1, y: 0, z: 0 },
            color: '#2a9d8f',
          },
        ],
        joints: [
          {
            id: 'a-to-b',
            type: 'fixed',
            parentPartId: 'a',
            childPartId: 'b',
            pivotOnParent: { x: 0.5, y: 0, z: 0 },
            pivotOnChild: { x: -0.5, y: 0, z: 0 },
            axis: { x: 0, y: 1, z: 0 },
          },
          {
            id: 'b-to-a',
            type: 'fixed',
            parentPartId: 'b',
            childPartId: 'a',
            pivotOnParent: { x: -0.5, y: 0, z: 0 },
            pivotOnChild: { x: 0.5, y: 0, z: 0 },
            axis: { x: 0, y: 1, z: 0 },
          },
        ],
        isSimulating: false,
      });
      store.selectPart('a');

      store.updateSelectedPartDimensions({ x: 2, y: 1, z: 1 });

      const a = store.state().parts.find(part => part.id === 'a');
      const b = store.state().parts.find(part => part.id === 'b');

      // b follows the widened a, and a itself is never dragged back by the return joint
      expect(a?.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(b?.position.x).toBeCloseTo(1.5, 6);
    });

    it('keeps the catalog definition id through a JSON round trip', () => {
      store.loadAssemblyJson(store.exportJson());

      expect(store.state().parts.find(part => part.id === 'chassis')?.definitionId)
        .toBe('car-chassis');
    });
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
