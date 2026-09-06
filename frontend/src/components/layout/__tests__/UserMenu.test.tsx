import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import UserMenu from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(() => {
    window.localStorage.setItem("saarai_api_key", "k");
    window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
  });

  it("opens the menu and signs out", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserMenu placement="right" />);

    const trigger = await screen.findByRole("button", { name: "Account menu" });
    await user.click(trigger);

    const signOut = await screen.findByRole("menuitem", { name: "Sign out" });
    await user.click(signOut);

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem("saarai_auth_user")).toBeNull();
  });
});
