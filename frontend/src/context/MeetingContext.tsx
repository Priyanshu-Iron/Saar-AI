import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";
import type { ThreadState } from "../components/ui/Thread";

export type MeetingSummary = { name: string; thread: ThreadState; label: string };

type MeetingContextValue = { current: MeetingSummary | null; setCurrent: (s: MeetingSummary | null) => void };

const MeetingContext = createContext<MeetingContextValue>({ current: null, setCurrent: () => undefined });

export function MeetingProvider({ children }: PropsWithChildren) {
  const [current, setCurrent] = useState<MeetingSummary | null>(null);
  const value = useMemo(() => ({ current, setCurrent }), [current]);
  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export function useMeetingContext() {
  return useContext(MeetingContext);
}
