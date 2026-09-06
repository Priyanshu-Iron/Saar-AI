import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Thread from "../Thread";
import LoadingThread from "../LoadingThread";

function markers(kind: "done" | "now" | "todo") {
  return document.querySelectorAll(`[data-marker="${kind}"]`).length;
}

describe("Thread", () => {
  it("renders four markers with the current one highlighted", () => {
    render(<Thread state="transcribing" />);
    expect(markers("done")).toBe(2);
    expect(markers("now")).toBe(1);
    expect(markers("todo")).toBe(1);
  });

  it("fills every marker when ready", () => {
    render(<Thread state="ready" />);
    expect(markers("done")).toBe(3);
    expect(markers("now")).toBe(1);
    expect(markers("todo")).toBe(0);
  });

  it("exposes an accessible name from the step label", () => {
    render(<Thread state="recording" />);
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
  });

  it("prefers an explicit label", () => {
    render(<Thread state="joined" label="Status: Scheduled" />);
    expect(screen.getByRole("img", { name: "Status: Scheduled" })).toBeInTheDocument();
  });

  it("shows step labels only at large size", () => {
    const { rerender } = render(<Thread state="joined" size="large" />);
    expect(screen.getByText("Essence ready")).toBeInTheDocument();
    rerender(<Thread state="joined" size="inline" />);
    expect(screen.queryByText("Essence ready")).not.toBeInTheDocument();
  });

  it("renders failed with a danger marker at the recording position and a Failed label", () => {
    render(<Thread state="failed" size="large" />);
    expect(document.querySelectorAll('[data-marker="failed"]').length).toBe(1);
    expect(markers("done")).toBe(1);
    expect(markers("todo")).toBe(2);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Failed" })).toBeInTheDocument();
  });
});

describe("LoadingThread", () => {
  it("renders a status region", () => {
    render(<LoadingThread />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });
});
