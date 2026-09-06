export type ThreadState = "joined" | "recording" | "transcribing" | "ready";

export const THREAD_STEPS: ReadonlyArray<{ state: ThreadState; label: string }> = [
  { state: "joined", label: "Bot joined" },
  { state: "recording", label: "Recording" },
  { state: "transcribing", label: "Transcribing" },
  { state: "ready", label: "Essence ready" },
];

type ThreadSize = "inline" | "card" | "large";

type ThreadProps = {
  state: ThreadState;
  size?: ThreadSize;
  label?: string;
  className?: string;
};

const widthBySize: Record<ThreadSize, string> = {
  inline: "w-16",
  card: "w-full",
  large: "w-full",
};

const markerClass: Record<"done" | "now" | "todo", string> = {
  done: "bg-cyan border-cyan",
  now: "bg-gold border-gold shadow-[0_0_10px_rgb(var(--gold))]",
  todo: "bg-surface border-violet",
};

export function Thread({ state, size = "card", label, className = "" }: ThreadProps) {
  const current = THREAD_STEPS.findIndex((step) => step.state === state);
  const stepLabel = THREAD_STEPS[current]?.label ?? "Unavailable";
  const markerSize = size === "inline" ? "h-2 w-2 -top-[3px]" : "h-2.5 w-2.5 -top-1";

  return (
    <div
      role="img"
      aria-label={label ?? `Status: ${stepLabel}`}
      className={[widthBySize[size], className].join(" ")}
    >
      <div className="relative h-0.5 rounded-full bg-thread thread-draw">
        {THREAD_STEPS.map((step, index) => {
          const kind = index < current ? "done" : index === current ? "now" : "todo";
          const left = `${(index / (THREAD_STEPS.length - 1)) * 100}%`;
          return (
            <span
              key={step.state}
              data-marker={kind}
              aria-hidden="true"
              className={[
                "absolute -translate-x-1/2 rounded-full border-2",
                markerSize,
                markerClass[kind],
              ].join(" ")}
              style={{ left }}
            />
          );
        })}
      </div>
      {size === "large" ? (
        <div className="mt-2 flex justify-between text-small text-ink-2" aria-hidden="true">
          {THREAD_STEPS.map((step) => (
            <span key={step.state}>{step.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default Thread;
