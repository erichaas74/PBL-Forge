import {
  SPECIMEN_RENDER_MODE_STORAGE_KEY,
  readStoredRenderMode,
  resetSpecimenRenderMode,
  setSpecimenRenderMode,
  specimenRenderMode,
  toggleSpecimenRenderMode,
} from './specimen-render-mode';

describe('specimen render mode', () => {
  afterEach(() => resetSpecimenRenderMode());

  it('defaults to the drawn plate', () => {
    // The plate is the right default for the workstations: cheaper, crisper at
    // tile size, and readable without WebGL.
    expect(specimenRenderMode()).toBe('plate');
  });

  it('flips between the two representations', () => {
    expect(toggleSpecimenRenderMode()).toBe('render');
    expect(specimenRenderMode()).toBe('render');

    expect(toggleSpecimenRenderMode()).toBe('plate');
    expect(specimenRenderMode()).toBe('plate');
  });

  it('persists a choice across reloads', () => {
    setSpecimenRenderMode('render');

    expect(localStorage.getItem(SPECIMEN_RENDER_MODE_STORAGE_KEY)).toBe('render');
    expect(readStoredRenderMode()).toBe('render');
  });

  it('ignores a stored value it does not recognise', () => {
    // Storage is shared with older builds and with hand-editing; an unknown
    // value must fall back rather than putting tiles into a mode that has no
    // renderer behind it.
    localStorage.setItem(SPECIMEN_RENDER_MODE_STORAGE_KEY, 'hologram');

    expect(readStoredRenderMode()).toBeNull();
  });

  it('clears the stored choice on reset', () => {
    setSpecimenRenderMode('render');
    resetSpecimenRenderMode();

    expect(localStorage.getItem(SPECIMEN_RENDER_MODE_STORAGE_KEY)).toBeNull();
    expect(specimenRenderMode()).toBe('plate');
  });
});
