import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import { signInAs } from "../../../test/auth";
import Rail from "../Rail";

describe("Rail", () => {
  it("renders the four navigation links with accessible names", () => {
    renderWithProviders(<Rail />, { route: "/dashboard" });
    for (const name of ["Dashboard", "Meetings", "Chat", "Settings"]) {
      // One link in the desktop rail and one in the mobile tab bar.
      expect(screen.getAllByRole("link", { name })).toHaveLength(2);
    }
  });

  it("marks the current page", () => {
    renderWithProviders(<Rail />, { route: "/meetings" });
    const [meetings] = screen.getAllByRole("link", { name: "Meetings" });
    expect(meetings).toHaveAttribute("aria-current", "page");
  });

  it("exposes the theme toggle", () => {
    renderWithProviders(<Rail />, { route: "/dashboard" });
    expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
  });
});

describe("Rail admin link", () => {
  it("is hidden from regular users", async () => {
    signInAs();
    renderWithProviders(<Rail />, { route: "/dashboard" });
    await screen.findAllByRole("link", { name: "Dashboard" });
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("is shown to the admin", async () => {
    signInAs({ isAdmin: true });
    renderWithProviders(<Rail />, { route: "/dashboard" });
    expect(await screen.findAllByRole("link", { name: "Admin" })).toHaveLength(2);
  });
});
