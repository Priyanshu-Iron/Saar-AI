import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

  it("Dashboard renders live bots on a thread", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Status: Recording" }).length).toBeGreaterThan(0));
  });

  it("Settings exposes the theme toggle", () => {
    renderWithProviders(<Settings />, { route: "/settings" });
    expect(screen.getByRole("button", { name: /Switch to (dark|light) theme/ })).toBeInTheDocument();
  });
});
