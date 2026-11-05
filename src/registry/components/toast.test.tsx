import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createToastManager, Toaster, ToastProvider, useToast } from "./toast";

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.add({ title: "Saved", description: "All changes stored." })}>
        Default
      </button>
      <button onClick={() => toast.add({ title: "Upload failed", type: "error" })}>Error</button>
    </>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("adds toasts newest first from the hook and closes them from the close button", () => {
    render(
      <ToastProvider>
        <Trigger />
        <Toaster contained duration={0} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Default" }));
    fireEvent.click(screen.getByRole("button", { name: "Error" }));
    const toasts = document.querySelectorAll('[data-slot="toast"]');
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveAttribute("data-type", "error");
    expect(toasts[0]).toHaveAttribute("data-index", "0");
    expect(toasts[1]).toHaveAttribute("data-index", "1");
    expect(screen.getByRole("dialog", { name: "Saved" })).toHaveAccessibleDescription("All changes stored.");
    expect(toasts[0].querySelector('[data-slot="toast-icon"]')).toHaveAttribute("data-type", "error");
    expect(toasts[1].querySelector('[data-slot="toast-icon"]')).toBeNull();

    const close = toasts[0].querySelector<HTMLButtonElement>('[data-slot="toast-close"]')!;
    expect(close).toHaveAttribute("aria-label", "Dismiss notification");
    fireEvent.click(close);
    expect(screen.queryByText("Upload failed")).toBeNull();
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="toast"]')).toHaveAttribute("data-index", "0");
  });

  it("updates a loading toast to success through an external manager", () => {
    const manager = createToastManager();
    render(
      <ToastProvider toastManager={manager}>
        <Toaster position="top-center" duration={0} />
      </ToastProvider>,
    );
    let id = "";
    act(() => {
      id = manager.add({ title: "Deploying", type: "loading", timeout: 0 });
    });
    const toaster = document.querySelector('[data-slot="toaster"]');
    expect(toaster).toHaveAttribute("data-position", "top-center");
    expect(toaster).toHaveAccessibleName("Notifications");
    expect(document.querySelector('[data-slot="toast-icon"]')).toHaveAttribute("data-type", "loading");

    act(() => manager.update(id, { title: "Deployed", type: "success" }));
    expect(screen.getByText("Deployed")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="toast"]')).toHaveAttribute("data-type", "success");
    expect(document.querySelector('[data-slot="toast-icon"]')).toHaveAttribute("data-type", "success");
  });

  it("renders an action button and marks toasts past the limit", () => {
    const onClick = vi.fn();
    const manager = createToastManager();
    render(
      <ToastProvider toastManager={manager}>
        <Toaster contained duration={0} />
      </ToastProvider>,
    );
    act(() => {
      manager.add({ title: "Message archived", actionProps: { children: "Undo", onClick } });
      for (const title of ["Second", "Third", "Fourth"]) manager.add({ title });
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo", hidden: true }));
    expect(onClick).toHaveBeenCalledOnce();
    const toasts = document.querySelectorAll('[data-slot="toast"]');
    expect(toasts).toHaveLength(4);
    expect(toasts[3]).toHaveAttribute("data-limited");
    expect(toasts[3]).toHaveClass("pointer-events-none");
    expect(toasts[0]).not.toHaveAttribute("data-limited");
  });
});
