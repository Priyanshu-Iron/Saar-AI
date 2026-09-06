import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
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
