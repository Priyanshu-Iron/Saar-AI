import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/render";
import { signInAs } from "../../test/auth";
import * as api from "../../api";
import Admin from "../Admin";

const USERS: api.AdminUser[] = [
  { id: 2, email: "wait@example.com", status: "pending", joined_at: "2026-09-25T10:00:00", decided_at: null, is_admin: false },
  { id: 3, email: "gone@example.com", status: "disabled", joined_at: "2026-09-20T10:00:00", decided_at: null, is_admin: false },
  { id: 1, email: "admin@example.com", status: "approved", joined_at: "2026-09-01T10:00:00", decided_at: null, is_admin: true },
];

function row(email: string) {
  return screen.getByRole("row", { name: new RegExp(email) });
}

describe("Admin users", () => {
  it("lists accounts with a waiting count and plain-text status", async () => {
    signInAs({ isAdmin: true, email: "admin@example.com" });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    renderWithProviders(<Admin />, { route: "/admin" });
    expect(await screen.findByText("1 waiting for approval")).toBeInTheDocument();
    expect(within(row("wait@example.com")).getByText("Waiting")).toBeInTheDocument();
    expect(within(row("gone@example.com")).getByText("Disabled")).toBeInTheDocument();
    expect(within(row("admin@example.com")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("approves a pending account", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    const approve = vi.spyOn(api.adminApi, "approve").mockResolvedValue({ id: 2, status: "approved" });
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Approve wait@example.com" }));
    expect(approve).toHaveBeenCalledWith(2);
    expect(await within(row("wait@example.com")).findByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("No one is waiting for approval.")).toBeInTheDocument();
  });

  it("re-enables a disabled account", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    const enable = vi.spyOn(api.adminApi, "enable").mockResolvedValue({ id: 3, status: "approved" });
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Enable gone@example.com" }));
    expect(enable).toHaveBeenCalledWith(3);
  });

  it("shows an error when an action fails", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    vi.spyOn(api.adminApi, "disable").mockRejectedValue(new api.ApiError(500, "Server error"));
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Disable wait@example.com" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    expect(within(row("wait@example.com")).getByText("Waiting")).toBeInTheDocument();
  });

  it("shows a retry when the list fails to load", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockRejectedValueOnce(new api.ApiError(503, "Service unavailable")).mockResolvedValue({ users: USERS });
    renderWithProviders(<Admin />, { route: "/admin" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 waiting for approval")).toBeInTheDocument();
  });
});
