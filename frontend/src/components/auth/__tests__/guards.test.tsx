import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../../test/render";
import { signInAs } from "../../../test/auth";
import ProtectedRoute from "../ProtectedRoute";
import AdminRoute from "../AdminRoute";

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route path="/pending" element={<p>pending page</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>admin page</p>} />
        </Route>
      </Route>
    </Routes>
  );
}

describe("route guards", () => {
  it("sends a pending user to /pending", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("pending page")).toBeInTheDocument();
  });

  it("lets an approved user through", async () => {
    signInAs();
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("sends a non-admin away from /admin", async () => {
    signInAs();
    renderWithProviders(<App />, { route: "/admin" });
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("lets the admin into /admin", async () => {
    signInAs({ isAdmin: true });
    renderWithProviders(<App />, { route: "/admin" });
    expect(await screen.findByText("admin page")).toBeInTheDocument();
  });
});
