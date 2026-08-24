import { part } from './mini-dragon-mesh.spec-helpers';
import { createMiniDragonPalette } from './mini-dragon-palette';

describe('mini dragon palette', () => {
  it('keeps inherited pigments and semantic feature colours separate', () => {
    const palette = createMiniDragonPalette(
      part(
        'mini-dragon-body',
        { color: '#4466aa' },
        {
          miniPatchColor: '#e7b24c',
          miniEmberColor: '#ff6538',
          miniAccentColor: '#00e5ff',
          miniPatternStyle: 'harlequin',
          miniSurfaceStyle: 'bumpy',
        },
      ),
    );

    expect(palette.coat.getHexString()).toBe('4466aa');
    expect(palette.patch.getHexString()).toBe('e7b24c');
    expect(palette.ember.getHexString()).toBe('ff6538');
    expect(palette.accent.getHexString()).toBe('00e5ff');
    expect(palette.patternStyle).toBe('harlequin');
    expect(palette.surfaceStyle).toBe('bumpy');
    expect(palette.dorsal.equals(palette.coat)).toBe(false);
    expect(palette.belly.equals(palette.coat)).toBe(false);
    expect(palette.eye.getHexString()).toBe('ff6538');
    expect(palette.horn.equals(palette.tooth)).toBe(false);
    expect(palette.membrane.equals(palette.coat)).toBe(false);
    expect(palette.paw.equals(palette.coat)).toBe(false);
    expect(palette.mouth.equals(palette.pupil)).toBe(false);
  });
});
