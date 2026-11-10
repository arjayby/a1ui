import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityPill, createActivityController, useActivity, type Activity } from "./activity-pill";

const pill = () => document.querySelector<HTMLElement>('[data-slot="activity-pill"]');
const toggle = () => document.querySelector<HTMLButtonElement>('[data-slot="activity-pill-toggle"]')!;

describe("createActivityController", () => {
  it("moves one activity from running to progress to success", () => {
    const controller = createActivityController();
    const listener = vi.fn();
    controller.subscribe(listener);

    const id = controller.start({ title: "Uploading", detail: "report.pdf" });
    expect(controller.get()).toEqual({ id, status: "running", title: "Uploading", detail: "report.pdf" });

    controller.update({ value: 40 });
    expect(controller.get()).toMatchObject({ id, status: "progress", value: 40 });
    controller.update({ value: null });
    expect(controller.get()).toMatchObject({ status: "running", value: undefined });

    controller.succeed("Uploaded");
    expect(controller.get()).toEqual({ id, status: "success", title: "Uploaded", detail: "report.pdf" });
    expect(listener).toHaveBeenCalledTimes(4);

    controller.clear();
    expect(controller.get()).toBeNull();
  });

  it("ignores late results from an activity that was replaced or has settled", () => {
    const controller = createActivityController();
    const first = controller.start("Exporting");
    const second = controller.start({ title: "Deploying", value: 10 });
    expect(second).not.toBe(first);
    expect(controller.get()).toMatchObject({ status: "progress", value: 10 });

    controller.update({ id: first, value: 90 });
    controller.succeed({ id: first, title: "Exported" });
    expect(controller.get()).toMatchObject({ id: second, title: "Deploying", value: 10 });

    controller.fail({ id: second, title: "Deploy failed", detail: "Build error." });
    expect(controller.get()).toEqual({
      id: second,
      status: "error",
      title: "Deploy failed",
      detail: "Build error.",
    });
    controller.update({ value: 50 });
    expect(controller.get()).toMatchObject({ status: "error" });
  });

  it("shows a result on its own when nothing was started, and only with a title", () => {
    const controller = createActivityController();
    controller.succeed();
    expect(controller.get()).toBeNull();
    controller.succeed("Copied");
    expect(controller.get()).toMatchObject({ status: "success", title: "Copied" });
  });
});

describe("ActivityPill", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders nothing but empty live regions while idle", () => {
    render(<ActivityPill activity={null} position="bottom-right" />);
    expect(pill()).toBeNull();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(document.querySelector('[data-slot="activity-pill-root"]')).toHaveAttribute(
      "data-position",
      "bottom-right",
    );
  });

  it("announces a running activity politely and exposes an indeterminate progressbar", () => {
    render(<ActivityPill activity={{ status: "running", title: "Deploying" }} />);
    expect(pill()).toHaveAttribute("data-status", "running");
    expect(pill()).toHaveAttribute("data-state", "compact");
    expect(screen.getByRole("status")).toHaveTextContent("Deploying");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();

    const bar = screen.getByRole("progressbar", { name: "Deploying" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByRole("button", { name: "Deploying" })).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes a clamped progress value in tabular figures with its width reserved", () => {
    const { rerender } = render(
      <ActivityPill activity={{ status: "progress", title: "Uploading", value: 42.4 }} />,
    );
    const bar = screen.getByRole("progressbar", { name: "Uploading" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");

    const value = document.querySelector('[data-slot="activity-pill-value"]')!;
    expect(value).toHaveClass("tabular-nums");
    expect(value).toHaveTextContent("100%42%");
    expect(value.firstElementChild).toHaveClass("invisible");

    rerender(<ActivityPill activity={{ status: "progress", title: "Uploading", value: 180 }} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    rerender(<ActivityPill activity={{ status: "progress", title: "Uploading", value: Number.NaN }} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("expands on press to show detail and actions, and collapses on Escape or an outside press", () => {
    const onCancel = vi.fn();
    const onView = vi.fn();
    const activity: Activity = { status: "progress", title: "Uploading", detail: "report.pdf", value: 12 };
    render(
      <>
        <button>Elsewhere</button>
        <ActivityPill activity={activity} onCancel={onCancel} onView={onView} />
      </>,
    );
    expect(screen.queryByRole("group", { name: "Activity details" })).toBeNull();

    fireEvent.click(toggle());
    expect(pill()).toHaveAttribute("data-state", "expanded");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("group", { name: "Activity details" });
    expect(toggle()).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveTextContent("report.pdf");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onView).toHaveBeenCalledWith(activity);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledWith(activity);

    screen.getByRole("button", { name: "Cancel" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(pill()).toHaveAttribute("data-state", "compact");
    expect(toggle()).toHaveFocus();

    fireEvent.click(toggle());
    fireEvent.pointerDown(panel.ownerDocument.querySelector('[data-slot="activity-pill-panel"]')!);
    expect(pill()).toHaveAttribute("data-state", "expanded");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(pill()).toHaveAttribute("data-state", "compact");
  });

  it("lets a success linger, waits while hovered, then leaves and reports it", async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const activity: Activity = { id: "a", status: "success", title: "Deployed" };
    render(<ActivityPill activity={activity} successDuration={1000} onDismiss={onDismiss} />);
    expect(screen.getByRole("status")).toHaveTextContent("Deployed");
    expect(screen.queryByRole("progressbar")).toBeNull();

    fireEvent.pointerEnter(pill()!);
    act(() => void vi.advanceTimersByTime(5000));
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerLeave(pill()!);
    act(() => void vi.advanceTimersByTime(999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith(activity);
    // It hides on its own even when the owner keeps passing the same activity.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(pill()).toHaveAttribute("inert");

    vi.useRealTimers();
    await waitFor(() => expect(pill()).toBeNull());
  });

  it("keeps an error until it is dismissed, and shows it again when the same error returns", async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();
    const failed: Activity = { status: "error", title: "Export failed", detail: "The connection dropped." };
    const { rerender } = render(
      <ActivityPill activity={failed} successDuration={10} onDismiss={onDismiss} onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Export failed. The connection dropped.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    act(() => void vi.advanceTimersByTime(60_000));
    expect(pill()).toHaveAttribute("data-status", "error");
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith(failed);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith(failed);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(pill()).toHaveAttribute("inert");

    rerender(<ActivityPill activity={{ status: "running", title: "Exporting" }} onDismiss={onDismiss} />);
    expect(pill()).toHaveAttribute("data-status", "running");
    expect(pill()).not.toHaveAttribute("inert");
    rerender(<ActivityPill activity={failed} onDismiss={onDismiss} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Export failed");
    expect(pill()).toHaveAttribute("data-status", "error");
  });

  it("uses custom labels and keeps a success when successDuration is 0", () => {
    vi.useFakeTimers();
    render(
      <ActivityPill
        activity={{ status: "success", title: "Exported" }}
        successDuration={0}
        onView={() => {}}
        labels={{ view: "Open file", dismiss: "Close", details: "Export details" }}
      />,
    );
    act(() => void vi.advanceTimersByTime(60_000));
    fireEvent.click(toggle());
    expect(screen.getByRole("group", { name: "Export details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("is driven by the useActivity hook and by a shared controller", () => {
    const controller = createActivityController();
    function App() {
      const { activity, start, update, fail, clear } = useActivity(controller);
      return (
        <>
          <button onClick={() => start("Syncing")}>Start</button>
          <button onClick={() => update({ value: 75 })}>Update</button>
          <button onClick={() => fail({ title: "Sync failed" })}>Fail</button>
          <ActivityPill activity={activity} onDismiss={clear} />
        </>
      );
    }
    render(<App />);
    expect(pill()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(pill()).toHaveAttribute("data-status", "running");
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Sync failed");

    act(() => void controller.start({ title: "Syncing again", value: 5 }));
    expect(pill()).toHaveAttribute("data-status", "progress");
    expect(screen.getByRole("status")).toHaveTextContent("Syncing again");

    fireEvent.click(toggle());
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    act(() => controller.fail("Sync failed"));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(controller.get()).toBeNull();
  });
});
