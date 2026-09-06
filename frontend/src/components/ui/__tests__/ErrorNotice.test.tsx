import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorNotice from "../ErrorNotice";

describe("ErrorNotice", () => {
  it("renders as an alert with the message", () => {
    render(<ErrorNotice message="Couldn't reach SaarAI. Check your connection and try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach SaarAI.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="Something failed" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
