import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompareCurtain } from "./compare-curtain";

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

function renderCurtain(props: Partial<React.ComponentProps<typeof CompareCurtain>> = {}) {
  const result = render(
    <CompareCurtain before={<span>Draft</span>} after={<span>Published</span>} {...props} />,
  );
  const stage = result.container.querySelector<HTMLElement>("[data-compare-stage]")!;
  vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 0,
    width: 400,
    height: 200,
    right: 500,
    bottom: 200,
    x: 100,
    y: 0,
    toJSON() {},
  });
  return result;
}

describe("CompareCurtain", () => {
  it("has one accessible slider on the center handle and no range input", () => {
    const { container } = renderCurtain({ ariaLabel: "Reveal published design", afterLabel: "Published" });
    const handle = screen.getByRole("slider", { name: "Reveal published design" });
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    expect(handle).toHaveAttribute("aria-valuetext", "50% published");
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it("drags the handle directly, ignores other pointers, and clamps at both edges", () => {
    renderCurtain();
    const handle = screen.getByRole("slider");
    fireEvent.pointerDown(handle, { clientX: 300, button: 0, pointerId: 1 });
    expect(handle).toHaveFocus();
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(handle, { clientX: 450, pointerId: 2 });
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    fireEvent.pointerMove(handle, { clientX: 700, pointerId: 1 });
    expect(handle).toHaveAttribute("aria-valuenow", "100");
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 });
    expect(handle).toHaveAttribute("aria-valuenow", "0");
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(handle, { clientX: 300, pointerId: 1 });
    expect(handle).toHaveAttribute("aria-valuenow", "0");
  });

  it("supports arrow, page, and boundary keys in controlled mode", () => {
    const onValueChange = vi.fn();
    const { rerender } = renderCurtain({ value: 40, onValueChange });
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith(41);
    expect(handle).toHaveAttribute("aria-valuenow", "40");
    rerender(<CompareCurtain before="Draft" after="Published" value={41} onValueChange={onValueChange} />);
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(51);
    fireEvent.keyDown(handle, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(handle, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith(100);
  });

  it("does not respond when disabled", () => {
    const onValueChange = vi.fn();
    renderCurtain({ disabled: true, onValueChange });
    const handle = screen.getByRole("slider");
    expect(handle).toHaveAttribute("tabindex", "-1");
    fireEvent.pointerDown(handle, { clientX: 400, button: 0, pointerId: 1 });
    fireEvent.keyDown(handle, { key: "End" });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
