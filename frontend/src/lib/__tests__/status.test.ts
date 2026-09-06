import { describe, expect, it } from "vitest";
import { botStateToThreadState, isActiveState, isFinishedState, isLiveState } from "../status";

describe("botStateToThreadState", () => {
  it.each([
    [1, "joined", "Ready to join"], [2, "joined", "Joining"], [8, "joined", "In waiting room"], [11, "joined", "Scheduled"], [12, "joined", "Staged"],
    [3, "recording", "In meeting"], [4, "recording", "Recording"], [13, "recording", "Recording paused"],
    [14, "recording", "Joining breakout room"], [15, "recording", "Leaving breakout room"], [16, "recording", "Recording permission denied"],
    [5, "transcribing", "Leaving"], [6, "transcribing", "Transcribing"],
    [9, "ready", "Essence ready"], [10, "ready", "Deleted"],
    [7, "failed", "Failed"],
  ])("maps %i", (code, state, label) => {
    expect(botStateToThreadState(code as number)).toEqual({ state, label });
  });

  it("maps unknown codes to joined Unavailable", () => {
    expect(botStateToThreadState(42)).toEqual({ state: "joined", label: "Unavailable" });
  });
});

describe("helpers", () => {
  it("isLiveState covers in-call states", () => {
    for (const s of [3, 4, 13, 14, 15, 16]) expect(isLiveState(s)).toBe(true);
    for (const s of [1, 2, 5, 6, 7, 9]) expect(isLiveState(s)).toBe(false);
  });
  it("isFinishedState", () => {
    expect(isFinishedState(9)).toBe(true);
    expect(isFinishedState(10)).toBe(true);
    expect(isFinishedState(4)).toBe(false);
  });
  it("isActiveState covers known states that are neither finished nor failed", () => {
    for (const s of [1, 2, 3, 4, 8, 11, 12, 13, 16]) expect(isActiveState(s)).toBe(true);
    for (const s of [7, 9, 10, 42]) expect(isActiveState(s)).toBe(false);
  });
});
