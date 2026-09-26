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

const SETTINGS: api.AdminSettings = {
  llm_provider: "openai",
  llm_model: "gpt-4o-mini",
  openai_api_key: { set: true, last4: "a1b2", updated_at: "2026-09-26T12:00:00" },
  google_api_key: { set: false, last4: null, updated_at: null },
  deepgram_api_key: { set: false, last4: null, updated_at: null },
};

async function openKeys() {
  signInAs({ isAdmin: true });
  vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: [] });
  vi.spyOn(api.adminApi, "settings").mockResolvedValue(SETTINGS);
  renderWithProviders(<Admin />, { route: "/admin" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "AI and keys" }));
  await screen.findByLabelText("OpenAI API key");
  return user;
}

describe("Admin keys", () => {
  it("shows whether each key is set without filling it in", async () => {
    await openKeys();
    expect(screen.getByText("Set, ends in a1b2. Updated 26 Sept 2026.")).toBeInTheDocument();
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.getByLabelText("OpenAI API key")).toHaveValue("");
  });

  it("saves only the keys that were typed", async () => {
    const user = await openKeys();
    const save = vi.spyOn(api.adminApi, "saveSettings").mockResolvedValue({
      ...SETTINGS,
      deepgram_api_key: { set: true, last4: "9z9z", updated_at: "2026-09-26T13:00:00" },
    });
    await user.type(screen.getByLabelText("Deepgram API key"), "dg-new-9z9z");
    await user.click(screen.getByRole("button", { name: "Save keys" }));
    expect(save).toHaveBeenCalledWith({ llm_provider: "openai", llm_model: "gpt-4o-mini", deepgram_api_key: "dg-new-9z9z" });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Deepgram API key")).toHaveValue("");
  });

  it("resets the model when the provider changes and warns about a missing key", async () => {
    const user = await openKeys();
    await user.selectOptions(screen.getByLabelText("Provider"), "google");
    expect(screen.getByLabelText("Model")).toHaveValue("gemini-1.5-flash");
    expect(screen.getByText("Add a Gemini API key, or generation will fail.")).toBeInTheDocument();
  });

  it("shows the save error", async () => {
    const user = await openKeys();
    vi.spyOn(api.adminApi, "saveSettings").mockRejectedValue(new api.ApiError(500, "Server error"));
    await user.click(screen.getByRole("button", { name: "Save keys" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  });
});
