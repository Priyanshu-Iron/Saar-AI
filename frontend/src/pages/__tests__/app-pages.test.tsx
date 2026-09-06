import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import * as api from "../../api";
import Dashboard from "../Dashboard";
import Meetings from "../Meetings";
import Settings from "../Settings";

const meeting = { id: 7, object_id: "bot_7", name: "Q3 vendor review", meeting_url: "https://meet.example/abc", state: 4, created_at: "2026-09-01T10:00:00Z" };

beforeEach(() => {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
  vi.spyOn(api.meetingsApi, "list").mockResolvedValue({ count: 1, meetings: [meeting] });
  vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 1, bots: [meeting] });
});

function NavigateTo({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
}

describe("app pages under the new identity", () => {
  it("Meetings renders status as a thread, not a pill", async () => {
    renderWithProviders(<Meetings />, { route: "/meetings" });
    await waitFor(() => expect(screen.getByText("Q3 vendor review")).toBeInTheDocument());
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(document.querySelector(".animate-ping")).toBeNull();
  });

  it("Meetings reads the initial search from the URL", async () => {
    renderWithProviders(<Meetings />, { route: "/meetings?q=vendor" });
    await waitFor(() => expect(screen.getByDisplayValue("vendor")).toBeInTheDocument());
  });

  it("Meetings picks up a new ?q= while it is already mounted", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Meetings />
        <NavigateTo to="/meetings?q=vendor" />
      </>,
      { route: "/meetings" },
    );
    const input = screen.getByPlaceholderText("Search meetings…");
    await waitFor(() => expect(input).toHaveValue(""));

    await user.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() => expect(screen.getByPlaceholderText("Search meetings…")).toHaveValue("vendor"));
  });

  it("Dashboard shows live bots on threads and recent meetings with teasers", async () => {
    vi.spyOn(api.meetingsApi, "recent").mockResolvedValue({ count: 2, meetings: [
      { meeting: { ...meeting, id: 9, name: "Hiring sync", state: 9 }, teaser: "Hire two engineers" },
      { meeting: { ...meeting, id: 10, name: "Board prep", state: 9 }, teaser: null },
    ] });
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(await screen.findByRole("heading", { name: "Live now" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(await screen.findByText("Hire two engineers")).toBeInTheDocument();
    expect(screen.getByText("Essence pending")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hiring sync/ })).toHaveAttribute("href", "/meetings/9");
    expect(screen.queryByText("Total meetings")).not.toBeInTheDocument();
  });

  it("Dashboard hides Live now when nothing is live", async () => {
    vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
    vi.spyOn(api.meetingsApi, "recent").mockResolvedValue({ count: 0, meetings: [] });
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(await screen.findByRole("heading", { name: "Recent" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Live now" })).not.toBeInTheDocument();
  });

  it("Dashboard shows a just-sent bot under Live now while it is joining", async () => {
    vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 1, bots: [{ ...meeting, state: 2, name: "Just sent" }] });
    vi.spyOn(api.meetingsApi, "recent").mockResolvedValue({ count: 0, meetings: [] });
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(await screen.findByRole("heading", { name: "Live now" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Joining" })).toBeInTheDocument();
  });

  it("Meetings rows link to the workspace and live meetings sort first", async () => {
    vi.spyOn(api.meetingsApi, "list").mockResolvedValue({ count: 2, meetings: [
      { ...meeting, id: 1, name: "Old finished", state: 9, created_at: "2026-09-05T10:00:00Z" },
      { ...meeting, id: 2, name: "Happening now", state: 4, created_at: "2026-09-01T10:00:00Z" },
    ] });
    renderWithProviders(<Meetings />, { route: "/meetings" });
    const links = await screen.findAllByRole("link", { name: /Old finished|Happening now/ });
    expect(links[0]).toHaveAttribute("href", "/meetings/2");
    expect(links[1]).toHaveAttribute("href", "/meetings/1");
    expect(screen.queryByRole("link", { name: "Details" })).not.toBeInTheDocument();
  });

  it("Meetings shows an error with retry when the list fails", async () => {
    vi.spyOn(api.meetingsApi, "list").mockRejectedValueOnce(new api.ApiError(503, "Service unavailable")).mockResolvedValue({ count: 0, meetings: [] });
    renderWithProviders(<Meetings />, { route: "/meetings" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "No meetings yet" })).toBeInTheDocument();
  });

  it("Settings exposes the theme toggle", () => {
    renderWithProviders(<Settings />, { route: "/settings" });
    expect(screen.getByRole("button", { name: /Switch to (dark|light) theme/ })).toBeInTheDocument();
  });
});
