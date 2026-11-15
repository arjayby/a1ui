import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SectionRail } from "./section-rail";

// Motion reads the reduced-motion query once per page, so tests flip the hook directly.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const sections = [
  { id: "start", label: "Start" },
  { id: "details", label: "Details" },
  { id: "finish", label: "Finish" },
];

function addTrackedSection(id: string, top: number, parent: HTMLElement = document.body) {
  const section = document.createElement("section");
  section.id = id;
  section.getBoundingClientRect = vi.fn(() => ({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }));
  parent.append(section);
  return section;
}

const tick = (link: HTMLElement) => link.querySelector<HTMLElement>("[aria-hidden='true']")!;

/** A tick is a 24px bar that Motion scales from its left edge, so its length is read from the transform. */
function tickLength(marker: HTMLElement) {
  const scale = /scaleX\(([\d.]+)\)/.exec(marker.style.transform);
  return Number((Number(scale ? scale[1] : 1) * 24).toFixed(2));
}

/** Waits for the springs to settle on each tick's `[length, opacity]`. */
function expectTicks(markers: HTMLElement[], expected: Record<number, [length: number, opacity: number]>) {
  return waitFor(() => {
    for (const [index, [length, opacity]] of Object.entries(expected)) {
      const marker = markers[Number(index)];
      expect(tickLength(marker)).toBe(length);
      expect(Number(marker.style.opacity)).toBe(opacity);
    }
  });
}

describe("SectionRail", () => {
  beforeEach(() => {
    vi.stubGlobal("innerHeight", 1000);
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    motionPreference.reduced = false;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("recomputes the active section when activeOffset changes", () => {
    addTrackedSection("start", 0);
    addTrackedSection("details", 400);
    addTrackedSection("finish", 800);
    const { rerender } = render(<SectionRail sections={sections} activeOffset={0.2} />);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "location");

    rerender(<SectionRail sections={sections} activeOffset={0.5} />);
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location");

    rerender(<SectionRail sections={sections} activeOffset={2} />);
    expect(screen.getByRole("link", { name: "Finish" })).toHaveAttribute("aria-current", "location");

    rerender(<SectionRail sections={sections} activeOffset={-1} />);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "location");
  });

  it("updates the reading position when the viewport resizes", async () => {
    addTrackedSection("start", 0);
    addTrackedSection("details", 300);
    addTrackedSection("finish", 700);
    render(<SectionRail sections={sections} />);
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location");

    vi.stubGlobal("innerHeight", 500);
    fireEvent.resize(window);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "location"),
    );
  });

  it("activates the last section at the bottom of the page", async () => {
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
    addTrackedSection("start", -100);
    addTrackedSection("details", 200);
    addTrackedSection("finish", 900);
    render(<SectionRail sections={sections} />);
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location");

    vi.stubGlobal("scrollY", 1000);
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Finish" })).toHaveAttribute("aria-current", "location"),
    );
  });

  it("moves highlighting between focused links and clears it when focus leaves", async () => {
    render(<SectionRail sections={sections} />);
    const links = screen.getAllByRole("link");
    const markers = links.map(tick);

    fireEvent.focus(links[1]);
    await expectTicks(markers, { 1: [24, 1] });
    fireEvent.blur(links[1], { relatedTarget: links[2] });
    fireEvent.focus(links[2], { relatedTarget: links[1] });
    await expectTicks(markers, { 2: [24, 1], 1: [20, 0.8] });

    fireEvent.blur(links[2], { relatedTarget: document.body });
    await expectTicks(markers, { 0: [20, 1], 1: [12, 0.25], 2: [12, 0.25] });
  });

  it("skips missing section elements while preserving marker indexes", () => {
    addTrackedSection("details", 100);
    render(<SectionRail sections={sections} />);
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Finish" })).toHaveAttribute("data-state", "pending");
  });

  it("renders an empty navigation when no sections are supplied", () => {
    render(<SectionRail sections={[]} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("marks sections before, at, and after the reading position", async () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    addTrackedSection("start", -100);
    addTrackedSection("details", 200);
    addTrackedSection("finish", 700);

    render(<SectionRail sections={sections} ariaLabel="Story sections" />);

    const links = screen.getAllByRole("link");
    await waitFor(() => expect(links[1]).toHaveAttribute("aria-current", "location"));
    expect(links[0]).toHaveAttribute("data-state", "complete");
    expect(links[1]).toHaveAttribute("data-state", "active");
    expect(links[2]).toHaveAttribute("data-state", "pending");
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-label", "Story sections");
  });

  it("updates the current section after scrolling", async () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    addTrackedSection("start", -100);
    addTrackedSection("details", -50);
    const finish = addTrackedSection("finish", 700);

    render(<SectionRail sections={sections} />);
    const finishLink = screen.getByRole("link", { name: "Finish" });

    finish.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
    fireEvent.scroll(window);

    await waitFor(() => expect(finishLink).toHaveAttribute("aria-current", "location"));
  });

  it("links each marker to its section", () => {
    render(<SectionRail sections={sections} className="fixed" />);

    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start");
    expect(screen.getByRole("navigation")).toHaveClass("fixed");
  });

  it("sets the gap between section markers", () => {
    render(<SectionRail sections={sections} gap="0.5rem" />);

    expect(screen.getByRole("list")).toHaveStyle({ gap: "0.5rem" });
  });

  it("supports a short active marker without dimming its active color", async () => {
    const { rerender } = render(<SectionRail sections={sections} activeMarkerLength="short" />);
    const activeMarker = tick(screen.getByRole("link", { name: "Start" }));

    // The first render is already at rest: nothing animates in on mount.
    expect(tickLength(activeMarker)).toBe(12);
    expect(activeMarker).toHaveStyle({ opacity: "1" });

    rerender(<SectionRail sections={sections} activeMarkerLength="long" />);
    await expectTicks([activeMarker], { 0: [20, 1] });
  });

  it("tapers nearby markers around the hovered or focused section", async () => {
    const nearbySections = [
      { id: "one", label: "One" },
      { id: "two", label: "Two" },
      { id: "three", label: "Three" },
      { id: "four", label: "Four" },
      { id: "five", label: "Five" },
    ];
    render(<SectionRail sections={nearbySections} />);

    const links = screen.getAllByRole("link");
    const markers = links.map(tick);

    fireEvent.pointerEnter(links[2]);
    await expectTicks(markers, { 2: [24, 1], 1: [20, 0.8], 0: [16, 1], 3: [20, 0.8], 4: [16, 0.6] });

    fireEvent.pointerLeave(screen.getByRole("list"));
    fireEvent.focus(links[1]);
    await expectTicks(markers, { 1: [24, 1], 0: [20, 1] });
  });

  it("retargets a tick that is still moving instead of restarting it", async () => {
    render(<SectionRail sections={sections} />);
    const links = screen.getAllByRole("link");
    const marker = tick(links[2]);

    fireEvent.pointerEnter(links[2]);
    await waitFor(() => expect(tickLength(marker)).toBeGreaterThan(12));
    const midFlight = tickLength(marker);
    expect(midFlight).toBeLessThan(24);

    // The pointer moves on before the tick arrives: it heads for the new length from where it is.
    fireEvent.pointerEnter(links[0]);
    await expectTicks([marker], { 0: [16, 0.6] });
  });

  it("keeps every tick the same size in layout and scales it from its left edge", () => {
    render(<SectionRail sections={sections} />);
    const markers = screen.getAllByRole("link").map(tick);

    for (const marker of markers) {
      expect(marker).toHaveStyle({ width: "24px" });
      expect(marker).toHaveClass("origin-left");
    }
    expect(markers.map(tickLength)).toEqual([20, 12, 12]);
  });

  it("gives on pointer-down and springs back on release", async () => {
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Details" });
    const marker = tick(link);

    fireEvent.pointerEnter(link);
    fireEvent.pointerDown(link, { isPrimary: true, button: 0 });
    await expectTicks([marker], { 0: [18, 1] });

    fireEvent.pointerUp(link, { isPrimary: true, button: 0 });
    await expectTicks([marker], { 0: [24, 1] });
  });

  it("dims the pressed tick instead of moving it with reduced motion", async () => {
    motionPreference.reduced = true;
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Details" });
    const marker = tick(link);

    fireEvent.pointerEnter(link);
    fireEvent.pointerDown(link, { isPrimary: true, button: 0 });
    await expectTicks([marker], { 0: [24, 0.6] });

    fireEvent.pointerUp(link, { isPrimary: true, button: 0 });
    await expectTicks([marker], { 0: [24, 1] });
  });

  it("shows a label under the pointer and takes it back along the same path", async () => {
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Details" });
    expect(screen.queryByText("Details")).not.toBeInTheDocument();

    fireEvent.pointerEnter(link);
    const label = screen.getByText("Details");
    expect(label).toHaveClass("origin-left");
    // It starts nudged toward its tick, slightly small and transparent.
    expect(label).toHaveStyle({ opacity: "0" });
    expect(label.style.transform).toBe("translateX(-4px) scale(0.96)");
    await waitFor(() => {
      expect(label).toHaveStyle({ opacity: "1" });
      expect(label.style.transform).toBe("none");
    });

    fireEvent.pointerLeave(link);
    await waitFor(() => expect(label.style.transform).toContain("scale(0.9"));
    await waitFor(() => expect(screen.queryByText("Details")).not.toBeInTheDocument());
  });

  it("only cross-fades the label with reduced motion", async () => {
    motionPreference.reduced = true;
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Details" });

    fireEvent.pointerEnter(link);
    const label = screen.getByText("Details");
    expect(label).toHaveStyle({ opacity: "0" });
    expect(label.style.transform).toBe("");
    await waitFor(() => expect(label).toHaveStyle({ opacity: "1" }));
    expect(label.style.transform).toBe("none");

    fireEvent.pointerLeave(link);
    await waitFor(() => expect(screen.queryByText("Details")).not.toBeInTheDocument());
  });

  it("shows the label on keyboard focus and hides it on blur", async () => {
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Finish" });
    vi.spyOn(link, "matches").mockImplementation((selector) => selector === ":focus-visible");

    act(() => link.focus());
    expect(screen.getByText("Finish")).toBeInTheDocument();

    act(() => link.blur());
    await waitFor(() => expect(screen.queryByText("Finish")).not.toBeInTheDocument());
  });

  it("leaves the label out when focus comes from the pointer", () => {
    render(<SectionRail sections={sections} />);
    const link = screen.getByRole("link", { name: "Finish" });
    vi.spyOn(link, "matches").mockReturnValue(false);

    act(() => link.focus());
    expect(screen.queryByText("Finish")).not.toBeInTheDocument();
  });

  it("tracks sections inside a scroll container", async () => {
    const scrollContainer = document.createElement("div");
    const reactRoot = document.createElement("div");
    scrollContainer.style.overflowY = "auto";
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "scrollHeight", { configurable: true, value: 600 });
    scrollContainer.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
    scrollContainer.append(reactRoot);
    document.body.append(scrollContainer);

    addTrackedSection("start", 120, scrollContainer);
    const details = addTrackedSection("details", 220, scrollContainer);
    addTrackedSection("finish", 320, scrollContainer);
    render(<SectionRail sections={sections} />, { container: reactRoot });

    details.getBoundingClientRect = vi.fn(() => ({
      top: 150,
      bottom: 250,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 150,
      toJSON: () => ({}),
    }));
    fireEvent.scroll(scrollContainer);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location"),
    );
  });

  it.each([false, true])("confines link jumps to the scroll panel with reduced motion %s", (reduced) => {
    motionPreference.reduced = reduced;
    const panel = document.createElement("div");
    const reactRoot = document.createElement("div");
    panel.style.overflowY = "auto";
    Object.defineProperties(panel, {
      clientHeight: { value: 200 },
      scrollHeight: { value: 600 },
      clientTop: { value: 2 },
    });
    panel.getBoundingClientRect = () => new DOMRect(0, 100, 100, 200);
    const scroll = vi.fn();
    panel.scrollTo = scroll;
    panel.append(reactRoot);
    document.body.append(panel);
    addTrackedSection("details", 220, panel);
    const windowScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const history = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    render(<SectionRail sections={sections} />, { container: reactRoot });
    const link = screen.getByRole("link", { name: "Details" });

    expect(fireEvent.click(link)).toBe(false);
    expect(scroll).toHaveBeenCalledWith({ top: 118, behavior: reduced ? "instant" : "smooth" });
    expect(windowScroll).not.toHaveBeenCalled();
    expect(history).toHaveBeenCalledWith(window.history.state, "", expect.stringMatching(/#details$/));

    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("activates the last section when a scroll container reaches the bottom", async () => {
    const scrollContainer = document.createElement("div");
    const reactRoot = document.createElement("div");
    scrollContainer.style.overflowY = "auto";
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "scrollHeight", { configurable: true, value: 600 });
    Object.defineProperty(scrollContainer, "scrollTop", { configurable: true, value: 0, writable: true });
    scrollContainer.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));
    scrollContainer.append(reactRoot);
    document.body.append(scrollContainer);

    addTrackedSection("start", 50, scrollContainer);
    addTrackedSection("details", 150, scrollContainer);
    addTrackedSection("finish", 250, scrollContainer);
    render(<SectionRail sections={sections} />, { container: reactRoot });

    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "location");

    scrollContainer.scrollTop = 400;
    fireEvent.scroll(scrollContainer);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Finish" })).toHaveAttribute("aria-current", "location"),
    );
  });
});
