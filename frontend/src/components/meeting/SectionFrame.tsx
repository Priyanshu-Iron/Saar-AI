import { type ReactNode } from "react";
import ErrorNotice from "../ui/ErrorNotice";
import Skeleton from "../ui/Skeleton";
import LegacyMarkdown from "./LegacyMarkdown";
import type { SectionState } from "../../hooks/useMeeting";

type SectionFrameProps = { id: string; title: string; state: SectionState; onRetry: () => void; children: ReactNode };

export function SectionFrame({ id, title, state, onRetry, children }: SectionFrameProps) {
  if (state.status === "empty") return null;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 py-6 first:pt-0">
      <h2 id={`${id}-heading`} className="text-h2">{title}</h2>
      {state.notice && (state.status === "ready" || state.status === "legacy") && (
        <ErrorNotice className="mt-4" message={state.notice} onRetry={onRetry} />
      )}
      {state.status === "generating" ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        </div>
      ) : state.status === "error" ? (
        <ErrorNotice className="mt-4" message={state.error ?? "Could not generate this section."} onRetry={onRetry} />
      ) : state.status === "legacy" ? (
        <LegacyMarkdown markdown={state.markdown ?? ""} onRegenerate={onRetry} />
      ) : (
        <div className="mt-4 space-y-6">{children}</div>
      )}
    </section>
  );
}

export default SectionFrame;
