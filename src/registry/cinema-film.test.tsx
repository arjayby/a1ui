import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CinemaFilm, type CinemaFilmProps } from "./cinema-film";

const items = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "elevenlabs", name: "ElevenLabs" },
  { id: "mistral", name: "Mistral AI" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "runway", name: "Runway" },
  { id: "cohere", name: "Cohere" },
  { id: "xai", name: "xAI" },
];

// Keep the real Embla hook and physics. jsdom needs browser observers and
// layout dimensions because it doesn't lay out the component's CSS.
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  targets = new Set<Element>();
  observe = vi.fn((target: Element) => this.targets.add(target));
  unobserve = vi.fn((target: Element) => this.targets.delete(target));
  disconnect = vi.fn(() => this.targets.clear());

  constructor(public callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }

  notify() {
    const entries = Array.from(this.targets, (target) => ({ target }) as ResizeObserverEntry);
    this.callback(entries, this as unknown as ResizeObserver);
  }
}

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor() {
    IntersectionObserverStub.instances.push(this);
  }
}

function advance(milliseconds = 4000) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

function renderFilm(props: Partial<CinemaFilmProps> = {}) {
  const result = render(<CinemaFilm items={items} {...props} />);
  advance(32);
  return result;
}

function getViewport() {
  return screen.getByRole("group", { name: /Film cards\. Use/ });
}

function getFrame(name: string) {
  return screen.getByRole("group", { name }).querySelector<HTMLElement>("[data-film-frame]")!;
}

function projectedDepth(frame: HTMLElement) {
  const translation = frame.style.transform.match(/translate3d\([^,]+px,[^,]+px,([^)]*)px\)/);
  if (!translation) throw new Error("Card is missing its depth transform");
  return Number(translation[1]);
}

function yaw(frame: HTMLElement) {
  const rotation = frame.style.transform.match(/rotateY\(([^)]+)deg\)/);
  if (!rotation) throw new Error("Card is missing its orientation");
  return Number(rotation[1]);
}

describe("CinemaFilm", () => {
  let viewportWidth: number;
  let layoutStyles: HTMLStyleElement;
  let preference: EventTarget & { matches: boolean; media: string };

  beforeEach(() => {
    vi.useFakeTimers();
    viewportWidth = 800;
    layoutStyles = document.createElement("style");
    layoutStyles.textContent = '[aria-roledescription="slide"] { margin-right: 28px; }';
    document.head.appendChild(layoutStyles);
    ResizeObserverStub.instances = [];
    IntersectionObserverStub.instances = [];
    preference = Object.assign(new EventTarget(), {
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
    });
    vi.stubGlobal("matchMedia", () => preference);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("aria-roledescription") === "slide" ? 180 : viewportWidth;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => viewportWidth);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(224);
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("aria-roledescription") !== "slide") return 0;
      return Array.from(this.parentElement!.children).indexOf(this) * 208;
    });
    vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(function (this: HTMLElement) {
      return this.parentElement;
    });
  });

  afterEach(() => {
    cleanup();
    layoutStyles.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders nothing for an empty list", () => {
    const { container } = renderFilm({ items: [] });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("centers a single card with all navigation disabled", () => {
    renderFilm({ items: items.slice(0, 1), initialIndex: 99 });
    expect(screen.getByRole("status")).toHaveTextContent("OpenAI, 1 of 1");
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous provider" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next provider" })).toBeDisabled();
    const frame = getFrame("OpenAI, 1 of 1");
    expect(frame).toBeVisible();
    expect(projectedDepth(frame)).toBe(0);
    expect(yaw(frame)).toBe(0);
  });

  it.each([
    [-10, 0],
    [99, 8],
    [2.9, 2],
    [Number.NaN, 0],
  ])("clamps initialIndex %s to card %s", (initialIndex, index) => {
    renderFilm({ initialIndex });
    expect(screen.getByRole("slider")).toHaveValue(String(index));
    expect(screen.getByRole("status")).toHaveTextContent(`${items[index].name}, ${index + 1} of 9`);
    expect(screen.getByRole("group", { name: `${items[index].name}, ${index + 1} of 9` })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("preserves accessible names with custom artwork and keeps instances independently controlled", () => {
    const customItems = [
      {
        id: "openai",
        name: "OpenAI",
        logo: <span>Custom wordmark</span>,
        artwork: <svg role="img" aria-label="Provider poster" />,
      },
    ];
    render(
      <>
        <CinemaFilm items={customItems} ariaLabel="Custom providers" />
        <CinemaFilm items={items} ariaLabel="All providers" />
      </>,
    );
    advance(32);
    const custom = within(screen.getByRole("region", { name: "Custom providers" }));
    const all = within(screen.getByRole("region", { name: "All providers" }));
    expect(custom.getByRole("group", { name: "OpenAI, 1 of 1" })).toHaveAttribute("aria-current", "true");
    expect(custom.getByText("Custom wordmark")).toBeVisible();
    expect(custom.getByRole("img", { name: "Provider poster" })).toBeVisible();
    expect(custom.getByRole("slider").getAttribute("aria-controls")).not.toBe(
      all.getByRole("slider").getAttribute("aria-controls"),
    );

    fireEvent.click(all.getByRole("button", { name: "Next provider" }));
    advance();
    expect(all.getByRole("status")).toHaveTextContent("Anthropic, 2 of 9");
    expect(custom.getByRole("status")).toHaveTextContent("OpenAI, 1 of 1");
  });

  it("wraps side cards toward the viewer and restores hidden cards as they reach the front", () => {
    renderFilm({ initialIndex: 4 });
    const left = getFrame("ElevenLabs, 4 of 9");
    const center = getFrame("Mistral AI, 5 of 9");
    const right = getFrame("DeepSeek, 6 of 9");
    const first = getFrame("OpenAI, 1 of 9");
    expect(projectedDepth(center)).toBeCloseTo(0);
    expect(projectedDepth(left)).toBeGreaterThan(0);
    expect(projectedDepth(right)).toBeCloseTo(projectedDepth(left));
    expect(yaw(left)).toBeGreaterThan(0);
    expect(yaw(right)).toBeCloseTo(-yaw(left));
    expect(Number(left.style.zIndex)).toBeGreaterThan(Number(center.style.zIndex));
    expect(first).not.toBeVisible();

    fireEvent.keyDown(getViewport(), { key: "Home" });
    advance();
    expect(first).toBeVisible();
    expect(Number(first.style.opacity)).toBeCloseTo(1);
    expect(projectedDepth(first)).toBeCloseTo(0);
    expect(screen.getByRole("button", { name: "Previous provider" })).toBeEnabled();
  });

  it("keeps arrow and keyboard navigation synchronized with the active card", () => {
    renderFilm();
    fireEvent.click(screen.getByRole("button", { name: "Next provider" }));
    advance();
    expect(screen.getByRole("slider")).toHaveValue("1");
    fireEvent.keyDown(getViewport(), { key: "ArrowRight" });
    advance();
    expect(screen.getByRole("status")).toHaveTextContent("Google, 3 of 9");
    fireEvent.click(screen.getByRole("button", { name: "Previous provider" }));
    advance();
    expect(screen.getByRole("slider")).toHaveValue("1");
    fireEvent.keyDown(getViewport(), { key: "End" });
    advance();
    expect(screen.getByRole("status")).toHaveTextContent("xAI, 9 of 9");
    expect(screen.getByRole("button", { name: "Next provider" })).toBeEnabled();
  });

  it.each(["Next provider", "Previous provider"])("loops through multiple laps using %s", (buttonName) => {
    renderFilm();
    const direction = buttonName === "Next provider" ? 1 : -1;
    const button = screen.getByRole("button", { name: buttonName });
    for (let step = 1; step <= items.length * 2 + 1; step += 1) {
      fireEvent.click(button);
      advance();
      const index = (((direction * step) % items.length) + items.length) % items.length;
      expect(screen.getByRole("slider")).toHaveValue(String(index));
      const marker = screen.getByRole("slider").parentElement!.querySelector("span span") as HTMLElement;
      const progress = Number(marker.style.transform.match(/translate3d\(([^%]+)%/)?.[1]);
      expect(progress).toBeCloseTo((index / (items.length - 1)) * 400, 1);
      expect(screen.getByRole("status")).toHaveTextContent(`${items[index].name}, ${index + 1} of 9`);
      expect(projectedDepth(getFrame(`${items[index].name}, ${index + 1} of 9`))).toBeCloseTo(0);
      expect(button).toBeEnabled();
    }
  });

  it("keeps the inward projection continuous across the last-to-first seam", () => {
    renderFilm({ initialIndex: 8 });
    const first = getFrame("OpenAI, 1 of 9");
    const last = getFrame("xAI, 9 of 9");
    expect(first).toBeVisible();
    expect(yaw(first)).toBeLessThan(0);
    const depth = projectedDepth(first);
    fireEvent.keyDown(getViewport(), { key: "ArrowRight" });
    advance(96);
    expect(first).toBeVisible();
    expect(projectedDepth(first)).toBeLessThan(depth);
    advance();
    expect(projectedDepth(first)).toBeCloseTo(0);
    expect(yaw(last)).toBeGreaterThan(0);
    expect(screen.getByRole("slider")).toHaveValue("0");
    fireEvent.keyDown(getViewport(), { key: "ArrowLeft" });
    advance();
    expect(screen.getByRole("slider")).toHaveValue("8");
    expect(projectedDepth(last)).toBeCloseTo(0);
  });

  it("repeats short lists to fill the viewport while exposing each provider only once", () => {
    renderFilm({ items: items.slice(0, 2) });
    expect(getViewport().querySelectorAll('[aria-roledescription="slide"]')).toHaveLength(6);
    expect(screen.getAllByRole("group", { name: /, [12] of 2$/ })).toHaveLength(2);
    expect(getViewport().querySelectorAll('[aria-hidden="true"][inert]')).toHaveLength(4);
    for (let step = 1; step <= 8; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next provider" }));
      advance();
      const index = step % 2;
      expect(screen.getByRole("slider")).toHaveValue(String(index));
      expect(screen.getAllByRole("group", { name: /, [12] of 2$/ })).toHaveLength(2);
      expect(projectedDepth(getFrame(`${items[index].name}, ${index + 1} of 2`))).toBeCloseTo(0);
    }
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    advance();
    expect(screen.getByRole("status")).toHaveTextContent("Anthropic, 2 of 2");
  });

  it("adds and removes looping copies on resize without changing the selected provider", () => {
    renderFilm({ initialIndex: 8 });
    act(() => {
      viewportWidth = 2400;
      [...ResizeObserverStub.instances].forEach((observer) => observer.notify());
    });
    advance();
    expect(getViewport().querySelectorAll('[aria-roledescription="slide"]')).toHaveLength(18);
    expect(screen.getByRole("status")).toHaveTextContent("xAI, 9 of 9");
    fireEvent.click(screen.getByRole("button", { name: "Next provider" }));
    advance();
    expect(screen.getByRole("status")).toHaveTextContent("OpenAI, 1 of 9");
    act(() => {
      viewportWidth = 800;
      [...ResizeObserverStub.instances].forEach((observer) => observer.notify());
    });
    advance();
    expect(getViewport().querySelectorAll('[aria-roledescription="slide"]')).toHaveLength(9);
    expect(screen.getByRole("status")).toHaveTextContent("OpenAI, 1 of 9");
    expect(projectedDepth(getFrame("OpenAI, 1 of 9"))).toBeCloseTo(0);
  });

  it("does not intercept keyboard events from content inside a card", () => {
    renderFilm({ items: [{ ...items[0], artwork: <button>Artwork action</button> }, items[1]] });
    const action = screen.getByRole("button", { name: "Artwork action" });
    expect(fireEvent.keyDown(action, { key: "ArrowRight" })).toBe(true);
    expect(fireEvent.keyDown(getViewport(), { key: "Tab" })).toBe(true);
    advance();
    expect(screen.getByRole("slider")).toHaveValue("0");
  });

  it("preserves scrubber intent during easing, then lets a drag interrupt it", () => {
    renderFilm({ initialIndex: 2 });
    const slider = screen.getByRole("slider");
    const track = getViewport().firstElementChild as HTMLElement;
    const original = track.style.transform;
    fireEvent.change(slider, { target: { value: "8" } });
    advance(96);
    expect(track.style.transform).not.toBe(original);
    expect(slider).toHaveValue("8");
    expect(slider).toHaveAttribute("aria-valuetext", "xAI, 9 of 9");
    expect(screen.getByRole("status")).not.toHaveTextContent("xAI, 9 of 9");

    fireEvent.change(slider, { target: { value: "7" } });
    advance(32);
    expect(slider).toHaveValue("7");
    fireEvent.mouseDown(getViewport(), { button: 0, buttons: 1, clientX: 400, clientY: 100 });
    expect(slider).not.toHaveValue("7");
    fireEvent.mouseUp(document, { button: 0, clientX: 400, clientY: 100 });
    advance();
    const index = Number((slider as HTMLInputElement).value);
    expect(screen.getByRole("status")).toHaveTextContent(`${items[index].name}, ${index + 1} of 9`);
  });

  it("recomputes the projection after a resize without changing the active provider", () => {
    renderFilm({ initialIndex: 4 });
    const left = getFrame("ElevenLabs, 4 of 9");
    const original = left.style.transform;
    act(() => {
      viewportWidth = 1200;
      [...ResizeObserverStub.instances].forEach((observer) => observer.notify());
    });
    advance(32);
    expect(left.style.transform).not.toBe(original);
    expect(screen.getByRole("slider")).toHaveValue("4");
    expect(screen.getByRole("status")).toHaveTextContent("Mistral AI, 5 of 9");
  });

  it("handles the item list shrinking, becoming empty, and being populated again", async () => {
    const { rerender } = renderFilm({ initialIndex: 4 });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "8" } });
    advance(96);
    await act(async () => rerender(<CinemaFilm items={items.slice(0, 1)} initialIndex={4} />));
    advance();
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("OpenAI, 1 of 1");

    rerender(<CinemaFilm items={[]} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    rerender(<CinemaFilm items={items} initialIndex={2} />);
    advance(32);
    expect(screen.getByRole("status")).toHaveTextContent("Google, 3 of 9");
    expect(screen.getByRole("slider")).toBeEnabled();
  });

  it("jumps directly for reduced motion and cancels ongoing easing when the preference changes", () => {
    renderFilm();
    fireEvent.click(screen.getByRole("button", { name: "Next provider" }));
    advance(96);
    act(() => {
      preference.matches = true;
      preference.dispatchEvent(new Event("change"));
    });
    advance(32);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "4" } });
    expect(screen.getByRole("status")).toHaveTextContent("Mistral AI, 5 of 9");
    expect(projectedDepth(getFrame("Mistral AI, 5 of 9"))).toBeCloseTo(0);
    const track = getViewport().firstElementChild as HTMLElement;
    const resting = track.style.transform;
    advance();
    expect(track.style.transform).toBe(resting);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disconnects observers and cancels animation when unmounted during a scroll", () => {
    const { unmount } = renderFilm();
    fireEvent.click(screen.getByRole("button", { name: "Next provider" }));
    advance(48);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(ResizeObserverStub.instances.length).toBeGreaterThan(0);
    expect(IntersectionObserverStub.instances.length).toBeGreaterThan(0);
    ResizeObserverStub.instances.forEach((observer) => expect(observer.disconnect).toHaveBeenCalled());
    IntersectionObserverStub.instances.forEach((observer) => expect(observer.disconnect).toHaveBeenCalled());
    act(() => preference.dispatchEvent(new Event("change")));
    expect(vi.getTimerCount()).toBe(0);
  });
});
