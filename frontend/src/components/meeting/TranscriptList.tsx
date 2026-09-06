import { useEffect, useRef, useState } from "react";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import { formatTimestamp } from "../../lib/time";

type Group = { speaker: string; items: IndexedUtterance[] };

function group(utterances: IndexedUtterance[]): Group[] {
  const groups: Group[] = [];
  for (const u of utterances) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === u.speaker) last.items.push(u);
    else groups.push({ speaker: u.speaker, items: [u] });
  }
  return groups;
}

type TranscriptListProps = { utterances: IndexedUtterance[]; focusIndex?: number | null; follow?: boolean };

export function TranscriptList({ utterances, focusIndex = null, follow = false }: TranscriptListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(true); // true until the user scrolls up
  const lastCount = useRef(utterances.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!follow || !el) return;
    if (utterances.length !== lastCount.current) {
      lastCount.current = utterances.length;
      if (stuck) el.scrollTop = el.scrollHeight;
    }
  }, [utterances.length, follow, stuck]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const jump = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setStuck(true);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} onScroll={onScroll} className="h-full overflow-y-auto pr-1">
        {group(utterances).map((g, gi) => (
          <div key={gi} className="mb-4">
            <p className="mb-1 text-small text-cyan">{g.speaker}</p>
            <ul className="space-y-1">
              {g.items.map((u) => {
                const current = u.index === focusIndex;
                return (
                  <li
                    key={u.index}
                    id={`utt-${u.index}`}
                    aria-current={current ? "true" : undefined}
                    className={[
                      "grid grid-cols-[44px_1fr] gap-2 rounded-control px-1 py-0.5 text-body motion-safe:transition-colors motion-safe:duration-1000",
                      current ? "bg-gold/15 ring-1 ring-gold/50" : "",
                    ].join(" ")}
                  >
                    <span className="pt-0.5 text-[11px] text-ink-2">{formatTimestamp(u.timestamp_ms)}</span>
                    <span>{u.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {follow && !stuck ? (
        <button
          type="button"
          onClick={jump}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-control bg-violet px-3 py-1 text-small text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
export default TranscriptList;
