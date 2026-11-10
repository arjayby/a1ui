import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskSteps, type TaskStep, type TaskStepStatus } from "./task-steps";

const job = (statuses: TaskStepStatus[], extra: Partial<TaskStep>[] = []): TaskStep[] =>
  ["Install", "Build", "Deploy"].map((label, index) => ({
    id: label.toLowerCase(),
    label,
    status: statuses[index] ?? "pending",
    ...extra[index],
  }));

const row = (label: string) =>
  screen.getAllByRole("listitem").find((item) => within(item).queryByText(label)) as HTMLElement;
const time = (label: string) => row(label).querySelector('[data-slot="task-steps-time"]');
const status = (label: string) => row(label).querySelector('[data-slot="task-steps-status"]');
const panel = (label: string) => row(label).querySelector('[data-slot="task-steps-panel"]');
const politeMessage = () => screen.getByRole("status");
const alertMessage = () => screen.getByRole("alert");

describe("TaskSteps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders an ordered list and marks only the running step as the current step", () => {
    render(<TaskSteps aria-label="Deploy job" steps={job(["done", "running", "pending"])} />);
    const list = screen.getByRole("list", { name: "Deploy job" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.getAttribute("data-status"))).toEqual(["done", "running", "pending"]);
    expect(items.map((item) => item.getAttribute("aria-current"))).toEqual([null, "step", null]);
  });

  it("says each status in words, drawing the word for failed and skipped steps", () => {
    render(
      <TaskSteps
        steps={[
          { id: "a", label: "Queue", status: "done" },
          { id: "b", label: "Build", status: "running" },
          { id: "c", label: "Checks", status: "failed" },
          { id: "d", label: "Deploy", status: "skipped" },
          { id: "e", label: "Notify", status: "pending" },
        ]}
      />,
    );
    expect(status("Queue")).toHaveTextContent("Done");
    expect(status("Queue")).toHaveClass("sr-only");
    expect(status("Build")).toHaveTextContent("Running");
    expect(status("Notify")).toHaveTextContent("Pending");
    expect(status("Checks")).toHaveTextContent("Failed");
    expect(status("Checks")).not.toHaveClass("sr-only");
    expect(status("Deploy")).toHaveTextContent("Skipped");
    expect(status("Deploy")).not.toHaveClass("sr-only");
    // Every icon is decorative; the words carry the state.
    document.querySelectorAll('[data-slot="task-steps-icon"]').forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("measures a running step each second and keeps its final duration", () => {
    const { rerender } = render(<TaskSteps steps={job(["running"])} />);
    expect(time("Install")).toHaveTextContent("0s");
    expect(time("Build")).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(3000));
    expect(time("Install")).toHaveTextContent("3s");

    act(() => vi.advanceTimersByTime(400));
    rerender(<TaskSteps steps={job(["done", "running"])} />);
    expect(time("Install")).toHaveTextContent("3.4s");
    expect(time("Build")).toHaveTextContent("0s");

    act(() => vi.advanceTimersByTime(65_000));
    expect(time("Build")).toHaveTextContent("1m 05s");
    expect(time("Install")).toHaveTextContent("3.4s");
    rerender(<TaskSteps steps={job(["done", "failed", "skipped"])} />);
    expect(time("Build")).toHaveTextContent("1m 05s");
    expect(time("Deploy")).toHaveTextContent("");
  });

  it("uses supplied timing instead of its own clock", () => {
    render(
      <TaskSteps
        steps={job(
          ["done", "running", "pending"],
          [{ durationMs: 1234 }, { startedAt: Date.now() - 42_000 }, { durationMs: 99 }],
        )}
      />,
    );
    expect(time("Install")).toHaveTextContent("1.2s");
    expect(time("Build")).toHaveTextContent("42s");
    // A pending step has no time yet, whatever was passed.
    expect(time("Deploy")).toHaveTextContent("");
    act(() => vi.advanceTimersByTime(1000));
    expect(time("Build")).toHaveTextContent("43s");
  });

  it("restarts the clock when a failed step runs again, and clears it on a reset", () => {
    const { rerender } = render(<TaskSteps steps={job(["running"])} />);
    act(() => vi.advanceTimersByTime(5000));
    rerender(<TaskSteps steps={job(["failed"])} />);
    expect(time("Install")).toHaveTextContent("5.0s");
    rerender(<TaskSteps steps={job(["running"])} />);
    expect(time("Install")).toHaveTextContent("0s");
    act(() => vi.advanceTimersByTime(2000));
    expect(time("Install")).toHaveTextContent("2s");
    rerender(<TaskSteps steps={job(["pending"])} />);
    expect(time("Install")).toHaveTextContent("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("opens a step's detail while it runs, closes it when it finishes, and lets it be re-opened", () => {
    const extra = [{ logs: ["resolving", "linking"] }, { detail: "Compiling 212 modules." }];
    const { rerender } = render(<TaskSteps steps={job(["running"], extra)} />);

    const install = within(row("Install")).getByRole("button", { name: "Install" });
    const build = within(row("Build")).getByRole("button", { name: "Build" });
    expect(install).toHaveAttribute("aria-expanded", "true");
    expect(build).toHaveAttribute("aria-expanded", "false");
    expect(install).toHaveAttribute("aria-controls", panel("Install")!.id);
    expect(panel("Install")!.firstElementChild).not.toHaveAttribute("inert");
    expect(panel("Build")!.firstElementChild).toHaveAttribute("inert");
    expect(within(row("Install")).getByRole("log", { name: "Install" })).toHaveTextContent(
      "resolvinglinking",
    );
    // A step with nothing to show is not a button.
    expect(within(row("Deploy")).queryByRole("button")).toBeNull();

    rerender(<TaskSteps steps={job(["done", "running"], extra)} />);
    expect(install).toHaveAttribute("aria-expanded", "false");
    expect(panel("Install")!.firstElementChild).toHaveAttribute("inert");
    expect(build).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(install);
    expect(install).toHaveAttribute("aria-expanded", "true");
    expect(panel("Install")).toHaveAttribute("data-open");
    fireEvent.click(install);
    expect(install).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a person's choice until the step changes status, and leaves a failed step open", () => {
    const extra = [{ logs: ["resolving"] }];
    const { rerender } = render(<TaskSteps steps={job(["running"], extra)} />);
    const install = within(row("Install")).getByRole("button", { name: "Install" });

    fireEvent.click(install);
    expect(install).toHaveAttribute("aria-expanded", "false");
    rerender(<TaskSteps steps={job(["running"], [{ logs: ["resolving", "linking"] }])} />);
    expect(install).toHaveAttribute("aria-expanded", "false");

    rerender(<TaskSteps steps={job(["failed", "skipped", "skipped"], extra)} />);
    expect(install).toHaveAttribute("aria-expanded", "true");
  });

  it("announces starts and finishes politely, failures assertively, and nothing on mount", () => {
    const { rerender } = render(
      <StrictMode>
        <TaskSteps steps={job(["running"])} />
      </StrictMode>,
    );
    expect(politeMessage()).toHaveTextContent("");
    expect(alertMessage()).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(2000));
    rerender(
      <StrictMode>
        <TaskSteps steps={job(["done", "running"])} />
      </StrictMode>,
    );
    expect(politeMessage()).toHaveTextContent("Install: Done, 2.0s. Build: Running");
    expect(alertMessage()).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(1000));
    rerender(
      <StrictMode>
        <TaskSteps steps={job(["done", "failed", "skipped"])} />
      </StrictMode>,
    );
    expect(alertMessage()).toHaveTextContent("Build: Failed, 1.0s");
    expect(politeMessage()).toHaveTextContent("Deploy: Skipped");
  });

  it("takes a jump across several steps as one update and one announcement", () => {
    const { rerender } = render(<TaskSteps steps={job(["running"])} />);
    act(() => vi.advanceTimersByTime(1500));
    const before = politeMessage().firstElementChild;

    rerender(<TaskSteps steps={job(["done", "done", "done"], [{}, { durationMs: 800 }])} />);
    expect(screen.getAllByRole("listitem").map((item) => item.getAttribute("data-status"))).toEqual([
      "done",
      "done",
      "done",
    ]);
    expect(politeMessage()).toHaveTextContent("Install: Done, 1.5s. Build: Done, 0.8s. Deploy: Done");
    // One new node, so the message is read once.
    expect(politeMessage().children).toHaveLength(1);
    expect(politeMessage().firstElementChild).not.toBe(before);
    expect(screen.getByRole("list").querySelector("[aria-current]")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("fills a connector once the job is past its step, but not after a failure", () => {
    const filled = () =>
      screen
        .getAllByRole("listitem")
        .map((item) => item.querySelector('[data-slot="task-steps-connector"]')?.hasAttribute("data-filled"));
    const { rerender } = render(<TaskSteps steps={job(["done", "running"])} />);
    // The last step has no connector.
    expect(filled()).toEqual([true, false, undefined]);
    rerender(<TaskSteps steps={job(["done", "skipped", "running"])} />);
    expect(filled()).toEqual([true, true, undefined]);
    rerender(<TaskSteps steps={job(["failed", "skipped", "skipped"])} />);
    expect(filled()).toEqual([false, false, undefined]);
  });

  it("uses custom status words and a custom time format in rows and announcements", () => {
    const props = {
      statusLabels: { running: "En cours", done: "Terminé" },
      formatDuration: (ms: number, running: boolean) => `${running ? "~" : ""}${ms}ms`,
    };
    const { rerender } = render(<TaskSteps steps={job(["running"])} {...props} />);
    expect(status("Install")).toHaveTextContent("En cours");
    expect(time("Install")).toHaveTextContent("~0ms");
    act(() => vi.advanceTimersByTime(1000));
    expect(time("Install")).toHaveTextContent("~1000ms");
    rerender(<TaskSteps steps={job(["done"])} {...props} />);
    expect(time("Install")).toHaveTextContent("1000ms");
    expect(politeMessage()).toHaveTextContent("Install: Terminé, 1000ms");
  });

  it("renders on the server without reading the clock or browser preferences", () => {
    const matchMedia = vi.fn();
    vi.stubGlobal("matchMedia", matchMedia);
    const html = renderToString(
      <TaskSteps steps={job(["done", "running"], [{ durationMs: 4200 }, { logs: ["compiling"] }])} />,
    );
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("4.2s");
    expect(html).toContain("0s");
    expect(html).toContain("compiling");
    expect(matchMedia).not.toHaveBeenCalled();
  });
});
