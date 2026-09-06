import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderWithProviders } from "../../../test/render";
import * as api from "../../../api";
import TopBar from "../TopBar";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

describe("TopBar", () => {
  beforeEach(() => {
    window.localStorage.setItem("saarai_api_key", "k");
    window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
    vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
  });

  it("renders the account menu and search input", async () => {
    renderWithProviders(<TopBar />, { route: "/dashboard" });

    expect(await screen.findByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search meetings")).toBeInTheDocument();
  });

  it("sends the search query to the meetings list", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <TopBar />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </>,
      { route: "/dashboard" },
    );

    const input = await screen.findByPlaceholderText("Search meetings");
    await user.type(input, "vendor");
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/meetings?q=vendor"));
  });
});
