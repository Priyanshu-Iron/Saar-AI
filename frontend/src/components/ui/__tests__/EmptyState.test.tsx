import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders the word, title, body, and action", () => {
    render(
      <EmptyState
        devanagari="खाली"
        title="No meetings yet"
        body="Send a bot to your next call to see it here."
        action={<button type="button">Send bot</button>}
      />,
    );
    expect(screen.getByText("खाली")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No meetings yet" })).toBeInTheDocument();
    expect(screen.getByText("Send a bot to your next call to see it here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send bot" })).toBeInTheDocument();
  });
});
