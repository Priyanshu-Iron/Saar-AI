import type { Minutes } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";
import OwnerChip from "./OwnerChip";

type Props = { data: Minutes; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const th = "px-3 py-2 text-left font-medium";

export function MinutesSection({ data, utterances, onCite }: Props) {
  return (
    <>
      <p className="max-w-prose text-body">{data.summary}</p>
      <CitedList title="Decisions" items={data.decisions} utterances={utterances} onCite={onCite} marker="gold" />
      {data.actions.length > 0 ? (
        <div>
          <h3 className="text-h3">Action items</h3>
          <div className="mt-2 overflow-x-auto rounded-panel border border-line">
            <table className="w-full text-small">
              <thead className="bg-raised text-ink-2">
                <tr>
                  <th scope="col" className={th}>Action</th>
                  <th scope="col" className={th}>Owner</th>
                  <th scope="col" className={th}>Due</th>
                  <th scope="col" className={th}><span className="sr-only">Source</span></th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((a, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-body">{a.text}</td>
                    <td className="px-3 py-2"><OwnerChip name={a.owner} /></td>
                    <td className="px-3 py-2 text-ink-2">{a.due ?? "No date"}</td>
                    <td className="px-3 py-2"><Citation refs={a.refs} utterances={utterances} onCite={onCite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <CitedList title="Discussion" items={data.discussion} utterances={utterances} onCite={onCite} />
      <CitedList title="Notes" items={data.notes} utterances={utterances} onCite={onCite} />
    </>
  );
}
export default MinutesSection;
