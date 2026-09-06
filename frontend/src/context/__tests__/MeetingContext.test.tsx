import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MeetingProvider, useMeetingContext } from "../MeetingContext";

describe("MeetingContext", () => {
  it("stores and clears the current meeting summary", () => {
    const { result } = renderHook(() => useMeetingContext(), { wrapper: MeetingProvider });
    expect(result.current.current).toBeNull();
    act(() => result.current.setCurrent({ name: "Q3", thread: "recording", label: "Recording" }));
    expect(result.current.current?.name).toBe("Q3");
    act(() => result.current.setCurrent(null));
    expect(result.current.current).toBeNull();
  });
});
