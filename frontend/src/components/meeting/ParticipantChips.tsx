import type { Participant } from "../../api";

export function ParticipantChips({ participants }: { participants: Participant[] }) {
  const ordered = [...participants].sort((a, b) => Number(b.is_host) - Number(a.is_host));
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Participants">
      {ordered.map((p) => (
        <li
          key={p.id}
          className={["rounded-full border px-2 py-0.5 text-small", p.is_host ? "border-gold text-gold" : "border-line text-ink-2"].join(" ")}
        >
          {p.full_name}{p.is_host ? " · host" : ""}
        </li>
      ))}
    </ul>
  );
}

export default ParticipantChips;
