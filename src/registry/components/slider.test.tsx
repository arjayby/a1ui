import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Slider } from "./slider";

describe("Slider", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("normalizes stops and clamps the value in a custom range", () => {
    const { container } = render(
      <Slider label="Exposure" min={-10} max={10} stops={[10, 0, -10, 0, 11, NaN]} defaultValue={-20} />,
    );
    const input = screen.getByRole("slider", { name: "Exposure" });
    expect(input).toHaveAttribute("aria-valuenow", "-10");
    expect(container.querySelectorAll('[data-slot="slider-stop"]')).toHaveLength(3);
    expect(container.querySelector('[data-slot="slider-stop"][data-active]')).toHaveStyle({ left: "0%" });
  });

  it("keeps keyboard increments precise near a stop and submits the selected value", () => {
    const onValueChange = vi.fn();
    render(
      <form data-testid="form">
        <Slider
          label="Intensity"
          name="intensity"
          stops={[50]}
          defaultValue={50}
          onValueChange={onValueChange}
        />
      </form>,
    );
    const input = screen.getByRole("slider", { name: "Intensity" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(input).toHaveAttribute("aria-valuenow", "51");
    expect(onValueChange).toHaveBeenLastCalledWith(51);
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("intensity")).toBe("51");
  });

  it("waits for controlled updates and disables the native input", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Slider label="Intensity" value={50} onValueChange={onValueChange} />);
    const input = screen.getByRole("slider", { name: "Intensity" });
    fireEvent.change(input, { target: { value: "60" } });
    expect(onValueChange).toHaveBeenLastCalledWith(60);
    expect(input).toHaveAttribute("aria-valuenow", "50");
    rerender(<Slider label="Intensity" value={60} disabled onValueChange={onValueChange} />);
    expect(input).toHaveAttribute("aria-valuenow", "60");
    expect(input).toBeDisabled();
  });

  it("formats units in the readout and accessible value text", () => {
    render(
      <Slider
        label="Animation duration"
        min={0}
        max={1}
        step={0.1}
        defaultValue={0.3}
        formatValue={(seconds) => `${seconds.toFixed(1)} seconds`}
      />,
    );
    const input = screen.getByRole("slider", { name: "Animation duration" });
    expect(input).toHaveAttribute("aria-valuetext", "0.3 seconds");
    expect(screen.getByText("0.3 seconds")).toBeVisible();
    fireEvent.keyDown(input, { key: "Home" });
    expect(input).toHaveAttribute("aria-valuetext", "0.0 seconds");
    expect(screen.getByText("0.0 seconds")).toBeVisible();
  });

  it("rejects invalid geometry before rendering", () => {
    expect(() => render(<Slider label="Intensity" min={10} max={10} />)).toThrow("max greater than min");
    expect(() => render(<Slider label="Intensity" step={0} />)).toThrow("positive finite step");
    expect(() => render(<Slider label="Intensity" snapDistance={-1} />)).toThrow("snapDistance");
  });
});
