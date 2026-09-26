import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import * as api from "../../api";
import { signInAs } from "../../test/auth";

function Probe() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p data-testid="user">{user ? `${user.email}|${user.status}|${user.isAdmin}` : "signed out"}</p>;
}

const renderProbe = () => render(<AuthProvider><Probe /></AuthProvider>);

describe("AuthContext", () => {
  it("refreshes status and admin flag from /auth/me on load", async () => {
    signInAs({ email: "a@example.com", status: "pending" });
    vi.spyOn(api.authApi, "me").mockResolvedValue({ email: "a@example.com", status: "approved", is_admin: true });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|approved|true"));
    expect(JSON.parse(window.localStorage.getItem("saarai_auth_user") ?? "{}")).toMatchObject({ status: "approved", isAdmin: true });
  });

  it("signs out when /auth/me rejects the key", async () => {
    signInAs();
    vi.spyOn(api.authApi, "me").mockRejectedValue(new api.ApiError(401, "Invalid or disabled API key"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("signed out"));
    expect(window.localStorage.getItem("saarai_api_key")).toBeNull();
  });

  it("keeps the stored session when /auth/me cannot be reached", async () => {
    signInAs({ email: "a@example.com" });
    vi.spyOn(api.authApi, "me").mockRejectedValue(new TypeError("Failed to fetch"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|approved|false"));
  });

  it("moves to pending when the API reports account_pending", async () => {
    signInAs({ email: "a@example.com" });
    renderProbe();
    await screen.findByText("a@example.com|approved|false");
    act(() => {
      window.dispatchEvent(new CustomEvent(api.ACCESS_EVENT, { detail: "account_pending" }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|pending|false");
  });

  it("signs out when the API reports account_disabled", async () => {
    signInAs({ email: "a@example.com" });
    renderProbe();
    await screen.findByText("a@example.com|approved|false");
    act(() => {
      window.dispatchEvent(new CustomEvent(api.ACCESS_EVENT, { detail: "account_disabled" }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("signed out");
  });
});
