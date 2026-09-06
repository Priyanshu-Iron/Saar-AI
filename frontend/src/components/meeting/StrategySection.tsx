import type { Strategy } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";
import OwnerChip from "./OwnerChip";

type Props = { data: Strategy; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const th = "px-3 py-2 text-left font-medium";

export function StrategySection({ data, utterances, onCite }: Props) {
  return (
    <>
      {data.priorities.length > 0 ? (
        <div>
          <h3 className="text-h3">Priorities</h3>
          <ol aria-label="Priorities" className="mt-2 list-decimal space-y-3 pl-5 text-body">
            {data.priorities.map((p, i) => (
              <li key={i}>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{p.action}</span>
                  <OwnerChip name={p.owner} />
                  <Citation refs={p.refs} utterances={utterances} onCite={onCite} />
                </div>
                <p className="text-small text-ink-2">{p.why}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {data.risks.length > 0 ? (
        <div>
          <h3 className="text-h3">Risks</h3>
          <div className="mt-2 overflow-x-auto rounded-panel border border-line">
            <table className="w-full text-small">
              <thead className="bg-raised text-ink-2">
                <tr>
                  <th scope="col" className={th}>Risk</th>
                  <th scope="col" className={th}>Likelihood</th>
                  <th scope="col" className={th}>Impact</th>
                  <th scope="col" className={th}>Mitigation</th>
                  <th scope="col" className={th}><span className="sr-only">Source</span></th>
                </tr>
              </thead>
              <tbody>
                {data.risks.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-body">{r.risk}</td>
                    <td className="px-3 py-2">{r.likelihood}</td>
                    <td className="px-3 py-2">{r.impact}</td>
                    <td className="px-3 py-2">{r.mitigation}</td>
                    <td className="px-3 py-2"><Citation refs={r.refs} utterances={utterances} onCite={onCite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <CitedList title="Follow-ups" items={data.followups} utterances={utterances} onCite={onCite} />
      <CitedList title="Resources" items={data.resources} utterances={utterances} onCite={onCite} />
      <CitedList title="Opportunities" items={data.opportunities} utterances={utterances} onCite={onCite} />
      <CitedList title="Next meeting agenda" items={data.agenda} utterances={utterances} onCite={onCite} ordered />
    </>
  );
}
export default StrategySection;
