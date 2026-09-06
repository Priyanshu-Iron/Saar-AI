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

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserMenu placement="right" />);

    const trigger = await screen.findByRole("button", { name: "Account menu" });
    await user.click(trigger);
    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("closes when a pointer lands outside the menu", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <UserMenu placement="right" />
        <button type="button">outside</button>
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
    });
  });
});
