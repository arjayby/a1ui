import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerScaleWrapper,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

function Sheet(props: { onOpenChange?: (open: boolean) => void; defaultOpen?: boolean }) {
  return (
    <Drawer duration={0} {...props}>
      <DrawerTrigger>Edit profile</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit profile</DrawerTitle>
          <DrawerDescription>Changes save when you close the sheet.</DrawerDescription>
        </DrawerHeader>
        <p>Body copy</p>
        <DrawerFooter>
          <DrawerClose>Done</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function surface() {
  const element = document.querySelector<HTMLElement>('[data-slot="drawer-surface"]')!;
  element.getBoundingClientRect = () => new DOMRect(0, 400, 400, 400);
  return element;
}

// MotionValue velocity decays to zero once the pointer rests for 30ms.
const rest = () => new Promise((resolve) => setTimeout(resolve, 60));

function drag(element: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 200, clientY: from });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: 200, clientY: (from + to) / 2 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: 200, clientY: to });
}

describe("Drawer", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens from the trigger as a labelled dialog with a handle and closes from DrawerClose", async () => {
    const onOpenChange = vi.fn();
    render(<Sheet onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog).toHaveAccessibleDescription("Changes save when you close the sheet.");
    expect(dialog).toHaveAttribute("data-side", "bottom");
    expect(document.querySelector('[data-slot="drawer-handle"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it("dismisses when dragged past the threshold and stays open after a short drag", async () => {
    render(<Sheet defaultOpen />);
    await screen.findByRole("dialog");
    const sheet = surface();
    drag(sheet, 420, 460);
    expect(sheet).toHaveAttribute("data-dragging");
    await rest();
    fireEvent.pointerUp(sheet, { pointerId: 1, clientX: 200, clientY: 460 });
    expect(sheet).not.toHaveAttribute("data-dragging");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    drag(sheet, 420, 620);
    await rest();
    fireEvent.pointerUp(sheet, { pointerId: 1, clientX: 200, clientY: 620 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("rubber-bands an upward drag, springs back, and dismisses on a quick flick", async () => {
    render(<Sheet defaultOpen />);
    await screen.findByRole("dialog");
    const sheet = surface();
    drag(sheet, 420, 220);
    await waitFor(() => expect(sheet.style.transform).toMatch(/translateY\(-/));
    const moved = Number.parseFloat(sheet.style.transform.replace("translateY(", ""));
    expect(moved).toBeLessThan(0);
    expect(moved).toBeGreaterThan(-200);
    fireEvent.pointerUp(sheet, { pointerId: 1, clientX: 200, clientY: 220 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(sheet.style.transform).toBe("none"));

    drag(sheet, 420, 470);
    fireEvent.pointerUp(sheet, { pointerId: 1, clientX: 200, clientY: 470 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("ignores drags that start on controls and honours controlled state", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <span data-testid="state">{String(open)}</span>
          <Drawer open={open} onOpenChange={setOpen} side="right" duration={0}>
            <DrawerContent aria-label="Filters">
              <DrawerClose>Close</DrawerClose>
            </DrawerContent>
          </Drawer>
        </>
      );
    }
    render(<Controlled />);
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAttribute("data-side", "right");
    const close = screen.getByRole("button", { name: "Close" });
    fireEvent.pointerDown(close, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(close, { pointerId: 1, clientX: 300, clientY: 0 });
    expect(surface()).not.toHaveAttribute("data-dragging");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("false"));
  });

  it("scales the wrapper only for drawers that ask for it", async () => {
    render(
      <DrawerScaleWrapper>
        <Drawer defaultOpen scaleBackground duration={0}>
          <DrawerContent aria-label="Share" />
        </Drawer>
      </DrawerScaleWrapper>,
    );
    const wrapper = document.querySelector<HTMLElement>('[data-slot="drawer-scale-wrapper"]')!;
    await waitFor(() => expect(wrapper.style.transform).toContain("scale(0.94)"));
  });
});
