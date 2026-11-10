import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl, type SegmentedControlProps } from "./segmented-control";

const options = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
  { value: "calendar", label: "Calendar" },
  { value: "timeline", label: "Timeline", disabled: true },
];

function Example(props: Partial<SegmentedControlProps>) {
  return <SegmentedControl aria-label="View" options={options} {...props} />;
}

/** Four 100px segments inside the 3px inset, so segment n spans 3 + 100n to 103 + 100n. */
function layOut(track: HTMLElement) {
  track.getBoundingClientRect = () => new DOMRect(0, 0, 406, 36);
}

function thumbPosition(track: HTMLElement) {
  return Number(track.style.getPropertyValue("--segment-position"));
}

describe("SegmentedControl", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("is a radio group with one tab stop on the checked option", () => {
    render(<Example defaultValue="board" />);
    const group = screen.getByRole("radiogroup", { name: "View" });
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(screen.getByRole("radio", { name: "Timeline" })).toBeDisabled();
    // The inverted copy of the labels is decoration, so each option is announced once.
    expect(group.querySelector('[data-slot="segmented-control-inverse"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(group.querySelector('[data-slot="segmented-control-thumb"]')).not.toBeNull();
  });

  it("starts with no selection and makes the first enabled option the tab stop", () => {
    render(<Example options={[{ ...options[0], disabled: true }, ...options.slice(1)]} />);
    expect(screen.getAllByRole("radio").map((radio) => radio.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(document.querySelector('[data-slot="segmented-control-thumb"]')).toHaveAttribute("data-empty");
  });

  it("moves focus and the selection with arrow keys, Home and End, skipping disabled options", () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="list" onValueChange={onValueChange} />);
    const [list, board, calendar] = screen.getAllByRole("radio");
    list.focus();
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(board).toHaveFocus();
    expect(board).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(board, { key: "End" });
    expect(calendar).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("calendar");
    // Timeline is disabled, so the next option after Calendar wraps to List.
    fireEvent.keyDown(calendar, { key: "ArrowDown" });
    expect(list).toHaveFocus();
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    expect(calendar).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(calendar, { key: "Home" });
    expect(list).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenCalledTimes(5);
    fireEvent.keyDown(list, { key: "ArrowRight", ctrlKey: true });
    expect(onValueChange).toHaveBeenCalledTimes(5);
  });

  it("selects on click and submits the value under its name", () => {
    render(
      <form data-testid="form">
        <Example name="view" defaultValue="list" />
      </form>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Calendar" }));
    expect(screen.getByRole("radio", { name: "Calendar" })).toHaveAttribute("aria-checked", "true");
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("view")).toBe("calendar");
  });

  it("waits for controlled updates and ignores a disabled control", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Example value="list" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Board" }));
    expect(onValueChange).toHaveBeenLastCalledWith("board");
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "true");
    rerender(<Example value="board" disabled onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "Board" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });

  it("drags the thumb under the point where it was grabbed and lands on the nearest option", async () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="list" onValueChange={onValueChange} />);
    const track = screen.getByRole("radiogroup");
    layOut(track);
    // Grab the thumb 70px into the first segment, then move 100px: it sits exactly on Board.
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 73 });
    expect(track).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 173 });
    await waitFor(() => expect(thumbPosition(track)).toBeCloseTo(1, 5));
    // Nothing is chosen until the thumb is let go.
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 233 });
    await waitFor(() => expect(thumbPosition(track)).toBeCloseTo(1.6, 5));
    fireEvent.pointerUp(track, { pointerId: 1, clientX: 233 });
    expect(track).not.toHaveAttribute("data-dragging");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("calendar");
    expect(screen.getByRole("radio", { name: "Calendar" })).toHaveAttribute("aria-checked", "true");
  });

  it("moves focus to the option a drag chose when focus was inside the control", () => {
    render(<Example defaultValue="list" />);
    const track = screen.getByRole("radiogroup");
    layOut(track);
    screen.getByRole("radio", { name: "List" }).focus();
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 53 });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 153 });
    fireEvent.pointerUp(track, { pointerId: 1, clientX: 153 });
    // How far the release throws the thumb depends on timing; focus goes wherever it landed.
    const chosen = screen.getByRole("radio", { checked: true });
    expect(chosen).not.toBe(screen.getByRole("radio", { name: "List" }));
    expect(chosen).toHaveFocus();
    expect(chosen.tabIndex).toBe(0);
  });

  it("resists past the end and never lands on a disabled option", async () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="calendar" onValueChange={onValueChange} />);
    const track = screen.getByRole("radiogroup");
    layOut(track);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 253 });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 353 });
    await waitFor(() => expect(thumbPosition(track)).toBeCloseTo(3, 5));
    // 200px past the last segment moves the thumb by well under a third of one.
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 553 });
    await waitFor(() => expect(thumbPosition(track)).toBeGreaterThan(3));
    expect(thumbPosition(track)).toBeLessThan(3.3);
    fireEvent.pointerUp(track, { pointerId: 1, clientX: 553 });
    // Timeline is disabled, so the thumb returns to Calendar and nothing changes.
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Calendar" })).toHaveAttribute("aria-checked", "true");
  });

  it("only picks up the thumb, and a press without movement changes nothing", () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="list" onValueChange={onValueChange} />);
    const track = screen.getByRole("radiogroup");
    layOut(track);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 250 });
    expect(track).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(track, { pointerId: 2, button: 0, clientX: 50 });
    expect(track).toHaveAttribute("data-dragging");
    fireEvent.pointerUp(track, { pointerId: 2, clientX: 50 });
    expect(onValueChange).not.toHaveBeenCalled();
    // A cancelled drag puts the thumb back instead of choosing where it was dropped.
    fireEvent.pointerDown(track, { pointerId: 3, button: 0, clientX: 50 });
    fireEvent.pointerMove(track, { pointerId: 3, clientX: 250 });
    fireEvent.pointerCancel(track, { pointerId: 3, clientX: 250 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "true");
  });
});
