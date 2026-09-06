import type { ThreadState } from "../components/ui/Thread";

export type ThreadStatus = { state: ThreadState; label: string };

const MAP: Record<number, ThreadStatus> = {
  1: { state: "joined", label: "Ready to join" },
  2: { state: "joined", label: "Joining" },
  8: { state: "joined", label: "In waiting room" },
  11: { state: "joined", label: "Scheduled" },
  12: { state: "joined", label: "Staged" },
  3: { state: "recording", label: "In meeting" },
  4: { state: "recording", label: "Recording" },
  13: { state: "recording", label: "Recording paused" },
  14: { state: "recording", label: "Joining breakout room" },
  15: { state: "recording", label: "Leaving breakout room" },
  16: { state: "recording", label: "Recording permission denied" },
  5: { state: "transcribing", label: "Leaving" },
  6: { state: "transcribing", label: "Transcribing" },
  9: { state: "ready", label: "Essence ready" },
  10: { state: "ready", label: "Deleted" },
  7: { state: "failed", label: "Failed" },
};

const UNAVAILABLE: ThreadStatus = { state: "joined", label: "Unavailable" };

/** Maps the backend bot state code to a position on the meeting thread. */
export function botStateToThreadState(state: number): ThreadStatus {
  return MAP[state] ?? UNAVAILABLE;
}

/** Bot states that mean a bot is currently inside a call. */
export function isLiveState(state: number): boolean {
  return [3, 4, 13, 14, 15, 16].includes(state);
}

/** Bot states after which no more transcript will arrive. */
export function isFinishedState(state: number): boolean {
  return state === 9 || state === 10;
}

/** Bot states worth showing as "live now": known codes that are neither finished nor failed. */
export function isActiveState(state: number): boolean {
  return state in MAP && !isFinishedState(state) && state !== 7;
}
