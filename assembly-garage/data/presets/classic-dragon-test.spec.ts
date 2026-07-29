import { CLASSIC_DRAGON_TEST_PRESET } from './classic-dragon-test';

describe('CLASSIC_DRAGON_TEST_PRESET', () => {
  it('builds a complete catalog dragon with chained tail joints', () => {
    const state = CLASSIC_DRAGON_TEST_PRESET.state;

    expect(state.parts.length).toBe(12);
    expect(state.joints.length).toBe(11);
    expect(state.parts.some(part => part.id === 'classic-dragon-body')).toBeTrue();

    const bodyChildren = state.joints
      .filter(joint => joint.parentPartId === 'classic-dragon-body')
      .map(joint => joint.childPartId);

    expect(bodyChildren).toContain('classic-dragon-horned-head');
    expect(bodyChildren).toContain('classic-dragon-left-wing');
    expect(bodyChildren).toContain('classic-dragon-right-wing');
    expect(bodyChildren).toContain('classic-dragon-tail-chain-root');

    expect(state.joints.some(joint =>
      joint.parentPartId === 'classic-dragon-tail-chain-root'
      && joint.childPartId === 'classic-dragon-tail-link-1',
    )).toBeTrue();
    expect(state.joints.some(joint =>
      joint.parentPartId === 'classic-dragon-tail-link-1'
      && joint.childPartId === 'classic-dragon-tail-link-2',
    )).toBeTrue();
    expect(state.joints.some(joint =>
      joint.parentPartId === 'classic-dragon-tail-link-2'
      && joint.childPartId === 'classic-dragon-tail-stinger',
    )).toBeTrue();

    const tailRoot = state.parts.find(part => part.id === 'classic-dragon-tail-chain-root');
    const tailLink1 = state.parts.find(part => part.id === 'classic-dragon-tail-link-1');
    const tailLink2 = state.parts.find(part => part.id === 'classic-dragon-tail-link-2');
    const tailRootJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-tail-chain-root');
    const tailLinkJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-tail-link-1');

    expect(tailRootJoint?.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(tailLinkJoint?.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(tailLink1?.rotation).toEqual(tailRoot?.rotation);
    expect(tailLink2?.rotation).toEqual(tailRoot?.rotation);
    expect(tailLink1?.position.x ?? 0).toBeLessThan(tailRoot?.position.x ?? 0);
    expect(tailLink2?.position.x ?? 0).toBeLessThan(tailLink1?.position.x ?? 0);

    const leftWingJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-left-wing');
    const rightWingJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-right-wing');
    const legJoint = state.joints.find(joint => joint.childPartId === 'classic-dragon-front-left-leg');

    expect(leftWingJoint?.axis).toEqual({ x: 1, y: 0, z: 0 });
    expect(rightWingJoint?.axis).toEqual({ x: -1, y: 0, z: 0 });
    expect(leftWingJoint?.behavior?.profile).toBe('oscillatingMotor');
    expect(rightWingJoint?.behavior?.profile).toBe('oscillatingMotor');
    expect(legJoint?.behavior?.profile).toBe('springHinge');
  });
});
