import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatTimestamp } from "../time";

describe("time", () => {
  it("formats timestamps as m:ss", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65_000)).toBe("1:05");
    expect(formatTimestamp(724_500)).toBe("12:04");
  });
  it("formats durations", () => {
    expect(formatDuration(42 * 60_000)).toBe("42 min");
    expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
    expect(formatDuration(20_000)).toBe("1 min");
  });
  it("formats dates as weekday day month", () => {
    expect(formatDate("2026-09-02T10:00:00Z")).toMatch(/^\w{3} 2 Sep$/);
  });
});
