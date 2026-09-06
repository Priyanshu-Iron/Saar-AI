import type { Insights } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";

type Props = { data: Insights; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const sentimentClass = { positive: "text-cyan", neutral: "text-ink-2", tense: "text-gold" } as const;

export function InsightsSection({ data, utterances, onCite }: Props) {
  return (
    <>
      {data.participation.length > 0 ? (
        <div>
          <h3 className="text-h3">Participation</h3>
          <ul className="mt-2 space-y-3" aria-label="Participation">
            {data.participation.map((p) => {
              const pct = Math.round(p.share * 100);
              return (
                <li key={p.name} className="grid grid-cols-[120px_1fr_44px] items-center gap-x-3 gap-y-1 text-small">
                  <span className="truncate">{p.name}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <span className="block h-full rounded-full bg-thread" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right text-ink-2">{pct}%</span>
                  <span className="col-span-3 text-ink-2">{p.note}<Citation refs={p.refs} utterances={utterances} onCite={onCite} /></span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <CitedList title="Themes" items={data.themes} utterances={utterances} onCite={onCite} />
      <CitedList title="Patterns" items={data.patterns} utterances={utterances} onCite={onCite} />
      <CitedList title="Concerns" items={data.concerns} utterances={utterances} onCite={onCite} />
      <div>
        <h3 className="text-h3">Sentiment</h3>
        <p className="mt-2 text-body">
          <span className={["font-semibold", sentimentClass[data.sentiment.overall]].join(" ")}>{data.sentiment.overall}</span>
          <span className="text-ink-2">. {data.sentiment.note}</span>
        </p>
      </div>
      <CitedList title="Takeaways" items={data.takeaways} utterances={utterances} onCite={onCite} marker="gold" />
    </>
  );
}
export default InsightsSection;
