import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ParticleMenu } from "./particle-menu";

// Motion's frame loop captures requestAnimationFrame when it loads. Route it through a stand-in
// installed before imports that looks up setTimeout on each call, so fake timers drive it.
vi.hoisted(() => {
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number;
});

const items = [{ id: "grace", label: "Grace", shape: "grace" as const }];

describe("ParticleMenu", () => {
  let preference: EventTarget & { matches: boolean };

  beforeEach(() => {
    // Motion times frames with performance.now(), so fake it along with the timers.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"],
    });
    preference = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("matchMedia", () => preference);
    vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 120,
      bottom: 120,
      width: 120,
      height: 120,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    cleanup();
    // Let Motion's shared loop drain its last requested frame so the next test starts idle.
    act(() => vi.advanceTimersByTime(100));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function move(control: HTMLElement, x: number, y: number) {
    fireEvent(control, new MouseEvent("pointermove", { clientX: x, clientY: y }));
    act(() => vi.advanceTimersByTime(1500));
  }

  it.each(["grace", "runes", "ashes", "oaths", "burst", "gate", "knot", "seed"] as const)(
    "%s responds to the pointer, returns gradually, and restores its exact silhouette",
    (shape) => {
      const { unmount } = render(<ParticleMenu items={[{ ...items[0], shape }]} />);
      const control = screen.getByRole("button", { name: "Grace" });
      const path = control.querySelector("path")!;
      const original = path.getAttribute("d");

      move(control, 45, 40);
      const firstPosition = path.getAttribute("d");
      expect(firstPosition).not.toBe(original);
      expect(vi.getTimerCount()).toBe(0);

      move(control, 80, 65);
      expect(path.getAttribute("d")).not.toBe(firstPosition);

      fireEvent.pointerLeave(control);
      act(() => vi.advanceTimersByTime(750));
      expect(path).not.toHaveAttribute("d", original);
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      act(() => vi.advanceTimersByTime(4000));
      expect(path).toHaveAttribute("d", original);
      expect(vi.getTimerCount()).toBe(0);
      unmount();
    },
  );

  it("pushes grains along a quick pointer flick but not a slow move to the same spot", () => {
    const after = (gap: number) => {
      const { unmount } = render(<ParticleMenu items={items} />);
      const control = screen.getByRole("button", { name: "Grace" });
      move(control, 50, 60);
      fireEvent(control, new MouseEvent("pointermove", { clientX: 50, clientY: 60 }));
      act(() => vi.advanceTimersByTime(gap));
      fireEvent(control, new MouseEvent("pointermove", { clientX: 56, clientY: 60 }));
      act(() => vi.advanceTimersByTime(80));
      const xs = [
        ...control
          .querySelector("path")!
          .getAttribute("d")!
          .matchAll(/M(-?[\d.]+)/g),
      ].map((match) => Number(match[1]));
      unmount();
      act(() => vi.advanceTimersByTime(100));
      return xs;
    };
    // Same start and end point: only the pointer's speed differs, and the flick moves grains right.
    const slow = after(500);
    const flicked = after(16);
    const pushed = Math.max(...flicked.map((x, index) => x - slow[index]));
    expect(pushed).toBeGreaterThan(1);
    expect(Math.min(...flicked.map((x, index) => x - slow[index]))).toBeGreaterThan(-0.1);
  });

  it("cancels movement immediately when the motion preference changes", () => {
    const { unmount } = render(<ParticleMenu items={items} />);
    const control = screen.getByRole("button", { name: "Grace" });
    const path = control.querySelector("path")!;
    const original = path.getAttribute("d");
    move(control, 45, 40);
    expect(path.getAttribute("d")).not.toBe(original);

    act(() => {
      preference.matches = true;
      preference.dispatchEvent(new Event("change"));
    });
    expect(path).toHaveAttribute("d", original);
    move(control, 80, 65);
    expect(path).toHaveAttribute("d", original);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it("keeps the original glyph still when strength is zero", () => {
    const { unmount } = render(<ParticleMenu items={items} strength={0} />);
    const control = screen.getByRole("button", { name: "Grace" });
    const path = control.querySelector("path")!;
    const original = path.getAttribute("d");
    move(control, 60, 60);
    expect(path).toHaveAttribute("d", original);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it("cleans up a pending animation when unmounted", () => {
    const { unmount } = render(<ParticleMenu items={items} />);
    const control = screen.getByRole("button", { name: "Grace" });
    fireEvent(control, new MouseEvent("pointermove", { clientX: 45, clientY: 40 }));
    act(() => vi.advanceTimersByTime(32));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    // Motion's shared loop runs one empty frame after the last animation stops.
    act(() => vi.advanceTimersByTime(17));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves native links and invokes button actions once", () => {
    const onSelect = vi.fn();
    const { unmount } = render(
      <ParticleMenu
        ariaLabel="Main navigation"
        items={[
          { ...items[0], href: "/" },
          { id: "oaths", label: "Oaths", shape: "oaths", onSelect },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Grace" })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("button", { name: "Oaths" }));
    expect(onSelect).toHaveBeenCalledOnce();
    unmount();
  });
});
