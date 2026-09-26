import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import * as api from "../../api";
import TopBar from "../../components/layout/TopBar";
import MeetingDetail from "../MeetingDetail";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });

const minutes: api.Minutes = { summary: "Vendor change agreed.", discussion: [], decisions: [{ text: "Change vendor for Q3", refs: [1] }], actions: [], notes: [] };
const outputs: api.OutputsResponse = { bot_id: 7, has_outputs: true, outputs: {
  mom: { format: "json", content: minutes, created_at: "x" },
  insights: { format: "json", content: { participation: [], themes: [], patterns: [], concerns: [], sentiment: { overall: "neutral", note: "n" }, takeaways: [] }, created_at: "x" },
  strategy: { format: "json", content: { priorities: [], followups: [], resources: [], risks: [], opportunities: [], agenda: [] }, created_at: "x" },
} };
const detailOf = (state: number, name = "Q3 vendor review") => ({
  meeting: { id: 7, object_id: "b", name, meeting_url: "u", state, created_at: "2026-09-02T10:00:00Z" },
  participants: [{ id: 1, full_name: "Ravi", email: null, is_host: true }, { id: 2, full_name: "Meena", email: null, is_host: false }],
});

beforeEach(() => {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
  vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(9));
  vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue({ bot_id: 7, utterance_count: 2, transcript: [
    { speaker: "Ravi", timestamp_ms: 0, duration_ms: 1000, text: "Delivery slipped" },
    { speaker: "Ravi", timestamp_ms: 724_000, duration_ms: 1000, text: "So we change vendor" },
  ] });
  vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(outputs);
  vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
});

function renderPage(route = "/meetings/7") {
  return renderWithProviders(
    <Routes>
      <Route path="/meetings/:botId" element={<MeetingDetail />} />
    </Routes>,
    { route },
  );
}

/** The page inside the shell, so the MeetingContext handoff to the top bar is exercised. */
function renderWithTopBar(route = "/meetings/7") {
  return renderWithProviders(
    <>
      <TopBar />
      <Routes>
        <Route path="/meetings/:botId" element={<MeetingDetail />} />
      </Routes>
    </>,
    { route },
  );
}

describe("MeetingDetail", () => {
  it("renders the header, thread, and essence for a ready meeting", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Q3 vendor review" })).toBeInTheDocument();
    expect(screen.getByText("Ravi · host")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Essence ready" })).toBeInTheDocument();
    expect(await screen.findByText("Vendor change agreed.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("opens the transcript drawer on a citation and marks the utterance current", async () => {
    renderPage();
    const cite = await screen.findByRole("button", { name: "Show source at 12:04" });
    await userEvent.setup().click(cite);
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
  });

  it("scrolls again when the same citation is clicked twice", async () => {
    const spy = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    renderPage();
    const cite = await screen.findByRole("button", { name: "Show source at 12:04" });
    spy.mockClear();
    await user.click(cite);
    await user.click(cite);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("clears the citation highlight 1500 ms after the last click", async () => {
    renderPage();
    const cite = await screen.findByRole("button", { name: "Show source at 12:04" });
    vi.useFakeTimers();
    try {
      fireEvent.click(cite);
      expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
      act(() => { vi.advanceTimersByTime(1000); });
      fireEvent.click(cite); // a new click restarts the timer
      act(() => { vi.advanceTimersByTime(1000); });
      expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
      act(() => { vi.advanceTimersByTime(500); });
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the drawer from the URL", async () => {
    renderPage("/meetings/7?transcript=open");
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
  });

  it("shows the waiting state for a live meeting with the drawer open", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(4, "Live one"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Essence arrives when the call ends" })).toBeInTheDocument();
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
  });

  it("keeps the drawer closed once the reader closes it during a live meeting", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(4, "Live one"));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close transcript" }));

    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Show transcript" })).toBeInTheDocument();

    // The effect must not reopen it on the re-render that the URL change causes.
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument());
  });

  it("shows the waiting state while the recording is being transcribed", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(6, "Wrapping up"));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Essence arrives when the call ends" })).toBeInTheDocument();
    expect(screen.getByText("The call has ended and the recording is being transcribed.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("publishes the meeting name and thread to the top bar", async () => {
    renderWithTopBar();

    expect(await screen.findByText("Meetings / Q3 vendor review")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Status: Essence ready" })).toHaveLength(2));
  });

  it("shows the failed state", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(7, "Broken"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("The bot could not complete this meeting");
    expect(screen.getByRole("img", { name: "Status: Failed" })).toBeInTheDocument();
  });

  it("shows not found", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockRejectedValue(new api.ApiError(404, "Meeting not found"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Meeting not found" })).toBeInTheDocument();
  });

  it("offers a retry when the initial load fails for another reason", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockRejectedValue(new api.ApiError(503, "Service unavailable"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
