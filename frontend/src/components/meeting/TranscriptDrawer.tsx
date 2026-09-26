import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import EmptyState from "../ui/EmptyState";
import TranscriptList from "./TranscriptList";

type TranscriptDrawerProps = {
  open: boolean;
  onClose: () => void;
  utterances: IndexedUtterance[];
  /** The cited utterance; `nonce` changes on every citation click, even a repeat. */
  focus: { index: number; nonce: number } | null;
  live: boolean;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function TranscriptDrawer({ open, onClose, utterances, focus, live }: TranscriptDrawerProps) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const focusIndex = focus?.index ?? null;
  const focusNonce = focus?.nonce;
  const pendingScroll = useRef<number | null>(null);

  // Each citation click clears the find query (so the cited line is not filtered out)
  // and queues a scroll to it, even when the same citation is clicked again.
  useEffect(() => {
    if (focusNonce === undefined || focusIndex === null) return;
    pendingScroll.current = focusIndex;
    setQuery("");
  }, [focusNonce]); // keyed on the nonce only: the index travels with it

  // Run the queued scroll once the drawer is open and the query is empty.
  useEffect(() => {
    if (!open || query || pendingScroll.current === null) return;
    document.getElementById(`utt-${pendingScroll.current}`)?.scrollIntoView({ block: "center" });
    pendingScroll.current = null;
  }, [open, query, focusNonce]);

  // Move focus to the close button on open, and again if the layout variant
  // switches (aside <-> dialog) while open, since that remounts the panel
  // and would otherwise leave focus on <body>.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open, isDesktop]);

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

  if (isDesktop) {
    // `main` (below the top bar) is the scroll container, so stick to its top and
    // subtract its vertical padding (py-8) from the height.
    return (
      <aside aria-label="Transcript" className="h-[calc(100vh-52px-4rem)] w-[360px] shrink-0 border-l border-line lg:sticky lg:top-0">
        {panel}
      </aside>
    );
  }
  // The dialog is portalled to <body>: inside <main> (its own stacking context) the
  // sticky top bar and the mobile tab bar would paint over it.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-50 bg-surface">
      {panel}
    </div>,
    document.body,
  );
}
export default TranscriptDrawer;
