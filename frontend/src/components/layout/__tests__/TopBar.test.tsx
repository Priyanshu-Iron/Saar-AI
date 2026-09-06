import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import * as api from "../../../api";
import TopBar from "../TopBar";

describe("TopBar", () => {
  beforeEach(() => {
    window.localStorage.setItem("saarai_api_key", "k");
    window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
    vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
  });

  it("renders the account menu and search input", async () => {
    renderWithProviders(<TopBar />, { route: "/dashboard" });

    expect(await screen.findByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search meetings")).toBeInTheDocument();
  });
});
