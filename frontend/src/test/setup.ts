import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom has no matchMedia. Default to light and desktop-width; tests override with vi.spyOn.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

// @testing-library/dom's `waitFor` only auto-advances fake timers when it detects a
// jest-shaped global (see `jestFakeTimersAreEnabled` in @testing-library/dom). Vitest's
// `vi.useFakeTimers()` doesn't define that global, so without this shim any `waitFor`
// used while fake timers are active hangs until the real per-test timeout fires, even
// once the awaited condition is already true. This is a no-op except when a test has
// fake timers active.
if (typeof (globalThis as unknown as { jest?: unknown }).jest === "undefined") {
  (globalThis as unknown as { jest: { advanceTimersByTime: (ms: number) => unknown } }).jest = {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  };
}
