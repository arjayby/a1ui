import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Progress } from "./progress";

describe("Progress", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("labels the bar, reports its value, and rolls the digits to the new value", () => {
    const { rerender } = render(<Progress label="Uploading" value={42} duration={0} />);
    const bar = screen.getByRole("progressbar", { name: "Uploading" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
    expect(bar).toHaveAttribute("data-variant", "bar");
    const valueText = document.querySelector('[data-slot="progress-value"]');
    expect(valueText).toHaveAttribute("data-value", "42%");
    expect(valueText!.querySelectorAll('[data-slot="progress-digit"]')).toHaveLength(2);
    expect(document.querySelector('[data-slot="progress-fill"]')).toHaveStyle({
      transform: "translateX(-58%)",
    });

    rerender(<Progress label="Uploading" value={100} duration={0} />);
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("data-complete");
    expect(valueText!.querySelectorAll('[data-slot="progress-digit"]')).toHaveLength(3);
  });

  it("clamps out-of-range values and formats with formatValue across min and max", () => {
    render(
      <Progress
        aria-label="Files"
        value={14}
        min={0}
        max={12}
        formatValue={(value, percent) => `${value} of 12 (${Math.round(percent)}%)`}
        duration={0}
      />,
    );
    const bar = screen.getByRole("progressbar", { name: "Files" });
    expect(bar).toHaveAttribute("aria-valuenow", "12");
    expect(bar).toHaveAttribute("aria-valuetext", "12 of 12 (100%)");
    expect(document.querySelector('[data-slot="progress-value"]')).toHaveAttribute(
      "data-value",
      "12 of 12 (100%)",
    );
  });

  it("goes indeterminate with a sweep and no value text when value is null", () => {
    render(<Progress label="Syncing" value={null} shimmer />);
    const bar = screen.getByRole("progressbar", { name: "Syncing" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("aria-valuetext", "indeterminate progress");
    expect(bar).toHaveAttribute("data-indeterminate");
    expect(document.querySelector('[data-slot="progress-sweep"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="progress-value"]')).toBeNull();
    expect(document.querySelector('[data-slot="progress-shimmer"]')).toBeNull();
  });

  it("fills steps one after another and draws the ring with a stroke", () => {
    const { rerender } = render(
      <Progress aria-label="Setup" variant="steps" steps={4} value={60} duration={0} />,
    );
    const fills = [
      ...document.querySelectorAll('[data-slot="progress-segment"] [data-slot="progress-fill"]'),
    ];
    expect(fills).toHaveLength(4);
    expect(fills.map((fill) => (fill as HTMLElement).style.transform)).toEqual([
      "none",
      "none",
      "translateX(-60%)",
      "translateX(-100%)",
    ]);

    rerender(<Progress aria-label="Setup" variant="ring" value={25} duration={0} />);
    expect(screen.getByRole("progressbar", { name: "Setup" })).toHaveAttribute("data-variant", "ring");
    expect(document.querySelector('circle[data-slot="progress-fill"]')).not.toBeNull();
  });

  it("shows the shimmer only while below 100% and can hide the value", () => {
    const { rerender } = render(<Progress aria-label="Build" value={30} shimmer showValue={false} />);
    expect(document.querySelector('[data-slot="progress-shimmer"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="progress-value"]')).toBeNull();
    rerender(<Progress aria-label="Build" value={100} shimmer showValue={false} />);
    expect(document.querySelector('[data-slot="progress-shimmer"]')).toBeNull();
  });
});
