import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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

function mockMatchMedia(matches: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("TranscriptList", () => {
  it("groups consecutive speaker lines and marks the focused one current", () => {
    render(<TranscriptList utterances={utterances} focusIndex={1} />);
    expect(screen.getAllByText("Ravi")).toHaveLength(1);
    expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
    expect(document.getElementById("utt-0")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("0:09")).toBeInTheDocument();
  });

  it("scrolls to the bottom when following as new lines arrive", () => {
    const { container, rerender } = render(<TranscriptList utterances={utterances} follow />);
    const scroller = container.querySelector(".overflow-y-auto") as HTMLDivElement;
    Object.defineProperty(scroller, "scrollHeight", { value: 500, configurable: true });
    scroller.scrollTop = 0;
    const grown: IndexedUtterance[] = [
      ...utterances,
      { index: 3, speaker: "Meena", timestamp_ms: 12000, duration_ms: 1000, text: "Let's confirm the date" },
    ];
    rerender(<TranscriptList utterances={grown} follow />);
    expect(scroller.scrollTop).toBe(500);
  });

  describe("mount with existing content", () => {
    afterEach(() => {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
    });

    it("scrolls to the bottom on mount when following", () => {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        get() {
          return 500;
        },
      });
      const { container } = render(<TranscriptList utterances={utterances} follow />);
      const scroller = container.querySelector(".overflow-y-auto") as HTMLDivElement;
      expect(scroller.scrollTop).toBe(500);
    });
  });
});

describe("TranscriptDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<TranscriptDrawer open={false} onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count, filters by find, and closes on Escape and the button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TranscriptDrawer open onClose={onClose} utterances={utterances} focusIndex={null} live={false} />);
    expect(screen.getByText("3 lines")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Find in transcript"), "budget");
    expect(screen.getByText(/budget needs sign-off/)).toBeInTheDocument();
    expect(screen.queryByText("Delivery slipped again")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Close transcript" }));
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
    expect(screen.getByRole("heading", { name: "No transcript yet" })).toBeInTheDocument();
  });

  it("renders the desktop aside as a complementary region with no dialog", () => {
    mockMatchMedia(true);
    render(<TranscriptDrawer open onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    expect(screen.getByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the mobile dialog with no complementary region, and Tab wraps focus", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<TranscriptDrawer open onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Close transcript" });
    const findInput = screen.getByLabelText("Find in transcript");
    findInput.focus();
    expect(document.activeElement).toBe(findInput);
    await user.tab();
    // Tab from the last focusable element wraps around to the first.
    expect(document.activeElement).toBe(closeButton);
  });

  it("refocuses the close button when the layout variant switches while open", () => {
    let listener: ((e: MediaQueryListEvent) => void) | undefined;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn((_event: string, cb: EventListenerOrEventListenerObject) => {
        listener = cb as (e: MediaQueryListEvent) => void;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<TranscriptDrawer open onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    expect(screen.getByRole("complementary", { name: "Transcript" })).toBeInTheDocument();

    // Move focus away, then simulate the viewport crossing the breakpoint.
    (document.activeElement as HTMLElement | null)?.blur();
    act(() => {
      listener?.({ matches: false } as MediaQueryListEvent);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close transcript" })).toHaveFocus();
  });
});
