import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SwipeRow, SwipeRowGroup, type SwipeRowAction } from "./swipe-row";

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const ROW_WIDTH = 320;
const row = (name = "Launch checklist") =>
  screen.getByText(name).closest<HTMLElement>('[data-slot="swipe-row"]')!;

/** Dispatches a pointer event at a set time, because release velocity is measured from timestamps. */
function pointer(type: string, target: Element, x: number, time: number, y = 0) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
    timeStamp: { value: time },
  });
  fireEvent(target, event);
}

/** Moves focus the way a Tab press would, letting React handle the focus events. */
function focus(element: HTMLElement) {
  act(() => element.focus());
}

/** Presses at `from`, moves through each `[x, time]` point, and lifts at `liftAt`. */
function swipe(target: Element, from: number, points: [x: number, time: number][], liftAt: number) {
  pointer("pointerdown", target, from, 0);
  for (const [x, time] of points) pointer("pointermove", target, x, time);
  pointer("pointerup", target, points[points.length - 1][0], liftAt);
}

function Inbox({
  onDelete = () => {},
  onPin = () => {},
  onRead = () => {},
  fullSwipe,
  disabled,
  onOpenChange,
}: {
  onDelete?: () => void;
  onPin?: () => void;
  onRead?: () => void;
  fullSwipe?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: string | null) => void;
}) {
  const trailing: SwipeRowAction[] = [
    { label: "Delete", tone: "destructive", removesRow: true, onAction: onDelete },
    { label: "Pin", onAction: onPin },
  ];
  return (
    <SwipeRow
      leading={[{ label: "Read", tone: "primary", onAction: onRead }]}
      trailing={trailing}
      fullSwipe={fullSwipe}
      disabled={disabled}
      onOpenChange={onOpenChange}
    >
      <button type="button">Launch checklist</button>
    </SwipeRow>
  );
}

describe("SwipeRow", () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(ROW_WIDTH);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vibrate.mockClear();
    motionPreference.reduced = false;
  });

  it("renders each side as real buttons in reading order with the primary action outermost", () => {
    render(
      <SwipeRowGroup aria-label="Inbox">
        <Inbox />
      </SwipeRowGroup>,
    );
    expect(screen.getByRole("list", { name: "Inbox" })).toContainElement(screen.getByRole("listitem"));
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Read",
      "Launch checklist",
      "Pin",
      "Delete",
    ]);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-primary", "true");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-tone", "destructive");
    expect(screen.getByRole("button", { name: "Pin" })).not.toHaveAttribute("data-primary");
    expect(row()).not.toHaveAttribute("data-open");
  });

  it("is a plain element outside a group", () => {
    render(<Inbox />);
    expect(row()).not.toHaveAttribute("role");
  });

  it("reveals a side when focus moves into its actions and hides it when focus leaves", () => {
    const onOpenChange = vi.fn();
    render(<Inbox onOpenChange={onOpenChange} />);
    focus(screen.getByRole("button", { name: "Pin" }));
    expect(row()).toHaveAttribute("data-open", "trailing");
    focus(screen.getByRole("button", { name: "Delete" }));
    expect(row()).toHaveAttribute("data-open", "trailing");
    focus(screen.getByRole("button", { name: "Read" }));
    expect(row()).toHaveAttribute("data-open", "leading");
    focus(screen.getByRole("button", { name: "Launch checklist" }));
    expect(row()).not.toHaveAttribute("data-open");
    expect(onOpenChange.mock.calls).toEqual([["trailing"], [null], ["leading"], [null]]);
  });

  it("leaves a vertical gesture to the page", () => {
    render(<Inbox />);
    pointer("pointerdown", row(), 300, 0, 100);
    pointer("pointermove", row(), 296, 10, 120);
    pointer("pointermove", row(), 150, 20, 120);
    expect(row()).not.toHaveAttribute("data-dragging");
    pointer("pointerup", row(), 150, 400, 120);
    expect(row()).not.toHaveAttribute("data-open");
  });

  it("waits for 10 pixels before dragging, then opens the side it was released over", () => {
    render(<Inbox />);
    pointer("pointerdown", row(), 300, 0);
    pointer("pointermove", row(), 292, 10);
    expect(row()).not.toHaveAttribute("data-dragging");
    pointer("pointermove", row(), 200, 20);
    expect(row()).toHaveAttribute("data-dragging", "true");
    // Held still before lifting, so position decides: 90 of 144 pixels is past halfway.
    pointer("pointerup", row(), 200, 400);
    expect(row()).not.toHaveAttribute("data-dragging");
    expect(row()).toHaveAttribute("data-open", "trailing");
  });

  it("closes an open row that is dragged back, and opens the leading side the other way", () => {
    const { unmount } = render(
      <SwipeRow defaultOpen="trailing" trailing={[{ label: "Pin", onAction: () => {} }]}>
        Launch checklist
      </SwipeRow>,
    );
    swipe(row(), 200, [[260, 10]], 400);
    expect(row()).not.toHaveAttribute("data-open");
    unmount();

    render(<Inbox />);
    swipe(row(), 100, [[160, 10]], 400);
    expect(row()).toHaveAttribute("data-open", "leading");
  });

  it("lets release velocity decide between open and closed", () => {
    const onDelete = vi.fn();
    render(<Inbox onDelete={onDelete} />);
    // A short fast flick: 19 pixels of travel, thrown far past the actions.
    swipe(
      row(),
      300,
      [
        [289, 10],
        [271, 20],
      ],
      25,
    );
    expect(row()).toHaveAttribute("data-open", "trailing");
    expect(onDelete).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();

    // Dragged nearly open, then thrown back the other way.
    swipe(
      row(),
      300,
      [
        [200, 100],
        [170, 300],
        [190, 310],
      ],
      315,
    );
    expect(row()).not.toHaveAttribute("data-open");
  });

  it("arms a full swipe once, and commits the primary action on release", () => {
    const onDelete = vi.fn();
    render(<Inbox onDelete={onDelete} />);
    pointer("pointerdown", row(), 300, 0);
    pointer("pointermove", row(), 150, 10);
    expect(row()).not.toHaveAttribute("data-full-swipe");
    // The threshold is 60% of the row: 192 pixels.
    pointer("pointermove", row(), 90, 20);
    expect(row()).toHaveAttribute("data-full-swipe", "true");
    pointer("pointermove", row(), 80, 30);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    pointer("pointerup", row(), 80, 400);
    expect(onDelete).toHaveBeenCalledTimes(1);
    // The action removes the row, so it stays out on that side until it unmounts.
    expect(row()).toHaveAttribute("data-open", "trailing");
  });

  it("cancels an armed full swipe when the pointer heads back", () => {
    const onDelete = vi.fn();
    render(<Inbox onDelete={onDelete} />);
    pointer("pointerdown", row(), 300, 0);
    pointer("pointermove", row(), 80, 10);
    expect(row()).toHaveAttribute("data-full-swipe", "true");
    pointer("pointermove", row(), 140, 300);
    expect(row()).not.toHaveAttribute("data-full-swipe");
    pointer("pointerup", row(), 140, 700);
    expect(onDelete).not.toHaveBeenCalled();
    expect(row()).toHaveAttribute("data-open", "trailing");

    // Still past the threshold, but moving back toward closed at release.
    pointer("pointerdown", row(), 300, 1000);
    pointer("pointermove", row(), 60, 1010);
    pointer("pointermove", row(), 50, 1200);
    pointer("pointermove", row(), 70, 1210);
    pointer("pointerup", row(), 70, 1215);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("lets a flick carry the last stretch of a full swipe, and closes after an action that keeps the row", () => {
    const onRead = vi.fn();
    render(<Inbox onRead={onRead} />);
    // 100 pixels past the single leading action, then thrown onward.
    swipe(
      row(),
      20,
      [
        [100, 200],
        [130, 210],
      ],
      215,
    );
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(row()).not.toHaveAttribute("data-open");
  });

  it("never commits when full swipe is off or the pointer is cancelled", () => {
    const onDelete = vi.fn();
    const { rerender } = render(<Inbox onDelete={onDelete} fullSwipe={false} />);
    swipe(row(), 300, [[40, 10]], 400);
    expect(row()).toHaveAttribute("data-open", "trailing");
    expect(row()).not.toHaveAttribute("data-full-swipe");

    rerender(<Inbox onDelete={onDelete} />);
    pointer("pointerdown", document.body, 0, 500);
    expect(row()).not.toHaveAttribute("data-open");
    pointer("pointerdown", row(), 300, 1000);
    pointer("pointermove", row(), 40, 1010);
    expect(row()).toHaveAttribute("data-full-swipe", "true");
    pointer("pointercancel", row(), 40, 1020);
    expect(row()).not.toHaveAttribute("data-full-swipe");
    expect(onDelete).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("runs an action from its button and puts the row away after a pointer press", () => {
    const onPin = vi.fn();
    const onDelete = vi.fn();
    render(<Inbox onPin={onPin} onDelete={onDelete} />);
    const pin = screen.getByRole("button", { name: "Pin" });
    focus(pin);
    // A keyboard click carries no detail: focus is still on the button, so it stays in view.
    fireEvent.click(pin);
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(row()).toHaveAttribute("data-open", "trailing");
    fireEvent.click(pin, { detail: 1 });
    expect(onPin).toHaveBeenCalledTimes(2);
    expect(row()).not.toHaveAttribute("data-open");
    expect(pin).not.toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(vibrate).not.toHaveBeenCalled();
    expect(row()).toHaveAttribute("data-open", "trailing");
  });

  it("closes on a press outside, a page scroll, or a tap on its own content", () => {
    const onContent = vi.fn();
    render(
      <SwipeRow defaultOpen="trailing" trailing={[{ label: "Pin", onAction: () => {} }]}>
        <button type="button" onClick={onContent}>
          Launch checklist
        </button>
      </SwipeRow>,
    );
    expect(row()).toHaveAttribute("data-open", "trailing");
    pointer("pointerdown", document.body, 0, 0);
    expect(row()).not.toHaveAttribute("data-open");

    swipe(row(), 300, [[200, 10]], 400);
    expect(row()).toHaveAttribute("data-open", "trailing");
    fireEvent.scroll(window);
    expect(row()).not.toHaveAttribute("data-open");

    // Focus is what keeps a row open while the page scrolls the focused action into view.
    focus(screen.getByRole("button", { name: "Pin" }));
    fireEvent.scroll(window);
    expect(row()).toHaveAttribute("data-open", "trailing");

    const content = screen.getByRole("button", { name: "Launch checklist" });
    pointer("pointerdown", content, 100, 1000);
    pointer("pointerup", content, 100, 1050);
    fireEvent.click(content, { detail: 1 });
    expect(row()).not.toHaveAttribute("data-open");
    expect(onContent).not.toHaveBeenCalled();
    fireEvent.click(content, { detail: 1 });
    expect(onContent).toHaveBeenCalledTimes(1);
  });

  it("keeps one row open at a time in a group", () => {
    render(
      <SwipeRowGroup>
        <SwipeRow defaultOpen="trailing" trailing={[{ label: "Pin first", onAction: () => {} }]}>
          First
        </SwipeRow>
        <SwipeRow trailing={[{ label: "Pin second", onAction: () => {} }]}>Second</SwipeRow>
      </SwipeRowGroup>,
    );
    expect(row("First")).toHaveAttribute("data-open", "trailing");
    focus(screen.getByRole("button", { name: "Pin second" }));
    expect(row("Second")).toHaveAttribute("data-open", "trailing");
    expect(row("First")).not.toHaveAttribute("data-open");
  });

  it("follows a controlled open side and asks before changing it", () => {
    const onOpenChange = vi.fn();
    const trailing = [{ label: "Pin", onAction: () => {} }];
    const { rerender } = render(
      <SwipeRow open="trailing" onOpenChange={onOpenChange} trailing={trailing}>
        Launch checklist
      </SwipeRow>,
    );
    pointer("pointerdown", document.body, 0, 0);
    expect(onOpenChange).toHaveBeenLastCalledWith(null);
    expect(row()).toHaveAttribute("data-open", "trailing");
    rerender(
      <SwipeRow open={null} onOpenChange={onOpenChange} trailing={trailing}>
        Launch checklist
      </SwipeRow>,
    );
    expect(row()).not.toHaveAttribute("data-open");
  });

  it("ignores swipes and disables its actions when disabled", () => {
    render(<Inbox disabled />);
    swipe(row(), 300, [[150, 10]], 400);
    expect(row()).not.toHaveAttribute("data-open");
    expect(row()).toHaveAttribute("data-disabled", "true");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("fades the actions in over a still row with reduced motion", async () => {
    motionPreference.reduced = true;
    render(<Inbox />);
    const content = row().querySelector<HTMLElement>('[data-slot="swipe-row-content"]')!;
    const actions = row().querySelector<HTMLElement>(
      '[data-slot="swipe-row-actions"][data-side="trailing"]',
    )!;
    expect(actions).toHaveStyle({ opacity: "0", pointerEvents: "none" });
    pointer("pointerdown", row(), 300, 0);
    pointer("pointermove", row(), 200, 10);
    // 90 of 144 pixels: the fade tracks the drag, and the row itself has not moved.
    await waitFor(() => expect(actions).toHaveStyle({ opacity: "0.625" }));
    expect(content.style.transform).toBe("none");
    pointer("pointerup", row(), 200, 400);
    expect(row()).toHaveAttribute("data-open", "trailing");
    expect(actions).toHaveStyle({ pointerEvents: "auto" });
    expect(content.style.transform).toBe("none");
  });
});
