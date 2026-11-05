import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogProps,
} from "./dialog";

function Example(props: DialogProps) {
  return (
    <Dialog duration={0} {...props}>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update how others see you.</DialogDescription>
        </DialogHeader>
        <input aria-label="Name" defaultValue="Ada" />
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens from its trigger with a labelled popup and closes from the corner button", async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog).toHaveAccessibleDescription("Update how others see you.");
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(document.querySelector('[data-slot="dialog-backdrop"]')).not.toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.querySelector('[data-slot="dialog-backdrop"]')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes with Escape and from a DialogClose in the footer", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("waits for the caller to update controlled state", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<Example open onOpenChange={onOpenChange} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    rerender(<Example open={false} onOpenChange={onOpenChange} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the popup through its exit animation, then unmounts it", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(false)}>Dismiss</button>
          <Dialog open={open} onOpenChange={setOpen} duration={0.2}>
            <DialogContent showCloseButton={false}>
              <DialogTitle>Saved</DialogTitle>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    render(<Controlled />);
    expect(await screen.findByRole("dialog", { name: "Saved" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss", hidden: true }));
    const closing = document.querySelector('[data-slot="dialog-content"]');
    expect(closing).toHaveAttribute("data-state", "closed");
    expect(closing).toHaveAttribute("inert");
    await waitFor(() => expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull());
    expect(document.querySelectorAll('[data-slot="dialog-viewport"]')).toHaveLength(0);
  });

  it("requires the Dialog root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<DialogTrigger>Orphan</DialogTrigger>)).toThrow(
      "DialogTrigger must be used within Dialog.",
    );
  });
});
