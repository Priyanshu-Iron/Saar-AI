import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from "../ThemeContext";
import ThemeToggle from "../../components/layout/ThemeToggle";

function Probe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

describe("ThemeContext", () => {
  it("defaults to the system preference when storage is empty", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("reads a stored theme over the system preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("toggles, persists, and updates data-theme", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Probe /><ThemeToggle /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });
});
