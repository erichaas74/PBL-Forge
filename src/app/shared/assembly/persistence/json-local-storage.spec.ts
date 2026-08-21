import { readStoredJson, writeStoredJson } from './json-local-storage';

describe('JSON local storage', () => {
  beforeEach(() => localStorage.clear());

  it('decodes the first available key', () => {
    localStorage.setItem('legacy', JSON.stringify({ count: 3 }));

    expect(
      readStoredJson(['current', 'legacy'], 0, (value) =>
        typeof value === 'object' && value !== null
          ? Number((value as Record<string, unknown>)['count'])
          : 0,
      ),
    ).toBe(3);
  });

  it('falls back for missing, invalid, or rejected data', () => {
    expect(readStoredJson('missing', 'fallback', String)).toBe('fallback');
    localStorage.setItem('broken', '{');
    expect(readStoredJson('broken', 'fallback', String)).toBe('fallback');
    localStorage.setItem('rejected', '{}');
    expect(
      readStoredJson('rejected', 'fallback', () => {
        throw new Error('invalid schema');
      }),
    ).toBe('fallback');
  });

  it('serializes values consistently', () => {
    writeStoredJson('value', { ready: true });

    expect(localStorage.getItem('value')).toBe('{"ready":true}');
  });
});
