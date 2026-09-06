import { type ReactNode } from "react";

type EmptyStateProps = {
  devanagari: string;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ devanagari, title, body, action, className = "" }: EmptyStateProps) {
  return (
    <div className={["flex flex-col items-start gap-3 py-10", className].join(" ")}>
      <span lang="hi" className="text-display text-thread" style={{ fontStretch: "100%", fontWeight: 500 }} aria-hidden="true">
        {devanagari}
      </span>
      <h2 className="text-h2">{title}</h2>
      <p className="max-w-prose text-body text-ink-2">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
