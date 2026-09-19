import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatusCapsuleDemo } from "@/components/status-capsule-demo";

import { StatusCapsule, type StatusCapsuleTask } from "./status-capsule";

const tasks: StatusCapsuleTask[] = [
  { id: "first", label: "tokens.json", status: "success" },
  { id: "second", label: "component.tsx", status: "running" },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StatusCapsule", () => {
  it("exposes determinate progress and keeps status announcements separate from percentage updates", () => {
    const { rerender } = render(
      <StatusCapsule title="Exporting files" status="running" progress={42} tasks={tasks} />,
    );
    expect(screen.getByRole("progressbar", { name: "Exporting files progress" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "42% complete");
    expect(screen.getByRole("status")).toHaveTextContent("Exporting files. In progress.");
    expect(screen.getByRole("button")).toHaveTextContent("1 of 2 complete");
    rerender(<StatusCapsule title="Exporting files" status="running" progress={55} tasks={tasks} />);
    expect(screen.getByRole("status")).toHaveTextContent("Exporting files. In progress.");
    rerender(<StatusCapsule title="Export complete" status="success" tasks={tasks} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("status")).toHaveTextContent("Export complete. Complete.");
  });

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses indeterminate progress for an unavailable value %s",
    (progress) => {
      render(<StatusCapsule status="running" progress={progress} tasks={[]} />);
      expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "In progress");
    },
  );

  it.each([
    [-20, "0"],
    [120, "100"],
  ])("clamps progress %s to %s", (progress, expected) => {
    render(<StatusCapsule status="running" progress={progress} tasks={[]} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", expected);
  });

  it("collapses with Escape, hides and inerts its actions, and restores focus to the trigger", () => {
    const onAction = vi.fn();
    render(
      <StatusCapsule status="ready" tasks={tasks} action={{ label: "Run export", onClick: onAction }} />,
    );
    const action = screen.getByRole("button", { name: "Run export" });
    const trigger = screen.getByRole("button", { name: /Ready/ });
    const region = screen.getByRole("region");
    action.focus();
    fireEvent.keyDown(action, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(region).toHaveAttribute("inert");
    expect(region).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Run export" })).toBeNull();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Run export" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("supports controlled expansion and returns focus when the parent closes it", () => {
    const onExpandedChange = vi.fn();
    const action = { label: "Retry export", onClick: vi.fn() };
    const { rerender } = render(
      <StatusCapsule
        status="error"
        tasks={tasks}
        expanded
        onExpandedChange={onExpandedChange}
        action={action}
      />,
    );
    const trigger = screen.getByRole("button", { name: /Needs attention/ });
    fireEvent.click(trigger);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    screen.getByRole("button", { name: "Retry export" }).focus();
    rerender(
      <StatusCapsule
        status="error"
        tasks={tasks}
        expanded={false}
        onExpandedChange={onExpandedChange}
        action={action}
      />,
    );
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps multiple capsule relationships unique and prevents disabled actions", () => {
    const onAction = vi.fn();
    render(
      <>
        <StatusCapsule title="First export" status="ready" tasks={[]} defaultExpanded={false} />
        <StatusCapsule
          title="Second export"
          status="running"
          tasks={tasks}
          action={{ label: "Exporting", onClick: onAction, disabled: true }}
        />
      </>,
    );
    const first = screen.getByRole("button", { name: /First export/ });
    const second = screen.getByRole("button", { name: /Second export/ });
    expect(first.getAttribute("aria-controls")).not.toBe(second.getAttribute("aria-controls"));
    expect(document.getElementById(second.getAttribute("aria-controls")!)).toBe(screen.getByRole("region"));
    fireEvent.click(screen.getByRole("button", { name: "Exporting" }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders task failures as text with caller-supplied details and footer content", () => {
    render(
      <StatusCapsule
        status="error"
        tasks={[{ id: "failed", label: "report.csv", status: "error", detail: "Network unavailable" }]}
        footer={<a href="/help">View help</a>}
      />,
    );
    const taskList = screen.getByRole("list", { name: "Tasks" });
    expect(within(taskList).getByText("Needs attention")).toBeVisible();
    expect(within(taskList).getByText("Network unavailable")).toBeVisible();
    expect(screen.getByRole("link", { name: "View help" })).toHaveAttribute("href", "/help");
  });
});

describe("StatusCapsuleDemo", () => {
  it("completes and replays a simulated job while collapsed", () => {
    vi.useFakeTimers();
    render(<StatusCapsuleDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Run preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse details" }));
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByRole("status")).toHaveTextContent("Export complete");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));
    fireEvent.click(screen.getByRole("button", { name: "Run again" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("status")).toHaveTextContent("Exporting files");
  });

  it("retries after an interrupted job and cleans up its timer on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<StatusCapsuleDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Preview interruption" }));
    act(() => vi.advanceTimersByTime(1300));
    expect(screen.getByRole("status")).toHaveTextContent("Export interrupted");
    expect(screen.getByText("Connection lost. Try again.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry export" }));
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByRole("status")).toHaveTextContent("Export complete");
    fireEvent.click(screen.getByRole("button", { name: "Run again" }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
