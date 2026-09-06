import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import LinkButton from "../LinkButton";
import StatusThread from "../../meeting/StatusThread";

describe("LinkButton", () => {
  it("renders a link styled as a button", () => {
    renderWithProviders(<LinkButton to="/dashboard">Send bot</LinkButton>);
    const link = screen.getByRole("link", { name: "Send bot" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link.className).toContain("bg-violet");
  });
  it("secondary variant uses the violet hairline", () => {
    renderWithProviders(<LinkButton to="/x" variant="secondary">All meetings</LinkButton>);
    expect(screen.getByRole("link").className).toContain("border-violet");
  });
});

describe("StatusThread", () => {
  it("exposes one accessible name and hides the visible label", () => {
    renderWithProviders(<StatusThread state="recording" label="Recording" />);
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(screen.getByText("Recording")).toHaveAttribute("aria-hidden", "true");
  });
});
