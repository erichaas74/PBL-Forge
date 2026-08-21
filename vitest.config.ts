import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Jasmine restored spies between specs. Preserve that isolation after the
    // migration so one browser stub cannot leak into the next test.
    clearMocks: true,
    restoreMocks: true,
    // Several rendering suites construct full Three.js scenes. Letting Vitest
    // occupy every available core makes otherwise-fast specs intermittently
    // exceed their timeout while the complete browser suite is under load.
    maxWorkers: 2,
    // Canvas texture generation and full Three.js scene construction can cross
    // ten seconds when both workers are competing with the full browser suite.
    testTimeout: 15_000,
  },
});
