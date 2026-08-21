// jsdom intentionally implements only browser APIs that do not require layout.
// Keep the few primitives used by component tests here instead of repeating
// environment stubs across the student and Designer suites.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: {
      configurable: true,
      writable: true,
      value: () => undefined,
    },
    releasePointerCapture: {
      configurable: true,
      writable: true,
      value: () => undefined,
    },
    hasPointerCapture: {
      configurable: true,
      writable: true,
      value: () => false,
    },
  });
}
