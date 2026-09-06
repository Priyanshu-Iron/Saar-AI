import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TranscriptDrawer from "../TranscriptDrawer";
import TranscriptList from "../TranscriptList";
import type { IndexedUtterance } from "../../../hooks/useMeeting";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const utterances: IndexedUtterance[] = [
  { index: 0, speaker: "Ravi", timestamp_ms: 0, duration_ms: 1000, text: "Delivery slipped again" },
  { index: 1, speaker: "Ravi", timestamp_ms: 4000, duration_ms: 1000, text: "So we change vendor" },
  { index: 2, speaker: "Meena", timestamp_ms: 9000, duration_ms: 1000, text: "ठीक है, budget needs sign-off" },
];

describe("TranscriptList", () => {
  it("groups consecutive speaker lines and marks the focused one current", () => {
    render(<TranscriptList utterances={utterances} focusIndex={1} />);
    expect(screen.getAllByText("Ravi")).toHaveLength(1);
    expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
    expect(document.getElementById("utt-0")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("0:09")).toBeInTheDocument();
  });
});

// The drawer renders a desktop aside and a mobile dialog; CSS hides one per
// breakpoint, but jsdom has no CSS, so both are present and queries take [0].
describe("TranscriptDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<TranscriptDrawer open={false} onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count, filters by find, and closes on Escape and the button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TranscriptDrawer open onClose={onClose} utterances={utterances} focusIndex={null} live={false} />);
    expect(screen.getAllByText("3 lines")[0]).toBeInTheDocument();
    await user.type(screen.getAllByLabelText("Find in transcript")[0], "budget");
    expect(screen.getAllByText(/budget needs sign-off/)[0]).toBeInTheDocument();
    // The find box's state is shared by both the desktop and mobile copies,
    // so typing into one filters both lists.
    expect(screen.queryAllByText("Delivery slipped again")).toHaveLength(0);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getAllByRole("button", { name: "Close transcript" })[0]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("scrolls the focused utterance into view", () => {
    const spy = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    render(<TranscriptDrawer open onClose={() => {}} utterances={utterances} focusIndex={2} live={false} />);
    expect(spy).toHaveBeenCalled();
    expect(document.getElementById("utt-2")).toHaveAttribute("aria-current", "true");
  });

  it("shows the empty word when there is no transcript", () => {
    render(<TranscriptDrawer open onClose={() => {}} utterances={[]} focusIndex={null} live={false} />);
    expect(screen.getAllByRole("heading", { name: "No transcript yet" })[0]).toBeInTheDocument();
  });
});
