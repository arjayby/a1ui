import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CardVortex, type CardVortexProps } from "./card-vortex";

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

describe("CardVortex", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
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
