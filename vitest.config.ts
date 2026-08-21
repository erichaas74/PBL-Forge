import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Jasmine restored spies between specs. Preserve that isolation after the
    // migration so one browser stub cannot leak into the next test.
    clearMocks: true,
    restoreMocks: true,
  },
});
