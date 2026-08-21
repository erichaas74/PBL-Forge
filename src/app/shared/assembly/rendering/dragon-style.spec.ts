import {
  DEFAULT_DRAGON_STYLE,
  getActiveDragonStyle,
  getActiveWingShape,
  setDragonStyleOverride,
} from './dragon-style';

describe('dragon style', () => {
  afterEach(() => setDragonStyleOverride(null));

  it('uses the published style when the Designer has no live override', () => {
    expect(getActiveDragonStyle()).toBe(DEFAULT_DRAGON_STYLE);
    expect(getActiveWingShape()).toBe(DEFAULT_DRAGON_STYLE.wing);
  });

  it('exposes a live Designer override without mutating the published defaults', () => {
    const override = {
      ...DEFAULT_DRAGON_STYLE,
      wing: {
        ...DEFAULT_DRAGON_STYLE.wing,
        camber: DEFAULT_DRAGON_STYLE.wing.camber + 0.1,
      },
    };

    setDragonStyleOverride(override);

    expect(getActiveDragonStyle()).toBe(override);
    expect(getActiveWingShape()).toBe(override.wing);
    expect(DEFAULT_DRAGON_STYLE.wing.camber).not.toBe(override.wing.camber);
  });
});
