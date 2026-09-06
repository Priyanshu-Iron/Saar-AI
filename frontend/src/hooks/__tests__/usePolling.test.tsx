import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePolling } from "../usePolling";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

async function flush() { await act(async () => { await Promise.resolve(); }); }

describe("usePolling", () => {
  it("runs immediately and then every interval", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(fn, 1000));
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(2);

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not run immediately when immediate is false", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(fn, 1000, false));
    await flush();
    expect(fn).toHaveBeenCalledTimes(0);

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("pauses while the document is hidden", async () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    const fn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(fn, 1000));
    await flush();
    expect(fn).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(fn).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops on unmount", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePolling(fn, 1000));
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops when intervalMs becomes null", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ ms }: { ms: number | null }) => usePolling(fn, ms), {
      initialProps: { ms: 1000 as number | null },
    });
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    rerender({ ms: null });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
