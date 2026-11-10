import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Stepper } from "./stepper";

describe("Stepper", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const value = () => screen.getByRole("spinbutton", { name: "Guests" });
  const increase = () => screen.getByRole("button", { name: "Increase Guests" });
  const decrease = () => screen.getByRole("button", { name: "Decrease Guests" });

  it("exposes spinbutton semantics and clamps the value to the range", () => {
    render(<Stepper label="Guests" min={1} max={8} defaultValue={20} />);
    expect(value()).toHaveAttribute("aria-valuenow", "8");
    expect(value()).toHaveAttribute("aria-valuemin", "1");
    expect(value()).toHaveAttribute("aria-valuemax", "8");
    expect(value()).toHaveAttribute("tabindex", "0");
    expect(value()).not.toHaveAttribute("aria-valuetext");
    // The buttons stay out of the tab order: the value's arrow keys do the same job.
    expect(increase()).toHaveAttribute("tabindex", "-1");
    expect(decrease()).toHaveAttribute("tabindex", "-1");
  });

  it("steps with the arrow keys, pages, and jumps to either end", () => {
    const onValueChange = vi.fn();
    render(
      <form data-testid="form">
        <Stepper label="Guests" name="guests" defaultValue={50} onValueChange={onValueChange} />
      </form>,
    );
    for (const [key, expected] of [
      ["ArrowUp", 51],
      ["ArrowRight", 52],
      ["ArrowDown", 51],
      ["ArrowLeft", 50],
      ["PageUp", 60],
      ["PageDown", 50],
      ["End", 100],
      ["Home", 0],
    ] as const) {
      expect(fireEvent.keyDown(value(), { key })).toBe(false);
      expect(value()).toHaveAttribute("aria-valuenow", String(expected));
      expect(onValueChange).toHaveBeenLastCalledWith(expected);
    }
    // Keys the stepper does not use keep their default action, as do shortcuts.
    expect(fireEvent.keyDown(value(), { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(value(), { key: "ArrowUp", metaKey: true })).toBe(true);
    expect(value()).toHaveAttribute("aria-valuenow", "0");
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("guests")).toBe("0");
  });

  it("steps on pointer down, without waiting for the release", () => {
    const onValueChange = vi.fn();
    render(<Stepper label="Guests" defaultValue={2} onValueChange={onValueChange} />);
    fireEvent.pointerDown(increase(), { button: 0 });
    expect(value()).toHaveAttribute("aria-valuenow", "3");
    expect(value()).toHaveFocus();
    fireEvent.pointerUp(increase());
    // The click that follows a pointer press carries a count and must not step again.
    fireEvent.click(increase(), { detail: 1 });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    // A click with no pointer behind it comes from assistive technology or the keyboard.
    fireEvent.click(decrease(), { detail: 0 });
    expect(value()).toHaveAttribute("aria-valuenow", "2");
    fireEvent.pointerDown(increase(), { button: 2 });
    expect(value()).toHaveAttribute("aria-valuenow", "2");
  });

  it("repeats while held, speeds up, and stops on release, leave, and blur", () => {
    vi.useFakeTimers();
    render(<Stepper label="Guests" defaultValue={0} />);
    const now = () => Number(value().getAttribute("aria-valuenow"));

    fireEvent.pointerDown(increase(), { button: 0 });
    expect(now()).toBe(1);
    act(() => void vi.advanceTimersByTime(399));
    expect(now()).toBe(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(now()).toBe(2);
    act(() => void vi.advanceTimersByTime(1000));
    const afterFirstSecond = now() - 2;
    act(() => void vi.advanceTimersByTime(1000));
    const afterSecondSecond = now() - 2 - afterFirstSecond;
    expect(afterFirstSecond).toBeGreaterThan(4);
    expect(afterSecondSecond).toBeGreaterThan(afterFirstSecond);
    expect(afterSecondSecond).toBeLessThanOrEqual(20);

    fireEvent.pointerUp(increase());
    const released = now();
    act(() => void vi.advanceTimersByTime(2000));
    expect(now()).toBe(released);

    for (const stop of [
      () => fireEvent.pointerLeave(decrease()),
      () => fireEvent.pointerCancel(decrease()),
      () => fireEvent.blur(value()),
      () => fireEvent.blur(window),
    ]) {
      const before = now();
      fireEvent.pointerDown(decrease(), { button: 0 });
      act(() => void vi.advanceTimersByTime(700));
      expect(now()).toBeLessThan(before - 1);
      stop();
      const stopped = now();
      act(() => void vi.advanceTimersByTime(2000));
      expect(now()).toBe(stopped);
    }
  });

  it("dims the button at a limit, keeps it pressable, and ends a hold there", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    render(<Stepper label="Guests" min={1} max={4} defaultValue={1} onValueChange={onValueChange} />);
    expect(decrease()).toHaveAttribute("aria-disabled", "true");
    expect(decrease()).toBeEnabled();
    expect(increase()).not.toHaveAttribute("aria-disabled");
    fireEvent.pointerDown(decrease(), { button: 0 });
    fireEvent.keyDown(value(), { key: "Home" });
    fireEvent.keyDown(value(), { key: "ArrowDown" });
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(increase(), { button: 0 });
    act(() => void vi.advanceTimersByTime(5000));
    expect(value()).toHaveAttribute("aria-valuenow", "4");
    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(increase()).toHaveAttribute("aria-disabled", "true");
    expect(decrease()).not.toHaveAttribute("aria-disabled");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps decimal steps exact and returns an off-grid value to the grid", () => {
    render(
      <Stepper
        label="Guests"
        min={0}
        max={1}
        step={0.1}
        defaultValue={0.1}
        format={(amount) => `${amount.toFixed(1)}×`}
      />,
    );
    fireEvent.keyDown(value(), { key: "ArrowUp" });
    fireEvent.keyDown(value(), { key: "ArrowUp" });
    expect(value()).toHaveAttribute("aria-valuenow", "0.3");
    expect(value()).toHaveAttribute("aria-valuetext", "0.3×");
    cleanup();

    render(<Stepper label="Guests" min={0} max={10} step={3} defaultValue={9} />);
    fireEvent.keyDown(value(), { key: "ArrowUp" });
    expect(value()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(value(), { key: "ArrowDown" });
    expect(value()).toHaveAttribute("aria-valuenow", "9");
  });

  it("waits for controlled updates and calls the newest handler during a hold", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Stepper label="Guests" value={5} onValueChange={first} />);
    fireEvent.pointerDown(increase(), { button: 0 });
    expect(first).toHaveBeenLastCalledWith(6);
    expect(value()).toHaveAttribute("aria-valuenow", "5");
    rerender(<Stepper label="Guests" value={6} onValueChange={second} />);
    expect(value()).toHaveAttribute("aria-valuenow", "6");
    act(() => void vi.advanceTimersByTime(400));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenLastCalledWith(7);
  });

  it("ignores every input when disabled and leaves the form", () => {
    const onValueChange = vi.fn();
    render(
      <form data-testid="form">
        <Stepper label="Guests" name="guests" defaultValue={2} disabled onValueChange={onValueChange} />
      </form>,
    );
    expect(value()).toHaveAttribute("aria-disabled", "true");
    expect(value()).toHaveAttribute("tabindex", "-1");
    expect(increase()).toBeDisabled();
    expect(decrease()).toBeDisabled();
    fireEvent.pointerDown(increase(), { button: 0 });
    fireEvent.keyDown(value(), { key: "ArrowUp" });
    expect(onValueChange).not.toHaveBeenCalled();
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).has("guests")).toBe(false);
  });

  it("reserves room for the widest value so the footprint stays fixed", () => {
    const { container } = render(
      <Stepper label="Guests" min={0} max={500} step={25} format={(amount) => `$${amount}`} />,
    );
    const sizers = [...container.querySelectorAll('[data-slot="stepper-value"] > .invisible')];
    expect(sizers.map((sizer) => sizer.textContent)).toEqual(["$0", "$500", "$25", "$475"]);
    expect(container.querySelector('[data-slot="stepper-roll"]')).toHaveTextContent("$0");
  });

  it("rejects invalid geometry before rendering", () => {
    expect(() => render(<Stepper label="Guests" min={10} max={10} />)).toThrow("max greater than min");
    expect(() => render(<Stepper label="Guests" step={0} />)).toThrow("positive finite step");
    expect(() => render(<Stepper label="Guests" largeStep={-1} />)).toThrow("largeStep");
  });
});
