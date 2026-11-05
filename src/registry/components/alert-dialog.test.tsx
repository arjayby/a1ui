import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogProps,
} from "./alert-dialog";

function Example({ onDelete, ...props }: AlertDialogProps & { onDelete?: () => void }) {
  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger>Delete project</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete this project?</AlertDialogTitle>
        <AlertDialogDescription>All deployments will be removed.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens from the trigger as a labelled alertdialog and unmounts after the exit animation", async () => {
    const onDelete = vi.fn();
    const onOpenChange = vi.fn();
    render(<Example duration={0.05} onDelete={onDelete} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this project?" });
    expect(dialog).toHaveAccessibleDescription("All deployments will be removed.");
    const action = screen.getByRole("button", { name: "Delete" });
    expect(action).toHaveAttribute("data-variant", "destructive");
    expect(action).toHaveClass("bg-destructive");
    fireEvent.click(action);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls.map(([open]) => open)).toEqual([true, false]);
    // Base UI holds the popup while Motion plays the exit, then it leaves the DOM.
    expect(screen.getByRole("alertdialog", { hidden: true })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog", { hidden: true })).toBeNull());
  });

  it("stays open on a backdrop click and shakes, but closes with Escape and Cancel", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("alertdialog");
    const backdrop = document.querySelector('[data-slot="alert-dialog-backdrop"]')!;
    fireEvent.click(backdrop);
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(dialog).toHaveAttribute("data-shaking");
    await waitFor(() => expect(dialog).not.toHaveAttribute("data-shaking"));
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog", { hidden: true })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog", { hidden: true })).toBeNull());
  });

  it("follows controlled state and skips the shake with no motion", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Example open={open} onOpenChange={setOpen} duration={0} />
          <span data-testid="state">{String(open)}</span>
        </>
      );
    }
    render(<Controlled />);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(document.querySelector('[data-slot="alert-dialog-backdrop"]')!);
    expect(dialog).not.toHaveAttribute("data-shaking");
    expect(screen.getByTestId("state")).toHaveTextContent("true");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    await waitFor(() => expect(screen.queryByRole("alertdialog", { hidden: true })).toBeNull());
  });

  it("throws when a part is used outside AlertDialog", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AlertDialogContent />)).toThrow(
      "AlertDialogContent must be used within AlertDialog.",
    );
  });
});
