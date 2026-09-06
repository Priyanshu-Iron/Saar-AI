import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import EmptyState from "../ui/EmptyState";
import TranscriptList from "./TranscriptList";

type TranscriptDrawerProps = {
  open: boolean;
  onClose: () => void;
  utterances: IndexedUtterance[];
  focusIndex: number | null;
  live: boolean;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function TranscriptDrawer({ open, onClose, utterances, focusIndex, live }: TranscriptDrawerProps) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Scroll the cited utterance into view whenever it changes while open.
  useEffect(() => {
    if (!open || focusIndex === null) return;
    document.getElementById(`utt-${focusIndex}`)?.scrollIntoView({ block: "center" });
  }, [open, focusIndex]);

  // Move focus to the close button on open.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
    // The desktop aside is non-modal: it must not trap Tab. Only the mobile
    // dialog (a true modal) cycles focus within itself.
    if (isDesktop || event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const visible = query.trim()
    ? utterances.filter((u) => u.text.toLowerCase().includes(query.trim().toLowerCase()))
    : utterances;

  const panel = (
    <div ref={panelRef} onKeyDown={onKeyDown} className="flex h-full flex-col bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-h3">Transcript</h2>
        <span className="text-small text-ink-2">{utterances.length} lines</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close transcript" className={["rounded-control p-1 text-ink-2 hover:text-ink", focusRing].join(" ")}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <label htmlFor={`${headingId}-find`} className="sr-only">Find in transcript</label>
      <input
        id={`${headingId}-find`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in transcript"
        className={["mb-3 h-8 w-full rounded-control border border-line bg-raised px-3 text-small text-ink placeholder:text-ink-2 focus-visible:border-violet", focusRing].join(" ")}
      />
      {utterances.length === 0 ? (
        <EmptyState devanagari="मौन" title="No transcript yet" body={live ? "Lines appear here as people speak." : "The bot didn't capture any speech in this meeting."} className="py-6" />
      ) : (
        <TranscriptList utterances={visible} focusIndex={focusIndex} follow={live && !query} />
      )}
    </div>
  );

  return isDesktop ? (
    <aside aria-label="Transcript" className="h-[calc(100vh-52px)] w-[360px] shrink-0 border-l border-line lg:sticky lg:top-[52px]">
      {panel}
    </aside>
  ) : (
    <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-40">
      {panel}
    </div>
  );
}
export default TranscriptDrawer;
