import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import { ToastQueue, useToastQueue, type ToastQueueController, type ToastQueueMessage } from "./toast-queue";

const controllerRef: { current: ToastQueueController | null } = { current: null };

function Harness({ limit = 3 }: { limit?: number }) {
  const queue = useToastQueue({ limit });
  useEffect(() => {
    controllerRef.current = queue;
  });
  return <ToastQueue {...queue} />;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function add(message: ToastQueueMessage) {
  act(() => controllerRef.current!.push(message));
}

describe("ToastQueue", () => {
  it("announces new messages and animates entry and dismissal", () => {
    vi.useFakeTimers();
    const { container } = render(<Harness />);
    add({ title: "Changes saved", description: "All edits are up to date.", tone: "success" });
    const item = container.querySelector('[data-slot="toast-queue-item"]')!;
    expect(item).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("status")).toHaveTextContent("Changes saved. All edits are up to date.");
    expect(container.querySelector("style")?.textContent).toContain("a1ui-toast-queue-in");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Changes saved" }));
    expect(item).toHaveAttribute("data-state", "exiting");
    expect(item).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(219));
    expect(container.querySelectorAll('[data-slot="toast-queue-item"]')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelectorAll('[data-slot="toast-queue-item"]')).toHaveLength(0);
  });

  it("keeps the newest messages and exits overflow items", () => {
    vi.useFakeTimers();
    const { container } = render(<Harness limit={2} />);
    add({ title: "First" });
    add({ title: "Second" });
    add({ title: "Third" });
    const items = container.querySelectorAll('[data-slot="toast-queue-item"]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Third");
    expect(items[2]).toHaveAttribute("data-state", "exiting");
    act(() => vi.advanceTimersByTime(220));
    expect(container.querySelectorAll('[data-slot="toast-queue-item"]')).toHaveLength(2);
    expect(screen.queryByText("First")).not.toBeInTheDocument();
  });

  it("automatically dismisses after durationMs without resetting on another push", () => {
    vi.useFakeTimers();
    const { container } = render(<Harness />);
    add({ title: "Timed", durationMs: 1000 });
    act(() => vi.advanceTimersByTime(800));
    add({ title: "Second" });
    act(() => vi.advanceTimersByTime(200));
    expect(container.querySelectorAll('[data-state="exiting"]')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByText("Timed")).not.toBeInTheDocument();
  });

  it("removes dismissed messages immediately for reduced motion", () => {
    vi.useFakeTimers();
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    try {
      const { container } = render(<Harness />);
      add({ title: "Quiet" });
      fireEvent.click(screen.getByRole("button", { name: "Dismiss Quiet" }));
      act(() => vi.advanceTimersByTime(0));
      expect(container.querySelectorAll('[data-slot="toast-queue-item"]')).toHaveLength(0);
      expect(container.querySelector("style")?.textContent).toContain("prefers-reduced-motion: reduce");
    } finally {
      window.matchMedia = original;
    }
  });
});
