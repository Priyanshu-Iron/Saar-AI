import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Citation from "../Citation";
import MinutesSection from "../MinutesSection";
import InsightsSection from "../InsightsSection";
import StrategySection from "../StrategySection";
import SectionFrame from "../SectionFrame";
import SectionNav from "../SectionNav";
import type { IndexedUtterance } from "../../../hooks/useMeeting";

const utterances: IndexedUtterance[] = [
  { index: 0, speaker: "Ravi", timestamp_ms: 724_000, duration_ms: 1000, text: "We change vendor" },
  { index: 1, speaker: "Meena", timestamp_ms: 760_000, duration_ms: 1000, text: "I will send the RFP" },
];

describe("Citation", () => {
  it("renders nothing without refs", () => {
    const { container } = render(<Citation refs={[]} utterances={utterances} onCite={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("names the first ref's timestamp and counts the rest", async () => {
    const onCite = vi.fn();
    render(<Citation refs={[1, 0]} utterances={utterances} onCite={onCite} />);
    const button = screen.getByRole("button", { name: "Show source at 12:40" });
    expect(button).toHaveTextContent("+1");
    await userEvent.setup().click(button);
    expect(onCite).toHaveBeenCalledWith(1);
  });
});

describe("MinutesSection", () => {
  it("renders summary, decisions, and the actions table with owners", () => {
    render(
      <MinutesSection
        utterances={utterances}
        onCite={() => {}}
        data={{
          summary: "Vendor change agreed.",
          discussion: [{ text: "Delivery slipped", refs: [0] }],
          decisions: [{ text: "Change vendor for Q3", refs: [0] }],
          actions: [{ text: "Send RFP", owner: "Meena", due: "Friday", refs: [1] }, { text: "Confirm budget", owner: null, due: null, refs: [] }],
          notes: [],
        }}
      />,
    );
    expect(screen.getByText("Vendor change agreed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByText("Meena")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Show source/ })).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
  });
});

describe("InsightsSection", () => {
  it("renders participation bars with percentages and the sentiment word", () => {
    render(
      <InsightsSection
        utterances={utterances}
        onCite={() => {}}
        data={{
          participation: [{ name: "Ravi", share: 0.6, note: "Led the discussion", refs: [0] }],
          themes: [{ text: "Vendor reliability", refs: [] }],
          patterns: [], concerns: [],
          sentiment: { overall: "tense", note: "Frustration about delays." },
          takeaways: [{ text: "Switch vendor", refs: [0] }],
        }}
      />,
    );
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("tense")).toHaveClass("text-gold");
    expect(screen.getByRole("heading", { name: "Takeaways" })).toBeInTheDocument();
  });
});

describe("StrategySection", () => {
  it("renders priorities and the risks table", () => {
    render(
      <StrategySection
        utterances={utterances}
        onCite={() => {}}
        data={{
          priorities: [{ action: "Sign the new vendor", owner: "Ravi", why: "Delays cost revenue", refs: [0] }],
          followups: [], resources: [],
          risks: [{ risk: "Budget not approved", likelihood: "medium", impact: "high", mitigation: "Escalate to Ankit", refs: [1] }],
          opportunities: [], agenda: [],
        }}
      />,
    );
    expect(screen.getByRole("list", { name: "Priorities" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Likelihood" })).toBeInTheDocument();
    expect(screen.getByText("Escalate to Ankit")).toBeInTheDocument();
  });
});

describe("SectionFrame", () => {
  it("shows skeletons while generating and an error with retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SectionFrame id="mom" title="Minutes" state={{ status: "generating" }} onRetry={onRetry}>x</SectionFrame>);
    expect(screen.getByRole("heading", { name: "Minutes" })).toBeInTheDocument();
    expect(screen.queryByText("x")).not.toBeInTheDocument();
    rerender(<SectionFrame id="mom" title="Minutes" state={{ status: "error", error: "Provider down" }} onRetry={onRetry}>x</SectionFrame>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
  it("renders legacy markdown with a regenerate button", () => {
    render(<SectionFrame id="mom" title="Minutes" state={{ status: "legacy", markdown: "### Old heading" }} onRetry={() => {}}>x</SectionFrame>);
    expect(screen.getByText("Generated before citations were available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate for citations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old heading" })).toBeInTheDocument();
  });
});

describe("SectionNav", () => {
  it("closes on Escape, returns focus to the trigger, and disables a regenerating item", async () => {
    const user = userEvent.setup();
    render(<SectionNav onRegenerate={() => {}} regenerating={{ mom: true }} />);

    const trigger = screen.getByRole("button", { name: "Regenerate" });
    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Regenerate minutes" })).toBeDisabled();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("closes when a pointer lands outside the menu", async () => {
    const user = userEvent.setup();
    render(<SectionNav onRegenerate={() => {}} regenerating={{}} />);

    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(screen.getByRole("menuitem", { name: "Regenerate minutes" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });
  });
});
