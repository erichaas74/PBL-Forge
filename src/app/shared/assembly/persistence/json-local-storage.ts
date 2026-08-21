export type StoredJsonKey = string | readonly string[];

/**
 * Reads the first available key and hands the parsed, untrusted value to the
 * caller's domain decoder. Missing, invalid, blocked, and quota-constrained
 * storage all resolve to the supplied fallback so an instrument stays usable.
 */
export function readStoredJson<T>(
  key: StoredJsonKey,
  fallback: T,
  decode: (value: unknown) => T,
): T {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return fallback;

    for (const candidate of typeof key === 'string' ? [key] : key) {
      const raw = storage.getItem(candidate);
      if (raw !== null) return decode(JSON.parse(raw) as unknown);
    }
  } catch {
    // Browser privacy settings, corrupt JSON, and decoder errors all fall back.
  }
  return fallback;
}

/** Writes JSON without allowing storage availability or quota to break the caller. */
export function writeStoredJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // The in-memory application state remains authoritative for this session.
  }
}
