import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import { signInAs } from "../../test/auth";
import Pending from "../Pending";

function App() {
  return (
    <Routes>
      <Route path="/pending" element={<Pending />} />
      <Route path="/dashboard" element={<p>dashboard page</p>} />
    </Routes>
  );
}

describe("Pending", () => {
  it("explains the wait", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    expect(await screen.findByRole("heading", { name: "Waiting for approval" })).toBeInTheDocument();
  });

  it("says so when the account is still pending", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Still waiting. Check again later.")).toBeInTheDocument();
  });

  it("moves to the dashboard once approved", async () => {
    const me = signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    const button = await screen.findByRole("button", { name: "Check again" });
    me.mockResolvedValue({ email: "user@example.com", status: "approved", is_admin: false });
    await userEvent.setup().click(button);
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });
});
