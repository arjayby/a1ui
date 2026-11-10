import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetProps,
} from "./sheet";

const SIZE = 600;

function Example(props: SheetProps) {
  return (
    <Sheet {...props}>
      <SheetTrigger>Show route</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Route</SheetTitle>
          <SheetDescription>Outbound to Sunnydale.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <input aria-label="Stop" />
        </SheetBody>
        <SheetFooter>
          <SheetClose>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const content = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
/** The sheet's translation along its axis, in pixels. */
const travel = () => Number(/translate[XY]\((-?[\d.]+)px\)/.exec(content()?.style.transform ?? "")?.[1] ?? 0);
const pause = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/**
 * Presses `target`, moves the pointer by `distance` along the y axis in steps, and holds it there.
 * Later events are sent to the same element, as they are once the sheet has captured the pointer.
 */
function drag(target: Element, distance: number) {
  const pointer = { pointerId: 1, isPrimary: true, button: 0, clientX: 100 };
  fireEvent.pointerDown(target, { ...pointer, clientY: 300 });
  for (let step = 1; step <= 4; step++) {
    fireEvent.pointerMove(target, { ...pointer, clientY: 300 + (distance * step) / 4 });
  }
  return () => fireEvent.pointerUp(target, { ...pointer, clientY: 300 + distance });
}

describe("Sheet", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens from its trigger as a labelled modal and closes with Escape and SheetClose", async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show route" }));
    const sheet = await screen.findByRole("dialog", { name: "Route" });
    expect(sheet).toHaveAccessibleDescription("Outbound to Sunnydale.");
    expect(sheet).toHaveAttribute("data-state", "open");
    expect(sheet).toHaveAttribute("data-side", "bottom");
    expect(document.querySelector('[data-slot="sheet-backdrop"]')).not.toBeNull();
    // A sheet that fits its content has one size, so its handle is only a grab affordance.
    expect(document.querySelector('[data-slot="sheet-handle"]')).toHaveAttribute("aria-hidden", "true");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(sheet, { key: "Escape" });
    await waitFor(() => expect(content()).toBeNull());
    expect(document.querySelector('[data-slot="sheet-backdrop"]')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Show route" }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    await waitFor(() => expect(content()).toBeNull());
  });

  it("waits for the caller to update controlled open state", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Show route" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example open onOpenChange={onOpenChange} side="right" />);
    expect(await screen.findByRole("dialog")).toHaveAttribute("data-side", "right");
    rerender(<Example open={false} onOpenChange={onOpenChange} side="right" />);
    await waitFor(() => expect(content()).toBeNull());
  });

  it("moves between detents from the handle with the keyboard and a click", async () => {
    const onDetentChange = vi.fn();
    render(<Example defaultOpen detents={[0.3, 0.6, 1]} onDetentChange={onDetentChange} />);
    const handle = await screen.findByRole("slider", { name: "Resize sheet" });
    expect(handle).toHaveAttribute("aria-valuenow", "30");
    expect(handle).toHaveAttribute("aria-valuemin", "30");
    expect(handle).toHaveAttribute("aria-valuemax", "100");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");

    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "60");
    expect(content()).toHaveAttribute("data-detent", "1");
    fireEvent.keyDown(handle, { key: "End" });
    expect(handle).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(onDetentChange).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle).toHaveAttribute("aria-valuenow", "60");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle).toHaveAttribute("aria-valuenow", "30");

    // Enter and a click both step to the next detent and wrap after the largest.
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.click(handle);
    expect(handle).toHaveAttribute("aria-valuenow", "100");
    fireEvent.click(handle);
    expect(handle).toHaveAttribute("aria-valuetext", "30%");
    expect(onDetentChange).toHaveBeenLastCalledWith(0);
  });

  it("keeps a controlled detent until the caller changes it", async () => {
    const onDetentChange = vi.fn();
    const { rerender } = render(
      <Example defaultOpen detents={[0.5, 1]} detent={0} onDetentChange={onDetentChange} />,
    );
    const handle = await screen.findByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(onDetentChange).toHaveBeenLastCalledWith(1);
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    rerender(<Example defaultOpen detents={[0.5, 1]} detent={1} onDetentChange={onDetentChange} />);
    expect(handle).toHaveAttribute("aria-valuenow", "100");
  });

  it("tracks a drag 1:1, resists past the largest detent, and rests at the nearest detent", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(SIZE);
    const onDetentChange = vi.fn();
    render(<Example defaultOpen detents={[0.5, 1]} onDetentChange={onDetentChange} />);
    const handle = await screen.findByRole("slider");
    // The half detent leaves half of the sheet past the bottom edge.
    await waitFor(() => expect(travel()).toBe(SIZE / 2));

    let release = drag(handle, -250);
    await waitFor(() => expect(travel()).toBe(50));
    expect(content()).toHaveAttribute("data-dragging");
    // Held still before release, so there is no throw: the nearest detent is the largest.
    await pause(150);
    release();
    expect(content()).not.toHaveAttribute("data-dragging");
    expect(onDetentChange).toHaveBeenLastCalledWith(1);
    await waitFor(() => expect(travel()).toBe(0));

    // 200px past the largest detent moves the sheet much less than 200px, and it springs back.
    release = drag(handle, -200);
    await waitFor(() => expect(travel()).toBeLessThan(-60));
    expect(travel()).toBeGreaterThan(-120);
    await pause(150);
    release();
    await waitFor(() => expect(travel()).toBe(0));
    expect(handle).toHaveAttribute("aria-valuenow", "100");
  });

  it("dismisses when dragged most of the way out, and resists instead when it is not dismissible", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(SIZE);
    const onOpenChange = vi.fn();
    const { unmount } = render(<Example defaultOpen onOpenChange={onOpenChange} />);
    const title = await screen.findByText("Route");
    await waitFor(() => expect(travel()).toBe(0));
    let release = drag(title, 400);
    await waitFor(() => expect(travel()).toBe(400));
    await pause(150);
    release();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(content()).toBeNull());
    unmount();

    render(<Example defaultOpen dismissible={false} onOpenChange={onOpenChange} />);
    onOpenChange.mockClear();
    await waitFor(() => expect(travel()).toBe(0));
    release = drag(await screen.findByText("Route"), 400);
    await waitFor(() => expect(travel()).toBeGreaterThan(100));
    expect(travel()).toBeLessThan(200);
    await pause(150);
    release();
    await waitFor(() => expect(travel()).toBe(0));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(content()).toHaveAttribute("data-state", "open");
  });

  it("throws the sheet away on a fast flick and leaves presses on fields alone", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(SIZE);
    const onOpenChange = vi.fn();
    render(<Example defaultOpen onOpenChange={onOpenChange} />);
    await waitFor(() => expect(travel()).toBe(0));

    // A press that starts on a text field selects text; it never moves the sheet.
    drag(screen.getByRole("textbox", { name: "Stop" }), 300)();
    await pause(50);
    expect(travel()).toBe(0);
    expect(onOpenChange).not.toHaveBeenCalled();

    // 60px travelled in a few milliseconds projects far past the edge.
    drag(screen.getByText("Route"), 60)();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(content()).toBeNull());
  });

  it("rejects detents that are not ascending fractions and parts outside a Sheet", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Example detents={[1, 0.5]} />)).toThrow(
      "Sheet detents must be ascending fractions greater than 0 and at most 1.",
    );
    expect(() => render(<Example detents={[0.5, 1.5]} />)).toThrow("Sheet detents must be ascending");
    expect(() => render(<SheetTrigger>Orphan</SheetTrigger>)).toThrow(
      "SheetTrigger must be used within Sheet.",
    );
  });
});
