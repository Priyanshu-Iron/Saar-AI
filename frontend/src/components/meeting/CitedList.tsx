import type { Cited } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";

type CitedListProps = { title: string; items: Cited[]; utterances: IndexedUtterance[]; onCite: (i: number) => void; marker?: "gold" | "plain"; ordered?: boolean };

export function CitedList({ title, items, utterances, onCite, marker = "plain", ordered = false }: CitedListProps) {
  if (items.length === 0) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="text-h3">{title}</h3>
      <List aria-label={title} className={["mt-2 space-y-2 text-body", ordered ? "list-decimal pl-5" : ""].join(" ")}>
        {items.map((item, i) => (
          <li key={i} className={marker === "gold" ? "relative pl-4 before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-gold" : ""}>
            {item.text}
            <Citation refs={item.refs} utterances={utterances} onCite={onCite} />
          </li>
        ))}
      </List>
    </div>
  );
}
export default CitedList;
