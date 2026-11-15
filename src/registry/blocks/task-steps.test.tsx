import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskSteps, type TaskStep, type TaskStepStatus } from "./task-steps";

// Motion's frame loop captures requestAnimationFrame when it loads. Route it through a timeout
// installed before imports, so the fake clock drives Motion's springs as well as the step clocks.
vi.hoisted(() => {
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number;
});

// Motion reads the reduced-motion query once and then listens to it, so every test shares one.
const motionQuery = Object.assign(new EventTarget(), { matches: false });
function setReducedMotion(reduced: boolean) {
  motionQuery.matches = reduced;
  motionQuery.dispatchEvent(new Event("change"));
}

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
const surface = (label: string) => row(label).querySelector('[data-slot="task-steps-row"]') as HTMLElement;
const spinner = (label: string) =>
  row(label).querySelector('[data-slot="task-steps-spinner"]') as SVGGElement | null;
// Motion starts an animation, and reports a finished exit, through a promise, so tests that watch
// one advance the clock asynchronously.
const advance = (milliseconds: number) => act(() => vi.advanceTimersByTimeAsync(milliseconds));
// Long enough for every spring to come to rest and for anything on its way out to leave. React
// removes what has left when the first pass ends, and the second gives Motion the frame it takes
// to go idle.
async function settle() {
  await advance(1500);
  await advance(100);
}
const politeMessage = () => screen.getByRole("status");
const alertMessage = () => screen.getByRole("alert");

describe("TaskSteps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.stubGlobal("matchMedia", () => motionQuery);
    // Motion restores the scroll position after it measures a panel's natural height; jsdom cannot scroll.
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(async () => {
    cleanup();
    setReducedMotion(false);
    // Let Motion's shared loop run its last requested frame, so the next test starts idle.
    await vi.advanceTimersByTimeAsync(100);
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

  it("restarts the clock when a failed step runs again, and clears it on a reset", async () => {
    const { rerender } = render(<TaskSteps steps={job(["running"])} />);
    act(() => vi.advanceTimersByTime(5000));
    rerender(<TaskSteps steps={job(["failed"])} />);
    expect(time("Install")).toHaveTextContent("5.0s");
    rerender(<TaskSteps steps={job(["running"])} />);
    expect(time("Install")).toHaveTextContent("0s");
    act(() => vi.advanceTimersByTime(2000));
    expect(time("Install")).toHaveTextContent("2s");
    rerender(<TaskSteps steps={job(["pending"])} />);
    // The time fades out with the rest of the step, and then nothing is left ticking or animating.
    await settle();
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

  it("takes a jump across several steps as one update and one announcement", async () => {
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
    // Once the springs have settled, the arc has gone and no clock or animation is left running.
    await settle();
    expect(spinner("Install")).toBeNull();
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

  it("dims a row on pointer-down, before the click, and restores it on release", async () => {
    const { rerender } = render(<TaskSteps steps={job(["done"], [{ detail: "Added 412 packages." }])} />);
    const install = within(row("Install")).getByRole("button", { name: "Install" });
    expect(surface("Install").style.opacity).toBe("1");

    fireEvent.pointerDown(install, { isPrimary: true });
    // One frame: the dim is not eased in.
    await advance(17);
    expect(surface("Install").style.opacity).toBe("0.7");
    // Held, it stays dimmed, and nothing has been toggled yet.
    await advance(600);
    expect(surface("Install").style.opacity).toBe("0.7");
    expect(install).toHaveAttribute("aria-expanded", "false");

    fireEvent.pointerUp(install, { isPrimary: true });
    await advance(60);
    const returning = Number(surface("Install").style.opacity);
    expect(returning).toBeGreaterThan(0.7);
    expect(returning).toBeLessThan(1);
    await settle();
    expect(surface("Install").style.opacity).toBe("1");

    // A step that loses its detail while it is held has no button left to release it, so it recovers.
    fireEvent.pointerDown(install, { isPrimary: true });
    await advance(17);
    expect(surface("Install").style.opacity).toBe("0.7");
    rerender(<TaskSteps steps={job(["done"])} />);
    await advance(17);
    expect(surface("Install").style.opacity).toBe("1");
    fireEvent.pointerUp(document.body, { isPrimary: true });
  });

  it("moves a step's label and clock colour on one spring with its status", async () => {
    const mix = (label: string, name: string) => Number(surface(label).style.getPropertyValue(name));
    const { rerender } = render(<TaskSteps steps={job(["pending"])} />);
    expect(mix("Install", "--task-steps-ink")).toBe(0);
    expect(mix("Install", "--task-steps-clock")).toBe(0);

    rerender(<TaskSteps steps={job(["running"])} />);
    await advance(100);
    const ink = mix("Install", "--task-steps-ink");
    expect(ink).toBeGreaterThan(0);
    expect(ink).toBeLessThan(1);
    expect(mix("Install", "--task-steps-clock")).toBe(ink);

    // Finishing mid-way retargets the clock from where it is; the label carries on to full strength.
    rerender(<TaskSteps steps={job(["done"])} />);
    await advance(32);
    const clock = mix("Install", "--task-steps-clock");
    expect(clock).toBeGreaterThan(0);
    expect(clock).toBeLessThan(1);
    expect(mix("Install", "--task-steps-ink")).toBeGreaterThanOrEqual(ink);
    await settle();
    expect(mix("Install", "--task-steps-ink")).toBe(1);
    expect(mix("Install", "--task-steps-clock")).toBe(0);
  });

  it("fades a drawn status word out when the step runs again, reading only the new status", async () => {
    const words = () => [...row("Install").querySelectorAll('[data-slot="task-steps-status"]')];
    const { rerender } = render(<TaskSteps steps={job(["failed"])} />);
    expect(words().map((word) => word.textContent)).toEqual(["Failed"]);
    // A word that is there from the start is not faded in.
    expect((words()[0] as HTMLElement).style.opacity).toBe("1");

    rerender(<TaskSteps steps={job(["running"])} />);
    expect(words().map((word) => word.textContent)).toEqual(["Failed", "Running"]);
    expect(words()[0]).toHaveAttribute("aria-hidden", "true");
    expect(words()[1]).toHaveClass("sr-only");
    await settle();
    expect(words().map((word) => word.textContent)).toEqual(["Running"]);

    rerender(<TaskSteps steps={job(["failed"])} />);
    expect((words()[0] as HTMLElement).style.opacity).toBe("0");
    expect(words()[0]).not.toHaveAttribute("aria-hidden");
    await settle();
    expect((words()[0] as HTMLElement).style.opacity).toBe("1");
  });

  it("opens a panel that arrives with a step's first log line, and closes one that is taken away", async () => {
    const { rerender } = render(<TaskSteps steps={job(["running"])} />);
    expect(panel("Install")).toBeNull();

    rerender(<TaskSteps steps={job(["running"], [{ logs: ["resolving"] }])} />);
    expect(within(row("Install")).getByRole("button", { name: "Install" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // It starts closed and opens on the spring, rather than appearing at full height.
    expect((panel("Install") as HTMLElement).style.height).toBe("0px");
    expect((panel("Install") as HTMLElement).style.opacity).toBe("0");
    await settle();
    expect((panel("Install") as HTMLElement).style.opacity).toBe("1");

    // A later line fades in; the one that came with the panel did not need to.
    rerender(<TaskSteps steps={job(["running"], [{ logs: ["resolving", "linking"] }])} />);
    const lines = [...within(row("Install")).getByRole("log").children] as HTMLElement[];
    expect(lines.map((line) => line.textContent)).toEqual(["resolving", "linking"]);
    expect(lines.map((line) => line.style.opacity)).toEqual(["1", "0"]);
    await settle();
    expect(lines[1].style.opacity).toBe("1");

    // With its detail gone the step is no longer a button, and the panel closes before it leaves.
    rerender(<TaskSteps steps={job(["running"])} />);
    expect(within(row("Install")).queryByRole("button")).toBeNull();
    expect(panel("Install")).toHaveTextContent("resolvinglinking");
    expect(panel("Install")!.firstElementChild).toHaveAttribute("inert");
    await settle();
    expect(panel("Install")).toBeNull();
  });

  it("turns the running arc until it has closed, and holds it still under reduced motion", async () => {
    const { rerender, unmount } = render(<TaskSteps steps={job(["running"])} />);
    await advance(250);
    const quarter = spinner("Install")!.style.transform;
    expect(quarter).toMatch(/^rotate\(\d+(\.\d+)?deg\)$/);
    expect(quarter).not.toBe("rotate(0deg)");

    // The arc keeps turning while it closes into the ring, then it is gone.
    rerender(<TaskSteps steps={job(["done"])} />);
    await advance(100);
    expect(spinner("Install")!.style.transform).not.toBe(quarter);
    await settle();
    expect(spinner("Install")).toBeNull();
    unmount();

    setReducedMotion(true);
    render(<TaskSteps steps={job(["running"])} />);
    await advance(1250);
    expect(spinner("Install")).not.toBeNull();
    expect(spinner("Install")!.style.transform).toBe("");
    // The clock is what still shows the step running.
    expect(time("Install")).toHaveTextContent("1s");
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
