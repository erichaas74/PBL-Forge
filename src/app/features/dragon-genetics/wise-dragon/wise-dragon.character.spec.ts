import { WISE_DRAGON_PROFILE, WISE_DRAGON_SOURCE } from './wise-dragon.character';

describe('Wise Dragon character model', () => {
  it('uses a complete 24-locus elder genome', () => {
    expect(Object.keys(WISE_DRAGON_PROFILE.genome).length).toBe(24);
  });

  it('publishes a bespoke regal descriptor with avatar head controls', () => {
    expect(WISE_DRAGON_SOURCE.kind).toBe('descriptor');
    if (WISE_DRAGON_SOURCE.kind !== 'descriptor') return;
    const head = WISE_DRAGON_SOURCE.descriptor.blueprint.parts.find(
      (part) => part.visualProfile?.profileId === 'dragon-head-horned',
    );
    const body = WISE_DRAGON_SOURCE.descriptor.blueprint.parts.find(
      (part) => part.visualProfile?.profileId === 'dragon-body',
    );

    expect(head?.visualProfile?.parameters).toEqual(expect.objectContaining({
      wiseAvatar: true,
      eyeColor: '#69e3d2',
      cranium: 1.32,
      sex: 'male',
    }));
    expect(body?.visualProfile?.parameters?.['bodyArchetype']).toBe('regal');
  });
});
