import { describe, expect, it } from "vitest";
import { botStateToThreadState } from "../status";

describe("botStateToThreadState", () => {
  it("maps pre-join states to joined with their own label", () => {
    expect(botStateToThreadState(1)).toEqual({ state: "joined", label: "Ready to join" });
    expect(botStateToThreadState(2)).toEqual({ state: "joined", label: "Joining" });
    expect(botStateToThreadState(8)).toEqual({ state: "joined", label: "In waiting room" });
    expect(botStateToThreadState(11)).toEqual({ state: "joined", label: "Scheduled" });
  });

  it("maps in-meeting states to recording", () => {
    expect(botStateToThreadState(3)).toEqual({ state: "recording", label: "In meeting" });
    expect(botStateToThreadState(4)).toEqual({ state: "recording", label: "Recording" });
  });

  it("maps post-meeting processing to transcribing", () => {
    expect(botStateToThreadState(5)).toEqual({ state: "transcribing", label: "Leaving" });
    expect(botStateToThreadState(6)).toEqual({ state: "transcribing", label: "Transcribing" });
  });

  it("maps 9 to ready", () => {
    expect(botStateToThreadState(9)).toEqual({ state: "ready", label: "Essence ready" });
  });

  it("maps the error state to joined with Error, and unknown states to Unavailable", () => {
    expect(botStateToThreadState(7)).toEqual({ state: "joined", label: "Error" });
    expect(botStateToThreadState(42)).toEqual({ state: "joined", label: "Unavailable" });
  });
});
