import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/render";
import Login from "../Login";
import Signup from "../Signup";
import NotFound from "../NotFound";
import * as api from "../../api";

describe("Login", () => {
  it("shows the credential error copy when login fails", async () => {
    vi.spyOn(api.authApi, "login").mockRejectedValueOnce(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });
    await user.type(screen.getByLabelText("Work email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("That password doesn't match this email. Try again."),
    );
  });

  it("shows the network error copy with a retry when fetch fails", async () => {
    vi.spyOn(api.authApi, "login").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });
    await user.type(screen.getByLabelText("Work email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach SaarAI. Check your connection and try again."),
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("has no social buttons or forgot-password link", () => {
    renderWithProviders(<Login />, { route: "/login" });
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
  });
});

describe("Signup", () => {
  it("stores the name locally after registering", async () => {
    vi.spyOn(api.authApi, "register").mockResolvedValueOnce({ api_key: "k", message: "ok" });
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });
    await user.type(screen.getByLabelText("Full name"), "Priya");
    await user.type(screen.getByLabelText("Work email"), "p@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("saarai_auth_user") ?? "{}")).toEqual({ email: "p@b.com", name: "Priya" }),
    );
  });

  it("rejects a short password before calling the API", async () => {
    const register = vi.spyOn(api.authApi, "register");
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });
    await user.type(screen.getByLabelText("Full name"), "Priya");
    await user.type(screen.getByLabelText("Work email"), "p@b.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});

describe("NotFound", () => {
  it("renders the empty state with a link to the dashboard", () => {
    renderWithProviders(<NotFound />, { route: "/nowhere" });
    expect(screen.getByRole("heading", { name: "There's nothing here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});
