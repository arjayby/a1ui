import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CardVortex, type CardVortexProps } from "./card-vortex";

// Motion's frame loop captures requestAnimationFrame when it loads. Route it through a stand-in
// installed before imports that looks up setTimeout on each call, so fake timers drive it.
vi.hoisted(() => {
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 16) as unknown as number;
});

const items = [
  { id: "hades", title: "Hades", href: "/work/hades" },
  { id: "raus", title: "Raus", href: "/work/raus" },
  { id: "hiro", title: "Hiro", href: "/work/hiro", target: "_blank", rel: "noreferrer" },
  { id: "dance", title: "Dance", href: "/work/dance" },
];

const renderVortex = (props: Partial<CardVortexProps> = {}) =>
  render(
    <CardVortex items={items} ariaLabel="Selected work" {...props}>
      <button type="button">Work</button>
    </CardVortex>,
  );

const root = () => document.querySelector("[data-card-vortex]") as HTMLElement;
const trigger = () => document.querySelector("[data-card-vortex-trigger]") as HTMLElement;
const mouse = { pointerType: "mouse" };
// Testing Library sends pointerEnter and pointerLeave as over and out, which Motion's own
// listeners on a card never hear, so this dispatches the event itself.
const point = (type: string, target: Element) =>
  fireEvent(
    target,
    new PointerEvent(type, { pointerType: "mouse", isPrimary: true, bubbles: !/enter|leave/.test(type) }),
  );
/** Runs the clock until Motion's springs have come to rest. */
const settle = () => act(() => vi.advanceTimersByTimeAsync(1000));
// Motion reads the motion preference once and then listens to that same query for changes,
// so every test shares one.
const preference = Object.assign(new EventTarget(), { matches: false });
const setReducedMotion = (reduced: boolean) => {
  preference.matches = reduced;
  preference.dispatchEvent(new Event("change"));
};

describe("CardVortex", () => {
  beforeEach(() => {
    // Motion times frames with performance.now(), so fake it along with the timers.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"],
    });
    vi.stubGlobal("matchMedia", () => preference);
  });

  afterEach(() => {
    cleanup();
    setReducedMotion(false);
    // Let Motion's shared loop drain its last requested frame so the next test starts idle.
    act(() => void vi.advanceTimersByTime(100));
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders every item as a link inside a named nav", () => {
    renderVortex();
    const nav = screen.getByRole("navigation", { name: "Selected work", hidden: true });
    const links = within(nav).getAllByRole("link", { hidden: true });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(items.map(({ href }) => href));
    expect(links[2]).toHaveAttribute("target", "_blank");
    expect(links[2]).toHaveAttribute("rel", "noreferrer");
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("renders only the trigger when there are no items", () => {
    renderVortex({ items: [] });
    expect(screen.getByRole("button", { name: "Work" })).toBeInTheDocument();
    expect(root()).toBeNull();
  });

  it("opens when the pointer enters the trigger and closes shortly after it leaves", () => {
    const onOpenChange = vi.fn();
    renderVortex({ onOpenChange });

    fireEvent.pointerEnter(trigger(), mouse);
    expect(root()).toHaveAttribute("data-state", "open");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.pointerLeave(root(), mouse);
    expect(root()).toHaveAttribute("data-state", "open");
    act(() => void vi.advanceTimersByTime(200));
    expect(root()).toHaveAttribute("data-state", "closed");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("stays open when the pointer comes back before the close delay ends", () => {
    renderVortex();
    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.pointerLeave(root(), mouse);
    act(() => void vi.advanceTimersByTime(60));
    fireEvent.pointerEnter(root(), mouse);
    act(() => void vi.advanceTimersByTime(400));
    expect(root()).toHaveAttribute("data-state", "open");
  });

  it("toggles on a tap and ignores touch hover", () => {
    renderVortex();
    const touch = { pointerType: "touch" };

    fireEvent.pointerEnter(trigger(), touch);
    expect(root()).toHaveAttribute("data-state", "closed");

    fireEvent.pointerDown(trigger(), touch);
    fireEvent.click(trigger());
    expect(root()).toHaveAttribute("data-state", "open");

    fireEvent.pointerDown(trigger(), touch);
    fireEvent.click(trigger());
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("opens on the first tap of a link trigger and follows the link on the second", () => {
    // A link within the page, because jsdom cannot follow one to another document.
    render(
      <CardVortex items={items}>
        <a href="#work">Work</a>
      </CardVortex>,
    );
    const link = screen.getByRole("link", { name: "Work" });
    const touch = { pointerType: "touch" };

    fireEvent.pointerDown(link, touch);
    expect(fireEvent.click(link)).toBe(false);
    expect(root()).toHaveAttribute("data-state", "open");

    fireEvent.pointerDown(link, touch);
    expect(fireEvent.click(link)).toBe(true);
  });

  it("closes on a press in the space between the cards", () => {
    renderVortex();
    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.pointerDown(document.querySelector("[data-card-vortex-area]")!, { pointerType: "touch" });
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("marks the trigger as expanded and points it at the nav", () => {
    renderVortex();
    const button = screen.getByRole("button", { name: "Work" });
    const nav = screen.getByRole("navigation", { name: "Selected work", hidden: true });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", nav.id);

    fireEvent.pointerEnter(trigger(), mouse);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("moves the ring away from an edge instead of only shrinking it", () => {
    const rect = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockReturnValue(DOMRect.fromRect({ x: 10, y: 10, width: 40, height: 20 }));
    const width = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(152);
    const height = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(118);
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    try {
      renderVortex();
      fireEvent.pointerEnter(trigger(), mouse);
      // At full size the ring reaches 165 + 76 across and 165 + 59 down from its center,
      // so it moves right and down until 8px of room is left at the top-left.
      const area = document.querySelector<HTMLElement>("[data-card-vortex-area]")!;
      expect(area.style.transform).toBe("translate(-50%,-50%) translate(219px,212px)");
    } finally {
      rect.mockRestore();
      width.mockRestore();
      height.mockRestore();
    }
  });

  it("turns a card round from where it is when the ring reopens mid-close", async () => {
    const ring = (open: boolean) => (
      <CardVortex items={items} open={open}>
        <button type="button">Work</button>
      </CardVortex>
    );
    const { rerender } = render(ring(true));
    const card = document.querySelector<HTMLElement>("[data-card-vortex-card]")!;
    const opacity = () => Number(card.style.opacity);
    await settle();
    expect(opacity()).toBe(1);

    rerender(ring(false));
    await act(() => vi.advanceTimersByTimeAsync(80));
    const midway = opacity();
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);

    // One frame later the card is still beside where it was: no jump, and no wait for its turn.
    rerender(ring(true));
    await act(() => vi.advanceTimersByTimeAsync(16));
    expect(Math.abs(opacity() - midway)).toBeLessThan(0.15);
    await settle();
    expect(opacity()).toBe(1);
  });

  it("lifts a card under the pointer and dips it from pointer-down", async () => {
    renderVortex({ open: true });
    const card = document.querySelector<HTMLElement>("[data-card-vortex-card]")!;
    const surface = card.querySelector<HTMLElement>("[data-card-vortex-surface]")!;
    const icon = surface.querySelector("svg")!;
    await settle();
    const placed = card.style.transform;
    expect(placed).toContain("translate3d(");

    point("pointerenter", card);
    await settle();
    expect(surface.style.transform).toBe("scale(1.05)");
    expect(icon.style.transform).toBe("scale(1.1)");

    // The press starts on pointer-down, not on the click that follows.
    point("pointerdown", card);
    await settle();
    expect(surface.style.transform).toBe("scale(0.98)");

    point("pointerup", card);
    await settle();
    expect(surface.style.transform).toBe("scale(1.05)");

    point("pointerleave", card);
    await settle();
    expect(surface.style.transform).toBe("none");
    expect(icon.style.transform).toBe("none");
    // Only the parts inside the card answer the pointer: its place on the ring is untouched.
    expect(card.style.transform).toBe(placed);
  });

  it("dims a pressed card instead of resizing it with reduced motion", async () => {
    setReducedMotion(true);
    renderVortex({ open: true });
    const card = document.querySelector<HTMLElement>("[data-card-vortex-card]")!;
    const surface = card.querySelector<HTMLElement>("[data-card-vortex-surface]")!;
    await settle();

    point("pointerenter", card);
    point("pointerdown", card);
    await settle();
    expect(surface.style.transform).toBe("");
    expect(surface.style.opacity).toBe("0.8");

    point("pointerup", card);
    await settle();
    expect(surface.style.opacity).toBe("1");
  });

  it("closes on a press outside and on Escape", () => {
    renderVortex();
    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.pointerDown(document.body);
    expect(root()).toHaveAttribute("data-state", "closed");

    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.keyDown(screen.getByRole("button", { name: "Work" }), { key: "Escape" });
    expect(root()).toHaveAttribute("data-state", "closed");
  });

  it("follows the open prop when controlled", () => {
    const { rerender } = renderVortex({ open: true });
    expect(root()).toHaveAttribute("data-state", "open");
    rerender(
      <CardVortex items={items} open={false}>
        <button type="button">Work</button>
      </CardVortex>,
    );
    expect(root()).toHaveAttribute("data-state", "closed");
  });
});
