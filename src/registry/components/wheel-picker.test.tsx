import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WheelPicker, WheelPickerGroup } from "./wheel-picker";

const ROW = 36;
const fruit = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
  { value: "date", label: "Date" },
  { value: "elderberry", label: "Elderberry" },
  { value: "fig", label: "Fig" },
  { value: "grape", label: "Grape" },
  { value: "guava", label: "Guava" },
];

let reducedMotion = true;
const vibrate = vi.fn();

/** Moves the wheel the way a native scroll would: the offset changes, then the event arrives. */
function scrollTo(wheel: HTMLElement, row: number) {
  wheel.scrollTop = row * ROW;
  fireEvent.scroll(wheel);
}

describe("WheelPicker", () => {
  beforeEach(() => {
    reducedMotion = true;
    vibrate.mockClear();
    vi.stubGlobal("matchMedia", (query: string) =>
      Object.assign(new EventTarget(), { matches: reducedMotion && query.includes("reduced-motion") }),
    );
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is a listbox whose selected option sits at the centre and submits with a form", () => {
    render(
      <form data-testid="form">
        <WheelPicker label="Fruit" name="fruit" options={fruit} defaultValue="date" />
      </form>,
    );
    const wheel = screen.getByRole("listbox", { name: "Fruit" });
    const selected = screen.getByRole("option", { name: "Date" });
    expect(screen.getAllByRole("option")).toHaveLength(fruit.length);
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(wheel).toHaveAttribute("aria-activedescendant", selected.id);
    expect(screen.getByRole("option", { name: "Cherry" })).toHaveAttribute("aria-disabled", "true");
    expect(wheel.scrollTop).toBe(3 * ROW);
    expect(new FormData(screen.getByTestId("form") as HTMLFormElement).get("fruit")).toBe("date");
  });

  it("starts on the first enabled option when no value is given", () => {
    render(<WheelPicker label="Fruit" options={[{ value: "a", disabled: true }, { value: "b" }]} />);
    expect(screen.getByRole("option", { name: "b" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("listbox").scrollTop).toBe(ROW);
  });

  it("updates the value and ticks once as each option crosses the centre", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" options={fruit} onValueChange={onValueChange} />);
    const wheel = screen.getByRole("listbox");
    scrollTo(wheel, 0.4);
    expect(onValueChange).not.toHaveBeenCalled();
    scrollTo(wheel, 0.6);
    expect(onValueChange).toHaveBeenLastCalledWith("banana");
    scrollTo(wheel, 1.2);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledTimes(1);
    // The disabled option passes under the centre without becoming the value.
    scrollTo(wheel, 2);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("aria-selected", "true");
    scrollTo(wheel, 3);
    expect(onValueChange).toHaveBeenLastCalledWith("date");
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("comes to rest on an enabled option", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" options={fruit} onValueChange={onValueChange} />);
    const wheel = screen.getByRole("listbox");
    scrollTo(wheel, 2.2);
    act(() => void vi.advanceTimersByTime(200));
    expect(onValueChange).toHaveBeenLastCalledWith("date");
    expect(wheel.scrollTop).toBe(3 * ROW);
  });

  it("stays silent when haptics are off", () => {
    render(<WheelPicker label="Fruit" options={fruit} haptics={false} />);
    scrollTo(screen.getByRole("listbox"), 4);
    expect(screen.getByRole("option", { name: "Elderberry" })).toHaveAttribute("aria-selected", "true");
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("moves with the keyboard, skipping disabled options", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" options={fruit} defaultValue="banana" onValueChange={onValueChange} />);
    const wheel = screen.getByRole("listbox");
    fireEvent.keyDown(wheel, { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenLastCalledWith("date");
    expect(wheel.scrollTop).toBe(3 * ROW);
    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(onValueChange).toHaveBeenLastCalledWith("banana");
    fireEvent.keyDown(wheel, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith("guava");
    fireEvent.keyDown(wheel, { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(wheel, { key: "PageUp" });
    expect(onValueChange).toHaveBeenLastCalledWith("banana");
    fireEvent.keyDown(wheel, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
    fireEvent.keyDown(wheel, { key: "PageDown" });
    expect(onValueChange).toHaveBeenLastCalledWith("fig");
    expect(wheel.scrollTop).toBe(5 * ROW);
  });

  it("finds options by typing, and steps through matches when a letter repeats", () => {
    vi.useFakeTimers();
    render(<WheelPicker label="Fruit" options={fruit} />);
    const wheel = screen.getByRole("listbox");
    const selected = () => screen.getByRole("option", { selected: true });
    fireEvent.keyDown(wheel, { key: "g" });
    expect(selected()).toHaveTextContent("Grape");
    vi.advanceTimersByTime(100);
    fireEvent.keyDown(wheel, { key: "u" });
    expect(selected()).toHaveTextContent("Guava");
    vi.advanceTimersByTime(1000);
    fireEvent.keyDown(wheel, { key: "g" });
    expect(selected()).toHaveTextContent("Grape");
    vi.advanceTimersByTime(100);
    fireEvent.keyDown(wheel, { key: "g" });
    expect(selected()).toHaveTextContent("Guava");
    // Cherry is disabled, so typing its letter leaves the value alone.
    vi.advanceTimersByTime(1000);
    fireEvent.keyDown(wheel, { key: "c" });
    expect(selected()).toHaveTextContent("Guava");
  });

  it("selects the option that is clicked, unless it is disabled", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" options={fruit} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByText("Cherry"));
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Elderberry"));
    expect(onValueChange).toHaveBeenLastCalledWith("elderberry");
    expect(screen.getByRole("listbox").scrollTop).toBe(4 * ROW);
  });

  it("follows a controlled value and returns to it when a change is declined", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <WheelPicker label="Fruit" options={fruit} value="banana" onValueChange={onValueChange} />,
    );
    const wheel = screen.getByRole("listbox");
    fireEvent.keyDown(wheel, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith("guava");
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("aria-selected", "true");
    expect(wheel.scrollTop).toBe(ROW);
    scrollTo(wheel, 5);
    expect(onValueChange).toHaveBeenLastCalledWith("fig");
    act(() => void vi.advanceTimersByTime(200));
    expect(wheel.scrollTop).toBe(ROW);
    rerender(<WheelPicker label="Fruit" options={fruit} value="fig" onValueChange={onValueChange} />);
    expect(wheel.scrollTop).toBe(5 * ROW);
    expect(screen.getByRole("option", { name: "Fig" })).toHaveAttribute("aria-selected", "true");
  });

  it("does not pull the wheel away from a scroll in progress", () => {
    vi.useFakeTimers();
    const { rerender } = render(<WheelPicker label="Fruit" options={fruit} value="apple" />);
    const wheel = screen.getByRole("listbox");
    scrollTo(wheel, 4.3);
    rerender(<WheelPicker label="Fruit" options={fruit} value="banana" />);
    expect(wheel.scrollTop).toBe(4.3 * ROW);
    act(() => void vi.advanceTimersByTime(200));
    expect(wheel.scrollTop).toBe(ROW);
  });

  it("springs to a value set from outside and bends toward a newer one mid-flight", () => {
    reducedMotion = false;
    vi.useFakeTimers();
    const { rerender } = render(<WheelPicker label="Fruit" options={fruit} value="apple" />);
    const wheel = screen.getByRole("listbox");
    rerender(<WheelPicker label="Fruit" options={fruit} value="guava" />);
    expect(wheel.scrollTop).toBe(0);
    act(() => void vi.advanceTimersByTime(96));
    const midway = wheel.scrollTop;
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(7 * ROW);
    expect(wheel.style.scrollSnapType).toBe("none");
    rerender(<WheelPicker label="Fruit" options={fruit} value="banana" />);
    act(() => void vi.advanceTimersByTime(16));
    // The spring keeps its speed through the new target instead of restarting from rest.
    expect(wheel.scrollTop).toBeGreaterThan(midway);
    act(() => void vi.advanceTimersByTime(3000));
    expect(wheel.scrollTop).toBe(ROW);
    expect(wheel.style.scrollSnapType).toBe("");
  });

  it("drags with the mouse, follows the pointer and throws on release", () => {
    reducedMotion = false;
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" options={fruit} onValueChange={onValueChange} />);
    const wheel = screen.getByRole("listbox");
    const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(wheel, { ...pointer, clientY: 200 });
    fireEvent.pointerMove(wheel, { ...pointer, clientY: 197 });
    expect(wheel.scrollTop).toBe(0);
    fireEvent.pointerMove(wheel, { ...pointer, clientY: 190 });
    expect(wheel).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(wheel, { ...pointer, clientY: 154 });
    // The drag is measured from where it began, so the wheel moves exactly as far as the pointer.
    expect(wheel.scrollTop).toBe(36);
    expect(onValueChange).toHaveBeenLastCalledWith("banana");
    fireEvent.pointerUp(wheel, { ...pointer, clientY: 154 });
    expect(wheel).not.toHaveAttribute("data-dragging");
    act(() => void vi.advanceTimersByTime(3000));
    expect(wheel.scrollTop % ROW).toBe(0);
    expect(wheel.scrollTop).toBeGreaterThanOrEqual(ROW);
    // The click that ends a drag does not select the row under the pointer.
    const calls = onValueChange.mock.calls.length;
    fireEvent.click(screen.getByText("Apple"));
    expect(onValueChange).toHaveBeenCalledTimes(calls + 1);
  });

  it("ignores input when disabled", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker label="Fruit" name="fruit" options={fruit} disabled onValueChange={onValueChange} />);
    const wheel = screen.getByRole("listbox");
    expect(wheel).toHaveAttribute("aria-disabled", "true");
    expect(wheel).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(wheel, { key: "ArrowDown" });
    fireEvent.click(screen.getByText("Fig"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(document.querySelector('input[name="fruit"]')).toBeDisabled();
  });

  it("groups wheels under one label and moves between them with the arrow keys", () => {
    render(
      <WheelPickerGroup label="Time" itemHeight={40} visibleCount={3}>
        <WheelPicker label="Hour" options={[{ value: "1" }, { value: "2" }]} defaultValue="2" />
        <WheelPicker label="Minute" options={[{ value: "00" }, { value: "30" }]} />
      </WheelPickerGroup>,
    );
    const hour = screen.getByRole("listbox", { name: "Hour" });
    const minute = screen.getByRole("listbox", { name: "Minute" });
    expect(screen.getByRole("group", { name: "Time" })).toContainElement(minute);
    // The group's row size reaches the wheels inside it.
    expect(hour.scrollTop).toBe(40);
    expect(hour.parentElement).toHaveStyle({ height: "120px" });
    hour.focus();
    fireEvent.keyDown(hour, { key: "ArrowRight" });
    expect(minute).toHaveFocus();
    fireEvent.keyDown(minute, { key: "ArrowRight" });
    expect(minute).toHaveFocus();
    fireEvent.keyDown(minute, { key: "ArrowLeft" });
    expect(hour).toHaveFocus();
  });
});
