import { DRAGON_BODY_TYPE_PRESETS } from './dragon-body-types';

describe('dragon body type presets', () => {
  it('builds all six requested dragons as fully joined assembly trees', () => {
    expect(DRAGON_BODY_TYPE_PRESETS.map(item => item.id)).toEqual([
      'regal-dragon',
      'bulwark-dragon',
      'sky-courser-dragon',
      'marsh-prowler-dragon',
      'double-wing-dragon',
      'long-serpent-dragon',
    ]);

    for (const preset of DRAGON_BODY_TYPE_PRESETS) {
      const { parts, joints } = preset.state;
      const partIds = new Set(parts.map(part => part.id));
      const childIds = joints.map(joint => joint.childPartId);

      expect(joints.length).toBe(parts.length - 1);
      expect(new Set(childIds).size).toBe(childIds.length);
      expect(parts.filter(part => !childIds.includes(part.id))).toHaveLength(1);
      expect(parts.find(part => !childIds.includes(part.id))?.roles).toContain('core');

      for (const joint of joints) {
        expect(partIds.has(joint.parentPartId)).toBe(true);
        expect(partIds.has(joint.childPartId)).toBe(true);
        if (joint.behavior) {
          expect(joint.behavior.breakForce).toBeGreaterThanOrEqual(1_000_000);
          expect(joint.behavior.breakDamage).toBeGreaterThanOrEqual(1_000_000);
        }
      }
    }
  });

  it('uses the fitted body, leg, foot, and wing catalog families', () => {
    const expected = [
      ['regal-dragon', 'dragon-regal-body', 'regal'],
      ['bulwark-dragon', 'dragon-bulwark-body', 'bulwark'],
      ['sky-courser-dragon', 'dragon-courser-body', 'courser'],
      ['marsh-prowler-dragon', 'dragon-prowler-body', 'prowler'],
      ['double-wing-dragon', 'dragon-four-wing-body', 'four-wing'],
      ['long-serpent-dragon', 'dragon-serpent-body', 'serpent'],
    ] as const;

    for (const [presetId, definitionId, archetype] of expected) {
      const preset = DRAGON_BODY_TYPE_PRESETS.find(item => item.id === presetId)!;
      const body = preset.state.parts.find(part => part.roles?.includes('core'))!;

      expect(body.definitionId).toBe(definitionId);
      expect(body.visualProfile?.parameters?.['bodyArchetype']).toBe(archetype);
    }

    const bulwark = DRAGON_BODY_TYPE_PRESETS.find(item => item.id === 'bulwark-dragon')!;
    expect(bulwark.state.parts.some(part => part.definitionId === 'dragon-bulwark-front-left-leg')).toBe(true);
    expect(bulwark.state.parts.some(part => part.definitionId === 'dragon-bulwark-clawed-foot')).toBe(true);
    expect(bulwark.state.parts.some(part => part.definitionId === 'dragon-bulwark-left-wing')).toBe(true);
  });

  it('joins both complete wing pairs to the double-wing body', () => {
    const preset = DRAGON_BODY_TYPE_PRESETS.find(item => item.id === 'double-wing-dragon')!;
    const body = preset.state.parts.find(part => part.roles?.includes('core'))!;
    const wings = preset.state.parts.filter(part =>
      part.visualProfile?.profileId === 'dragon-wing'
      || part.visualProfile?.profileId === 'dragon-secondary-wing',
    );
    const claws = preset.state.parts.filter(part =>
      part.visualProfile?.profileId === 'dragon-wing-claw',
    );

    expect(wings).toHaveLength(4);
    expect(claws).toHaveLength(4);
    expect(preset.state.joints.filter(joint =>
      joint.parentPartId === body.id && wings.some(wing => wing.id === joint.childPartId),
    )).toHaveLength(4);
    expect(claws.every(claw => preset.state.joints.some(joint =>
      joint.childPartId === claw.id && wings.some(wing => wing.id === joint.parentPartId),
    ))).toBe(true);
  });

  it('builds the serpent as a wingless long body with a seven-link articulated tail', () => {
    const preset = DRAGON_BODY_TYPE_PRESETS.find(item => item.id === 'long-serpent-dragon')!;
    const body = preset.state.parts.find(part => part.roles?.includes('core'))!;
    const links = preset.state.parts.filter(part => part.id.includes('-tail-link-'));

    expect(body.dimensions.x).toBeGreaterThan(5);
    expect(preset.state.parts.some(part =>
      part.visualProfile?.profileId === 'dragon-wing'
      || part.visualProfile?.profileId === 'dragon-secondary-wing',
    )).toBe(false);
    expect(links).toHaveLength(7);

    for (const link of links) {
      expect(preset.state.joints.some(joint => joint.childPartId === link.id)).toBe(true);
    }
  });
});
