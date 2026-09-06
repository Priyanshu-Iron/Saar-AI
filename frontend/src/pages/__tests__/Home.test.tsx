import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import Home from "../Home";

describe("Home", () => {
  it("renders the hero headline with the Devanagari word and both actions", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every meeting, reduced to its सार");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows the demo meeting on a finished thread", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    expect(screen.getByRole("img", { name: "Status: Essence ready" })).toBeInTheDocument();
    expect(screen.getByText("Q3 vendor review")).toBeInTheDocument();
  });

  it("lists the three steps", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    for (const step of ["Send the bot", "Read both languages", "Get the essence"]) {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    }
  });
});
