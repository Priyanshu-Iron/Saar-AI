import Thread, { type ThreadState } from "../ui/Thread";

type StatusThreadProps = {
  state: ThreadState;
  label: string;
  size?: "inline" | "card";
  className?: string;
};

/** A Thread with its visible label; the label is decorative because the Thread carries the accessible name. */
export function StatusThread({ state, label, size = "inline", className = "" }: StatusThreadProps) {
  return (
    <span className={["inline-flex items-center gap-3", className].join(" ")}>
      <Thread state={state} size={size} label={`Status: ${label}`} className={size === "card" ? "max-w-[240px]" : ""} />
      <span aria-hidden="true" className="text-small text-ink-2">{label}</span>
    </span>
  );
}

export default StatusThread;
