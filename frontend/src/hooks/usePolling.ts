import { useEffect, useRef } from "react";

/**
 * Runs `fn` every `intervalMs` while `intervalMs` is a number and the document
 * is visible. Pass null to stop. Overlapping runs are skipped. Runs once
 * immediately unless `immediate` is false.
 */
export function usePolling(fn: () => Promise<void> | void, intervalMs: number | null, immediate = true): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (intervalMs === null) return;
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        await fnRef.current();
      } finally {
        inFlight = false;
      }
    };

    if (immediate) void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
