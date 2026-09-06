import type { ThreadState } from "../components/ui/Thread";

export type ThreadStatus = { state: ThreadState; label: string };

const MAP: Record<number, ThreadStatus> = {
  1: { state: "joined", label: "Ready to join" },
  2: { state: "joined", label: "Joining" },
  3: { state: "recording", label: "In meeting" },
  4: { state: "recording", label: "Recording" },
  5: { state: "transcribing", label: "Leaving" },
  6: { state: "transcribing", label: "Transcribing" },
  8: { state: "joined", label: "In waiting room" },
  9: { state: "ready", label: "Essence ready" },
  11: { state: "joined", label: "Scheduled" },
};

const UNAVAILABLE: ThreadStatus = { state: "joined", label: "Unavailable" };

/** Maps the backend bot state code to a position on the meeting thread. */
export function botStateToThreadState(state: number): ThreadStatus {
  return MAP[state] ?? UNAVAILABLE;
}

/** Bot states that mean a bot is currently inside a call. */
export function isLiveState(state: number): boolean {
  return state === 3 || state === 4;
}
