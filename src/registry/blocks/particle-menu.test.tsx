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

  it.each(["grace", "runes", "ashes", "oaths", "ring", "lattice", "halo", "spiral"] as const)(
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

  it("pushes grains further along a quick pointer flick than a slow move to the same spot", () => {
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
    // Same start and end point, both while the pointer is moving: only its speed differs, and the
    // faster move carries the grains further right.
    const slow = after(96);
    const flicked = after(16);
    const pushed = Math.max(...flicked.map((x, index) => x - slow[index]));
    expect(pushed).toBeGreaterThan(1);
    expect(Math.min(...flicked.map((x, index) => x - slow[index]))).toBeGreaterThan(-0.1);
  });

  // Every grain's x in the path, sampled each frame for a second and a half.
  function trace(path: Element) {
    const frames: number[][] = [];
    for (let elapsed = 0; elapsed < 1500; elapsed += 16) {
      act(() => vi.advanceTimersByTime(16));
      frames.push([...path.getAttribute("d")!.matchAll(/M(-?[\d.]+)/g)].map((match) => Number(match[1])));
    }
    return frames;
  }

  // How far past its resting place the worst grain travelled on the way there.
  function overshoot(frames: number[][]) {
    const [start] = frames;
    const end = frames[frames.length - 1];
    return Math.max(
      ...frames.flatMap((xs) =>
        xs.map((x, index) => Math.abs(x - start[index]) - Math.abs(end[index] - start[index])),
      ),
    );
  }

  it("settles without overshoot under keyboard focus, and with a slight give after a moving pointer", () => {
    const { unmount } = render(<ParticleMenu items={items} />);
    const control = screen.getByRole("button", { name: "Grace" });
    const path = control.querySelector("path")!;
    const resting = path.getAttribute("d");

    // jsdom reports no element as :focus-visible, so stand in for a keyboard focus.
    const focusVisible = vi.spyOn(control, "matches").mockReturnValue(true);
    fireEvent.focus(control);
    const focused = trace(path);
    expect(path.getAttribute("d")).not.toBe(resting);
    expect(overshoot(focused)).toBeLessThan(0.02);
    expect(vi.getTimerCount()).toBe(0);

    focusVisible.mockRestore();
    fireEvent.blur(control);
    act(() => vi.advanceTimersByTime(6000));
    expect(path).toHaveAttribute("d", resting);

    fireEvent(control, new MouseEvent("pointermove", { clientX: 54, clientY: 60 }));
    act(() => vi.advanceTimersByTime(16));
    fireEvent(control, new MouseEvent("pointermove", { clientX: 60, clientY: 60 }));
    expect(overshoot(trace(path))).toBeGreaterThan(0.1);
    unmount();
  });

  // Motion's fades read a clock that moves on only between tasks, so let each frame run as its own.
  const settle = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("dims on pointer down, before the click, and fades back on release", async () => {
    const onSelect = vi.fn();
    const { unmount } = render(<ParticleMenu items={[{ ...items[0], onSelect }]} />);
    const control = screen.getByRole("button", { name: "Grace" });

    fireEvent.pointerDown(control, { pointerType: "mouse", button: 0 });
    await settle(17);
    expect(control).toHaveStyle({ opacity: "0.6" });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.pointerUp(control, { pointerType: "mouse", button: 0 });
    await settle(50);
    const fading = Number(control.style.opacity);
    expect(fading).toBeGreaterThan(0.6);
    expect(fading).toBeLessThan(1);
    await settle(1000);
    expect(control).toHaveStyle({ opacity: "1" });
    unmount();
  });

  it("dims on hover and keyboard focus instead of scattering when motion is reduced", async () => {
    preference.matches = true;
    const { unmount } = render(<ParticleMenu items={items} />);
    const control = screen.getByRole("button", { name: "Grace" });
    const path = control.querySelector("path")!;
    const resting = path.getAttribute("d");

    fireEvent.pointerEnter(control, { pointerType: "mouse", clientX: 60, clientY: 60 });
    await settle(1000);
    expect(control).toHaveStyle({ opacity: "0.75" });
    fireEvent.pointerLeave(control, { pointerType: "mouse" });
    await settle(1000);
    expect(control).toHaveStyle({ opacity: "1" });

    // jsdom reports no element as :focus-visible, so stand in for a keyboard focus.
    vi.spyOn(control, "matches").mockReturnValue(true);
    fireEvent.focus(control);
    await settle(1000);
    expect(control).toHaveStyle({ opacity: "0.75" });
    fireEvent.blur(control);
    await settle(1000);
    expect(control).toHaveStyle({ opacity: "1" });

    expect(path).toHaveAttribute("d", resting);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it("swaps the scatter for the dim when reduced motion is turned on, and back when it is turned off", async () => {
    const { unmount } = render(<ParticleMenu items={items} />);
    const control = screen.getByRole("button", { name: "Grace" });
    const path = control.querySelector("path")!;
    const resting = path.getAttribute("d");

    fireEvent.pointerEnter(control, { pointerType: "mouse", clientX: 60, clientY: 60 });
    await settle(1000);
    expect(path.getAttribute("d")).not.toBe(resting);
    expect(control).not.toHaveStyle({ opacity: "0.75" });
    fireEvent.pointerLeave(control, { pointerType: "mouse" });

    act(() => {
      preference.matches = true;
      preference.dispatchEvent(new Event("change"));
    });
    expect(path).toHaveAttribute("d", resting);
    fireEvent.pointerEnter(control, { pointerType: "mouse", clientX: 60, clientY: 60 });
    await settle(1000);
    expect(path).toHaveAttribute("d", resting);
    expect(control).toHaveStyle({ opacity: "0.75" });
    fireEvent.pointerLeave(control, { pointerType: "mouse" });

    act(() => {
      preference.matches = false;
      preference.dispatchEvent(new Event("change"));
    });
    fireEvent.pointerEnter(control, { pointerType: "mouse", clientX: 60, clientY: 60 });
    await settle(1000);
    expect(path.getAttribute("d")).not.toBe(resting);
    expect(control).toHaveStyle({ opacity: "1" });
    unmount();
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

  it("lets renderItem wrap a control while the particles still follow it", () => {
    const { container } = render(
      <ParticleMenu
        items={[{ id: "grace", label: "Grace", shape: "grace", href: "/grace" }, ...items.slice(1)]}
        renderItem={(item, control) => (
          <div data-testid={`wrap-${item.id}`}>
            {control}
            <a href="/extra">Extra</a>
          </div>
        )}
      />,
    );
    const link = screen.getByRole("link", { name: "Grace" });
    expect(screen.getByTestId("wrap-grace")).toContainElement(link);
    const path = container.querySelector("path")!;
    const resting = path.getAttribute("d");
    fireEvent.pointerEnter(link, { clientX: 60, clientY: 60 });
    act(() => vi.advanceTimersByTime(100));
    expect(path.getAttribute("d")).not.toBe(resting);
  });
});
