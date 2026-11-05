import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverProps,
} from "./popover";

function Example(props: PopoverProps) {
  return (
    <Popover duration={0} {...props}>
      <PopoverTrigger>Feedback</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Send feedback</PopoverTitle>
        <PopoverDescription>Tell us what to fix.</PopoverDescription>
        <textarea aria-label="Message" />
        <PopoverClose>Cancel</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens a labelled dialog from the trigger and closes with the close button", async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Feedback" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const dialog = await screen.findByRole("dialog", { name: "Send feedback" });
    expect(dialog).toHaveAccessibleDescription("Tell us what to fix.");
    expect(dialog).toHaveAttribute("data-slot", "popover-content");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("waits for the caller to update controlled state and closes on Escape", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(<Example open={false} onOpenChange={onOpenChange} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("renders the morph panel inside the trigger's anchor in place of the trigger surface", async () => {
    render(<Example morph />);
    const trigger = screen.getByRole("button", { name: "Feedback" });
    const anchor = trigger.closest('[data-slot="popover-anchor"]');
    expect(anchor).not.toBeNull();
    expect(trigger.querySelector('[data-slot="popover-surface"]')).not.toBeNull();

    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Send feedback" });
    expect(anchor).toContainElement(dialog);
    expect(dialog).toHaveAttribute("data-morph");
    expect(dialog.querySelector('[data-slot="popover-surface"]')).not.toBeNull();
    expect(trigger.querySelector('[data-slot="popover-surface"]')).toBeNull();
    expect(document.querySelectorAll('[data-slot="popover-surface"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger.querySelector('[data-slot="popover-surface"]')).not.toBeNull();
  });

  it("requires the Popover root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PopoverTrigger>Orphan</PopoverTrigger>)).toThrow(
      "PopoverTrigger must be used within Popover.",
    );
  });
});
