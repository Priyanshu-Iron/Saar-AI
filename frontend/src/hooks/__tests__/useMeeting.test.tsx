import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useMeeting } from "../useMeeting";

const meeting = (state: number) => ({ meeting: { id: 7, object_id: "b", name: "Q3", meeting_url: "u", state, created_at: "2026-09-02T10:00:00Z" }, participants: [] });
const transcript = (n: number) => ({ bot_id: 7, utterance_count: n, transcript: Array.from({ length: n }, (_, i) => ({ speaker: "Ravi", timestamp_ms: i * 1000, duration_ms: 500, text: `line ${i}` })) });
const minutes = { summary: "s", discussion: [], decisions: [{ text: "d", refs: [0] }], actions: [], notes: [] };
const jsonOutputs = (keys: api.SectionKey[]) => ({
  bot_id: 7, has_outputs: keys.length > 0,
  outputs: Object.fromEntries(keys.map((k) => [k, { format: "json", content: minutes, created_at: "x" }])),
}) as api.OutputsResponse;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

async function flush() { await act(async () => { await Promise.resolve(); }); }

describe("useMeeting", () => {
  it("polls transcript while live, then generates when the meeting ends", async () => {
    const detail = vi.spyOn(api.meetingsApi, "detail").mockResolvedValueOnce(meeting(4)).mockResolvedValue(meeting(9));
    const tr = vi.spyOn(api.meetingsApi, "transcript").mockResolvedValueOnce(transcript(1)).mockResolvedValue(transcript(2));
    const outputs = vi.spyOn(api.meetingsApi, "outputs").mockResolvedValueOnce(jsonOutputs([])).mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const all = vi.spyOn(api.generateApi, "all").mockResolvedValue({ bot_id: 7, done: ["mom", "insights", "strategy"], failed: {} });
    vi.spyOn(api.generateApi, "status").mockResolvedValueOnce({ running: true, done: ["mom"] }).mockResolvedValue({ running: false, done: ["mom", "insights", "strategy"] });

    const { result } = renderHook(() => useMeeting(7));
    await flush(); await flush();
    expect(result.current.phase).toBe("live");
    expect(result.current.utterances).toHaveLength(1);
    expect(result.current.utterances[0].index).toBe(0);

    await act(async () => { vi.advanceTimersByTime(5000); }); await flush(); await flush();
    expect(detail).toHaveBeenCalledTimes(2);
    expect(tr).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.phase).toBe("generating"));
    expect(all).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.essence.mom.status).toBe("ready");
    expect(outputs).toHaveBeenCalled();
  });

  it("is ready immediately when json outputs exist and does not generate", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(3));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const all = vi.spyOn(api.generateApi, "all");
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(all).not.toHaveBeenCalled();
    expect(result.current.essence.strategy.status).toBe("ready");
  });

  it("marks markdown outputs as legacy and still generates missing sections", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue({ bot_id: 7, has_outputs: false, outputs: { mom: { format: "markdown", content: "### old", created_at: "x" } } });
    vi.spyOn(api.generateApi, "all").mockResolvedValue({ bot_id: 7, done: [], failed: {} });
    vi.spyOn(api.generateApi, "status").mockResolvedValue({ running: false, done: [] });
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    await waitFor(() => expect(result.current.phase).not.toBe("loading"));
    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.essence.mom.status).toBe("legacy");
    expect(result.current.essence.mom.markdown).toBe("### old");
    expect(result.current.essence.insights.status).toBe("error");
  });

  it("treats a 409 from generate as already running", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs([]));
    vi.spyOn(api.generateApi, "all").mockRejectedValue(new api.ApiError(409, "Generation already running"));
    vi.spyOn(api.generateApi, "status").mockResolvedValue({ running: true, done: [] });
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    await waitFor(() => expect(result.current.phase).toBe("generating"));
    expect(result.current.error).toBeNull();
  });

  it("reports failed bots and not-found meetings", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(7));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(0));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs([]));
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    await waitFor(() => expect(result.current.phase).toBe("failed"));

    vi.spyOn(api.meetingsApi, "detail").mockRejectedValue(new api.ApiError(404, "Meeting not found"));
    const { result: r2 } = renderHook(() => useMeeting(8));
    await flush();
    await waitFor(() => expect(r2.current.phase).toBe("notfound"));
  });

  it("regenerate marks the section generating then ready", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const mom = vi.spyOn(api.generateApi, "mom").mockResolvedValue({ bot_id: 7, type: "mom", format: "json", content: minutes });
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    await act(async () => { await result.current.regenerate("mom"); });
    expect(mom).toHaveBeenCalledWith(7);
    expect(result.current.essence.mom.status).toBe("ready");
  });

  it("clears a stale error once a poll succeeds", async () => {
    vi.spyOn(api.meetingsApi, "detail")
      .mockRejectedValueOnce(new api.ApiError(503, "Service unavailable"))
      .mockResolvedValue(meeting(4));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs([]));
    const { result } = renderHook(() => useMeeting(7));
    await flush();
    expect(result.current.error).toBe("Service unavailable");
    expect(result.current.phase).toBe("loading");

    act(() => { result.current.retry(); });
    await flush();
    expect(result.current.error).toBeNull();
    expect(result.current.phase).toBe("live");
  });
});
