import type { IndexedUtterance } from "../../hooks/useMeeting";
import { formatTimestamp } from "../../lib/time";

type CitationProps = { refs: number[]; utterances: IndexedUtterance[]; onCite: (index: number) => void };

export function Citation({ refs, utterances, onCite }: CitationProps) {
  if (refs.length === 0) return null;
  const first = refs[0];
  const utterance = utterances[first];
  const stamp = utterance ? formatTimestamp(utterance.timestamp_ms) : `#${first}`;
  const more = refs.length - 1;
  return (
    <button
      type="button"
      onClick={() => onCite(first)}
      aria-label={`Show source at ${stamp}`}
      className="ml-2 inline-flex items-center gap-1 rounded-control border border-cyan/40 px-1.5 py-0.5 text-[11px] leading-none text-cyan hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
    >
      <span>{stamp}</span>
      {more > 0 ? <span className="text-ink-2">+{more}</span> : null}
    </button>
  );
}

export default Citation;
