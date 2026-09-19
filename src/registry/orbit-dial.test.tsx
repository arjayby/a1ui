import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrbitDial } from "./orbit-dial";

beforeEach(() => {
  class MockPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 1;
    }
  }
  vi.stubGlobal("PointerEvent", MockPointerEvent);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function face(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>("[data-orbit-dial-face]")!;
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 240,
    height: 240,
    right: 240,
    bottom: 240,
    x: 0,
    y: 0,
    toJSON() {},
  });
  return element;
}

function point(angle: number, pointerId = 1) {
  const radians = (angle * Math.PI) / 180;
  return {
    clientX: 120 + Math.sin(radians) * 100,
    clientY: 120 - Math.cos(radians) * 100,
    pointerId,
    button: 0,
  };
}

describe("OrbitDial", () => {
  it("exposes one named native slider with a spoken value and form value", () => {
    render(
      <form aria-label="Audio settings">
        <OrbitDial
          label="Gain"
          ariaLabel="Output gain"
          defaultValue={25}
          unit="dB"
          name="gain"
          getValueText={(value) => `${value} decibels`}
        />
      </form>,
    );
    const slider = screen.getByRole("slider", { name: "Output gain" });
    expect(slider).toHaveValue("25");
    expect(slider).toHaveAttribute("aria-valuetext", "25 decibels");
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("gain")).toBe("25");
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("updates uncontrolled values and keeps controlled values owned by the caller", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<OrbitDial label="Level" defaultValue={20} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "35" } });
    expect(screen.getByRole("slider")).toHaveValue("35");
    expect(onValueChange).toHaveBeenLastCalledWith(35);
    rerender(<OrbitDial label="Level" value={45} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } });
    expect(onValueChange).toHaveBeenLastCalledWith(70);
    expect(screen.getByRole("slider")).toHaveValue("45");
    rerender(<OrbitDial label="Level" value={70} onValueChange={onValueChange} />);
    expect(screen.getByRole("slider")).toHaveValue("70");
  });

  it("rounds decimal steps from a nonzero minimum without floating-point noise", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <OrbitDial
        label="Mix"
        min={0.1}
        max={1}
        step={0.2}
        defaultValue={0.44}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("slider")).toHaveValue("0.5");
    expect(screen.getByRole("slider")).toHaveAttribute("max", "0.9");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.30000000000000004" } });
    expect(onValueChange).toHaveBeenLastCalledWith(0.3);
    rerender(<OrbitDial label="Mix" min={-0.3} max={0.3} step={0.1} value={0.3} />);
    expect(screen.getByRole("slider")).toHaveValue("0.3");
    expect(screen.getByRole("slider")).toHaveAttribute("max", "0.3");
    rerender(<OrbitDial label="Mix" min={0.1} max={1} step={0.1} value={0.15} />);
    expect(screen.getByRole("slider")).toHaveValue("0.2");
  });

  it("reclamps the displayed value when bounds change", () => {
    const { rerender } = render(<OrbitDial label="Level" defaultValue={80} />);
    rerender(<OrbitDial label="Level" defaultValue={80} min={10} max={30} step={5} />);
    expect(screen.getByRole("slider")).toHaveValue("30");
  });

  it.each([
    { min: 5, max: 5, step: 1, expected: "5" },
    { min: 10, max: 5, step: 1, expected: "10" },
    { min: 0, max: 1, step: 2, expected: "0" },
    { min: -Number.MAX_VALUE, max: Number.MAX_VALUE, step: 1, expected: String(-Number.MAX_VALUE) },
    { min: 0, max: 1, step: Number.MIN_VALUE, expected: "0" },
  ])("disables a range with no representable steps: $min to $max", ({ min, max, step, expected }) => {
    render(<OrbitDial label="Level" min={min} max={max} step={step} />);
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(screen.getByRole("slider")).toHaveValue(expected);
  });

  it("falls back from invalid numbers and clamps infinite values", () => {
    const { rerender } = render(<OrbitDial label="Level" min={NaN} max={Infinity} step={0} value={NaN} />);
    expect(screen.getByRole("slider")).toHaveValue("0");
    expect(screen.getByRole("slider")).toHaveAttribute("step", "1");
    rerender(<OrbitDial label="Level" value={Infinity} />);
    expect(screen.getByRole("slider")).toHaveValue("100");
    rerender(<OrbitDial label="Level" value={-Infinity} />);
    expect(screen.getByRole("slider")).toHaveValue("0");
  });

  it("captures a pointer, focuses the slider, and ignores other pointers and center movement", () => {
    const { container } = render(<OrbitDial label="Level" defaultValue={10} />);
    const dial = face(container);
    fireEvent.pointerDown(dial, point(0));
    expect(screen.getByRole("slider")).toHaveValue("50");
    expect(screen.getByRole("slider")).toHaveFocus();
    expect(dial.setPointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(dial, point(90, 2));
    expect(screen.getByRole("slider")).toHaveValue("50");
    fireEvent.pointerMove(dial, { clientX: 120, clientY: 120, pointerId: 1 });
    expect(screen.getByRole("slider")).toHaveValue("50");
    fireEvent.pointerMove(dial, point(90));
    expect(screen.getByRole("slider")).toHaveValue("83");
    fireEvent.pointerUp(dial, point(90));
    expect(dial.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it.each([1, -1])("holds the endpoint through the bottom gap in direction %s", (direction) => {
    const { container } = render(<OrbitDial label="Level" />);
    const dial = face(container);
    fireEvent.pointerDown(dial, point(130 * direction));
    fireEvent.pointerMove(dial, point(170 * direction));
    expect(screen.getByRole("slider")).toHaveValue(direction === 1 ? "100" : "0");
    fireEvent.pointerMove(dial, point(-170 * direction));
    expect(screen.getByRole("slider")).toHaveValue(direction === 1 ? "100" : "0");
    fireEvent.pointerMove(dial, point(120 * direction));
    expect(screen.getByRole("slider")).toHaveValue(direction === 1 ? "94" : "6");
  });

  it.each(["pointerCancel", "lostPointerCapture"] as const)("ends dragging on %s", (eventName) => {
    const { container } = render(<OrbitDial label="Level" />);
    const dial = face(container);
    fireEvent.pointerDown(dial, point(0));
    fireEvent[eventName](dial, point(0));
    fireEvent.pointerMove(dial, point(90));
    expect(screen.getByRole("slider")).toHaveValue("50");
    expect(dial).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(dial, point(-135, 2));
    expect(screen.getByRole("slider")).toHaveValue("0");
  });

  it("ignores disabled controls and secondary buttons", () => {
    const onValueChange = vi.fn();
    const { container, rerender } = render(
      <OrbitDial label="Level" defaultValue={25} disabled onValueChange={onValueChange} />,
    );
    const dial = face(container);
    fireEvent.pointerDown(dial, point(0));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "80" } });
    expect(onValueChange).not.toHaveBeenCalled();
    rerender(<OrbitDial label="Level" defaultValue={25} onValueChange={onValueChange} />);
    fireEvent.pointerDown(dial, { ...point(0), button: 2 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("slider")).toHaveValue("25");
  });
});
